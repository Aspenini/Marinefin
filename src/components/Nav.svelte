<script lang="ts">
  import { api } from '../lib/api';
  import { router } from '../lib/router.svelte';
  import { session } from '../lib/session.svelte';
  import Icon from './Icon.svelte';

  let q = $state(router.current.name === 'search' ? (router.current.query.q ?? '') : '');
  let open = $state(false);

  $effect(() => {
    if (router.current.name === 'search') q = router.current.query.q ?? '';
  });

  function submit(e: Event) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.go(`/search?q=${encodeURIComponent(term)}`);
    else router.go('/search');
  }

  const avatar = $derived(session.user ? api.userImage(session.user) : '');
</script>

<header class="nav">
  <a class="brand" href="#/home" aria-label="Marinefin home">
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0b1219" />
      <path d="M7 20c4-1 7-7 9-13 2 6 5 12 9 13-3 4-6 6-9 6s-6-2-9-6z" fill="var(--accent)" />
    </svg>
    <span>Marinefin</span>
  </a>

  <nav class="links">
    <a href="#/home" class:on={router.current.name === 'home'}>Home</a>
    <a href="#/favorites" class:on={router.current.name === 'favorites'}>Favorites</a>
    <a href="#/history" class:on={router.current.name === 'history'}>History</a>
    <a href="#/live" class:on={router.current.name === 'live'}>Live TV</a>
  </nav>

  <form class="seek" onsubmit={submit}>
    <Icon name="search" size={16} />
    <input
      class="search-input"
      bind:value={q}
      placeholder="Search your library"
      aria-label="Search"
      onfocus={() => { if (router.current.name !== 'search') router.go(q ? `/search?q=${encodeURIComponent(q)}` : '/search'); }}
    />
  </form>

  <button class="user" onclick={() => (open = !open)} aria-haspopup="menu" aria-expanded={open}>
    {#if avatar}
      <img src={avatar} alt="" />
    {:else}
      <span class="init">{session.user?.Name?.slice(0, 1) ?? '?'}</span>
    {/if}
  </button>

  {#if open}
    <div class="menu" role="menu">
      <div class="who">
        <strong>{session.user?.Name}</strong>
        <small>{session.serverName}</small>
      </div>
      <a href="#/settings" onclick={() => (open = false)}><Icon name="settings" size={16} /> Settings</a>
      <a href="#/favorites" onclick={() => (open = false)}><Icon name="heart" size={16} /> Favorites</a>
      <button onclick={() => { open = false; session.logout(); router.go('/login'); }}>
        <Icon name="logout" size={16} /> Sign out
      </button>
    </div>
    <button class="scrim" aria-label="Close menu" onclick={() => (open = false)}></button>
  {/if}
</header>

<style>
  .nav {
    position: fixed;
    inset: 0 0 auto;
    z-index: 40;
    height: var(--nav-h);
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 22px;
    padding: 0 28px;
    background: linear-gradient(to bottom, rgba(6, 8, 13, 0.92), rgba(6, 8, 13, 0.55) 70%, transparent);
    backdrop-filter: blur(16px);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .links { display: flex; gap: 18px; }
  .links a { color: var(--muted); font-size: 14px; }
  .links a.on, .links a:hover { color: var(--text); }
  .seek {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(360px, 36vw);
    color: var(--muted);
  }
  .seek :global(.search-input) {
    width: 100%;
    height: 38px;
    background: rgba(255, 255, 255, 0.04);
  }
  .user {
    width: 36px;
    height: 36px;
    border: 1px solid var(--line);
    border-radius: 50%;
    padding: 0;
    overflow: hidden;
    background: var(--bg-card);
  }
  .user img { width: 100%; height: 100%; object-fit: cover; }
  .init { display: grid; place-items: center; height: 100%; font-weight: 600; }
  .menu {
    position: absolute;
    top: 62px;
    right: 22px;
    z-index: 5;
    width: 230px;
    padding: 8px;
    border-radius: 14px;
    background: #121922;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
  }
  .who { padding: 10px 10px 12px; border-bottom: 1px solid var(--line); margin-bottom: 6px; }
  .who strong { display: block; }
  .who small { color: var(--muted); }
  .menu a, .menu button {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 10px;
    border: 0;
    border-radius: 10px;
    background: none;
    color: var(--text);
    text-align: left;
  }
  .menu a:hover, .menu button:hover { background: rgba(255, 255, 255, 0.05); }
  .scrim { position: fixed; inset: 0; border: 0; background: transparent; }
  @media (max-width: 860px) {
    .links { display: none; }
    .seek { width: min(240px, 42vw); }
    .nav { padding: 0 14px; gap: 12px; }
  }
</style>

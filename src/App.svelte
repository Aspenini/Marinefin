<script lang="ts">
  import AudioDock from './components/AudioDock.svelte';
  import Nav from './components/Nav.svelte';
  import { player } from './lib/player.svelte';
  import { router } from './lib/router.svelte';
  import { session } from './lib/session.svelte';
  import Favorites from './pages/Favorites.svelte';
  import History from './pages/History.svelte';
  import Home from './pages/Home.svelte';
  import Item from './pages/Item.svelte';
  import Library from './pages/Library.svelte';
  import LiveTv from './pages/LiveTv.svelte';
  import Login from './pages/Login.svelte';
  import Person from './pages/Person.svelte';
  import Play from './pages/Play.svelte';
  import Search from './pages/Search.svelte';
  import Settings from './pages/Settings.svelte';

  const route = $derived(router.current.name);
  const isPlayer = $derived(route === 'play');
  const showChrome = $derived(session.loggedIn && !isPlayer);

  $effect(() => {
    if (!session.ready) return;
    if (!session.loggedIn && route !== 'login') router.replace('/login');
    if (session.loggedIn && route === 'login') router.replace('/home');
  });

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        router.go('/search');
        requestAnimationFrame(() => {
          document.querySelector<HTMLInputElement>('.seek input')?.focus();
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<div class="app-shell" class:has-dock={Boolean(player.audioItem) && !isPlayer} class:is-player={isPlayer}>
  {#if !session.ready}
    <div class="boot">Marinefin</div>
  {:else if !session.loggedIn || route === 'login'}
    <Login />
  {:else}
    {#if showChrome}<Nav />{/if}
    {#if route === 'home'}<Home />
    {:else if route === 'library'}<Library />
    {:else if route === 'item'}<Item />
    {:else if route === 'person'}<Person />
    {:else if route === 'play'}<Play />
    {:else if route === 'search'}<Search />
    {:else if route === 'favorites'}<Favorites />
    {:else if route === 'history'}<History />
    {:else if route === 'settings'}<Settings />
    {:else if route === 'live'}<LiveTv />
    {:else}<Home />{/if}
    {#if showChrome}<AudioDock />{/if}
  {/if}
</div>

<style>
  .boot {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    font-family: var(--display);
    font-size: 28px;
    letter-spacing: -0.03em;
    color: var(--muted);
  }
</style>

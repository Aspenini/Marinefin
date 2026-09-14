<script lang="ts">
  import { api } from '../lib/api';
  import { normalizeServer, serverCandidates } from '../lib/format';
  import { router } from '../lib/router.svelte';
  import { session } from '../lib/session.svelte';
  import type { PublicSystemInfo, User } from '../lib/types';
  import Icon from '../components/Icon.svelte';

  let url = $state(session.serverUrl || session.servers[0]?.url || '');
  let username = $state('');
  let password = $state('');
  let step = $state<'server' | 'user'>('server');
  let info = $state<PublicSystemInfo | null>(null);
  let users = $state<User[]>([]);
  let busy = $state(false);
  let error = $state('');
  let qcCode = $state('');
  let qcTimer: number | undefined;

  async function connect(e?: Event) {
    e?.preventDefault();
    error = '';
    busy = true;
    try {
      let server = '';
      let firstError: unknown;
      for (const candidate of serverCandidates(url)) {
        try {
          info = await api.publicInfo(candidate);
          server = candidate;
          break;
        } catch (err) {
          firstError ??= err;
        }
      }
      if (!server || !info) throw firstError ?? new Error('Enter a server address.');
      url = server;
      users = await api.publicUsers(server).catch(() => []);
      session.serverUrl = server;
      session.serverName = info.ServerName;
      session.rememberServer(server, info.ServerName);
      step = 'user';
      if (users.length === 1) username = users[0].Name;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not reach that server.';
    } finally {
      busy = false;
    }
  }

  async function signIn(e?: Event) {
    e?.preventDefault();
    if (!username.trim()) {
      error = 'Enter a username.';
      return;
    }
    error = '';
    busy = true;
    try {
      const result = await api.authenticate(url, username.trim(), password);
      await session.loginWithResult(url, result, info ?? undefined);
      router.replace('/home');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Sign-in failed.';
    } finally {
      busy = false;
    }
  }

  async function startQuickConnect() {
    error = '';
    busy = true;
    try {
      const start = await api.initiateQuickConnect(url);
      qcCode = start.Code;
      busy = false;
      window.clearInterval(qcTimer);
      qcTimer = window.setInterval(async () => {
        try {
          const state = await api.pollQuickConnect(url, start.Secret);
          if (state.Authenticated) {
            window.clearInterval(qcTimer);
            const result = await api.authenticateQuickConnect(url, start.Secret);
            await session.loginWithResult(url, result, info ?? undefined);
            router.replace('/home');
          }
        } catch {
          /* keep polling */
        }
      }, 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Quick Connect is not available.';
      busy = false;
    }
  }

  function pickUser(u: User) {
    username = u.Name;
    if (!u.HasPassword) void signIn();
  }

  async function demo() {
    url = 'https://demo.jellyfin.org/stable';
    await connect();
    username = 'demo';
    password = '';
    await signIn();
  }

  $effect(() => {
    return () => window.clearInterval(qcTimer);
  });
</script>

<div class="login">
  <div class="aurora"></div>
  <div class="panel">
    <div class="mark">
      <svg viewBox="0 0 32 32" width="42" height="42" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0b1219" />
        <path d="M7 20c4-1 7-7 9-13 2 6 5 12 9 13-3 4-6 6-9 6s-6-2-9-6z" fill="var(--accent)" />
      </svg>
      <div>
        <p class="eyebrow">Jellyfin client</p>
        <h1 class="display">Marinefin</h1>
      </div>
    </div>
    <p class="lede">A cinematic library in a single file. Point it at any Jellyfin server.</p>

    {#if step === 'server'}
      <form onsubmit={connect}>
        <label class="field">
          <span>Server address</span>
          <input bind:value={url} placeholder="jellyfin.example.com:8096" autocomplete="url" />
        </label>
        {#if session.servers.length}
          <div class="chip-row recents">
            {#each session.servers as s}
              <button type="button" class="chip" onclick={() => (url = s.url)}>{s.name || s.url}</button>
            {/each}
          </div>
        {/if}
        {#if error}<p class="err">{error}</p>{/if}
        <button class="btn primary wide" type="submit" disabled={busy || !url.trim()}>
          {busy ? 'Connecting…' : 'Connect'}
        </button>
        <button class="btn ghost wide" type="button" onclick={demo} disabled={busy}>Try the public demo</button>
      </form>
    {:else}
      <button class="back" onclick={() => { step = 'server'; qcCode = ''; }}><Icon name="chevL" size={16} /> {info?.ServerName ?? 'Server'}</button>
      {#if users.length}
        <div class="users">
          {#each users as u}
            <button class="who" onclick={() => pickUser(u)}>
              {#if u.PrimaryImageTag}
                <img src={`${normalizeServer(url)}/Users/${u.Id}/Images/Primary?fillWidth=80`} alt="" />
              {:else}
                <span>{u.Name.slice(0, 1)}</span>
              {/if}
              {u.Name}
            </button>
          {/each}
        </div>
      {/if}
      <form onsubmit={signIn}>
        <label class="field">
          <span>Username</span>
          <input bind:value={username} autocomplete="username" />
        </label>
        <label class="field">
          <span>Password</span>
          <input type="password" bind:value={password} autocomplete="current-password" />
        </label>
        {#if error}<p class="err">{error}</p>{/if}
        <button class="btn primary wide" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button class="btn ghost wide" type="button" onclick={startQuickConnect} disabled={busy}>
          {qcCode ? `Quick Connect · ${qcCode}` : 'Use Quick Connect'}
        </button>
        {#if qcCode}
          <p class="muted qc">Approve code <b>{qcCode}</b> in the Jellyfin dashboard or official app.</p>
        {/if}
      </form>
    {/if}
  </div>
</div>

<style>
  .login {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 32px 16px;
    position: relative;
    overflow: hidden;
  }
  .aurora {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(62, 224, 197, 0.16), transparent 42%),
      radial-gradient(ellipse at 80% 10%, rgba(88, 170, 255, 0.12), transparent 40%),
      radial-gradient(ellipse at 60% 90%, rgba(40, 80, 140, 0.2), transparent 45%),
      #06080d;
    filter: blur(8px);
    animation: drift 18s ease-in-out infinite alternate;
  }
  @keyframes drift {
    from { transform: translate3d(-2%, -1%, 0) scale(1.02); }
    to { transform: translate3d(2%, 2%, 0) scale(1.08); }
  }
  .panel {
    position: relative;
    width: min(440px, 100%);
    padding: 32px 28px 28px;
    border-radius: 24px;
    background: rgba(12, 17, 24, 0.78);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    backdrop-filter: blur(22px);
  }
  .mark { display: flex; gap: 14px; align-items: center; margin-bottom: 8px; }
  h1 { margin: 0; font-size: 34px; }
  .lede { color: var(--muted); margin: 0 0 22px; }
  form { display: flex; flex-direction: column; gap: 12px; }
  .wide { width: 100%; }
  .err { color: var(--danger); margin: 0; font-size: 13px; }
  .users { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .who {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 12px 0 6px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }
  .who img, .who span {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    display: grid;
    place-items: center;
    background: #1b2430;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: none;
    color: var(--muted);
    padding: 0 0 14px;
  }
  .qc { font-size: 13px; }
  .recents { margin: 4px 0 8px; }
</style>

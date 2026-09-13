<script lang="ts">
  import { api } from '../lib/api';
  import { router } from '../lib/router.svelte';
  import type { LiveTvChannel } from '../lib/types';

  let channels = $state<LiveTvChannel[]>([]);
  let loading = $state(true);
  let error = $state('');

  async function load() {
    loading = true;
    error = '';
    try {
      const res = await api.liveChannels();
      channels = res.Items ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Live TV is not available on this server.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void load();
  });
</script>

<div class="page">
  <p class="eyebrow">Tune in</p>
  <h1 class="display">Live TV</h1>
  {#if loading}
    <div class="list">{#each Array(6) as _}<div class="skel row"></div>{/each}</div>
  {:else if error}
    <div class="empty"><h3>No tuner</h3><p>{error}</p></div>
  {:else if !channels.length}
    <div class="empty"><h3>No channels</h3><p>This server has no Live TV channels configured.</p></div>
  {:else}
    <div class="list">
      {#each channels as ch}
        <button class="ch" onclick={() => router.go(`/play/${ch.Id}`)}>
          <div class="logo">
            {#if api.imageUrl(ch, 'Primary', { w: 160 })}
              <img src={api.imageUrl(ch, 'Primary', { w: 160 })} alt="" />
            {:else}
              <span>{ch.Number || ch.Name.slice(0, 2)}</span>
            {/if}
          </div>
          <div>
            <strong>{ch.Name}</strong>
            <small>{ch.CurrentProgram?.Name || 'On now'}</small>
            {#if ch.CurrentProgram?.Overview}
              <p>{ch.CurrentProgram.Overview}</p>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  h1 { margin: 6px 0 22px; font-size: clamp(36px, 5vw, 60px); }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .row { height: 88px; }
  .ch {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 14px;
    padding: 10px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    text-align: left;
  }
  .ch:hover { border-color: var(--accent); }
  .logo {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    background: #111820;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .logo img { width: 100%; height: 100%; object-fit: contain; }
  .ch small { color: var(--accent); display: block; }
  .ch p {
    margin: 6px 0 0;
    color: var(--muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

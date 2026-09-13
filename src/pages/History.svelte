<script lang="ts">
  import Poster from '../components/Poster.svelte';
  import { api } from '../lib/api';
  import type { BaseItem } from '../lib/types';

  let items = $state<BaseItem[]>([]);
  let loading = $state(true);

  async function load() {
    loading = true;
    try {
      const res = await api.items({
        Recursive: true,
        Filters: 'IsPlayed',
        SortBy: 'DatePlayed',
        SortOrder: 'Descending',
        IncludeItemTypes: 'Movie,Episode,Video,MusicVideo,Audio',
        Limit: 80,
      });
      items = res.Items ?? [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void load();
  });
</script>

<div class="page">
  <p class="eyebrow">Library</p>
  <h1 class="display">Watch history</h1>
  <p class="muted">Recently played titles, newest first.</p>
  {#if loading}
    <div class="grid" style="margin-top:22px">{#each Array(8) as _}<div class="skel" style="aspect-ratio:2/3"></div>{/each}</div>
  {:else if !items.length}
    <div class="empty"><h3>No history yet</h3><p>Play something and it will land here.</p></div>
  {:else}
    <div class="grid" style="margin-top:22px">
      {#each items as item (item.Id)}
        <Poster {item} />
      {/each}
    </div>
  {/if}
</div>

<style>
  h1 { margin: 6px 0 8px; font-size: clamp(36px, 5vw, 60px); }
</style>

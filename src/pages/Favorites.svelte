<script lang="ts">
  import Poster from '../components/Poster.svelte';
  import { api } from '../lib/api';
  import type { BaseItem } from '../lib/types';

  let tab = $state('Movie');
  let items = $state<BaseItem[]>([]);
  let loading = $state(true);

  const tabs = [
    { id: 'Movie', label: 'Movies' },
    { id: 'Series', label: 'Shows' },
    { id: 'Episode', label: 'Episodes' },
    { id: 'MusicAlbum,Audio', label: 'Music' },
    { id: 'Person', label: 'People' },
    { id: 'BoxSet,Playlist', label: 'Collections' },
  ];

  async function load() {
    loading = true;
    try {
      const res = await api.items({
        Filters: 'IsFavorite',
        Recursive: true,
        IncludeItemTypes: tab,
        SortBy: 'SortName',
        Limit: 200,
      });
      items = res.Items ?? [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void tab;
    void load();
  });
</script>

<div class="page">
  <p class="eyebrow">Library</p>
  <h1 class="display">Favorites</h1>
  <div class="chip-row" style="margin:16px 0 22px">
    {#each tabs as t}
      <button class="chip" class:on={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
    {/each}
  </div>
  {#if loading}
    <div class="grid">{#each Array(8) as _}<div class="skel" style="aspect-ratio:2/3"></div>{/each}</div>
  {:else if !items.length}
    <div class="empty"><h3>Nothing saved</h3><p>Heart a title and it will appear here.</p></div>
  {:else}
    <div class="grid">
      {#each items as item (item.Id)}
        <Poster {item} />
      {/each}
    </div>
  {/if}
</div>

<style>
  h1 { margin: 6px 0 0; font-size: clamp(36px, 5vw, 60px); }
</style>

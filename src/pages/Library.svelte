<script lang="ts">
  import Poster from '../components/Poster.svelte';
  import { api } from '../lib/api';
  import { collectionIncludeTypes } from '../lib/format';
  import { router } from '../lib/router.svelte';
  import type { BaseItem } from '../lib/types';

  let folder = $state<BaseItem | null>(null);
  let items = $state<BaseItem[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let loadingMore = $state(false);
  let error = $state('');
  let genres = $state<BaseItem[]>([]);
  let view = $state<'albums' | 'artists' | 'songs'>('albums');

  const id = $derived(router.current.params.id);
  const sort = $derived(router.current.query.sort || 'SortName');
  const order = $derived(router.current.query.order || 'Ascending');
  const filter = $derived(router.current.query.filter || '');
  const genre = $derived(router.current.query.genre || '');

  const sorts = [
    { id: 'SortName', label: 'Title' },
    { id: 'DateCreated', label: 'Date added' },
    { id: 'PremiereDate', label: 'Release date' },
    { id: 'CommunityRating', label: 'Rating' },
    { id: 'Runtime', label: 'Runtime' },
    { id: 'Random', label: 'Shuffle' },
  ];

  async function load(reset = true) {
    if (!id) return;
    if (reset) {
      loading = true;
      items = [];
    } else {
      loadingMore = true;
    }
    error = '';
    try {
      if (reset || !folder) folder = await api.item(id);
      const start = reset ? 0 : items.length;
      const isMusic = folder.CollectionType === 'music';
      let include = collectionIncludeTypes(folder.CollectionType);
      if (isMusic) {
        include = view === 'artists' ? 'MusicArtist' : view === 'songs' ? 'Audio' : 'MusicAlbum';
      }
      const res =
        isMusic && view === 'artists'
          ? await api.artists(id)
          : await api.items({
              ParentId: id,
              Recursive: true,
              IncludeItemTypes: include,
              SortBy: sort,
              SortOrder: order,
              Filters: filter || undefined,
              Genres: genre || undefined,
              StartIndex: start,
              Limit: 80,
            });
      const next = res.Items ?? [];
      items = reset ? next : [...items, ...next];
      total = res.TotalRecordCount ?? items.length;
      if (reset) genres = (await api.genres(id).catch(() => ({ Items: [] }))).Items ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not open this library.';
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  $effect(() => {
    void id;
    void sort;
    void order;
    void filter;
    void genre;
    void view;
    void load(true);
  });

  function onScroll() {
    if (loadingMore || loading || items.length >= total) return;
    if (window.innerHeight + window.scrollY > document.body.offsetHeight - 900) void load(false);
  }
</script>

<svelte:window onscroll={onScroll} />

<div class="page">
  <header class="head">
    <div>
      <p class="eyebrow">Library</p>
      <h1 class="display">{folder?.Name ?? 'Library'}</h1>
      <p class="muted">{total ? `${total} titles` : ''}</p>
    </div>
    <div class="tools">
      {#if folder?.CollectionType === 'music'}
        <div class="chip-row">
          {#each ['albums', 'artists', 'songs'] as v}
            <button class="chip" class:on={view === v} onclick={() => (view = v as typeof view)}>{v}</button>
          {/each}
        </div>
      {/if}
      <select value={sort} onchange={(e) => router.query({ sort: (e.target as HTMLSelectElement).value })}>
        {#each sorts as s}<option value={s.id}>{s.label}</option>{/each}
      </select>
      <select value={order} onchange={(e) => router.query({ order: (e.target as HTMLSelectElement).value })}>
        <option value="Ascending">Asc</option>
        <option value="Descending">Desc</option>
      </select>
      <select value={filter} onchange={(e) => router.query({ filter: (e.target as HTMLSelectElement).value })}>
        <option value="">All</option>
        <option value="IsUnplayed">Unplayed</option>
        <option value="IsPlayed">Played</option>
        <option value="IsFavorite">Favorites</option>
      </select>
    </div>
  </header>

  {#if genres.length}
    <div class="chip-row genres">
      <button class="chip" class:on={!genre} onclick={() => router.query({ genre: '' })}>All genres</button>
      {#each genres.slice(0, 24) as g}
        <button class="chip" class:on={genre === g.Name} onclick={() => router.query({ genre: g.Name })}>{g.Name}</button>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="grid">{#each Array(12) as _} <div class="skel card"></div> {/each}</div>
  {:else if error}
    <div class="empty"><h3>Nothing here</h3><p>{error}</p></div>
  {:else if !items.length}
    <div class="empty"><h3>Empty library</h3><p>No items match these filters.</p></div>
  {:else}
    <div class="grid">
      {#each items as item (item.Id)}
        <Poster {item} />
      {/each}
    </div>
    {#if loadingMore}<p class="muted more">Loading more…</p>{/if}
  {/if}
</div>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: flex-end;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  h1 { margin: 4px 0 6px; font-size: clamp(34px, 5vw, 56px); }
  .tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  select {
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg-card);
    padding: 0 10px;
  }
  .genres { margin-bottom: 18px; }
  .card { aspect-ratio: 2 / 3; }
  .more { text-align: center; padding: 20px; }
</style>

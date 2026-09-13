<script lang="ts">
  import Hero from '../components/Hero.svelte';
  import Row from '../components/Row.svelte';
  import { api } from '../lib/api';
  import { recommendationTitle } from '../lib/format';
  import { router } from '../lib/router.svelte';
  import type { BaseItem, RecommendationDto } from '../lib/types';

  let loading = $state(true);
  let error = $state('');
  let views = $state<BaseItem[]>([]);
  let resume = $state<BaseItem[]>([]);
  let nextUp = $state<BaseItem[]>([]);
  let latestMovies = $state<BaseItem[]>([]);
  let latestShows = $state<BaseItem[]>([]);
  let latestMusic = $state<BaseItem[]>([]);
  let favorites = $state<BaseItem[]>([]);
  let upcoming = $state<BaseItem[]>([]);
  let recs = $state<RecommendationDto[]>([]);

  const hero = $derived(resume[0] || latestMovies[0] || latestShows[0] || nextUp[0]);

  async function load() {
    loading = true;
    error = '';
    try {
      const [v, r, n, m, s, mu, f, u, rec] = await Promise.all([
        api.views(),
        api.resume(18),
        api.nextUp(18),
        api.latest('Movie', 18),
        api.latest('Series', 18),
        api.latest('MusicAlbum', 16),
        api.items({ Filters: 'IsFavorite', Recursive: true, Limit: 16, SortBy: 'DateCreated', SortOrder: 'Descending' }),
        api.upcoming(16).catch(() => ({ Items: [] as BaseItem[] })),
        api.recommendations().catch(() => [] as RecommendationDto[]),
      ]);
      views = v.Items ?? [];
      resume = r.Items ?? [];
      nextUp = n.Items ?? [];
      latestMovies = m ?? [];
      latestShows = s ?? [];
      latestMusic = mu ?? [];
      favorites = f.Items ?? [];
      upcoming = u.Items ?? [];
      recs = rec ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not load your home.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void load();
  });
</script>

<div class="page flush">
  {#if loading}
    <div class="skel hero-skel"></div>
    <div class="pad">
      <div class="skel line"></div>
      <div class="skel row"></div>
    </div>
  {:else if error}
    <div class="empty"><h3>Home is quiet</h3><p>{error}</p></div>
  {:else}
    {#if hero}
      <Hero item={hero} />
    {/if}
    <div class="pad">
      {#if views.length}
        <div class="libs">
          {#each views as lib}
            <button class="lib" onclick={() => router.go(lib.CollectionType === 'livetv' ? '/live' : `/library/${lib.Id}`)}>
              {#if api.imageUrl(lib, 'Primary', { w: 80 })}
                <img src={api.imageUrl(lib, 'Primary', { w: 80 })} alt="" />
              {/if}
              <span>{lib.Name}</span>
            </button>
          {/each}
        </div>
      {/if}
      <Row title="Continue watching" items={resume} landscape />
      <Row title="Next up" items={nextUp} landscape />
      <Row title="Recently added movies" items={latestMovies} />
      <Row title="Recently added shows" items={latestShows} />
      <Row title="New music" items={latestMusic} />
      <Row title="Coming soon" items={upcoming} landscape />
      <Row title="Favorites" items={favorites} href="#/favorites" />
      {#each recs as group}
        <Row title={recommendationTitle(group.RecommendationType, group.BaselineItemName)} items={group.Items ?? []} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .hero-skel { height: 78vh; border-radius: 0; }
  .pad { padding: 8px 36px 40px; }
  .line { height: 24px; width: 180px; margin: 20px 0 12px; }
  .row { height: 240px; }
  .libs { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 10px; }
  .lib {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 14px 0 6px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }
  .lib img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
  @media (max-width: 700px) { .pad { padding: 8px 16px 40px; } }
</style>

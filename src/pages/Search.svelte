<script lang="ts">
  import Poster from '../components/Poster.svelte';
  import { api } from '../lib/api';
  import { typeLabel } from '../lib/format';
  import { router } from '../lib/router.svelte';
  import type { BaseItem, SearchHint } from '../lib/types';

  let hints = $state<SearchHint[]>([]);
  let people = $state<SearchHint[]>([]);
  let items = $state<BaseItem[]>([]);
  let loading = $state(false);
  let timer: number | undefined;

  const q = $derived(router.current.query.q ?? '');

  async function run(term: string) {
    if (!term.trim()) {
      hints = [];
      people = [];
      items = [];
      return;
    }
    loading = true;
    try {
      const res = await api.search(term, 30);
      const all = res.SearchHints ?? [];
      people = all.filter((h) => h.Type === 'Person' || h.Type === 'MusicArtist');
      hints = all.filter((h) => h.Type !== 'Person');
      const ids = hints.slice(0, 24).map((h) => h.ItemId || h.Id).filter(Boolean) as string[];
      if (ids.length) {
        const got = await api.items({ Ids: ids.join(','), Limit: ids.length });
        items = got.Items ?? [];
      } else {
        items = [];
      }
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    const term = q;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void run(term), 180);
    return () => window.clearTimeout(timer);
  });

  function href(h: SearchHint) {
    const id = h.ItemId || h.Id;
    return h.Type === 'Person' ? `#/person/${id}` : `#/item/${id}`;
  }
</script>

<div class="page">
  <p class="eyebrow">Search</p>
  <h1 class="display">{q ? `Results for “${q}”` : 'Find something'}</h1>
  <p class="muted">{q ? '' : 'Start typing in the bar above. Movies, shows, music, people.'}</p>

  {#if loading}
    <div class="grid" style="margin-top:24px">{#each Array(8) as _}<div class="skel card"></div>{/each}</div>
  {:else}
    {#if people.length}
      <div class="section-head"><h2>People</h2></div>
      <div class="people">
        {#each people as p}
          <a href={href(p)}>
            {#if p.PrimaryImageTag}
              <img src={api.personImage({ Id: p.ItemId || p.Id || '', PrimaryImageTag: p.PrimaryImageTag })} alt="" />
            {:else}
              <div class="ph">{p.Name.slice(0, 1)}</div>
            {/if}
            <strong>{p.Name}</strong>
            <small>{typeLabel(p.Type)}</small>
          </a>
        {/each}
      </div>
    {/if}

    {#if items.length}
      <div class="section-head"><h2>Titles</h2></div>
      <div class="grid">
        {#each items as item (item.Id)}
          <Poster {item} />
        {/each}
      </div>
    {:else if hints.length}
      <div class="hints">
        {#each hints as h}
          <a href={href(h)}>
            <b>{h.Name}</b>
            <small>{typeLabel(h.Type)}{#if h.ProductionYear} · {h.ProductionYear}{/if}{#if h.Series} · {h.Series}{/if}</small>
          </a>
        {/each}
      </div>
    {:else if q}
      <div class="empty"><h3>No matches</h3><p>Try a shorter title or an actor name.</p></div>
    {/if}
  {/if}
</div>

<style>
  h1 { margin: 6px 0 8px; font-size: clamp(34px, 5vw, 56px); }
  .card { aspect-ratio: 2 / 3; }
  .people { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 14px; }
  .people img, .ph {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 50%;
    background: #151c24;
    display: grid;
    place-items: center;
    margin-bottom: 8px;
  }
  .people strong, .people small, .hints small { display: block; }
  .people small, .hints small { color: var(--muted); }
  .hints { display: flex; flex-direction: column; margin-top: 20px; }
  .hints a { padding: 10px 4px; border-bottom: 1px solid var(--line); }
  .hints a:hover { color: var(--accent); }
</style>

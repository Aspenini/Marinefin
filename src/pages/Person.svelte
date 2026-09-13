<script lang="ts">
  import Poster from '../components/Poster.svelte';
  import { api } from '../lib/api';
  import { router } from '../lib/router.svelte';
  import type { BaseItem } from '../lib/types';

  let person = $state<BaseItem | null>(null);
  let filmography = $state<BaseItem[]>([]);
  let loading = $state(true);
  let error = $state('');

  const id = $derived(router.current.params.id);

  async function load() {
    if (!id) return;
    loading = true;
    error = '';
    try {
      person = await api.item(id);
      const movies = await api.items({
        PersonIds: id,
        Recursive: true,
        IncludeItemTypes: 'Movie,Series,Episode',
        SortBy: 'PremiereDate',
        SortOrder: 'Descending',
        Limit: 80,
      });
      filmography = movies.Items ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not load this person.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void id;
    void load();
  });
</script>

<div class="page">
  {#if loading}
    <div class="skel avatar"></div>
  {:else if error || !person}
    <div class="empty"><h3>Not found</h3><p>{error}</p></div>
  {:else}
    <header class="head">
      {#if api.imageUrl(person, 'Primary', { w: 360 })}
        <img src={api.imageUrl(person, 'Primary', { w: 360 })} alt="" />
      {:else}
        <div class="ph">{person.Name.slice(0, 1)}</div>
      {/if}
      <div>
        <p class="eyebrow">Person</p>
        <h1 class="display">{person.Name}</h1>
        {#if person.Overview}<p class="syn">{person.Overview}</p>{/if}
      </div>
    </header>
    <div class="section-head"><h2>Known for</h2></div>
    {#if filmography.length}
      <div class="grid">
        {#each filmography as item (item.Id)}
          <Poster {item} />
        {/each}
      </div>
    {:else}
      <p class="muted">No linked titles.</p>
    {/if}
  {/if}
</div>

<style>
  .head { display: grid; grid-template-columns: 180px 1fr; gap: 28px; align-items: end; margin-bottom: 28px; }
  .head img, .ph, .avatar {
    width: 180px;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 50%;
    background: #151c24;
  }
  .ph { display: grid; place-items: center; font-size: 56px; font-family: var(--display); }
  h1 { margin: 6px 0 10px; font-size: clamp(36px, 5vw, 60px); }
  .syn { max-width: 70ch; color: #c9d5dc; }
  @media (max-width: 700px) { .head { grid-template-columns: 1fr; } }
</style>

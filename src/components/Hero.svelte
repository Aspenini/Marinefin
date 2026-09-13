<script lang="ts">
  import { api } from '../lib/api';
  import { formatDuration, formatRating, formatYear } from '../lib/format';
  import { router } from '../lib/router.svelte';
  import type { BaseItem } from '../lib/types';
  import Icon from './Icon.svelte';

  let { item }: { item: BaseItem } = $props();

  const backdrop = $derived(api.imageUrl(item, 'Backdrop', { w: 1920 }) || api.imageUrl(item, 'Primary', { w: 900 }));
  const logo = $derived(api.imageUrl(item, 'Logo', { w: 700 }));
  const resume = $derived((item.UserData?.PlaybackPositionTicks ?? 0) > 0 && !item.UserData?.Played);

  function play() {
    if (item.Type === 'Series') {
      router.go(`/item/${item.Id}`);
      return;
    }
    router.go(`/play/${item.Id}`);
  }
</script>

<section class="hero">
  {#if backdrop}
    <img class="bg" src={backdrop} alt="" />
  {/if}
  <div class="wash"></div>
  <div class="copy">
    <p class="eyebrow">{item.Type === 'Episode' ? item.SeriesName : item.Type}</p>
    {#if logo}
      <img class="logo" src={logo} alt={item.Name} />
    {:else}
      <h1 class="display">{item.Name}</h1>
    {/if}
    <p class="facts">
      {#if formatYear(item)}<span>{formatYear(item)}</span>{/if}
      {#if item.OfficialRating}<span>{item.OfficialRating}</span>{/if}
      {#if item.CommunityRating}<span class="gold"><Icon name="star" size={13} /> {formatRating(item.CommunityRating)}</span>{/if}
      {#if item.RunTimeTicks}<span>{formatDuration(item.RunTimeTicks)}</span>{/if}
    </p>
    {#if item.Overview}
      <p class="syn">{item.Overview}</p>
    {/if}
    <div class="acts">
      <button class="btn primary" onclick={play}>
        <Icon name="play" size={16} /> {resume ? 'Resume' : item.Type === 'Series' ? 'View series' : 'Play'}
      </button>
      <button class="btn ghost" onclick={() => router.go(`/item/${item.Id}`)}>
        <Icon name="info" size={16} /> More info
      </button>
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    min-height: min(86vh, 820px);
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }
  .bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 18%;
    filter: saturate(1.05);
  }
  .wash {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(6, 8, 13, 0.92) 8%, rgba(6, 8, 13, 0.45) 48%, rgba(6, 8, 13, 0.15) 100%),
      linear-gradient(to top, var(--bg) 0%, rgba(6, 8, 13, 0.2) 42%, transparent 70%);
  }
  .copy {
    position: relative;
    z-index: 1;
    width: min(680px, 92vw);
    padding: 0 36px 72px;
  }
  .logo {
    max-width: min(420px, 70vw);
    max-height: 150px;
    object-fit: contain;
    object-position: left bottom;
    filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.45));
    margin: 8px 0 12px;
  }
  h1 { font-size: clamp(42px, 6vw, 72px); margin: 6px 0 12px; }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    color: var(--muted);
    font-size: 14px;
    margin: 0 0 14px;
  }
  .gold { color: var(--gold); display: inline-flex; align-items: center; gap: 4px; }
  .syn {
    margin: 0 0 22px;
    color: #c5d2da;
    max-width: 52ch;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .acts { display: flex; gap: 10px; }
  @media (max-width: 700px) {
    .copy { padding: 0 16px 48px; }
    .hero { min-height: 72vh; }
  }
</style>

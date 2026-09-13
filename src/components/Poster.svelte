<script lang="ts">
  import { api } from '../lib/api';
  import { formatYear, itemSubtitle, ticksToSeconds } from '../lib/format';
  import { router } from '../lib/router.svelte';
  import type { BaseItem } from '../lib/types';
  import Icon from './Icon.svelte';

  let {
    item,
    landscape = false,
    showMeta = true,
  }: { item: BaseItem; landscape?: boolean; showMeta?: boolean } = $props();

  const img = $derived(
    api.imageUrl(item, landscape ? (item.ImageTags?.Thumb || item.BackdropImageTags?.[0] ? 'Thumb' : 'Backdrop') : 'Primary', {
      w: landscape ? 640 : 360,
    }) || api.imageUrl(item, 'Primary', { w: 360 }),
  );
  const square = $derived(!landscape && ['MusicAlbum', 'Audio', 'MusicArtist'].includes(item.Type ?? ''));
  const pct = $derived(item.UserData?.PlayedPercentage ?? (item.UserData?.PlaybackPositionTicks && item.RunTimeTicks
    ? (ticksToSeconds(item.UserData.PlaybackPositionTicks) / ticksToSeconds(item.RunTimeTicks)) * 100
    : 0));

  function open() {
    router.go(`/item/${item.Id}`);
  }
</script>

<button class="poster" class:landscape class:square class:played={item.UserData?.Played} onclick={open}>
  <div class="art">
    {#if img}
      <img src={img} alt="" loading="lazy" />
    {:else}
      <div class="ph">{item.Name?.slice(0, 1) ?? '?'}</div>
    {/if}
    <div class="veil">
      <span class="go"><Icon name="play" size={18} /></span>
    </div>
    {#if item.UserData?.Played}
      <span class="tick"><Icon name="check" size={12} /></span>
    {/if}
    {#if item.UserData?.IsFavorite}
      <span class="fav"><Icon name="heartFill" size={12} /></span>
    {/if}
    {#if item.CommunityRating}
      <span class="rate"><Icon name="star" size={11} /> {item.CommunityRating.toFixed(1)}</span>
    {/if}
    {#if pct > 1 && pct < 96}
      <div class="progress-line bar"><i style="width:{Math.min(100, pct)}%"></i></div>
    {/if}
  </div>
  {#if showMeta}
    <div class="meta">
      <strong>{item.Name}</strong>
      <small>{item.Type === 'Episode' ? itemSubtitle(item) : [formatYear(item), item.OfficialRating].filter(Boolean).join(' · ')}</small>
    </div>
  {/if}
</button>

<style>
  .poster {
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    color: inherit;
  }
  .art {
    position: relative;
    aspect-ratio: 2 / 3;
    border-radius: 12px;
    overflow: hidden;
    background: #10161e;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
    transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease);
  }
  .landscape .art { aspect-ratio: 16 / 9; }
  .square .art { aspect-ratio: 1; }
  .poster:hover .art, .poster:focus-visible .art {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--accent-glow);
  }
  img { width: 100%; height: 100%; object-fit: cover; }
  .ph {
    height: 100%;
    display: grid;
    place-items: center;
    font-family: var(--display);
    font-size: 42px;
    color: var(--faint);
  }
  .veil {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent 50%);
    opacity: 0;
    transition: opacity 0.25s;
    display: grid;
    place-items: center;
  }
  .poster:hover .veil { opacity: 1; }
  .go {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--accent);
    color: #04211c;
    display: grid;
    place-items: center;
    box-shadow: 0 10px 24px var(--accent-glow);
  }
  .tick, .fav, .rate {
    position: absolute;
    top: 8px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(6, 8, 13, 0.7);
    backdrop-filter: blur(8px);
  }
  .tick { right: 8px; color: var(--accent); }
  .fav { left: 8px; color: var(--danger); }
  .rate {
    left: 8px;
    top: auto;
    bottom: 10px;
    width: auto;
    height: 22px;
    padding: 0 7px;
    border-radius: 99px;
    font-size: 11px;
    gap: 4px;
    display: inline-flex;
    align-items: center;
    color: var(--gold);
  }
  .bar { position: absolute; left: 8px; right: 8px; bottom: 8px; }
  .meta { padding: 8px 2px 0; }
  .meta strong {
    display: block;
    font-size: 13.5px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta small { color: var(--muted); font-size: 12px; }
</style>

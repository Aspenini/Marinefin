<script lang="ts">
  import type { BaseItem } from '../lib/types';
  import Icon from './Icon.svelte';
  import Poster from './Poster.svelte';

  let {
    title,
    items,
    landscape = false,
    href = '',
  }: { title: string; items: BaseItem[]; landscape?: boolean; href?: string } = $props();

  let scroller: HTMLDivElement | undefined = $state();

  function scroll(dir: number) {
    scroller?.scrollBy({ left: dir * Math.min(scroller.clientWidth * 0.86, 720), behavior: 'smooth' });
  }
</script>

{#if items.length}
  <section class="row">
    <div class="section-head">
      <h2>{title}</h2>
      {#if href}
        <a class="more" href={href}>See all</a>
      {/if}
    </div>
    <div class="wrap">
      <button class="nav l" onclick={() => scroll(-1)} aria-label="Scroll left"><Icon name="chevL" /></button>
      <div class="scroller" bind:this={scroller}>
        {#each items as item (item.Id)}
          <div class="cell" class:wide={landscape}>
            <Poster {item} {landscape} />
          </div>
        {/each}
      </div>
      <button class="nav r" onclick={() => scroll(1)} aria-label="Scroll right"><Icon name="chevR" /></button>
    </div>
  </section>
{/if}

<style>
  .wrap { position: relative; }
  .scroller {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding: 6px 2px 16px;
    scrollbar-width: none;
  }
  .scroller::-webkit-scrollbar { display: none; }
  .cell { flex: 0 0 164px; min-width: 0; scroll-snap-align: start; }
  .cell.wide { flex: 0 0 280px; }
  .nav {
    position: absolute;
    top: 28%;
    z-index: 2;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 50%;
    background: rgba(8, 12, 18, 0.72);
    color: var(--text);
    backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .wrap:hover .nav { opacity: 1; }
  .l { left: -8px; }
  .r { right: -8px; }
  .more { color: var(--muted); font-size: 13px; }
  .more:hover { color: var(--accent); }
  @media (max-width: 700px) {
    .cell { flex-basis: 132px; }
    .cell.wide { flex-basis: 220px; }
    .nav { display: none; }
  }
</style>

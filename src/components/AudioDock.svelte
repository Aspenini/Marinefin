<script lang="ts">
  import { untrack } from 'svelte';
  import { api } from '../lib/api';
  import { formatClock, itemSubtitle } from '../lib/format';
  import { player } from '../lib/player.svelte';
  import { router } from '../lib/router.svelte';
  import Icon from './Icon.svelte';

  let audio: HTMLAudioElement | undefined = $state();
  let lastReport = 0;

  // Only a new track URL reloads the element; volume and mute are read untracked so changing them doesn't restart the song.
  $effect(() => {
    const url = player.audioUrl;
    if (!audio || !url) return;
    const el = audio;
    el.src = url;
    untrack(() => {
      el.volume = player.volume;
      el.muted = player.muted;
    });
    play(el);
  });

  function play(el: HTMLAudioElement) {
    el.play().catch((e: unknown) => {
      // AbortError just means the source changed before playback began.
      if ((e as Error)?.name === 'AbortError') return;
      fail((e as Error)?.name === 'NotAllowedError' ? 'Press play to start' : undefined);
    });
  }

  function fail(message = "This track couldn't be played.") {
    player.paused = true;
    player.audioError = message;
  }

  $effect(() => {
    if (audio) audio.volume = player.volume;
  });

  function onTime() {
    if (!audio) return;
    player.currentTime = audio.currentTime;
    player.duration = audio.duration || 0;
    if (audio.currentTime - lastReport > 10) {
      lastReport = audio.currentTime;
      player.reportAudio('progress');
    }
  }

  function toggle() {
    if (!audio) return;
    if (audio.paused) play(audio);
    else audio.pause();
    player.paused = audio.paused;
    player.reportAudio('progress');
  }

  function seek(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    if (audio) audio.currentTime = v;
    player.currentTime = v;
  }

  const art = $derived(player.audioItem ? api.imageUrl(player.audioItem, 'Primary', { w: 120 }) : '');
</script>

{#if player.audioItem}
  <div class="dock">
    <audio
      bind:this={audio}
      ontimeupdate={onTime}
      onplay={() => {
        player.paused = false;
        player.audioError = '';
      }}
      onpause={() => (player.paused = true)}
      onerror={() => fail()}
      onended={() => player.nextAudio()}
    ></audio>

    <button class="now" onclick={() => player.audioItem && router.go(`/item/${player.audioItem.AlbumId || player.audioItem.Id}`)}>
      {#if art}<img src={art} alt="" />{:else}<div class="ph"></div>{/if}
      <div>
        <strong>{player.audioItem.Name}</strong>
        <small class:err={player.audioError}>{player.audioError || itemSubtitle(player.audioItem)}</small>
      </div>
    </button>

    <div class="ctrls">
      <div class="btns">
        <button class="btn icon sm ghost" onclick={() => player.prevAudio()} aria-label="Previous"><Icon name="prev" size={16} /></button>
        <button class="btn icon primary" onclick={toggle} aria-label={player.paused ? 'Play' : 'Pause'}>
          <Icon name={player.paused ? 'play' : 'pause'} size={16} />
        </button>
        <button class="btn icon sm ghost" onclick={() => player.nextAudio()} aria-label="Next"><Icon name="next" size={16} /></button>
      </div>
      <div class="time">
        <span>{formatClock(player.currentTime)}</span>
        <input type="range" min="0" max={player.duration || 0} step="0.1" value={player.currentTime} oninput={seek} />
        <span>{formatClock(player.duration)}</span>
      </div>
    </div>

    <div class="side">
      <input
        class="vol"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={player.volume}
        oninput={(e) => player.setVolume(Number((e.target as HTMLInputElement).value))}
        aria-label="Volume"
      />
      <button class="btn icon sm ghost" onclick={() => (player.queueOpen = !player.queueOpen)} aria-label="Queue">
        <Icon name="queue" size={16} />
      </button>
    </div>
  </div>

  {#if player.queueOpen}
    <aside class="queue">
      <header>
        <strong>Up next</strong>
        <button class="btn icon sm ghost" onclick={() => (player.queueOpen = false)} aria-label="Close"><Icon name="close" size={14} /></button>
      </header>
      {#each player.queue as track, i (track.Id)}
        <button class="qitem" class:on={i === player.queueIndex} onclick={() => player.startAudio(player.queue, i)}>
          <span>{i + 1}</span>
          <div>
            <b>{track.Name}</b>
            <small>{track.AlbumArtist || track.Artists?.[0]}</small>
          </div>
        </button>
      {/each}
    </aside>
  {/if}
{/if}

<style>
  .dock {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 12px;
    z-index: 50;
    height: 76px;
    display: grid;
    grid-template-columns: minmax(160px, 1fr) minmax(280px, 1.4fr) minmax(120px, 0.8fr);
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    border-radius: 18px;
    background: rgba(12, 17, 24, 0.88);
    border: 1px solid var(--line);
    backdrop-filter: blur(22px);
    box-shadow: var(--shadow);
  }
  .now {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    background: none;
    padding: 0;
    text-align: left;
    min-width: 0;
  }
  .now img, .ph {
    width: 52px;
    height: 52px;
    border-radius: 8px;
    object-fit: cover;
    background: #1a222c;
  }
  .now strong, .now small, .qitem b, .qitem small {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .now small, .qitem small { color: var(--muted); font-size: 12px; }
  .now small.err { color: var(--danger); }
  .ctrls { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .btns { display: flex; align-items: center; gap: 8px; }
  .time {
    width: 100%;
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--muted);
  }
  input[type='range'] { width: 100%; accent-color: var(--accent); }
  .side { display: flex; justify-content: flex-end; align-items: center; gap: 10px; }
  .vol { width: 90px; accent-color: var(--accent); }
  .queue {
    position: fixed;
    right: 16px;
    bottom: 100px;
    z-index: 50;
    width: min(360px, 92vw);
    max-height: 50vh;
    overflow: auto;
    padding: 10px;
    border-radius: 16px;
    background: #121922;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
  }
  .queue header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .qitem {
    width: 100%;
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 8px;
    padding: 8px;
    border: 0;
    border-radius: 10px;
    background: none;
    text-align: left;
  }
  .qitem.on, .qitem:hover { background: var(--accent-dim); }
  @media (max-width: 760px) {
    .dock { grid-template-columns: 1fr auto; }
    .time, .vol { display: none; }
    .ctrls { align-items: flex-end; }
  }
</style>

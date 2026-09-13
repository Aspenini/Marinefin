<script lang="ts">
  import Hls from 'hls.js';
  import { onDestroy } from 'svelte';
  import { api } from '../lib/api';
  import { episodeLabel, formatBitrate, formatClock, secondsToTicks } from '../lib/format';
  import { matchesQuality, PLAYBACK_RATES, VIDEO_BITRATES } from '../lib/playback';
  import { player } from '../lib/player.svelte';
  import { router } from '../lib/router.svelte';
  import { session } from '../lib/session.svelte';
  import type { BaseItem, MediaStream } from '../lib/types';
  import Icon from './Icon.svelte';

  let {
    nextEpisode = null,
    onEnded = undefined,
  }: { nextEpisode?: BaseItem | null; onEnded?: () => void } = $props();

  let video: HTMLVideoElement | undefined = $state();
  let root: HTMLDivElement | undefined = $state();
  let hls: Hls | null = null;
  let hideTimer: number | undefined;
  let lastReport = 0;
  let started = false;
  let show = $state(true);
  let fullscreen = $state(false);
  let settingsOpen = $state(false);
  let settingsTab = $state<'audio' | 'subs' | 'quality' | 'speed'>('subs');
  let skipIntroUntil = $state(0);
  let skipCreditsUntil = $state(0);
  let countdown = $state(0);

  const sessionPlay = $derived(player.video);
  const streams = $derived(sessionPlay?.source.MediaStreams ?? sessionPlay?.item.MediaStreams ?? []);
  const audioTracks = $derived(streams.filter((s) => s.Type === 'Audio'));
  const subTracks = $derived(streams.filter((s) => s.Type === 'Subtitle'));
  const chapters = $derived(sessionPlay?.item.Chapters ?? []);
  const intro = $derived(findMarker(chapters, /intro/i));
  const credits = $derived(findMarker(chapters, /credit|outro|ending/i));
  const title = $derived(
    sessionPlay?.item.Type === 'Episode'
      ? `${sessionPlay.item.SeriesName ?? ''} · ${episodeLabel(sessionPlay.item)}`
      : sessionPlay?.item.Name ?? '',
  );

  const sourceBitrate = $derived(sessionPlay?.source.Bitrate ?? 0);
  const methodLabel = $derived(
    [
      sessionPlay?.method,
      sessionPlay?.source.Container,
      formatBitrate(sourceBitrate),
    ]
      .filter(Boolean)
      .join(' · '),
  );

  $effect(() => {
    const play = player.video;
    const url = play?.url;
    const useHls = play?.hls ?? false;
    const start = play?.startSeconds ?? 0;
    if (!play || !video || !url) return;
    attach(url, useHls);
    video.volume = player.volume;
    video.muted = player.muted;
    video.playbackRate = player.playbackRate;
    const onMeta = () => {
      if (start > 5 && start < (video?.duration ?? 0) - 2) video!.currentTime = start;
    };
    video.addEventListener('loadedmetadata', onMeta, { once: true });
    return () => {
      video?.removeEventListener('loadedmetadata', onMeta);
      destroyHls();
    };
  });

  $effect(() => {
    const idx = player.video?.subtitleIndex ?? -1;
    if (video) applySubtitle(idx);
  });

  $effect(() => {
    document.documentElement.style.setProperty('--sub-scale', String(session.settings.subtitleSize));
  });

  $effect(() => {
    if (!video) return;
    video.volume = player.volume;
    video.muted = player.muted;
    video.playbackRate = player.playbackRate;
  });

  function findMarker(chs: { Name?: string; StartPositionTicks: number; MarkerType?: string }[], re: RegExp) {
    const hit = chs.find((c) => re.test(c.Name || '') || re.test(c.MarkerType || ''));
    if (!hit) return null;
    const idx = chs.indexOf(hit);
    const end = chs[idx + 1]?.StartPositionTicks ?? hit.StartPositionTicks + 90_000_0000;
    return { start: hit.StartPositionTicks / 10_000_000, end: end / 10_000_000 };
  }

  function attach(url: string, useHls: boolean) {
    destroyHls();
    if (!video) return;
    if (useHls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        capLevelToPlayerSize: session.settings.maxResolution === 0,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
    }
    void video.play().catch(() => undefined);
  }

  function destroyHls() {
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  function report(kind: 'start' | 'progress' | 'stop', ticks?: number) {
    const play = player.video;
    if (!play) return;
    const body = {
      ItemId: play.item.Id,
      MediaSourceId: play.source.Id,
      PlaySessionId: play.playSessionId,
      PositionTicks: ticks ?? secondsToTicks(video?.currentTime ?? 0),
      AudioStreamIndex: play.audioIndex,
      SubtitleStreamIndex: play.subtitleIndex,
      IsPaused: video?.paused ?? false,
      IsMuted: video?.muted ?? false,
      VolumeLevel: Math.round((video?.volume ?? 1) * 100),
      PlayMethod: play.method,
      CanSeek: true,
    };
    const fn = kind === 'start' ? api.playing : kind === 'stop' ? api.stopped : api.progress;
    void fn(body).catch(() => undefined);
  }

  function onTime() {
    if (!video || !player.video) return;
    player.currentTime = video.currentTime;
    player.duration = video.duration || 0;
    if (intro && session.settings.skipIntro && video.currentTime >= intro.start && video.currentTime < intro.end - 1) {
      skipIntroUntil = intro.end;
    } else {
      skipIntroUntil = 0;
    }
    if (credits && session.settings.skipCredits && video.currentTime >= credits.start && video.currentTime < credits.end - 1) {
      skipCreditsUntil = credits.end;
    } else {
      skipCreditsUntil = 0;
    }
    if (!started && video.currentTime > 0.2) {
      started = true;
      report('start');
    } else if (video.currentTime - lastReport > 10) {
      lastReport = video.currentTime;
      report('progress');
    }
    if (nextEpisode && session.settings.autoplayNext && video.duration - video.currentTime < 16 && video.duration > 30) {
      countdown = Math.ceil(video.duration - video.currentTime);
    } else {
      countdown = 0;
    }
  }

  function bump(hide = true) {
    show = true;
    window.clearTimeout(hideTimer);
    if (hide && !video?.paused && !settingsOpen) {
      hideTimer = window.setTimeout(() => (show = false), 2600);
    }
  }

  function toggle() {
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
    bump();
  }

  function seekTo(t: number) {
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || t, t));
    player.currentTime = video.currentTime;
    report('progress');
  }

  function onBar(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    seekTo(((e.clientX - r.left) / r.width) * (video?.duration || 0));
  }

  async function toggleFs() {
    if (!root) return;
    if (!document.fullscreenElement) {
      await root.requestFullscreen?.();
      fullscreen = true;
    } else {
      await document.exitFullscreen?.();
      fullscreen = false;
    }
  }

  function applySubtitle(index: number) {
    if (!video) return;
    for (const track of Array.from(video.textTracks)) track.mode = 'hidden';
    const play = player.video;
    if (!play || index < 0) return;
    const sub = subTracks.find((s) => s.Index === index);
    if (!sub) return;
    const existing = Array.from(video.textTracks).find((t) => t.label === sub.DisplayTitle);
    if (existing) {
      existing.mode = 'showing';
      return;
    }
    const url = sub.DeliveryUrl
      ? sub.DeliveryUrl.startsWith('http')
        ? sub.DeliveryUrl
        : `${session.serverUrl}${sub.DeliveryUrl}`
      : api.subtitleUrl(play.item.Id, play.source.Id, sub.Index);
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = sub.DisplayTitle || 'Subtitle';
    track.srclang = sub.Language || 'und';
    track.src = url;
    track.default = true;
    video.appendChild(track);
    requestAnimationFrame(() => {
      const t = Array.from(video!.textTracks).find((x) => x.label === track.label);
      if (t) t.mode = 'showing';
    });
  }

  async function setAudio(stream: MediaStream) {
    if (!player.video) return;
    const t = video?.currentTime ?? 0;
    await player.startVideo(player.video.item, {
      startTicks: secondsToTicks(t),
      audioIndex: stream.Index,
      subtitleIndex: player.video.subtitleIndex,
      maxBitrate: player.video.maxBitrate,
      mediaSourceId: player.video.source.Id,
    });
  }

  async function setSub(index: number) {
    if (!player.video) return;
    const stream = subTracks.find((s) => s.Index === index);
    const text = !stream || stream.IsTextSubtitleStream || stream.DeliveryMethod === 'External';
    if (index < 0 || text) {
      player.video.subtitleIndex = index;
      applySubtitle(index);
      report('progress');
      return;
    }
    const t = video?.currentTime ?? 0;
    await player.startVideo(player.video.item, {
      startTicks: secondsToTicks(t),
      audioIndex: player.video.audioIndex,
      subtitleIndex: index,
      maxBitrate: player.video.maxBitrate,
      mediaSourceId: player.video.source.Id,
    });
  }

  async function setQuality(value: number) {
    if (!player.video) return;
    session.updateSettings({ maxStreamingBitrate: value });
    const t = video?.currentTime ?? 0;
    await player.startVideo(player.video.item, {
      startTicks: secondsToTicks(t),
      audioIndex: player.video.audioIndex,
      subtitleIndex: player.video.subtitleIndex,
      maxBitrate: value,
      mediaSourceId: player.video.source.Id,
    });
  }

  function setSpeed(rate: number) {
    player.setPlaybackRate(rate);
    if (video) video.playbackRate = rate;
  }

  function leave() {
    report('stop');
    player.stopVideo();
    router.back();
  }

  function onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    const map: Record<string, () => void> = {
      ' ': toggle,
      k: toggle,
      ArrowLeft: () => seekTo((video?.currentTime ?? 0) - 10),
      ArrowRight: () => seekTo((video?.currentTime ?? 0) + 10),
      ArrowUp: () => player.setVolume(player.volume + 0.05),
      ArrowDown: () => player.setVolume(player.volume - 0.05),
      f: () => void toggleFs(),
      m: () => {
        player.muted = !player.muted;
        if (video) video.muted = player.muted;
      },
      n: () => nextEpisode && router.go(`/play/${nextEpisode.Id}`),
      Escape: leave,
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
      bump();
    }
  }

  onDestroy(() => {
    if (player.video) report('stop');
  });

  function ended() {
    report('stop', secondsToTicks(video?.duration ?? 0));
    if (session.settings.autoplayNext && nextEpisode) router.go(`/play/${nextEpisode.Id}`);
    else onEnded?.();
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="stage"
  class:idle={!show}
  bind:this={root}
  role="application"
  aria-label="Video player"
  onmousemove={() => bump()}
  onmouseleave={() => !video?.paused && (show = false)}
>
  {#if player.loading}
    <div class="center muted">Opening stream…</div>
  {/if}
  {#if player.error}
    <div class="center">
      <p>{player.error}</p>
      <button class="btn ghost" onclick={leave}>Go back</button>
    </div>
  {/if}

  <video
    bind:this={video}
    ontimeupdate={onTime}
    onplay={() => { player.paused = false; bump(); }}
    onpause={() => { player.paused = true; show = true; report('progress'); }}
    onended={ended}
    onclick={toggle}
    ondblclick={() => void toggleFs()}
    playsinline
  ></video>

  <div class="hud" class:show>
    <div class="top">
      <button class="btn ghost icon" onclick={leave} aria-label="Back"><Icon name="chevL" /></button>
      <div>
        <strong>{title}</strong>
        <small>{methodLabel}</small>
      </div>
    </div>

    {#if skipIntroUntil > 0}
      <button class="skip" onclick={() => seekTo(skipIntroUntil)}>Skip intro</button>
    {:else if skipCreditsUntil > 0}
      <button class="skip" onclick={() => seekTo(skipCreditsUntil)}>Skip credits</button>
    {/if}

    {#if countdown > 0 && nextEpisode}
      <button class="nextup" onclick={() => router.go(`/play/${nextEpisode.Id}`)}>
        Next episode in {countdown}s · {nextEpisode.Name}
      </button>
    {/if}

    <div class="bottom">
      <div
        class="bar"
        role="slider"
        tabindex="0"
        aria-valuemin={0}
        aria-valuemax={player.duration || 0}
        aria-valuenow={player.currentTime}
        onclick={onBar}
        onkeydown={(e) => {
          if (e.key === 'ArrowLeft') seekTo(player.currentTime - 10);
          if (e.key === 'ArrowRight') seekTo(player.currentTime + 10);
        }}
      >
        <i style="width: {player.duration ? (player.currentTime / player.duration) * 100 : 0}%"></i>
        {#each chapters as ch}
          <em style="left: {player.duration ? (ch.StartPositionTicks / 10_000_000 / player.duration) * 100 : 0}%"></em>
        {/each}
      </div>
      <div class="row">
        <button class="btn icon ghost" onclick={toggle} aria-label="Play/Pause">
          <Icon name={player.paused ? 'play' : 'pause'} />
        </button>
        <button class="btn icon ghost" onclick={() => seekTo(player.currentTime - 10)} aria-label="Back 10s"><Icon name="skipBack" /></button>
        <button class="btn icon ghost" onclick={() => seekTo(player.currentTime + 10)} aria-label="Forward 10s"><Icon name="skipFwd" /></button>
        <span class="clock">{formatClock(player.currentTime)} / {formatClock(player.duration)}</span>
        <span class="grow"></span>
        <button
          class="btn icon ghost"
          onclick={() => {
            player.muted = !player.muted;
            if (video) video.muted = player.muted;
          }}
          aria-label="Mute"
        >
          <Icon name={player.muted || player.volume === 0 ? 'mute' : 'vol'} />
        </button>
        <input
          class="vol"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={player.volume}
          oninput={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            player.setVolume(v);
            if (video) video.volume = v;
          }}
        />
        <button class="btn icon ghost" onclick={() => (settingsOpen = !settingsOpen)} aria-label="Tracks">
          <Icon name="settings" />
        </button>
        <button class="btn icon ghost" onclick={() => void toggleFs()} aria-label="Fullscreen">
          <Icon name={fullscreen ? 'exitFull' : 'full'} />
        </button>
      </div>
    </div>

    {#if settingsOpen}
      <div class="sheet">
        <div class="tabs">
          <button class:on={settingsTab === 'subs'} onclick={() => (settingsTab = 'subs')}>Subtitles</button>
          <button class:on={settingsTab === 'audio'} onclick={() => (settingsTab = 'audio')}>Audio</button>
          <button class:on={settingsTab === 'quality'} onclick={() => (settingsTab = 'quality')}>Quality</button>
          <button class:on={settingsTab === 'speed'} onclick={() => (settingsTab = 'speed')}>Speed</button>
        </div>
        {#if settingsTab === 'subs'}
          <button class="opt" class:on={player.video?.subtitleIndex === -1} onclick={() => setSub(-1)}>Off</button>
          {#each subTracks as s}
            <button class="opt" class:on={player.video?.subtitleIndex === s.Index} onclick={() => setSub(s.Index)}>
              {s.DisplayTitle || s.Language || `Track ${s.Index}`}
            </button>
          {/each}
        {:else if settingsTab === 'audio'}
          {#each audioTracks as s}
            <button class="opt" class:on={player.video?.audioIndex === s.Index} onclick={() => setAudio(s)}>
              {s.DisplayTitle || s.Language || `Track ${s.Index}`}
            </button>
          {/each}
        {:else if settingsTab === 'quality'}
          {#each VIDEO_BITRATES as q}
            <button
              class="opt"
              class:on={matchesQuality(player.video?.maxBitrate, q.value)}
              onclick={() => setQuality(q.value)}
            >
              {q.label}{q.hint ? ` · ${q.hint}` : ''}
            </button>
          {/each}
        {:else}
          {#each PLAYBACK_RATES as rate}
            <button class="opt" class:on={player.playbackRate === rate} onclick={() => setSpeed(rate)}>{rate}×</button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .stage {
    position: relative;
    width: 100vw;
    height: 100dvh;
    background: #000;
    overflow: hidden;
    cursor: none;
  }
  .stage:not(.idle) { cursor: default; }
  video { width: 100%; height: 100%; object-fit: contain; background: #000; }
  .center {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    text-align: center;
    gap: 12px;
  }
  .hud {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, transparent 28%, transparent 68%, rgba(0, 0, 0, 0.5) 100%);
    opacity: 0;
    transition: opacity 0.25s;
    pointer-events: none;
  }
  .hud.show { opacity: 1; pointer-events: auto; }
  .top, .bottom { padding: 22px 24px; }
  .top { display: flex; gap: 12px; align-items: center; }
  .top small { display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  .row { display: flex; align-items: center; gap: 8px; }
  .clock { font-variant-numeric: tabular-nums; color: #d5dee4; font-size: 13px; }
  .grow { flex: 1; }
  .vol { width: 90px; accent-color: var(--accent); }
  .bar {
    position: relative;
    height: 5px;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 99px;
    cursor: pointer;
  }
  .bar i {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--accent);
    border-radius: inherit;
  }
  .bar em {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 9px;
    background: rgba(255, 255, 255, 0.55);
  }
  .skip, .nextup {
    position: absolute;
    right: 28px;
    bottom: 118px;
    height: 40px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgba(10, 14, 20, 0.75);
    color: var(--text);
    backdrop-filter: blur(10px);
  }
  .sheet {
    position: absolute;
    right: 24px;
    bottom: 96px;
    width: 280px;
    max-height: 50vh;
    overflow: auto;
    padding: 10px;
    border-radius: 14px;
    background: rgba(14, 18, 24, 0.92);
    border: 1px solid var(--line);
    backdrop-filter: blur(16px);
  }
  .tabs { display: flex; gap: 4px; margin-bottom: 8px; }
  .tabs button, .opt {
    border: 0;
    background: none;
    color: var(--muted);
    padding: 8px;
    border-radius: 8px;
    text-align: left;
  }
  .tabs button { flex: 1; font-size: 12px; }
  .opt { display: block; width: 100%; }
  .tabs button.on, .opt.on, .opt:hover, .tabs button:hover { background: var(--accent-dim); color: var(--text); }

  :global(video::cue) {
    font-family: Outfit, sans-serif;
    font-size: calc(22px * var(--sub-scale, 1));
    line-height: 1.35;
    text-shadow: 0 1px 2px #000, 0 0 8px #000;
    background: rgba(0, 0, 0, 0.35);
  }
</style>

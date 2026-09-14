<script lang="ts">
  import {
    AUDIO_BITRATES,
    LANGUAGES,
    MAX_RESOLUTIONS,
    MUSIC_BITRATES,
    PLAYBACK_RATES,
    VIDEO_BITRATES,
  } from '../lib/playback';
  import {
    APP,
    type AudioChannelPref,
    type AudioContainerPref,
    type PlayMethodPref,
    type SubtitleMode,
    type VideoCodecPref,
    type VideoContainerPref,
  } from '../lib/types';
  import { router } from '../lib/router.svelte';
  import { canDownloadSelf, SELF_FILENAME, selfUrl } from '../lib/selfDownload';
  import { session } from '../lib/session.svelte';

  const accents = ['#3ee0c5', '#79c8ff', '#f0a36b', '#e07ad6', '#f5c16c', '#8b9dff'];

  async function signOut() {
    await session.logout();
    router.go('/login');
  }

  function num(e: Event): number {
    return Number((e.target as HTMLSelectElement | HTMLInputElement).value);
  }

  function str(e: Event): string {
    return (e.target as HTMLSelectElement | HTMLInputElement).value;
  }

  function check(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }
</script>

<div class="page narrow">
  <p class="eyebrow">Account</p>
  <h1 class="display">Settings</h1>

  <section>
    <h2>Server</h2>
    <div class="card">
      <div>
        <strong>{session.serverName || 'Jellyfin'}</strong>
        <p class="muted">{session.serverUrl}</p>
        <p class="muted">Signed in as {session.user?.Name}</p>
      </div>
      <button class="btn ghost" onclick={signOut}>Sign out</button>
    </div>
  </section>

  <section>
    <h2>Appearance</h2>
    <p class="muted">Accent color</p>
    <div class="swatches">
      {#each accents as c}
        <button
          class="sw"
          class:on={session.settings.accent === c}
          style="background:{c}"
          onclick={() => session.updateSettings({ accent: c })}
          aria-label="Accent {c}"
        ></button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Video streaming</h2>
    <p class="lede">Caps sent to Jellyfin. Auto prefers direct play; lower bitrates force a transcode.</p>
    <label class="row">
      <span>
        Max bitrate
        <small>Peak streaming bandwidth</small>
      </span>
      <select
        value={String(session.settings.maxStreamingBitrate)}
        onchange={(e) => session.updateSettings({ maxStreamingBitrate: num(e) })}
      >
        {#each VIDEO_BITRATES as q}
          <option value={String(q.value)}>{q.label}{q.hint ? ` · ${q.hint}` : ''}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span>
        Max resolution
        <small>Taller sources are transcoded down</small>
      </span>
      <select
        value={String(session.settings.maxResolution)}
        onchange={(e) => session.updateSettings({ maxResolution: num(e) })}
      >
        {#each MAX_RESOLUTIONS as r}
          <option value={String(r.value)}>{r.label}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span>
        Play method
        <small>Direct play skips a server transcode</small>
      </span>
      <select
        value={session.settings.playMethod}
        onchange={(e) => session.updateSettings({ playMethod: str(e) as PlayMethodPref })}
      >
        <option value="auto">Auto (prefer direct play)</option>
        <option value="direct">Direct play / stream only</option>
        <option value="transcode">Always transcode</option>
      </select>
    </label>
    <label class="row">
      <span>
        Transcode codec
        <small>Used when the file cannot direct play</small>
      </span>
      <select
        value={session.settings.videoCodec}
        onchange={(e) => session.updateSettings({ videoCodec: str(e) as VideoCodecPref })}
      >
        <option value="auto">Auto (H.264)</option>
        <option value="h264">H.264</option>
        <option value="hevc">HEVC / H.265</option>
        <option value="av1">AV1</option>
      </select>
    </label>
    <label class="row">
      <span>
        Transcode container
        <small>HLS segment format when video is converted</small>
      </span>
      <select
        value={session.settings.videoContainer}
        onchange={(e) => session.updateSettings({ videoContainer: str(e) as VideoContainerPref })}
      >
        <option value="auto">Auto (fMP4)</option>
        <option value="mp4">fMP4 (HLS)</option>
        <option value="ts">MPEG-TS (HLS, H.264 only)</option>
      </select>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.enableHevc}
        onchange={(e) => session.updateSettings({ enableHevc: check(e) })}
      />
      Allow HEVC direct play
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.enableAv1}
        onchange={(e) => session.updateSettings({ enableAv1: check(e) })}
      />
      Allow AV1 direct play
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.enableHdr}
        onchange={(e) => session.updateSettings({ enableHdr: check(e) })}
      />
      Allow HDR / Dolby Vision
    </label>
  </section>

  <section>
    <h2>Audio</h2>
    <label class="row">
      <span>
        Transcode bitrate
        <small>When the audio track is remuxed or transcoded</small>
      </span>
      <select
        value={String(session.settings.audioBitrate)}
        onchange={(e) => session.updateSettings({ audioBitrate: num(e) })}
      >
        {#each AUDIO_BITRATES as q}
          <option value={String(q.value)}>{q.label}{q.hint ? ` · ${q.hint}` : ''}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span>
        Music bitrate
        <small>Streaming cap for the audio dock</small>
      </span>
      <select
        value={String(session.settings.musicBitrate)}
        onchange={(e) => session.updateSettings({ musicBitrate: num(e) })}
      >
        {#each MUSIC_BITRATES as q}
          <option value={String(q.value)}>{q.label}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span>
        Music transcode format
        <small>Used only when a track can't play as-is</small>
      </span>
      <select
        value={session.settings.audioContainer}
        onchange={(e) => session.updateSettings({ audioContainer: str(e) as AudioContainerPref })}
      >
        <option value="auto">Auto (MP3)</option>
        <option value="mp3">MP3</option>
        <option value="aac">AAC</option>
        <option value="opus">Opus</option>
        <option value="flac">FLAC (lossless)</option>
      </select>
    </label>
    <label class="row">
      <span>
        Channels
        <small>Stereo downmix saves bandwidth</small>
      </span>
      <select
        value={session.settings.audioChannels}
        onchange={(e) => session.updateSettings({ audioChannels: str(e) as AudioChannelPref })}
      >
        <option value="auto">Auto</option>
        <option value="stereo">Stereo</option>
        <option value="surround">Surround (up to 7.1)</option>
      </select>
    </label>
    <label class="row">
      <span>Preferred language</span>
      <select
        value={session.settings.audioLanguage}
        onchange={(e) => session.updateSettings({ audioLanguage: str(e) })}
      >
        {#each LANGUAGES as l}
          <option value={l.value}>{l.label}</option>
        {/each}
      </select>
    </label>
  </section>

  <section>
    <h2>Subtitles</h2>
    <label class="row">
      <span>Preferred language</span>
      <select
        value={session.settings.subtitleLanguage}
        onchange={(e) => session.updateSettings({ subtitleLanguage: str(e) })}
      >
        {#each LANGUAGES as l}
          <option value={l.value}>{l.label}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span>Mode</span>
      <select
        value={session.settings.subtitleMode}
        onchange={(e) => session.updateSettings({ subtitleMode: str(e) as SubtitleMode })}
      >
        <option value="default">Default / as stored</option>
        <option value="always">Always on</option>
        <option value="forced">Forced only</option>
        <option value="none">Off</option>
      </select>
    </label>
    <label class="row">
      <span>Size</span>
      <input
        type="range"
        min="0.8"
        max="1.8"
        step="0.1"
        value={session.settings.subtitleSize}
        oninput={(e) => session.updateSettings({ subtitleSize: num(e) })}
      />
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.burnSubtitles}
        onchange={(e) => session.updateSettings({ burnSubtitles: check(e) })}
      />
      Burn in image / PGS subtitles
    </label>
  </section>

  <section>
    <h2>Playback behavior</h2>
    <label class="row">
      <span>Default speed</span>
      <select
        value={String(session.settings.playbackRate)}
        onchange={(e) => session.updateSettings({ playbackRate: num(e) })}
      >
        {#each PLAYBACK_RATES as rate}
          <option value={String(rate)}>{rate}×</option>
        {/each}
      </select>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.autoplayNext}
        onchange={(e) => session.updateSettings({ autoplayNext: check(e) })}
      />
      Autoplay next episode
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.skipIntro}
        onchange={(e) => session.updateSettings({ skipIntro: check(e) })}
      />
      Offer skip intro
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.skipCredits}
        onchange={(e) => session.updateSettings({ skipCredits: check(e) })}
      />
      Offer skip credits
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.rememberPlaybackRate}
        onchange={(e) => session.updateSettings({ rememberPlaybackRate: check(e) })}
      />
      Remember playback speed
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={session.settings.rememberVolume}
        onchange={(e) => session.updateSettings({ rememberVolume: check(e) })}
      />
      Remember volume
    </label>
  </section>

  <section>
    <h2>About</h2>
    <p class="muted">
      {APP.name} {APP.version} is a static Jellyfin client. Build it once, host the single HTML file anywhere,
      and stream from your own server.
    </p>
    {#if canDownloadSelf}
      <div class="card dl">
        <p class="muted">
          Save {APP.name} as a single HTML file that opens straight from your computer. A local copy can also reach
          <code>http://</code> servers on your network.
        </p>
        <a class="btn ghost" href={selfUrl} download={SELF_FILENAME}>Download</a>
      </div>
    {/if}
    <ul>
      <li>Space / K — play / pause</li>
      <li>← → — seek 10 seconds · ↑ ↓ — volume</li>
      <li>F — fullscreen · M — mute · N — next episode · Esc — exit player</li>
    </ul>
  </section>
</div>

<style>
  h1 { margin: 6px 0 28px; font-size: clamp(36px, 5vw, 56px); }
  section { margin-bottom: 36px; }
  h2 { font-family: var(--display); font-size: 22px; margin: 0 0 12px; }
  .lede { color: var(--muted); margin: 0 0 8px; font-size: 14px; }
  .card {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--bg-card);
  }
  .dl { margin: 12px 0; }
  .dl p { margin: 0; }
  .swatches { display: flex; gap: 10px; margin-top: 10px; }
  .sw {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    padding: 0;
  }
  .sw.on { border-color: #fff; }
  .row, .check {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }
  .row span { display: flex; flex-direction: column; gap: 2px; }
  .row small { color: var(--muted); font-size: 12px; font-weight: 400; }
  .check { justify-content: flex-start; }
  select {
    height: 36px;
    min-width: 180px;
    max-width: min(280px, 48vw);
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg-card);
    padding: 0 10px;
  }
  input[type='range'] { accent-color: var(--accent); width: 160px; }
  ul { color: var(--muted); padding-left: 18px; }
</style>

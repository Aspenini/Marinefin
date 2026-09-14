export type VideoCodecPref = 'auto' | 'h264' | 'hevc' | 'av1';
export type PlayMethodPref = 'auto' | 'direct' | 'transcode';
export type AudioChannelPref = 'auto' | 'stereo' | 'surround';
export type AudioContainerPref = 'auto' | 'mp3' | 'aac' | 'opus' | 'flac';
export type VideoContainerPref = 'auto' | 'mp4' | 'ts';
export type SubtitleMode = 'default' | 'always' | 'forced' | 'none';

export interface BitrateOption {
  label: string;
  value: number;
  hint?: string;
}

/** Sent to Jellyfin when the user picks Auto / original. */
export const ORIGINAL_BITRATE = 120_000_000;

export const VIDEO_BITRATES: BitrateOption[] = [
  { label: 'Auto / original', value: 0, hint: 'Direct play when the browser can' },
  { label: '80 Mbps', value: 80_000_000, hint: '4K HDR' },
  { label: '40 Mbps', value: 40_000_000, hint: '4K' },
  { label: '20 Mbps', value: 20_000_000, hint: '1080p high' },
  { label: '15 Mbps', value: 15_000_000, hint: '1080p' },
  { label: '10 Mbps', value: 10_000_000, hint: '1080p medium' },
  { label: '8 Mbps', value: 8_000_000 },
  { label: '6 Mbps', value: 6_000_000, hint: '720p high' },
  { label: '4 Mbps', value: 4_000_000, hint: '720p' },
  { label: '3 Mbps', value: 3_000_000 },
  { label: '2 Mbps', value: 2_000_000, hint: '480p high' },
  { label: '1.5 Mbps', value: 1_500_000 },
  { label: '1 Mbps', value: 1_000_000, hint: '480p' },
  { label: '720 kbps', value: 720_000 },
  { label: '420 kbps', value: 420_000, hint: 'Low bandwidth' },
];

export const AUDIO_BITRATES: BitrateOption[] = [
  { label: 'Auto', value: 0 },
  { label: '640 kbps', value: 640_000, hint: 'Surround' },
  { label: '384 kbps', value: 384_000 },
  { label: '320 kbps', value: 320_000 },
  { label: '256 kbps', value: 256_000 },
  { label: '192 kbps', value: 192_000 },
  { label: '128 kbps', value: 128_000 },
];

export const MUSIC_BITRATES: BitrateOption[] = [
  { label: 'Auto (original, 320 kbps if converted)', value: 0 },
  { label: '320 kbps', value: 320_000 },
  { label: '256 kbps', value: 256_000 },
  { label: '192 kbps', value: 192_000 },
  { label: '128 kbps', value: 128_000 },
  { label: '96 kbps', value: 96_000 },
];

export const MAX_RESOLUTIONS: { label: string; value: number }[] = [
  { label: 'Original', value: 0 },
  { label: '4K (2160p)', value: 2160 },
  { label: '1440p', value: 1440 },
  { label: '1080p', value: 1080 },
  { label: '720p', value: 720 },
  { label: '480p', value: 480 },
];

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const LANGUAGES: { value: string; label: string }[] = [
  { value: '', label: 'Server default' },
  { value: 'eng', label: 'English' },
  { value: 'spa', label: 'Spanish' },
  { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' },
  { value: 'ita', label: 'Italian' },
  { value: 'por', label: 'Portuguese' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'kor', label: 'Korean' },
  { value: 'chi', label: 'Chinese' },
  { value: 'zho', label: 'Chinese (zho)' },
  { value: 'rus', label: 'Russian' },
  { value: 'ara', label: 'Arabic' },
  { value: 'hin', label: 'Hindi' },
  { value: 'nld', label: 'Dutch' },
  { value: 'swe', label: 'Swedish' },
  { value: 'nor', label: 'Norwegian' },
  { value: 'dan', label: 'Danish' },
  { value: 'fin', label: 'Finnish' },
  { value: 'pol', label: 'Polish' },
  { value: 'tur', label: 'Turkish' },
  { value: 'und', label: 'Unknown' },
];

export interface CodecSupport {
  h264: boolean;
  hevc: boolean;
  av1: boolean;
  vp9: boolean;
  aac: boolean;
  ac3: boolean;
  eac3: boolean;
  opus: boolean;
  flac: boolean;
  surround: boolean;
}

export function detectCodecSupport(): CodecSupport {
  const video = document.createElement('video');
  const can = (type: string) => {
    try {
      const result = video.canPlayType(type);
      return result === 'probably' || result === 'maybe';
    } catch {
      return false;
    }
  };
  const mse =
    typeof MediaSource !== 'undefined' && typeof MediaSource.isTypeSupported === 'function'
      ? (type: string) => MediaSource.isTypeSupported(type)
      : () => false;

  const h264 = can('video/mp4; codecs="avc1.42E01E"') || mse('video/mp4; codecs="avc1.42E01E"');
  const hevc =
    can('video/mp4; codecs="hvc1.1.6.L93.B0"') ||
    can('video/mp4; codecs="hev1.1.6.L93.B0"') ||
    mse('video/mp4; codecs="hvc1.1.6.L93.B0"');
  const av1 = can('video/mp4; codecs="av01.0.05M.08"') || mse('video/mp4; codecs="av01.0.05M.08"');
  const vp9 = can('video/webm; codecs="vp9"') || mse('video/webm; codecs="vp9"');
  const aac = can('audio/mp4; codecs="mp4a.40.2"');
  const ac3 = can('audio/mp4; codecs="ac-3"') || can('audio/mp4; codecs="ac3"');
  const eac3 = can('audio/mp4; codecs="ec-3"');
  const opus = can('audio/webm; codecs="opus"') || can('audio/mp4; codecs="opus"');
  const flac = can('audio/mp4; codecs="flac"') || can('audio/flac');

  return { h264, hevc, av1, vp9, aac, ac3, eac3, opus, flac, surround: ac3 || eac3 };
}

export function effectiveBitrate(value: number | undefined | null): number {
  if (!value || value <= 0) return ORIGINAL_BITRATE;
  return value;
}

export function effectiveMusicBitrate(value: number | undefined | null): number {
  if (!value || value <= 0) return 320_000;
  return value;
}

export function isAutoBitrate(value: number | undefined | null): boolean {
  return !value || value >= ORIGINAL_BITRATE;
}

export function bitrateLabel(value: number | undefined | null): string {
  const n = value ?? 0;
  const hit = VIDEO_BITRATES.find((q) => q.value === n || (q.value === 0 && isAutoBitrate(n)));
  if (hit) return hit.label;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} Mbps`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} kbps`;
  return `${n} bps`;
}

export function matchesQuality(current: number | undefined, option: number): boolean {
  const cur = current ?? 0;
  if (option === 0) return isAutoBitrate(cur);
  return cur === option;
}

function langMatch(streamLang: string | undefined, pref: string): boolean {
  if (!pref || !streamLang) return false;
  const a = streamLang.toLowerCase();
  const b = pref.toLowerCase();
  return a === b || a.startsWith(b) || b.startsWith(a);
}

export function pickAudioIndex(
  streams: { Index: number; Type: string; Language?: string; IsDefault?: boolean }[],
  language: string,
): number | undefined {
  const audio = streams.filter((s) => s.Type === 'Audio');
  if (!audio.length) return undefined;
  if (language) {
    const hit = audio.find((s) => langMatch(s.Language, language));
    if (hit) return hit.Index;
  }
  return audio.find((s) => s.IsDefault)?.Index ?? audio[0]?.Index;
}

export function pickSubtitleIndex(
  streams: {
    Index: number;
    Type: string;
    Language?: string;
    IsDefault?: boolean;
    IsForced?: boolean;
  }[],
  language: string,
  mode: SubtitleMode,
): number {
  if (mode === 'none') return -1;
  const subs = streams.filter((s) => s.Type === 'Subtitle');
  if (!subs.length) return -1;
  const byLang = language ? subs.filter((s) => langMatch(s.Language, language)) : subs;
  const pool = byLang.length ? byLang : subs;
  if (mode === 'forced') {
    const forced = pool.find((s) => s.IsForced);
    return forced?.Index ?? -1;
  }
  if (mode === 'always') {
    return pool.find((s) => s.IsDefault)?.Index ?? pool[0]?.Index ?? -1;
  }
  const def = pool.find((s) => s.IsDefault);
  if (def) return def.Index;
  if (language) return pool[0]?.Index ?? -1;
  return -1;
}

export function maxAudioChannels(pref: AudioChannelPref, support: CodecSupport): number {
  if (pref === 'stereo') return 2;
  if (pref === 'surround') return 8;
  return support.surround ? 8 : 6;
}

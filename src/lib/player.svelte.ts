import { api } from './api';
import { profileFromSettings } from './device';
import { isAudioItem, secondsToTicks, ticksToSeconds } from './format';
import {
  effectiveBitrate,
  ORIGINAL_BITRATE,
  pickAudioIndex,
  pickSubtitleIndex,
} from './playback';
import { session } from './session.svelte';
import type { BaseItem, MediaSource } from './types';

export interface PlaySession {
  item: BaseItem;
  source: MediaSource;
  playSessionId: string;
  url: string;
  method: 'DirectPlay' | 'DirectStream' | 'Transcode';
  hls: boolean;
  startSeconds: number;
  audioIndex?: number;
  subtitleIndex: number;
  maxBitrate: number;
  playbackRate: number;
}

class MediaPlayer {
  video = $state<PlaySession | null>(null);
  audioItem = $state<BaseItem | null>(null);
  queue = $state<BaseItem[]>([]);
  queueIndex = $state(0);
  audioUrl = $state('');
  audioError = $state('');
  private audioLoad = 0;
  private audioStream: { method: PlaySession['method']; playSessionId: string; mediaSourceId: string } = {
    method: 'DirectPlay',
    playSessionId: '',
    mediaSourceId: '',
  };
  paused = $state(true);
  currentTime = $state(0);
  duration = $state(0);
  volume = $state(1);
  muted = $state(false);
  loading = $state(false);
  error = $state('');
  queueOpen = $state(false);
  playbackRate = $state(1);

  constructor() {
    this.volume = session.settings.volume;
    this.playbackRate = session.settings.playbackRate;
  }

  async startVideo(
    item: BaseItem,
    opts: {
      startTicks?: number;
      audioIndex?: number;
      subtitleIndex?: number;
      maxBitrate?: number;
      mediaSourceId?: string;
    } = {},
  ) {
    this.stopAudio(false);
    this.loading = true;
    this.error = '';
    try {
      const startTicks = opts.startTicks ?? item.UserData?.PlaybackPositionTicks ?? 0;
      const maxBitrate = effectiveBitrate(opts.maxBitrate ?? session.settings.maxStreamingBitrate);
      const settings = session.settings;
      const streams = item.MediaStreams ?? item.MediaSources?.[0]?.MediaStreams ?? [];
      const audioIndex =
        opts.audioIndex ??
        pickAudioIndex(streams, settings.audioLanguage);
      const subtitleIndex =
        opts.subtitleIndex ??
        pickSubtitleIndex(streams, settings.subtitleLanguage, settings.subtitleMode);
      const method = settings.playMethod;
      const info = await api.playbackInfo(item.Id, {
        maxBitrate,
        audioStreamIndex: audioIndex,
        subtitleStreamIndex: subtitleIndex < 0 ? -1 : subtitleIndex,
        mediaSourceId: opts.mediaSourceId,
        startTimeTicks: startTicks,
        enableDirectPlay: method !== 'transcode',
        enableDirectStream: method !== 'transcode',
        profile: profileFromSettings(settings, maxBitrate),
      });
      const source = info.MediaSources?.[0];
      if (!source) throw new Error('No playable media source.');
      const stream = api.streamUrl(item.Id, source, info.PlaySessionId);
      this.playbackRate = settings.rememberPlaybackRate ? settings.playbackRate : 1;
      this.video = {
        item,
        source,
        playSessionId: info.PlaySessionId,
        url: stream.url,
        method: stream.method,
        hls: stream.hls || source.TranscodingSubProtocol === 'hls',
        startSeconds: ticksToSeconds(startTicks),
        audioIndex: audioIndex ?? source.DefaultAudioStreamIndex,
        subtitleIndex: subtitleIndex ?? source.DefaultSubtitleStreamIndex ?? -1,
        maxBitrate,
        playbackRate: this.playbackRate,
      };
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Playback failed';
      this.video = null;
    } finally {
      this.loading = false;
    }
  }

  async startAudio(items: BaseItem[], index = 0) {
    const list = items.filter((i) => isAudioItem(i));
    if (!list.length) return;
    this.queue = list;
    this.queueIndex = Math.max(0, Math.min(index, list.length - 1));
    await this.loadAudio(list[this.queueIndex]!);
  }

  /** Asks the server how to stream the track (like video), so it picks direct play or a transcode the browser supports. */
  async loadAudio(item: BaseItem) {
    const load = ++this.audioLoad;
    this.audioItem = item;
    this.audioError = '';
    this.audioUrl = '';
    try {
      const settings = session.settings;
      const maxBitrate = settings.musicBitrate > 0 ? settings.musicBitrate : ORIGINAL_BITRATE;
      const info = await api.playbackInfo(item.Id, {
        maxBitrate,
        startTimeTicks: item.UserData?.PlaybackPositionTicks ?? 0,
        enableDirectPlay: settings.playMethod !== 'transcode',
        enableDirectStream: settings.playMethod !== 'transcode',
        profile: profileFromSettings(settings, maxBitrate),
      });
      if (load !== this.audioLoad) return;
      const source = info.MediaSources?.[0];
      if (!source) throw new Error('No playable media source.');
      const stream = api.streamUrl(item.Id, source, info.PlaySessionId, 'Audio');
      this.audioStream = { method: stream.method, playSessionId: info.PlaySessionId, mediaSourceId: source.Id };
      this.audioUrl = stream.url;
      this.paused = false;
      this.reportAudio('start');
    } catch (e) {
      if (load !== this.audioLoad) return;
      this.audioError = e instanceof Error ? e.message : "This track couldn't be played.";
      this.paused = true;
    }
  }

  nextAudio() {
    if (this.queueIndex < this.queue.length - 1) {
      this.queueIndex += 1;
      void this.loadAudio(this.queue[this.queueIndex]!);
    }
  }

  prevAudio() {
    if (this.currentTime > 3) {
      this.currentTime = 0;
      return;
    }
    if (this.queueIndex > 0) {
      this.queueIndex -= 1;
      void this.loadAudio(this.queue[this.queueIndex]!);
    }
  }

  stopAudio(report = true) {
    if (report && this.audioItem) this.reportAudio('stop');
    this.audioItem = null;
    this.audioUrl = '';
    this.audioError = '';
    this.paused = true;
  }

  stopVideo() {
    this.video = null;
    this.error = '';
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (session.settings.rememberVolume) session.updateSettings({ volume: this.volume });
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.video) this.video.playbackRate = rate;
    if (session.settings.rememberPlaybackRate) session.updateSettings({ playbackRate: rate });
  }

  reportAudio(kind: 'start' | 'progress' | 'stop') {
    const item = this.audioItem;
    if (!item) return;
    const body = {
      ItemId: item.Id,
      PositionTicks: secondsToTicks(this.currentTime),
      IsPaused: this.paused,
      PlayMethod: this.audioStream.method,
      PlaySessionId: this.audioStream.playSessionId || undefined,
      MediaSourceId: this.audioStream.mediaSourceId || undefined,
      CanSeek: true,
    };
    const fn = kind === 'start' ? api.playing : kind === 'stop' ? api.stopped : api.progress;
    void fn(body).catch(() => undefined);
  }
}

export const player = new MediaPlayer();

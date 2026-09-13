import {
  detectCodecSupport,
  effectiveBitrate,
  effectiveMusicBitrate,
  maxAudioChannels,
  type AudioChannelPref,
  type PlayMethodPref,
  type VideoCodecPref,
} from './playback';
import { APP, type AppSettings } from './types';

const DEVICE_KEY = 'marinefin.deviceId';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `mf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Browser';
}

export function authHeader(token?: string | null): string {
  const parts = [
    `Client="${APP.name}"`,
    `Device="${getDeviceName()}"`,
    `DeviceId="${getDeviceId()}"`,
    `Version="${APP.version}"`,
  ];
  if (token) parts.push(`Token="${token}"`);
  return `MediaBrowser ${parts.join(', ')}`;
}

export interface DeviceProfileOptions {
  maxBitrate?: number;
  musicBitrate?: number;
  maxHeight?: number;
  videoCodec?: VideoCodecPref;
  playMethod?: PlayMethodPref;
  audioChannels?: AudioChannelPref;
  enableHevc?: boolean;
  enableAv1?: boolean;
  enableHdr?: boolean;
  burnSubtitles?: boolean;
  audioBitrate?: number;
}

export function profileFromSettings(settings: AppSettings, maxBitrate?: number): DeviceProfileOptions {
  return {
    maxBitrate: maxBitrate ?? effectiveBitrate(settings.maxStreamingBitrate),
    musicBitrate: effectiveMusicBitrate(settings.musicBitrate),
    maxHeight: settings.maxResolution,
    videoCodec: settings.videoCodec,
    playMethod: settings.playMethod,
    audioChannels: settings.audioChannels,
    enableHevc: settings.enableHevc,
    enableAv1: settings.enableAv1,
    enableHdr: settings.enableHdr,
    burnSubtitles: settings.burnSubtitles,
    audioBitrate: settings.audioBitrate,
  };
}

function cond(Condition: string, Property: string, Value: string, IsRequired = false) {
  return { Condition, Property, Value, IsRequired };
}

export function browserDeviceProfile(opts: DeviceProfileOptions | number = {}) {
  const options: DeviceProfileOptions = typeof opts === 'number' ? { maxBitrate: opts } : opts;
  const support = detectCodecSupport();
  const maxBitrate = effectiveBitrate(options.maxBitrate);
  const musicBitrate = effectiveMusicBitrate(options.musicBitrate);
  const videoPref = options.videoCodec ?? 'auto';
  const hevcOk = (options.enableHevc ?? true) && support.hevc;
  const av1Ok = (options.enableAv1 ?? true) && support.av1;
  const vp9Ok = support.vp9;

  const directVideo = ['h264'];
  if (hevcOk) directVideo.push('hevc');
  if (av1Ok) directVideo.push('av1');
  if (vp9Ok) directVideo.push('vp9');

  let transcodeVideo = 'h264';
  if (videoPref === 'hevc' && hevcOk) transcodeVideo = 'hevc';
  else if (videoPref === 'av1' && av1Ok) transcodeVideo = 'av1';

  const audioDirect: string[] = ['aac', 'mp3'];
  if (support.opus) audioDirect.push('opus');
  if (support.flac) audioDirect.push('flac', 'alac');
  if (support.ac3) audioDirect.push('ac3');
  if (support.eac3) audioDirect.push('eac3');

  const transcodeAudio = support.opus ? 'aac,mp3,opus' : 'aac,mp3';
  const channels = maxAudioChannels(options.audioChannels ?? 'auto', support);
  const transcodingAudioBitrate = options.audioBitrate && options.audioBitrate > 0 ? options.audioBitrate : undefined;

  const codecProfiles: Record<string, unknown>[] = [
    {
      Type: 'Video',
      Codec: 'h264',
      Conditions: [
        cond('NotEquals', 'IsAnamorphic', 'true'),
        cond('EqualsAny', 'VideoProfile', 'high|main|baseline|constrained baseline|high 10'),
        cond('LessThanEqual', 'VideoLevel', '52'),
      ],
    },
  ];

  if (hevcOk) {
    codecProfiles.push({
      Type: 'Video',
      Codec: 'hevc',
      Conditions: [
        cond('NotEquals', 'IsAnamorphic', 'true'),
        cond('EqualsAny', 'VideoProfile', 'main|main 10'),
        cond('LessThanEqual', 'VideoLevel', '183'),
      ],
    });
  }

  if (options.maxHeight && options.maxHeight > 0) {
    codecProfiles.push({
      Type: 'Video',
      Conditions: [
        cond('LessThanEqual', 'Height', String(options.maxHeight)),
        cond('LessThanEqual', 'Width', String(Math.round(options.maxHeight * (16 / 9)))),
      ],
    });
  }

  if (options.enableHdr === false) {
    codecProfiles.push({
      Type: 'Video',
      Conditions: [cond('EqualsAny', 'VideoRangeType', 'SDR|SDR8')],
    });
  }

  const subtitleProfiles = options.burnSubtitles
    ? [
        { Format: 'vtt', Method: 'Encode' },
        { Format: 'srt', Method: 'Encode' },
        { Format: 'ass', Method: 'Encode' },
        { Format: 'ssa', Method: 'Encode' },
        { Format: 'pgs', Method: 'Encode' },
        { Format: 'pgssub', Method: 'Encode' },
        { Format: 'subrip', Method: 'Encode' },
        { Format: 'dvdsub', Method: 'Encode' },
      ]
    : [
        { Format: 'vtt', Method: 'External' },
        { Format: 'vtt', Method: 'Hls' },
        { Format: 'srt', Method: 'External' },
        { Format: 'ass', Method: 'Encode' },
        { Format: 'ssa', Method: 'Encode' },
        { Format: 'pgs', Method: 'Encode' },
        { Format: 'pgssub', Method: 'Encode' },
        { Format: 'subrip', Method: 'External' },
        { Format: 'dvdsub', Method: 'Encode' },
      ];

  const transcodingProfile: Record<string, unknown> = {
    Container: 'mp4',
    Type: 'Video',
    AudioCodec: transcodeAudio,
    VideoCodec: transcodeVideo,
    Context: 'Streaming',
    Protocol: 'hls',
    MaxAudioChannels: String(Math.min(channels, 6)),
    MinSegments: '1',
    BreakOnNonKeyFrames: true,
    ManifestSubtitles: 'vtt',
  };
  if (transcodingAudioBitrate) transcodingProfile.MaxAudioBitrate = String(transcodingAudioBitrate);

  return {
    MaxStreamingBitrate: maxBitrate,
    MaxStaticBitrate: maxBitrate,
    MusicStreamingTranscodingBitrate: musicBitrate,
    DirectPlayProfiles: [
      {
        Container: 'mp4,m4v,mov,mkv,webm',
        Type: 'Video',
        VideoCodec: directVideo.join(','),
        AudioCodec: audioDirect.join(','),
      },
      {
        Container: 'mp4,m4v,mov',
        Type: 'Video',
        VideoCodec: directVideo.join(','),
        AudioCodec: audioDirect.join(','),
      },
      {
        Container: 'webm',
        Type: 'Video',
        VideoCodec: ['vp8', vp9Ok ? 'vp9' : '', av1Ok ? 'av1' : ''].filter(Boolean).join(','),
        AudioCodec: 'vorbis,opus',
      },
      {
        Container: 'mp3,aac,m4a,flac,opus,wav,ogg,webma,oga,alac',
        Type: 'Audio',
      },
    ],
    TranscodingProfiles: [
      transcodingProfile,
      {
        Container: 'ts',
        Type: 'Video',
        AudioCodec: 'aac,mp3',
        VideoCodec: 'h264',
        Context: 'Streaming',
        Protocol: 'hls',
        MaxAudioChannels: String(Math.min(channels, 6)),
        MinSegments: '1',
        BreakOnNonKeyFrames: true,
      },
      {
        Container: 'mp3',
        Type: 'Audio',
        AudioCodec: 'mp3',
        Context: 'Streaming',
        Protocol: 'http',
        MaxAudioChannels: '2',
      },
    ],
    ContainerProfiles: [],
    CodecProfiles: codecProfiles,
    SubtitleProfiles: subtitleProfiles,
    ResponseProfiles: [{ Type: 'Video', Container: 'm4v', MimeType: 'video/mp4' }],
  };
}

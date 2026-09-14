export interface User {
  Id: string;
  Name: string;
  HasPassword?: boolean;
  Policy?: {
    IsAdministrator?: boolean;
    EnableLiveTvAccess?: boolean;
  };
  Configuration?: {
    PlayDefaultAudioTrack?: boolean;
    SubtitleLanguagePreference?: string;
    AudioLanguagePreference?: string;
  };
  PrimaryImageTag?: string;
}

export interface UserData {
  PlaybackPositionTicks?: number;
  PlayedPercentage?: number;
  PlayCount?: number;
  IsFavorite?: boolean;
  Played?: boolean;
  LastPlayedDate?: string;
  UnplayedItemCount?: number;
  Key?: string;
}

export interface NameId {
  Name: string;
  Id: string;
}

export interface Person {
  Name: string;
  Id: string;
  Role?: string;
  Type?: string;
  PrimaryImageTag?: string;
}

export interface Chapter {
  StartPositionTicks: number;
  Name?: string;
  ImageTag?: string;
  ImageDateModified?: string;
  MarkerType?: string;
}

export interface MediaStream {
  Index: number;
  Type: 'Video' | 'Audio' | 'Subtitle' | 'EmbeddedImage' | 'Data' | 'Lyric';
  Codec?: string;
  Language?: string;
  DisplayTitle?: string;
  DisplayLanguage?: string;
  Title?: string;
  IsDefault?: boolean;
  IsForced?: boolean;
  IsExternal?: boolean;
  IsTextSubtitleStream?: boolean;
  DeliveryUrl?: string;
  DeliveryMethod?: string;
  BitRate?: number;
  Channels?: number;
  SampleRate?: number;
  Width?: number;
  Height?: number;
  AspectRatio?: string;
  AverageFrameRate?: number;
  ChannelLayout?: string;
  Profile?: string;
  VideoRange?: string;
  VideoRangeType?: string;
  IsAnamorphic?: boolean;
}

export interface MediaSource {
  Id: string;
  Name?: string;
  Path?: string;
  Container?: string;
  Size?: number;
  Bitrate?: number;
  RunTimeTicks?: number;
  SupportsDirectPlay?: boolean;
  SupportsDirectStream?: boolean;
  SupportsTranscoding?: boolean;
  TranscodingUrl?: string;
  TranscodingSubProtocol?: string;
  TranscodingContainer?: string;
  DefaultAudioStreamIndex?: number;
  DefaultSubtitleStreamIndex?: number;
  MediaStreams?: MediaStream[];
}

export interface BaseItem {
  Id: string;
  Name: string;
  OriginalTitle?: string;
  SortName?: string;
  Type: string;
  MediaType?: string;
  CollectionType?: string;
  Overview?: string;
  Taglines?: string[];
  ProductionYear?: number;
  OfficialRating?: string;
  CommunityRating?: number;
  CriticRating?: number;
  RunTimeTicks?: number;
  PremiereDate?: string;
  Status?: string;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  ParentBackdropItemId?: string;
  ParentBackdropImageTags?: string[];
  SeriesPrimaryImageTag?: string;
  ParentLogoItemId?: string;
  ParentLogoImageTag?: string;
  ParentThumbItemId?: string;
  ParentThumbImageTag?: string;
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ChildCount?: number;
  RecursiveItemCount?: number;
  UserData?: UserData;
  MediaSources?: MediaSource[];
  MediaStreams?: MediaStream[];
  People?: Person[];
  GenreItems?: NameId[];
  Genres?: string[];
  Studios?: NameId[];
  ProviderIds?: Record<string, string>;
  Chapters?: Chapter[];
  AlbumArtist?: string;
  AlbumArtists?: NameId[];
  ArtistItems?: NameId[];
  Artists?: string[];
  Album?: string;
  AlbumId?: string;
  ParentId?: string;
  CanDownload?: boolean;
  IsFolder?: boolean;
  Container?: string;
  Width?: number;
  Height?: number;
  ImageBlurHashes?: Record<string, Record<string, string>>;
  RemoteTrailers?: { Url: string; Name?: string }[];
  LocalTrailerCount?: number;
  SpecialFeatureCount?: number;
  LocationType?: string;
  ChannelName?: string;
  ChannelId?: string;
  StartDate?: string;
  EndDate?: string;
  CameraMake?: string;
  CameraModel?: string;
  LockedFields?: string[];
  DateCreated?: string;
  VideoRange?: string;
  VideoRangeType?: string;
}

export interface QueryResult<T = BaseItem> {
  Items: T[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface PlaybackInfo {
  MediaSources: MediaSource[];
  PlaySessionId: string;
}

export interface PublicSystemInfo {
  ServerName: string;
  Version: string;
  ProductName?: string;
  Id?: string;
  StartupWizardCompleted?: boolean;
}

export interface AuthResult {
  User: User;
  AccessToken: string;
  SessionInfo?: { Id?: string };
}

export interface RecommendationDto {
  BaselineItemName?: string;
  CategoryId?: string;
  RecommendationType?: string;
  Items?: BaseItem[];
}

export interface SearchHint {
  ItemId: string;
  Id?: string;
  Name: string;
  Type: string;
  MediaType?: string;
  ProductionYear?: number;
  PrimaryImageTag?: string;
  ThumbImageTag?: string;
  ThumbImageItemId?: string;
  BackdropImageTag?: string;
  BackdropImageItemId?: string;
  Series?: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artists?: string[];
  RunTimeTicks?: number;
  ChannelId?: string;
  ChannelName?: string;
  MatchedTerm?: string;
}

export interface LiveTvChannel extends BaseItem {
  Number?: string;
  ChannelType?: string;
  CurrentProgram?: BaseItem;
}

export interface QuickConnectResult {
  Authenticated: boolean;
  Secret: string;
  Code: string;
}

export interface SessionCaps {
  PlayDefaultAudioTrack?: boolean;
}

export type CollectionType =
  | 'movies'
  | 'tvshows'
  | 'music'
  | 'musicvideos'
  | 'homevideos'
  | 'boxsets'
  | 'books'
  | 'mixed'
  | 'livetv'
  | 'playlists'
  | 'photos';

export type VideoCodecPref = 'auto' | 'h264' | 'hevc' | 'av1';
export type PlayMethodPref = 'auto' | 'direct' | 'transcode';
export type AudioChannelPref = 'auto' | 'stereo' | 'surround';
export type AudioContainerPref = 'auto' | 'mp3' | 'aac' | 'opus' | 'flac';
export type VideoContainerPref = 'auto' | 'mp4' | 'ts';
export type SubtitleMode = 'default' | 'always' | 'forced' | 'none';

export interface AppSettings {
  accent: string;
  autoplayNext: boolean;
  skipIntro: boolean;
  skipCredits: boolean;
  rememberVolume: boolean;
  volume: number;
  subtitleSize: number;
  /** 0 = auto / original. Bits per second. */
  maxStreamingBitrate: number;
  /** 0 = original. Max encoded height in pixels. */
  maxResolution: number;
  videoCodec: VideoCodecPref;
  /** HLS segment container used when transcoding video. */
  videoContainer: VideoContainerPref;
  playMethod: PlayMethodPref;
  enableHevc: boolean;
  enableAv1: boolean;
  enableHdr: boolean;
  /** 0 = auto. Used when transcoding audio. */
  audioBitrate: number;
  /** 0 = original (transcodes at 320 kbps). Music streaming cap. */
  musicBitrate: number;
  /** Format music is converted to when it can't direct play. */
  audioContainer: AudioContainerPref;
  audioChannels: AudioChannelPref;
  audioLanguage: string;
  subtitleLanguage: string;
  subtitleMode: SubtitleMode;
  burnSubtitles: boolean;
  playbackRate: number;
  rememberPlaybackRate: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  accent: '#3ee0c5',
  autoplayNext: true,
  skipIntro: true,
  skipCredits: true,
  rememberVolume: true,
  volume: 1,
  subtitleSize: 1,
  maxStreamingBitrate: 0,
  maxResolution: 0,
  videoCodec: 'auto',
  videoContainer: 'auto',
  playMethod: 'auto',
  enableHevc: true,
  enableAv1: true,
  enableHdr: true,
  audioBitrate: 0,
  musicBitrate: 0,
  audioContainer: 'auto',
  audioChannels: 'auto',
  audioLanguage: '',
  subtitleLanguage: '',
  subtitleMode: 'default',
  burnSubtitles: false,
  playbackRate: 1,
  rememberPlaybackRate: true,
};

export const APP = {
  name: 'Marinefin',
  version: '1.1.0',
} as const;

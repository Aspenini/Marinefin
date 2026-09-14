import { authHeader, browserDeviceProfile, type DeviceProfileOptions } from './device';
import { maxAudioChannels, detectCodecSupport } from './playback';
import { normalizeServer } from './format';
import type {
  AuthResult,
  BaseItem,
  LiveTvChannel,
  PlaybackInfo,
  PublicSystemInfo,
  QueryResult,
  QuickConnectResult,
  RecommendationDto,
  SearchHint,
  User,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface ApiContext {
  serverUrl: string;
  token: string | null;
  userId: string | null;
}

let ctx: ApiContext = { serverUrl: '', token: null, userId: null };

export function setApiContext(next: Partial<ApiContext>) {
  ctx = { ...ctx, ...next };
  if (ctx.serverUrl) ctx.serverUrl = normalizeServer(ctx.serverUrl);
}

export function getApiContext(): ApiContext {
  return ctx;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

/** Token for URLs the browser loads itself (media, images, subtitles). `ApiKey` is current; `api_key` keeps older servers working. */
function tokenParams() {
  const token = ctx.token ?? undefined;
  return { ApiKey: token, api_key: token };
}

const CONNECT_TIMEOUT_MS = 5000;

function networkErrorMessage(err: unknown, server: string): string {
  if ((err as Error)?.name === 'TimeoutError') return 'The server took too long to respond.';
  if (location.protocol === 'https:' && /^http:\/\//i.test(server)) {
    return 'This page is served over HTTPS, so the browser blocks http:// servers. Use an https:// address, or download Marinefin below and open it locally.';
  }
  return 'Could not reach the server. Check the address, and that the server allows requests from this site (CORS).';
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  server = ctx.serverUrl,
  token = ctx.token,
): Promise<T> {
  if (!server) throw new ApiError('No server configured', 0);
  const headers = new Headers(init.headers);
  if (!headers.has('Authorization')) headers.set('Authorization', authHeader(token));
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${server}${path}`, { ...init, headers });
  } catch (err) {
    throw new ApiError(networkErrorMessage(err, server), 0);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { Message?: string };
      if (body.Message) message = body.Message;
    } catch {
      /* ignore */
    }
    if (res.status === 401) message = 'Unauthorized. Check your credentials or sign in again.';
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('The server sent a response Marinefin could not read.', res.status);
  }
}

export const api = {
  async publicInfo(server: string) {
    const notJellyfin = (status: number) =>
      new ApiError("That address responded, but it doesn't look like a Jellyfin server.", status);
    let info: PublicSystemInfo | undefined;
    try {
      info = await request<PublicSystemInfo>(
        `/System/Info/Public`,
        { signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS) },
        normalizeServer(server),
        null,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) throw notJellyfin(err.status);
      throw err;
    }
    if (!info?.Id || !info.Version) throw notJellyfin(200);
    return info;
  },

  publicUsers(server: string) {
    return request<User[]>(`/Users/Public`, {}, normalizeServer(server), null);
  },

  authenticate(server: string, Username: string, Pw: string) {
    return request<AuthResult>(
      `/Users/AuthenticateByName`,
      { method: 'POST', body: JSON.stringify({ Username, Pw }) },
      normalizeServer(server),
      null,
    );
  },

  initiateQuickConnect(server: string) {
    return request<QuickConnectResult>(
      `/QuickConnect/Initiate`,
      { method: 'POST' },
      normalizeServer(server),
      null,
    );
  },

  pollQuickConnect(server: string, secret: string) {
    return request<QuickConnectResult>(
      `/QuickConnect/Connect${qs({ Secret: secret })}`,
      {},
      normalizeServer(server),
      null,
    );
  },

  authenticateQuickConnect(server: string, secret: string) {
    return request<AuthResult>(
      `/Users/AuthenticateWithQuickConnect`,
      { method: 'POST', body: JSON.stringify({ Secret: secret }) },
      normalizeServer(server),
      null,
    );
  },

  me() {
    return request<User>(`/Users/Me`);
  },

  views() {
    return request<QueryResult>(`/Users/${ctx.userId}/Views`);
  },

  item(id: string) {
    return request<BaseItem>(`/Users/${ctx.userId}/Items/${id}`);
  },

  items(params: Record<string, string | number | boolean | undefined | null> = {}) {
    return request<QueryResult>(`/Users/${ctx.userId}/Items${qs({ Fields: defaultFields(), ...params })}`);
  },

  resume(limit = 16) {
    return request<QueryResult>(
      `/Users/${ctx.userId}/Items/Resume${qs({ Limit: limit, Fields: defaultFields(), MediaTypes: 'Video' })}`,
    );
  },

  nextUp(limit = 16) {
    return request<QueryResult>(
      `/Shows/NextUp${qs({ UserId: ctx.userId, Limit: limit, Fields: defaultFields(), EnableResumable: false })}`,
    );
  },

  latest(includeItemTypes?: string, limit = 16, parentId?: string) {
    return request<BaseItem[]>(
      `/Users/${ctx.userId}/Items/Latest${qs({
        Limit: limit,
        Fields: defaultFields(),
        IncludeItemTypes: includeItemTypes,
        ParentId: parentId,
      })}`,
    );
  },

  recommendations() {
    return request<RecommendationDto[]>(
      `/Movies/Recommendations${qs({ userId: ctx.userId, categoryLimit: 6, itemLimit: 16, fields: defaultFields() })}`,
    );
  },

  upcoming(limit = 16) {
    return request<QueryResult>(`/Shows/Upcoming${qs({ UserId: ctx.userId, Limit: limit, Fields: defaultFields() })}`);
  },

  seasons(seriesId: string) {
    return request<QueryResult>(
      `/Shows/${seriesId}/Seasons${qs({ UserId: ctx.userId, Fields: defaultFields() })}`,
    );
  },

  episodes(seriesId: string, extras: Record<string, string | number | boolean | undefined> = {}) {
    return request<QueryResult>(
      `/Shows/${seriesId}/Episodes${qs({ UserId: ctx.userId, Fields: defaultFields(), ...extras })}`,
    );
  },

  similar(id: string, limit = 18) {
    return request<QueryResult>(
      `/Items/${id}/Similar${qs({ UserId: ctx.userId, Limit: limit, Fields: defaultFields() })}`,
    );
  },

  localTrailers(id: string) {
    return request<BaseItem[]>(`/Users/${ctx.userId}/Items/${id}/LocalTrailers`);
  },

  specialFeatures(id: string) {
    return request<BaseItem[]>(`/Users/${ctx.userId}/Items/${id}/SpecialFeatures`);
  },

  genres(parentId?: string) {
    return request<QueryResult>(`/Genres${qs({ UserId: ctx.userId, ParentId: parentId, SortBy: 'SortName' })}`);
  },

  artists(parentId?: string) {
    return request<QueryResult>(
      `/Artists/AlbumArtists${qs({ UserId: ctx.userId, ParentId: parentId, Fields: defaultFields(), Recursive: true })}`,
    );
  },

  search(term: string, limit = 24) {
    return request<{ SearchHints: SearchHint[]; TotalRecordCount: number }>(
      `/Search/Hints${qs({ searchTerm: term, userId: ctx.userId, limit, includePeople: true, includeMedia: true, includeGenres: true, includeStudios: false, includeArtists: true })}`,
    );
  },

  favorite(id: string, on: boolean) {
    return request<User>(`/Users/${ctx.userId}/FavoriteItems/${id}`, { method: on ? 'POST' : 'DELETE' });
  },

  played(id: string, on: boolean) {
    return request<User>(`/Users/${ctx.userId}/PlayedItems/${id}`, { method: on ? 'POST' : 'DELETE' });
  },

  playbackInfo(
    id: string,
    opts: {
      maxBitrate?: number;
      audioStreamIndex?: number;
      subtitleStreamIndex?: number;
      mediaSourceId?: string;
      startTimeTicks?: number;
      enableDirectPlay?: boolean;
      enableDirectStream?: boolean;
      maxAudioChannels?: number;
      profile?: DeviceProfileOptions;
    } = {},
  ) {
    const profile = opts.profile ?? { maxBitrate: opts.maxBitrate };
    const max = profile.maxBitrate ?? opts.maxBitrate ?? 120_000_000;
    const channels = opts.maxAudioChannels ?? maxAudioChannels(profile.audioChannels ?? 'auto', detectCodecSupport());
    return request<PlaybackInfo>(
      `/Items/${id}/PlaybackInfo${qs({ UserId: ctx.userId, StartTimeTicks: opts.startTimeTicks ?? 0 })}`,
      {
        method: 'POST',
        body: JSON.stringify({
          UserId: ctx.userId,
          AutoOpenLiveStream: true,
          IsPlayback: true,
          MaxStreamingBitrate: max,
          StartTimeTicks: opts.startTimeTicks ?? 0,
          AudioStreamIndex: opts.audioStreamIndex,
          SubtitleStreamIndex: opts.subtitleStreamIndex,
          MediaSourceId: opts.mediaSourceId,
          EnableDirectPlay: opts.enableDirectPlay ?? true,
          EnableDirectStream: opts.enableDirectStream ?? true,
          AllowVideoStreamCopy: opts.enableDirectPlay ?? true,
          AllowAudioStreamCopy: opts.enableDirectPlay ?? true,
          MaxAudioChannels: channels,
          DeviceProfile: browserDeviceProfile(profile),
        }),
      },
    );
  },

  playing(body: Record<string, unknown>) {
    return request<void>(`/Sessions/Playing`, { method: 'POST', body: JSON.stringify(body) });
  },

  progress(body: Record<string, unknown>) {
    return request<void>(`/Sessions/Playing/Progress`, { method: 'POST', body: JSON.stringify(body) });
  },

  stopped(body: Record<string, unknown>) {
    return request<void>(`/Sessions/Playing/Stopped`, { method: 'POST', body: JSON.stringify(body) });
  },

  liveChannels() {
    return request<QueryResult<LiveTvChannel>>(
      `/LiveTv/Channels${qs({ UserId: ctx.userId, AddCurrentProgram: true, EnableFavoriteSorting: true })}`,
    );
  },

  livePrograms(channelIds?: string) {
    return request<QueryResult>(
      `/LiveTv/Programs${qs({ UserId: ctx.userId, ChannelIds: channelIds, IsAiring: true, Fields: 'Overview,PrimaryImageAspectRatio' })}`,
    );
  },

  logout() {
    return request<void>(`/Sessions/Logout`, { method: 'POST' }).catch(() => undefined);
  },

  imageUrl(
    item: Pick<BaseItem, 'Id' | 'ImageTags' | 'BackdropImageTags' | 'SeriesId' | 'SeriesPrimaryImageTag' | 'ParentBackdropItemId' | 'ParentBackdropImageTags' | 'AlbumId' | 'ParentThumbItemId' | 'ParentThumbImageTag'> | null | undefined,
    type: 'Primary' | 'Backdrop' | 'Logo' | 'Thumb' | 'Banner' | 'Art' = 'Primary',
    opts: { w?: number; h?: number; q?: number } = {},
  ): string {
    if (!item?.Id || !ctx.serverUrl) return '';
    let id = item.Id;
    let tag: string | undefined;
    if (type === 'Backdrop') {
      if (item.BackdropImageTags?.[0]) tag = item.BackdropImageTags[0];
      else if (item.ParentBackdropItemId && item.ParentBackdropImageTags?.[0]) {
        id = item.ParentBackdropItemId;
        tag = item.ParentBackdropImageTags[0];
      }
    } else if (type === 'Primary') {
      tag = item.ImageTags?.Primary;
      if (!tag && item.SeriesId && item.SeriesPrimaryImageTag) {
        id = item.SeriesId;
        tag = item.SeriesPrimaryImageTag;
      } else if (!tag && item.AlbumId) {
        id = item.AlbumId;
      }
    } else if (type === 'Thumb') {
      tag = item.ImageTags?.Thumb;
      if (!tag && item.ParentThumbItemId && item.ParentThumbImageTag) {
        id = item.ParentThumbItemId;
        tag = item.ParentThumbImageTag;
      }
    } else if (type === 'Logo') {
      tag = item.ImageTags?.Logo;
    } else {
      tag = item.ImageTags?.[type];
    }
    const params: Record<string, string | number | undefined> = {
      quality: opts.q ?? 90,
      tag,
      ...tokenParams(),
    };
    if (opts.w) params.fillWidth = opts.w;
    if (opts.h) params.fillHeight = opts.h;
    if (!opts.w && !opts.h) params.fillWidth = type === 'Backdrop' ? 1600 : 400;
    return `${ctx.serverUrl}/Items/${id}/Images/${type}${qs(params)}`;
  },

  personImage(person: { Id: string; PrimaryImageTag?: string }, w = 200): string {
    if (!ctx.serverUrl || !person.Id) return '';
    return `${ctx.serverUrl}/Items/${person.Id}/Images/Primary${qs({ fillWidth: w, quality: 85, tag: person.PrimaryImageTag, ...tokenParams() })}`;
  },

  userImage(user: User, w = 80): string {
    if (!ctx.serverUrl || !user.Id || !user.PrimaryImageTag) return '';
    return `${ctx.serverUrl}/Users/${user.Id}/Images/Primary${qs({ fillWidth: w, quality: 85, tag: user.PrimaryImageTag, ...tokenParams() })}`;
  },

  subtitleUrl(itemId: string, mediaSourceId: string, index: number): string {
    return `${ctx.serverUrl}/Videos/${itemId}/${mediaSourceId}/Subtitles/${index}/Stream.vtt${qs({ ...tokenParams() })}`;
  },

  streamUrl(
    itemId: string,
    source: { Id: string; TranscodingUrl?: string; SupportsDirectPlay?: boolean; SupportsDirectStream?: boolean },
    playSessionId: string,
    kind: 'Videos' | 'Audio' = 'Videos',
  ): { url: string; method: 'DirectPlay' | 'DirectStream' | 'Transcode'; hls: boolean } {
    if (source.TranscodingUrl) {
      const url = source.TranscodingUrl.startsWith('http')
        ? source.TranscodingUrl
        : `${ctx.serverUrl}${source.TranscodingUrl}`;
      return { url, method: 'Transcode', hls: /m3u8|hls/i.test(url) };
    }
    if (source.SupportsDirectPlay || source.SupportsDirectStream) {
      return {
        url: `${ctx.serverUrl}/${kind}/${itemId}/stream${qs({
          static: true,
          mediaSourceId: source.Id,
          playSessionId,
          ...tokenParams(),
        })}`,
        method: source.SupportsDirectPlay ? 'DirectPlay' : 'DirectStream',
        hls: false,
      };
    }
    if (kind === 'Audio') throw new Error('The server offered no stream this browser can play.');
    return {
      url: `${ctx.serverUrl}/Videos/${itemId}/master.m3u8${qs({
        MediaSourceId: source.Id,
        PlaySessionId: playSessionId,
        ...tokenParams(),
      })}`,
      method: 'Transcode',
      hls: true,
    };
  },

  /** HTTP status of a media URL (0 if unreachable), used to explain why the browser couldn't play it. */
  async streamStatus(url: string): Promise<number> {
    try {
      const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
      void res.body?.cancel();
      return res.status;
    } catch {
      return 0;
    }
  },
};

function defaultFields(): string {
  return [
    'Overview',
    'Genres',
    'People',
    'Chapters',
    'MediaStreams',
    'MediaSources',
    'ChildCount',
    'RecursiveItemCount',
    'PrimaryImageAspectRatio',
    'ProductionYear',
    'CommunityRating',
    'OfficialRating',
    'PremiereDate',
    'ProviderIds',
    'ParentId',
    'Taglines',
  ].join(',');
}

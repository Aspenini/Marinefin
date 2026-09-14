const TICKS_PER_SECOND = 10_000_000;

export function ticksToSeconds(ticks?: number): number {
  if (!ticks) return 0;
  return ticks / TICKS_PER_SECOND;
}

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function formatDuration(ticks?: number): string {
  const total = Math.floor(ticksToSeconds(ticks));
  if (!total) return '';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatYear(item: { ProductionYear?: number; PremiereDate?: string }): string {
  if (item.ProductionYear) return String(item.ProductionYear);
  if (item.PremiereDate) return item.PremiereDate.slice(0, 4);
  return '';
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function formatBitrate(bps?: number): string {
  if (!bps) return '';
  if (bps >= 1_000_000) {
    const mbps = bps / 1_000_000;
    return `${mbps < 10 ? mbps.toFixed(1) : Math.round(mbps)} Mbps`;
  }
  if (bps >= 1_000) return `${Math.round(bps / 1_000)} kbps`;
  return `${bps} bps`;
}

export function formatRating(n?: number): string {
  if (!n) return '';
  return n.toFixed(1);
}

export function itemSubtitle(item: {
  Type?: string;
  ProductionYear?: number;
  PremiereDate?: string;
  OfficialRating?: string;
  RunTimeTicks?: number;
  SeriesName?: string;
  AlbumArtist?: string;
  Artists?: string[];
  Album?: string;
  CommunityRating?: number;
  ChildCount?: number;
  RecursiveItemCount?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
}): string {
  if (item.Type === 'Episode') {
    const s = item.ParentIndexNumber != null ? `S${String(item.ParentIndexNumber).padStart(2, '0')}` : '';
    const e = item.IndexNumber != null ? `E${String(item.IndexNumber).padStart(2, '0')}` : '';
    return [item.SeriesName, `${s}${e}`].filter(Boolean).join(' · ');
  }
  if (item.Type === 'Audio') {
    return [item.AlbumArtist || item.Artists?.[0], item.Album].filter(Boolean).join(' · ');
  }
  if (item.Type === 'MusicAlbum') {
    return [item.AlbumArtist, formatYear(item)].filter(Boolean).join(' · ');
  }
  const bits = [formatYear(item), item.OfficialRating, formatDuration(item.RunTimeTicks)].filter(Boolean);
  return bits.join('  ·  ');
}

export function episodeLabel(item: { IndexNumber?: number; ParentIndexNumber?: number; Name?: string }): string {
  const s = item.ParentIndexNumber != null ? `S${String(item.ParentIndexNumber).padStart(2, '0')}` : '';
  const e = item.IndexNumber != null ? `E${String(item.IndexNumber).padStart(2, '0')}` : '';
  const code = `${s}${e}`.trim();
  return code && item.Name ? `${code} · ${item.Name}` : item.Name || code;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function normalizeServer(input: string): string {
  let url = input.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

/** Addresses to try for user input: as-is if it has a scheme, otherwise https first, then http. */
export function serverCandidates(input: string): string[] {
  const url = input.trim();
  if (!url) return [];
  if (/^https?:\/\//i.test(url)) return [normalizeServer(url)];
  return [normalizeServer(`https://${url}`), normalizeServer(`http://${url}`)];
}

export function isPlayable(item: { Type?: string; MediaType?: string; IsFolder?: boolean }): boolean {
  const t = item.Type;
  if (t === 'Movie' || t === 'Episode' || t === 'Video' || t === 'MusicVideo' || t === 'Trailer' || t === 'TvChannel') {
    return true;
  }
  if (t === 'Audio' || t === 'AudioBook') return true;
  return item.MediaType === 'Video' || item.MediaType === 'Audio';
}

export function isAudioItem(item: { Type?: string; MediaType?: string }): boolean {
  return item.Type === 'Audio' || item.Type === 'AudioBook' || item.MediaType === 'Audio';
}

export function collectionIncludeTypes(collectionType?: string): string | undefined {
  switch (collectionType) {
    case 'movies':
      return 'Movie';
    case 'tvshows':
      return 'Series';
    case 'music':
      return 'MusicAlbum';
    case 'musicvideos':
      return 'MusicVideo';
    case 'homevideos':
      return 'Video';
    case 'boxsets':
      return 'BoxSet';
    case 'books':
      return 'Book,AudioBook';
    case 'playlists':
      return 'Playlist';
    case 'photos':
      return 'PhotoAlbum,Photo';
    default:
      return undefined;
  }
}

export function typeLabel(type?: string): string {
  switch (type) {
    case 'Movie':
      return 'Movie';
    case 'Series':
      return 'Series';
    case 'Season':
      return 'Season';
    case 'Episode':
      return 'Episode';
    case 'Person':
      return 'Person';
    case 'MusicAlbum':
      return 'Album';
    case 'MusicArtist':
      return 'Artist';
    case 'Audio':
      return 'Track';
    case 'BoxSet':
      return 'Collection';
    case 'Playlist':
      return 'Playlist';
    case 'Book':
      return 'Book';
    case 'AudioBook':
      return 'Audiobook';
    case 'Photo':
      return 'Photo';
    case 'PhotoAlbum':
      return 'Album';
    case 'TvChannel':
      return 'Channel';
    case 'Trailer':
      return 'Trailer';
    case 'MusicVideo':
      return 'Music video';
    case 'Video':
      return 'Video';
    case 'CollectionFolder':
      return 'Library';
    default:
      return type || 'Item';
  }
}

export function recommendationTitle(type?: string, baseline?: string): string {
  switch (type) {
    case 'SimilarToRecentlyPlayed':
      return baseline ? `Because you watched ${baseline}` : 'Because you watched';
    case 'SimilarToLikedItem':
      return baseline ? `Because you liked ${baseline}` : 'Because you liked';
    case 'HasDirectorFromRecentlyPlayed':
      return 'More from directors you watch';
    case 'HasActorFromRecentlyPlayed':
      return 'More from actors you watch';
    case 'HasLikedDirector':
      return 'Directors you like';
    case 'HasLikedActor':
      return 'Actors you like';
    default:
      return 'Recommended';
  }
}

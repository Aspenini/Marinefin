import { api, setApiContext } from './api';
import { getDeviceId } from './device';
import { normalizeServer } from './format';
import { DEFAULT_SETTINGS, type AppSettings, type AuthResult, type PublicSystemInfo, type User } from './types';

type StoredSettings = Partial<AppSettings> & { defaultQuality?: number };

function normalizeSettings(raw: StoredSettings): AppSettings {
  const { defaultQuality, ...rest } = raw;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    maxStreamingBitrate: rest.maxStreamingBitrate ?? defaultQuality ?? DEFAULT_SETTINGS.maxStreamingBitrate,
    volume: clamp(rest.volume ?? DEFAULT_SETTINGS.volume, 0, 1),
    subtitleSize: clamp(rest.subtitleSize ?? DEFAULT_SETTINGS.subtitleSize, 0.6, 2.4),
    playbackRate: clamp(rest.playbackRate ?? DEFAULT_SETTINGS.playbackRate, 0.25, 3),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

const SESSION_KEY = 'marinefin.session';
const SERVERS_KEY = 'marinefin.servers';
const SETTINGS_KEY = 'marinefin.settings';

export interface SavedSession {
  serverUrl: string;
  token: string;
  user: User;
  serverName: string;
}

export interface KnownServer {
  url: string;
  name: string;
  lastUsed: number;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    if (parsed && typeof parsed === 'object' && fallback && typeof fallback === 'object') {
      return { ...fallback, ...parsed };
    }
    return parsed;
  } catch {
    return fallback;
  }
}

class Session {
  serverUrl = $state('');
  serverName = $state('');
  token = $state('');
  user = $state<User | null>(null);
  ready = $state(false);
  settings = $state<AppSettings>({ ...DEFAULT_SETTINGS });
  servers = $state<KnownServer[]>([]);

  loggedIn = $derived(Boolean(this.token && this.user && this.serverUrl));

  constructor() {
    this.settings = normalizeSettings(loadJson<StoredSettings>(SETTINGS_KEY, { ...DEFAULT_SETTINGS }));
    this.servers = loadJson<KnownServer[]>(SERVERS_KEY, [] as KnownServer[]);
    if (!Array.isArray(this.servers)) this.servers = [];
    const saved = loadJson<SavedSession | null>(SESSION_KEY, null);
    if (saved?.token && saved.user && saved.serverUrl) {
      this.apply(saved);
      void this.refresh().finally(() => {
        this.ready = true;
      });
    } else {
      this.ready = true;
    }
    this.applyAccent();
  }

  apply(saved: SavedSession) {
    this.serverUrl = saved.serverUrl;
    this.serverName = saved.serverName;
    this.token = saved.token;
    this.user = saved.user;
    setApiContext({ serverUrl: saved.serverUrl, token: saved.token, userId: saved.user.Id });
  }

  persist() {
    if (!this.loggedIn || !this.user) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    const payload: SavedSession = {
      serverUrl: this.serverUrl,
      token: this.token,
      user: this.user,
      serverName: this.serverName,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    this.rememberServer(this.serverUrl, this.serverName);
  }

  rememberServer(url: string, name: string) {
    const normalized = normalizeServer(url);
    const next = this.servers.filter((s) => s.url !== normalized);
    next.unshift({ url: normalized, name, lastUsed: Date.now() });
    this.servers = next.slice(0, 8);
    localStorage.setItem(SERVERS_KEY, JSON.stringify(this.servers));
  }

  forgetServer(url: string) {
    this.servers = this.servers.filter((s) => s.url !== url);
    localStorage.setItem(SERVERS_KEY, JSON.stringify(this.servers));
  }

  async loginWithResult(serverUrl: string, result: AuthResult, info?: PublicSystemInfo) {
    this.serverUrl = normalizeServer(serverUrl);
    this.token = result.AccessToken;
    this.user = result.User;
    this.serverName = info?.ServerName || this.serverName || 'Jellyfin';
    setApiContext({ serverUrl: this.serverUrl, token: this.token, userId: this.user.Id });
    this.persist();
  }

  async refresh() {
    try {
      this.user = await api.me();
      this.persist();
    } catch {
      this.clear(false);
    }
  }

  updateSettings(partial: Partial<AppSettings>) {
    this.settings = normalizeSettings({ ...this.settings, ...partial });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    this.applyAccent();
  }

  applyAccent() {
    document.documentElement.style.setProperty('--accent', this.settings.accent);
  }

  async logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    this.clear(true);
  }

  clear(keepServers: boolean) {
    this.token = '';
    this.user = null;
    setApiContext({ token: null, userId: null });
    localStorage.removeItem(SESSION_KEY);
    if (!keepServers) {
      this.serverUrl = '';
      this.serverName = '';
    }
  }
}

export const session = new Session();

void getDeviceId();

export interface Route {
  name: string;
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
}

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const url = new URL(raw.startsWith('/') ? raw : `/${raw}`, 'https://marinefin.local');
  const parts = url.pathname.split('/').filter(Boolean);
  const query = Object.fromEntries(url.searchParams.entries());
  const [a, b] = parts;

  if (!a || a === 'home') return { name: 'home', params: {}, query, path: '/home' };
  if (a === 'login') return { name: 'login', params: {}, query, path: '/login' };
  if (a === 'library' && b) return { name: 'library', params: { id: b }, query, path: `/library/${b}` };
  if (a === 'item' && b) return { name: 'item', params: { id: b }, query, path: `/item/${b}` };
  if (a === 'person' && b) return { name: 'person', params: { id: b }, query, path: `/person/${b}` };
  if (a === 'play' && b) return { name: 'play', params: { id: b }, query, path: `/play/${b}` };
  if (a === 'search') return { name: 'search', params: {}, query, path: '/search' };
  if (a === 'favorites') return { name: 'favorites', params: {}, query, path: '/favorites' };
  if (a === 'history') return { name: 'history', params: {}, query, path: '/history' };
  if (a === 'settings') return { name: 'settings', params: {}, query, path: '/settings' };
  if (a === 'live') return { name: 'live', params: {}, query, path: '/live' };
  return { name: 'home', params: {}, query, path: '/home' };
}

class Router {
  current = $state<Route>(parse());

  constructor() {
    window.addEventListener('hashchange', () => {
      this.current = parse();
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    });
  }

  go(path: string) {
    const next = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
    if (location.hash === next) {
      this.current = parse();
      return;
    }
    location.hash = next;
  }

  replace(path: string) {
    const next = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
    history.replaceState(null, '', next);
    this.current = parse();
  }

  back() {
    history.length > 1 ? history.back() : this.go('/home');
  }

  query(extra: Record<string, string | undefined>) {
    const params = new URLSearchParams(this.current.query);
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === '') params.delete(k);
      else params.set(k, v);
    }
    const q = params.toString();
    this.go(`${this.current.path}${q ? `?${q}` : ''}`);
  }
}

export const router = new Router();

if (!location.hash) {
  history.replaceState(null, '', '#/home');
  router.current = parse();
}

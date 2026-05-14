export type Route =
  | { path: 'search' }
  | { path: 'detail'; egrid: string };

export interface Router {
  getCurrentRoute(): Route;
  navigate(route: Route): void;
  subscribe(callback: (route: Route) => void): () => void;
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '');
  if (clean.startsWith('/detail/')) {
    const egrid = clean.slice('/detail/'.length);
    if (egrid) return { path: 'detail', egrid };
  }
  if (clean === '/search' || clean === '') return { path: 'search' };
  return { path: 'search' };
}

function serializeRoute(route: Route): string {
  if (route.path === 'search') return '#/search';
  return `#/detail/${route.egrid}`;
}

export function createRouter(): Router {
  const listeners = new Set<(route: Route) => void>();

  const notify = () => {
    const route = parseHash(window.location.hash);
    listeners.forEach((cb) => cb(route));
  };

  window.addEventListener('hashchange', notify);

  return {
    getCurrentRoute() {
      return parseHash(window.location.hash);
    },
    navigate(route) {
      const hash = serializeRoute(route);
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      } else {
        // still notify in case programmatic navigate without hash change
        listeners.forEach((cb) => cb(route));
      }
    },
    subscribe(callback) {
      listeners.add(callback);
      callback(parseHash(window.location.hash));
      return () => listeners.delete(callback);
    },
  };
}

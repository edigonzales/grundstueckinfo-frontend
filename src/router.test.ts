import { describe, it, expect } from 'vitest';
import { parseHash, createRouter } from './router';

describe('parseHash', () => {
  it('parses /search', () => {
    expect(parseHash('#/search')).toEqual({ path: 'search' });
  });

  it('parses empty hash as search', () => {
    expect(parseHash('')).toEqual({ path: 'search' });
  });

  it('parses /detail/:egrid', () => {
    expect(parseHash('#/detail/CH994641443597')).toEqual({
      path: 'detail',
      egrid: 'CH994641443597',
    });
  });

  it('falls back to search for unknown routes', () => {
    expect(parseHash('#/foo')).toEqual({ path: 'search' });
  });
});

describe('createRouter', () => {
  it('returns current route from window.location.hash', () => {
    window.location.hash = '#/detail/CH123456789012';
    const router = createRouter();
    const route = router.getCurrentRoute();
    expect(route).toEqual({ path: 'detail', egrid: 'CH123456789012' });
  });

  it('notifies subscribers on hashchange', () => {
    window.location.hash = '#/search';
    const router = createRouter();
    const routes: ReturnType<typeof parseHash>[] = [];
    router.subscribe((r) => routes.push(r));
    window.location.hash = '#/detail/CH999999999999';
    // hashchange listener is async in tests sometimes, so we dispatch
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(routes.some((r) => r.path === 'detail' && r.egrid === 'CH999999999999')).toBe(true);
  });
});

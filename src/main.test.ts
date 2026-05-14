import { afterEach, describe, it, expect, vi } from 'vitest';
import './main';

describe('gi-app', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('registers the custom element', () => {
    expect(customElements.get('gi-app')).toBeDefined();
  });

  it('renders loading initially', () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false } as Response));
    const el = document.createElement('gi-app') as HTMLElement;
    document.body.appendChild(el);
    const text = el.shadowRoot?.textContent ?? '';
    expect(text).toContain('Lade');
  });

  it('renders search view on route', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false } as Response));
    window.location.hash = '#/search';
    const el = document.createElement('gi-app') as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    expect(el.shadowRoot?.querySelector('gi-search-view')).toBeDefined();
  });

  it('renders detail view on detail route', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false } as Response));
    window.location.hash = '#/detail/CH994641443597';
    const el = document.createElement('gi-app') as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    expect(el.shadowRoot?.querySelector('gi-detail-view')).toBeDefined();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { loadAppConfig, DEFAULT_CONFIG } from './config';
import publicConfig from '../public/config/app.config.json';

describe('loadAppConfig', () => {
  it('returns defaults when fetch fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('Network')));
    const config = await loadAppConfig('/config/app.config.json');
    expect(config.language).toBe('de');
    expect(config.mockEnabled).toBe(true);
    expect(config.projection).toBe('EPSG:2056');
  });

  it('returns defaults when response is not ok', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 404 } as Response)
    );
    const config = await loadAppConfig('/config/app.config.json');
    expect(config.language).toBe('de');
    expect(config.mockEnabled).toBe(true);
  });

  it('merges external config over defaults', async () => {
    const external = { language: 'fr', mockEnabled: false };
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(external),
      } as Response)
    );
    const config = await loadAppConfig('/config/app.config.json');
    expect(config.language).toBe('fr');
    expect(config.mockEnabled).toBe(false);
    // defaults still present
    expect(config.projection).toBe('EPSG:2056');
    expect(config.startCenter).toEqual(DEFAULT_CONFIG.startCenter);
  });
});

describe('DEFAULT_CONFIG', () => {
  it('has all required fields', () => {
    expect(DEFAULT_CONFIG.backgroundWmts.layer).toBe('ch.swisstopo.pixelkarte-farbe');
    expect(DEFAULT_CONFIG.backgroundWmts.matrixSet).toBe('2056_27');
    expect(DEFAULT_CONFIG.backgroundWms.url).toContain('geodienste.ch');
    expect(DEFAULT_CONFIG.backgroundStrategy.switchScaleDenominator).toBe(5000);
    expect(DEFAULT_CONFIG.startCenter).toEqual([2588162, 1226286]);
  });

  it('matches the public runtime map defaults', () => {
    expect(publicConfig.startCenter).toEqual(DEFAULT_CONFIG.startCenter);
    expect(publicConfig.backgroundWmts.matrixSet).toBe(DEFAULT_CONFIG.backgroundWmts.matrixSet);
  });
});

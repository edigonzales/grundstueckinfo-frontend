import { afterEach, describe, it, expect, vi } from 'vitest';
import { SearchService } from './search-service';
import type { AppConfig } from '../config';

const mockConfig: AppConfig = {
  mockEnabled: true,
  language: 'de',
  serviceBaseUrl: 'https://avws.sogeo.services',
  authUrl: '#/auth-dummy',
  projection: 'EPSG:2056',
  startCenter: [2588387, 1226344],
  startZoom: 6,
  startExtent: [2420000, 1030000, 2900000, 1350000],
  searchServerUrlTemplate: 'https://api3.geo.admin.ch/rest/services/ech/SearchServer?sr=2056&searchText={searchText}&lang={language}&type=locations&limit=20&geometryFormat=geojson&origins=address,parcel',
  backgroundStrategy: { switchScaleDenominator: 5000 },
  backgroundWmts: { capabilitiesUrl: '', urlTemplate: '', layer: '', matrixSet: '2056_27', format: 'image/jpeg' },
  backgroundWms: { url: '', layers: '', format: 'image/png', transparent: true, crs: 'EPSG:2056' },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SearchService URL building', () => {
  it('builds SearchServer URL with replaced placeholders', () => {
    const svc = new SearchService(mockConfig);
    const url = svc['buildUrl']('test');
    expect(url).toContain('searchText=test');
    expect(url).toContain('lang=de');
  });
});

describe('SearchService EGRID extraction', () => {
  it('extracts EGRID from detail text', () => {
    const svc = new SearchService(mockConfig);
    const egrid = svc['extractEgrid']('Parzelle 123, CH994641443597');
    expect(egrid).toBe('CH994641443597');
  });

  it('extracts EGRID from label text', () => {
    const svc = new SearchService(mockConfig);
    const egrid = svc['extractEgrid']('CH843546415105');
    expect(egrid).toBe('CH843546415105');
  });

  it('returns undefined when no EGRID present', () => {
    const svc = new SearchService(mockConfig);
    const egrid = svc['extractEgrid']('Musterstrasse 1');
    expect(egrid).toBeUndefined();
  });
});

describe('SearchService parse results', () => {
  it('parses GeoJSON feature results with correct coordinate order', async () => {
    const svc = new SearchService(mockConfig);
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'FeatureCollection',
            features: [
              {
                id: 1500467,
                properties: {
                  label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
                  detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
                  origin: 'address',
                  y: 2588195.5,
                  x: 1226272.625,
                },
              },
              {
                id: 'parcel-feature',
                properties: {
                  label: 'Parzelle 926',
                  detail: 'CH994641443597',
                  origin: 'parcel',
                  y: 2606500,
                  x: 1237000,
                },
              },
            ],
          }),
      } as Response)
    );

    const results = await svc.search('test');
    expect(results).toHaveLength(2);

    const address = results[0];
    expect(address.id).toBe('1500467');
    expect(address.origin).toBe('address');
    expect(address.egrid).toBeUndefined();
    expect(address.easting).toBe(2588195.5);
    expect(address.northing).toBe(1226272.625);
    expect(address.easting).toBeGreaterThan(0);
    expect(address.northing).toBeGreaterThan(0);

    const parcel = results[1];
    expect(parcel.origin).toBe('parcel');
    expect(parcel.egrid).toBe('CH994641443597');
    expect(parcel.easting).toBe(2606500);
    expect(parcel.northing).toBe(1237000);
  });

  it('parses classic SearchServer results with attrs', async () => {
    const svc = new SearchService(mockConfig);
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                id: 1500467,
                weight: 100,
                attrs: {
                  label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
                  detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
                  origin: 'address',
                  y: 2588195.5,
                  x: 1226272.625,
                },
              },
            ],
          }),
      } as Response)
    );

    const results = await svc.search('Chemin des Esserts 1 2536 Plagne');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: '1500467',
      label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
      detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
      origin: 'address',
      easting: 2588195.5,
      northing: 1226272.625,
    });
  });

  it('returns an empty array when SearchServer has no results', async () => {
    const svc = new SearchService(mockConfig);
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'FeatureCollection',
            features: [],
          }),
      } as Response)
    );

    await expect(svc.search('kein treffer')).resolves.toEqual([]);
  });
});

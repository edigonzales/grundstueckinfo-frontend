import { describe, it, expect, vi } from 'vitest';
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
  it('parses feature results with correct coordinate order', async () => {
    const svc = new SearchService(mockConfig);
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                id: '1',
                properties: {
                  label: 'Musterstrasse 1',
                  detail: 'CH994641443597',
                  origin: 'parcel',
                  y: 2606500,
                  x: 1237000,
                },
              },
              {
                id: '2',
                properties: {
                  label: 'Hauptstrasse 42',
                  origin: 'address',
                  y: 2600000,
                  x: 1240000,
                },
              },
            ],
          }),
      } as Response)
    );

    const results = await svc.search('test');
    expect(results).toHaveLength(2);

    const parcel = results[0];
    expect(parcel.origin).toBe('parcel');
    expect(parcel.egrid).toBe('CH994641443597');
    expect(parcel.easting).toBe(2606500);
    expect(parcel.northing).toBe(1237000);

    const address = results[1];
    expect(address.origin).toBe('address');
    expect(address.egrid).toBeUndefined();
    expect(address.easting).toBe(2600000);
    expect(address.northing).toBe(1240000);

    vi.restoreAllMocks();
  });
});

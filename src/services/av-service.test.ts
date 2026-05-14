import { describe, it, expect } from 'vitest';
import { createAvService, MockAvService } from './av-service-factory';
import type { AppConfig } from '../config';
import { isServiceError } from './av-service';

const mockConfig: AppConfig = {
  mockEnabled: true,
  language: 'de',
  serviceBaseUrl: 'https://avws.sogeo.services',
  authUrl: '#/auth-dummy',
  projection: 'EPSG:2056',
  startCenter: [2588387, 1226344],
  startZoom: 6,
  startExtent: [2420000, 1030000, 2900000, 1350000],
  searchServerUrlTemplate: '',
  backgroundStrategy: { switchScaleDenominator: 5000 },
  backgroundWmts: { capabilitiesUrl: '', urlTemplate: '', layer: '', matrixSet: '2056_27', format: 'image/jpeg' },
  backgroundWms: { url: '', layers: '', format: 'image/png', transparent: true, crs: 'EPSG:2056' },
};

const liveConfig: AppConfig = { ...mockConfig, mockEnabled: false };

describe('AvService Factory', () => {
  it('returns MockAvService when mockEnabled is true', () => {
    const svc = createAvService(mockConfig);
    expect(svc).toBeInstanceOf(MockAvService);
  });

  it('returns LiveAvService when mockEnabled is false', () => {
    const svc = createAvService(liveConfig);
    expect(svc).not.toBeInstanceOf(MockAvService);
    expect(svc).toBeDefined();
  });
});

describe('MockAvService', () => {
  it('returns two items from getEGRID', async () => {
    const svc = new MockAvService();
    const items = await svc.getEGRID(2600000, 1200000);
    expect(items).toHaveLength(2);
    expect(items[0].egrid).toMatch(/^CH/);
  });

  it('returns Extract for CH994641443597', async () => {
    const svc = new MockAvService();
    const vm = await svc.getExtractById('CH994641443597');
    expect(vm.property.egrid).toBe('CH994641443597');
    expect(vm.property.number).toBeTruthy();
  });

  it('returns 204 ServiceError for unknown egrid', async () => {
    const svc = new MockAvService();
    try {
      await svc.getExtractById('CH000000000000');
      expect.fail('should have thrown');
    } catch (err) {
      expect(isServiceError(err)).toBe(true);
      expect((err as any).status).toBe(204);
    }
  });
});

describe('ServiceError', () => {
  it('identifies ServiceError objects', () => {
    expect(isServiceError({ status: 204, message: '' })).toBe(true);
    expect(isServiceError(new Error('foo'))).toBe(false);
    expect(isServiceError(null)).toBe(false);
  });
});

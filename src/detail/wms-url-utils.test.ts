import { describe, it, expect } from 'vitest';
import { parseWmsGetMapUrl } from './wms-url-utils';

describe('parseWmsGetMapUrl', () => {
  it('parses a complete GetMap URL and extracts base URL + parameters', () => {
    const url = 'https://geodienste.ch/db/av_situationsplan_0/deu?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=daten&STYLES=&CRS=EPSG%3A2056&TILED=false&MAP_RESOLUTION=100&OPACITIES=255&t=675&SRS=EPSG:2056&BBOX=2585830.11,1224198.85,2586093.60,1224354.34&DPI=300&HEIGHT=1169&WIDTH=2055';
    const result = parseWmsGetMapUrl(url);

    expect(result.url).toBe('https://geodienste.ch/db/av_situationsplan_0/deu');
    expect(result.params.SERVICE).toBe('WMS');
    expect(result.params.VERSION).toBe('1.3.0');
    expect(result.params.REQUEST).toBe('GetMap');
    expect(result.params.FORMAT).toBe('image/png');
    expect(result.params.LAYERS).toBe('daten');
    expect(result.params.CRS).toBe('EPSG:2056');
    expect(result.params.DPI).toBe('300');
    
    // WIDTH, HEIGHT, BBOX, SRS sollen ignoriert werden (steuert OL)
    expect(result.params.WIDTH).toBeUndefined();
    expect(result.params.HEIGHT).toBeUndefined();
    expect(result.params.BBOX).toBeUndefined();
    expect(result.params.SRS).toBeUndefined();
  });

  it('handles URL without query string', () => {
    const result = parseWmsGetMapUrl('https://example.com/wms?LAYERS=test&VERSION=1.1.1');
    expect(result.url).toBe('https://example.com/wms');
    expect(result.params.LAYERS).toBe('test');
    expect(result.params.VERSION).toBe('1.1.1');
  });
});

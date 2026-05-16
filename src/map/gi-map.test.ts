import { describe, it, expect } from 'vitest';
import './gi-map';
import WMTS from 'ol/source/WMTS';
import { ImageWMS } from 'ol/source';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import { get as getProjection } from 'ol/proj';
import type { AppConfig } from '../config';
import {
  DISCRETE_RESOLUTIONS,
  WMTS_MATRIX_IDS,
  WMTS_MATRIX_RESOLUTIONS,
  wmsImageLoadFunction,
} from './map-utils';

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
  backgroundWmts: {
    capabilitiesUrl: '',
    urlTemplate: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/2056/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
    layer: 'ch.swisstopo.pixelkarte-farbe',
    matrixSet: '2056_27',
    format: 'image/jpeg',
  },
  backgroundWms: {
    url: 'https://geodienste.ch/db/av_situationsplan_0/deu',
    layers: 'daten',
    format: 'image/png',
    transparent: true,
    crs: 'EPSG:2056',
  },
};

function createMapElement(): Element {
  const el = document.createElement('gi-map');
  el.setAttribute('style', 'display:block;width:600px;height:400px;');
  document.body.appendChild(el);
  (el as any).setConfig(mockConfig);
  return el;
}

describe('GiMap', () => {
  it('renders a map with LV95 projection, center, zoom and resolutions', () => {
    const el = createMapElement();
    const map = (el as any)._map;
    expect(map).toBeDefined();
    const view = map.getView();
    expect(view.getProjection().getCode()).toBe('EPSG:2056');
    expect(view.getCenter()).toEqual(mockConfig.startCenter);
    expect(view.getZoom()).toBe(mockConfig.startZoom);
    expect(view.getResolutions()).toEqual(DISCRETE_RESOLUTIONS);
    document.body.removeChild(el);
  });

  it('uses OpenLayers WMTS source and the official LV95 tile matrix identifiers', () => {
    const el = createMapElement();
    const wmtsLayer = (el as any)._wmtsLayer;
    const source = wmtsLayer.getSource();
    const tileGrid = source.getTileGrid();

    expect(source).toBeInstanceOf(WMTS);
    expect(source.getLayer()).toBe(mockConfig.backgroundWmts.layer);
    expect(source.getMatrixSet()).toBe('2056_27');
    expect(source.getFormat()).toBe('image/jpeg');
    expect(source.getStyle()).toBe('default');
    expect(source.getRequestEncoding()).toBe('REST');
    expect(tileGrid).toBeInstanceOf(WMTSTileGrid);
    expect(tileGrid.getMatrixIds()).toEqual(WMTS_MATRIX_IDS);
    expect(tileGrid.getResolution(18)).toBe(WMTS_MATRIX_RESOLUTIONS[18]);

    const projection = getProjection('EPSG:2056');
    const tileUrl = source.getTileUrlFunction()([18, 20, 10], 1, projection!);
    expect(tileUrl).toBe(
      'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/2056/18/20/10.jpeg'
    );
    document.body.removeChild(el);
  });

  it('uses ImageWMS source with imageLoadFunction for MAP_RESOLUTION', () => {
    const el = createMapElement();
    const wmsLayer = (el as any)._wmsLayer;
    const source = wmsLayer.getSource();

    expect(source).toBeInstanceOf(ImageWMS);
    expect(source.getImageLoadFunction()).toBe(wmsImageLoadFunction);
    document.body.removeChild(el);
  });

  it('dispatches map-click event with coordinates on click', async () => {
    const el = createMapElement();
    let eventFired = false;
    let x = 0, y = 0;

    el.addEventListener('map-click', ((e: CustomEvent) => {
      eventFired = true;
      x = e.detail.easting;
      y = e.detail.northing;
    }) as EventListener);

    // Simulate click by calling the handler directly (no DOM events in jsdom)
    const map = (el as any)._map;
    const view = map.getView();
    const center = view.getCenter();
    map.dispatchEvent({ type: 'click', coordinate: center } as any);

    expect(eventFired).toBe(true);
    expect(x).toBe(center[0]);
    expect(y).toBe(center[1]);
    document.body.removeChild(el);
  });

  it('toggles background layers based on scale denominator', () => {
    const el = createMapElement();
    const map = (el as any)._map;
    const wmts = (el as any)._wmtsLayer;
    const wms = (el as any)._wmsLayer;

    map.getView().setResolution(1.5);
    (el as any).updateBackground();
    expect(wmts.getVisible()).toBe(true);
    expect(wms.getVisible()).toBe(false);

    map.getView().setResolution(1.4);
    (el as any).updateBackground();
    expect(wmts.getVisible()).toBe(false);
    expect(wms.getVisible()).toBe(true);
    document.body.removeChild(el);
  });

  it('replaces configured layers instead of duplicating them', () => {
    const el = createMapElement();
    const map = (el as any)._map;
    expect(map.getLayers().getLength()).toBe(3);

    (el as any).setConfig(mockConfig);
    expect(map.getLayers().getLength()).toBe(3);

    const layers = map.getLayers().getArray();
    expect(layers.filter((layer: any) => layer.getSource() instanceof WMTS)).toHaveLength(1);
    expect(layers.filter((layer: any) => layer.getSource() instanceof ImageWMS)).toHaveLength(1);
    document.body.removeChild(el);
  });
});

describe('GiMap highlight', () => {
  it('highlights a polygon on the map', () => {
    const el = createMapElement();
    const source = (el as any)._highlightSource;
    expect(source.getFeatures()).toHaveLength(0);

    (el as any).highlightGeometry({ exterior: [[2600000, 1200000], [2600100, 1200000], [2600100, 1200100], [2600000, 1200000]] });
    expect(source.getFeatures()).toHaveLength(1);

    (el as any).clearHighlight();
    expect(source.getFeatures()).toHaveLength(0);
    document.body.removeChild(el);
  });
});

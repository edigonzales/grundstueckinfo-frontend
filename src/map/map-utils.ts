import proj4 from 'proj4';
import { get as getProjection, type Projection } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import WMTSTileGrid from 'ol/tilegrid/WMTS';

const EPSG_2056_DEF =
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 ' +
  '+x_0=2600000 +y_0=1200000 +ellps=bessel ' +
  '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs';

export const SWISS_EXTENT: [number, number, number, number] = [2420000, 1030000, 2900000, 1350000];
export const SWISS_WMTS_ORIGIN: [number, number] = [2420000, 1350000];
export const DEFAULT_MAP_CENTER: [number, number] = [2588387, 1226344];

export const DISCRETE_RESOLUTIONS = [
  4000, 2000, 1000, 500, 250, 100, 50, 20, 10, 5, 2.5, 1, 0.5, 0.25, 0.1,
];

export const WMTS_MATRIX_IDS = Array.from({ length: 28 }, (_, idx) => String(idx));

export const WMTS_MATRIX_RESOLUTIONS = [
  4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250,
  1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25,
];

export const WMTS_MATRIX_SIZES: [number, number][] = [
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 2],
  [3, 2],
  [3, 2],
  [4, 3],
  [8, 5],
  [19, 13],
  [38, 25],
  [94, 63],
  [188, 125],
  [375, 250],
  [750, 500],
  [938, 625],
  [1250, 834],
  [1875, 1250],
  [3750, 2500],
  [7500, 5000],
];

export function registerSwissProjection(): Projection {
  proj4.defs('EPSG:2056', EPSG_2056_DEF);
  register(proj4);

  const projection = getProjection('EPSG:2056');
  if (!projection) {
    throw new Error('EPSG:2056 projection registration failed');
  }

  projection.setExtent(SWISS_EXTENT);
  projection.setWorldExtent([5.96, 45.82, 10.49, 47.81]);
  return projection;
}

export function createSwissWmtsTileGrid(): WMTSTileGrid {
  return new WMTSTileGrid({
    origin: SWISS_WMTS_ORIGIN,
    resolutions: WMTS_MATRIX_RESOLUTIONS,
    matrixIds: WMTS_MATRIX_IDS,
    sizes: WMTS_MATRIX_SIZES,
    tileSize: 256,
  });
}

/**
 * Berechnet die aktuelle Bildschirm-DPI aus `window.devicePixelRatio`.
 * Basiswert ist 96 (CSS-Standard).
 */
export function getMapResolutionDpi(): number {
  return Math.round((window.devicePixelRatio || 1) * 96);
}

/**
 * Fügt einer URL den MAP_RESOLUTION-Parameter mit der aktuellen Bildschirm-DPI an.
 */
export function setMapResolutionParam(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}MAP_RESOLUTION=${getMapResolutionDpi()}`;
}

/**
 * OpenLayers `imageLoadFunction`, die vor dem Laden an jede GetMap-URL
 * den Parameter `MAP_RESOLUTION` mit der aktuellen DPI anhängt.
 */
export function wmsImageLoadFunction(image: any, src: string): void {
  image.getImage().src = setMapResolutionParam(src);
}

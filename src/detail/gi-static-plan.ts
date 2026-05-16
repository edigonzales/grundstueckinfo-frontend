import type { PlanImage, Lv95Surface } from '../parsers/types';
import olCss from 'ol/ol.css?raw';
import Map from 'ol/Map';
import View from 'ol/View';
import { Image as ImageLayer, Vector as VectorLayer } from 'ol/layer';
import { ImageWMS } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import { Feature } from 'ol';
import { Style, Stroke } from 'ol/style';
import { registerSwissProjection, wmsImageLoadFunction } from '../map/map-utils';
import { parseWmsGetMapUrl } from './wms-url-utils';

registerSwissProjection();

const EPSG_2056 = 'EPSG:2056';
const RUBBERBAND_COLOR = 'rgba(230, 0, 0, 0.4)';
const RUBBERBAND_WIDTH = 6;

export class GiStaticPlan extends HTMLElement {
  private _map: Map | null = null;
  private _vectorSource = new VectorSource();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setPlan(plan?: PlanImage, geometry?: Lv95Surface) {
    if (!plan || (!plan.imageDataUrl && !plan.referenceWmsUrl)) {
      this.renderEmpty();
      return;
    }

    if (!plan.bbox) {
      this.renderImageFallback(plan.referenceWmsUrl || plan.imageDataUrl || '');
      return;
    }

    if (plan.referenceWmsUrl) {
      // ImageWMS-Pfad
      this.renderWmsMap(plan.referenceWmsUrl, plan.bbox, geometry);
    } else if (plan.imageDataUrl) {
      // Base64-Fallback: einfaches Bild
      this.renderImageFallback(plan.imageDataUrl);
    }
  }

  private renderWmsMap(url: string, bbox: [number, number, number, number], geometry?: Lv95Surface) {
    if (!this.shadowRoot) return;

    // Bestehende Map aufräumen
    if (this._map) {
      this._map.setTarget(undefined);
      this._map = null;
    }

    const [minX, minY, maxX, maxY] = bbox;
    const extent = [minX, minY, maxX, maxY] as [number, number, number, number];

    this.shadowRoot.innerHTML = `
      <style>
        ${olCss}
        :host { display: block; }
        .map-target { 
          width: 100%; 
          aspect-ratio: ${(maxX - minX) / (maxY - minY)}; 
          border: 1px solid #ddd;
        }
      </style>
      <div class="map-target"></div>
    `;

    const mapTarget = this.shadowRoot.querySelector('.map-target') as HTMLDivElement;
    if (!mapTarget) return;

    const { url: wmsBaseUrl, params } = parseWmsGetMapUrl(url);

    const source = new ImageWMS({
      url: wmsBaseUrl,
      params,
      ratio: 1,
      projection: EPSG_2056,
      imageLoadFunction: wmsImageLoadFunction,
    });

    const imageLayer = new ImageLayer({ source, zIndex: 1 });

    const vectorLayer = new VectorLayer({
      source: this._vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: RUBBERBAND_COLOR,
          width: RUBBERBAND_WIDTH,
        }),
        fill: undefined,
      }),
      zIndex: 2,
    });

    const view = new View({
      projection: EPSG_2056,
      center: [(minX + maxX) / 2, (minY + maxY) / 2],
    });

    this._map = new Map({
      target: mapTarget,
      controls: [],
      interactions: [],
      layers: [imageLayer, vectorLayer],
      view,
    });

    view.fit(extent, { padding: [0, 0, 0, 0] });

    // Rubberband zeichnen
    this._vectorSource.clear();
    if (geometry && geometry.exterior.length >= 3) {
      const coords = [geometry.exterior];
      if (geometry.interiors && geometry.interiors.length > 0) {
        for (const interior of geometry.interiors) {
          if (interior.length >= 3) {
            coords.push(interior);
          }
        }
      }
      const polygon = new Polygon(coords);
      const feature = new Feature(polygon);
      this._vectorSource.addFeature(feature);
    }
  }

  private renderImageFallback(url: string) {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        img { max-width: 100%; height: auto; border: 1px solid #ccc; background: white; }
      </style>
      <img src="${url}" alt="Plan" crossorigin="anonymous" />
    `;
  }

  private renderEmpty() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .empty {
          padding: 2rem;
          text-align: center;
          border: 1px solid #eee;
          background: white;
          color: #999;
        }
      </style>
      <div class="empty">Kein Plan verfügbar.</div>
    `;
  }
}

customElements.define('gi-static-plan', GiStaticPlan);

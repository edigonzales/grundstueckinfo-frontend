import type { PlanImage, Lv95Surface } from '../parsers/types';
import olCss from 'ol/ol.css?raw';
import Map from 'ol/Map';
import View from 'ol/View';
import { Image as ImageLayer, Vector as VectorLayer } from 'ol/layer';
import Static from 'ol/source/ImageStatic';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import { Feature } from 'ol';
import { Style, Stroke } from 'ol/style';
import { getCenter } from 'ol/extent';
import { registerSwissProjection } from '../map/map-utils';

registerSwissProjection();

const EPSG_2056 = 'EPSG:2056';
const RUBBERBAND_COLOR = 'rgba(230, 0, 0, 0.4)';
const RUBBERBAND_WIDTH = 6;

export class GiStaticPlan extends HTMLElement {
  private _map: Map | null = null;
  private _imageLayer: ImageLayer<Static> | null = null;
  private _vectorLayer: VectorLayer<VectorSource> | null = null;
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

    // Wir brauchen mindestens eine BBox, sonst können wir nicht georeferenzieren.
    if (!plan.bbox) {
      this.renderImageFallback(plan.imageDataUrl || plan.referenceWmsUrl!);
      return;
    }

    const url = plan.imageDataUrl || plan.referenceWmsUrl!;
    this.renderStaticMap(url, plan.bbox, geometry);
  }

  private renderStaticMap(url: string, bbox: [number, number, number, number], geometry?: Lv95Surface) {
    if (!this.shadowRoot) return;

    // Temporäres Bild laden, um Originalgrösse zu ermitteln
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.initOlMap(url, bbox, [img.naturalWidth, img.naturalHeight], geometry);
    };
    img.onerror = () => {
      // Fallback: ohne bekannte Grösse trotzdem versuchen
      this.initOlMap(url, bbox, undefined, geometry);
    };
    img.src = url;
  }

  private initOlMap(
    url: string,
    bbox: [number, number, number, number],
    imageSize: [number, number] | undefined,
    geometry?: Lv95Surface
  ) {
    if (!this.shadowRoot) return;

    // Bestehende Map aufräumen
    if (this._map) {
      this._map.setTarget(undefined);
      this._map = null;
    }

    const [minX, minY, maxX, maxY] = bbox;
    const extent = [minX, minY, maxX, maxY] as [number, number, number, number];

    // Container-Grösse bestimmen
    const containerW = Math.max(100, this.clientWidth || 800);
    let containerH: number;
    if (imageSize) {
      const [imgW, imgH] = imageSize;
      containerH = containerW * (imgH / imgW);
    } else {
      containerH = containerW * ((maxY - minY) / (maxX - minX));
    }
    containerH = Math.max(100, containerH);

    this.shadowRoot.innerHTML = `
      <style>
        ${olCss}
        :host { display: block; }
        .map-target { width: 100%; height: ${Math.round(containerH)}px; }
      </style>
      <div class="map-target"></div>
    `;

    const mapTarget = this.shadowRoot.querySelector('.map-target') as HTMLDivElement;
    if (!mapTarget) return;

    const source = new Static({
      url,
      imageExtent: extent,
      projection: EPSG_2056,
      crossOrigin: 'anonymous',
    });

    this._imageLayer = new ImageLayer({ source, zIndex: 1 });

    this._vectorLayer = new VectorLayer({
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

    this._map = new Map({
      target: mapTarget,
      controls: [],
      interactions: [],
      layers: [this._imageLayer, this._vectorLayer],
      view: new View({
        projection: EPSG_2056,
        center: getCenter(extent),
        zoom: 1,
      }),
    });

    // Jetzt exakt fitten
    const view = this._map.getView();
    const size = [containerW, containerH];
    view.fit(extent, {
      size,
      padding: [0, 0, 0, 0],
      callback: () => {
        // Nach dem Fitten die Auflösung fixieren, damit sich nichts verschiebt
        const resolution = view.getResolution();
        if (resolution !== undefined) {
          view.setResolution(resolution);
        }
      },
    });

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

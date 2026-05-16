import olCss from 'ol/ol.css?raw';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Image as ImageLayer, Vector as VectorLayer } from 'ol/layer';
import { ImageWMS } from 'ol/source';
import WMTS from 'ol/source/WMTS';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';
import { Feature } from 'ol';
import { defaults as defaultControls, ScaleLine } from 'ol/control';
import { unByKey } from 'ol/Observable';
import type { EventsKey } from 'ol/events';
import type { AppConfig } from '../config';
import type { Lv95Polygon } from '../parsers/types';
import {
  createSwissWmtsTileGrid,
  DEFAULT_MAP_CENTER,
  DISCRETE_RESOLUTIONS,
  registerSwissProjection,
  SWISS_EXTENT,
  wmsImageLoadFunction,
} from './map-utils';

const EPSG_2056 = 'EPSG:2056';
registerSwissProjection();

export class GiMap extends HTMLElement {
  private _map: Map | null = null;
  private readonly _mapTarget: HTMLDivElement;
  private _highlightLayer: VectorLayer<VectorSource> | null = null;
  private _highlightSource = new VectorSource();
  private _wmtsLayer: TileLayer<WMTS> | null = null;
  private _wmsLayer: ImageLayer<ImageWMS> | null = null;
  private _config: AppConfig | null = null;
  private _resolutionListenerKey: EventsKey | null = null;

  static get observedAttributes() {
    return ['center', 'zoom'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        ${olCss}
        :host { display: block; width: 100%; height: 100%; }
        .map-target { width: 100%; height: 100%; }
      </style>
      <div class="map-target"></div>
    `;
    this._mapTarget = shadow.querySelector('.map-target') as HTMLDivElement;
  }

  connectedCallback() {
    if (!this._map) {
      this._map = this.createMap();
      this._map.on('click', (evt) => {
        const coord = evt.coordinate;
        this.dispatchEvent(new CustomEvent('map-click', {
          detail: { easting: coord[0], northing: coord[1] },
          bubbles: true,
          composed: true,
        }));
      });
      if (this._config) {
        this.configureMap(this._config);
      }
    }
  }

  disconnectedCallback() {
    this.removeResolutionListener();
    if (this._map) {
      this._map.setTarget(undefined);
      this._map = null;
    }
  }

  setConfig(config: AppConfig) {
    this._config = config;
    if (this._map) {
      this.configureMap(config);
    }
  }

  private createMap(): Map {
    return new Map({
      target: this._mapTarget,
      controls: defaultControls().extend([
        new ScaleLine({ units: 'metric' }),
      ]),
      view: new View({
        projection: EPSG_2056,
        extent: SWISS_EXTENT,
        resolutions: DISCRETE_RESOLUTIONS,
        center: DEFAULT_MAP_CENTER,
        zoom: 6,
      }),
    });
  }

  private configureMap(config: AppConfig) {
    if (!this._map) return;

    this.removeConfiguredLayers();
    this._wmtsLayer = this.createWmtsLayer(config);
    this._wmsLayer = this.createWmsLayer(config);
    this._highlightLayer = this.createHighlightLayer();

    const layers = this._map.getLayers();
    layers.insertAt(0, this._wmtsLayer);
    layers.insertAt(1, this._wmsLayer);
    layers.insertAt(2, this._highlightLayer);

    const view = this._map.getView();
    view.setCenter(config.startCenter);
    view.setZoom(config.startZoom);

    this.removeResolutionListener();
    this._resolutionListenerKey = view.on('change:resolution', () => this.updateBackground());
    this.updateBackground();
  }

  private createWmtsLayer(config: AppConfig): TileLayer<WMTS> {
    const source = new WMTS({
      url: config.backgroundWmts.urlTemplate,
      layer: config.backgroundWmts.layer,
      matrixSet: config.backgroundWmts.matrixSet,
      format: config.backgroundWmts.format,
      projection: config.projection,
      style: 'default',
      requestEncoding: 'REST',
      dimensions: { Time: 'current' },
      tileGrid: createSwissWmtsTileGrid(),
      crossOrigin: 'anonymous',
      wrapX: false,
    });

    return new TileLayer({ source, zIndex: 1 });
  }

  private createWmsLayer(config: AppConfig): ImageLayer<ImageWMS> {
    const source = new ImageWMS({
      url: config.backgroundWms.url,
      ratio: 1.0,
      projection: config.backgroundWms.crs,
      crossOrigin: 'anonymous',
      params: {
        LAYERS: config.backgroundWms.layers,
        FORMAT: config.backgroundWms.format,
        TRANSPARENT: config.backgroundWms.transparent,
        VERSION: '1.3.0',
        CRS: config.backgroundWms.crs,
      },
      serverType: 'mapserver',
      imageLoadFunction: wmsImageLoadFunction,
    });

    return new ImageLayer({ source, zIndex: 2, visible: false });
  }

  private createHighlightLayer(): VectorLayer<VectorSource> {
    return new VectorLayer({
      source: this._highlightSource,
      style: new Style({
        stroke: new Stroke({ color: 'rgba(220,0,0,0.9)', width: 2 }),
        fill: new Fill({ color: 'rgba(220,0,0,0.12)' }),
      }),
      zIndex: 3,
    });
  }

  private removeConfiguredLayers() {
    if (!this._map) return;
    for (const layer of [this._wmtsLayer, this._wmsLayer, this._highlightLayer]) {
      if (layer) {
        this._map.removeLayer(layer);
      }
    }
    this._wmtsLayer = null;
    this._wmsLayer = null;
    this._highlightLayer = null;
  }

  private removeResolutionListener() {
    if (this._resolutionListenerKey) {
      unByKey(this._resolutionListenerKey);
      this._resolutionListenerKey = null;
    }
  }

  private updateBackground() {
    if (!this._map || !this._wmtsLayer || !this._wmsLayer || !this._config) return;

    const resolution = this._map.getView().getResolution() ?? 1;
    const scaleDenominator = resolution / 0.00028;
    const threshold = this._config.backgroundStrategy.switchScaleDenominator;

    if (scaleDenominator <= threshold) {
      this._wmtsLayer.setVisible(false);
      this._wmsLayer.setVisible(true);
    } else {
      this._wmtsLayer.setVisible(true);
      this._wmsLayer.setVisible(false);
    }
  }

  highlightGeometry(geometry?: Lv95Polygon) {
    this._highlightSource.clear();
    if (!geometry || !geometry.exterior || geometry.exterior.length === 0) return;

    const coords = geometry.exterior;
    const polygon = new Polygon([coords]);
    const feature = new Feature(polygon);
    this._highlightSource.addFeature(feature);
  }

  clearHighlight() {
    this._highlightSource.clear();
  }

  setCenter(center: [number, number]) {
    this._map?.getView().setCenter(center);
  }

  setZoom(zoom: number) {
    this._map?.getView().setZoom(zoom);
  }

  fitExtent(extent?: [number, number, number, number]) {
    if (!this._map || !extent) return;
    this._map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 400,
    });
  }
}

customElements.define('gi-map', GiMap);

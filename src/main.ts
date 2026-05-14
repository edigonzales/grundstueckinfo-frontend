import './map/gi-map';
import './search/gi-search-view';
import './detail/gi-static-plan';
import './detail/gi-accordion-section';
import './detail/gi-detail-view';
import { loadAppConfig, type AppConfig } from './config';
import { createRouter, type Router, type Route } from './router';
import { createAvService } from './services/av-service-factory';
import type { AvService } from './services/av-service';

export class GiApp extends HTMLElement {
  private _config: AppConfig | null = null;
  private _router: Router | null = null;
  private _avService: AvService | null = null;
  private _unsubscribeRouter: (() => void) | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.renderLoading();
    this.init();
  }

  disconnectedCallback() {
    if (this._unsubscribeRouter) {
      this._unsubscribeRouter();
      this._unsubscribeRouter = null;
    }
  }

  private async init() {
    this._config = await loadAppConfig();
    this._avService = createAvService(this._config);
    this._router = createRouter();
    this._unsubscribeRouter = this._router.subscribe((route) => this.onRoute(route));
  }

  private onRoute(route: Route) {
    if (!this.shadowRoot) return;
    if (!this._config || !this._avService || !this._router) {
      this.renderLoading();
      return;
    }

    if (route.path === 'search') {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            height: 100vh;
            overflow: hidden;
            background: #fff;
          }
          gi-search-view {
            display: block;
            height: 100%;
          }
        </style>
        <gi-search-view></gi-search-view>
      `;
      const searchView = this.shadowRoot.querySelector('gi-search-view') as any;
      if (searchView) {
        searchView.setServices(this._config, this._avService, this._router);
      }
    } else {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; min-height: 100vh; background: #fff; }
        </style>
        <gi-detail-view></gi-detail-view>
      `;
      const detailView = this.shadowRoot.querySelector('gi-detail-view') as any;
      if (detailView) {
        detailView.setServices(this._config, this._avService, this._router);
        detailView.setEgrid(route.egrid);
      }
    }
  }

  private renderLoading() {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `<p>Lade…</p>`;
    }
  }

  get config(): AppConfig | null {
    return this._config;
  }

  get router(): Router | null {
    return this._router;
  }
}

customElements.define('gi-app', GiApp);

import { SearchService } from '../services/search-service';
import '../map/gi-map';
import type { AppConfig } from '../config';
import type { AvService } from '../services/av-service';
import type { GetEgridItem } from '../parsers/types';
import type { Router } from '../router';

interface SearchState {
  status: 'idle' | 'searching' | 'results' | 'error';
  results?: GetEgridItem[];
  selectedIndex?: number;
  message?: string;
}

export class GiSearchView extends HTMLElement {
  private _avService!: AvService;
  private _router!: Router;
  private _searchService!: SearchService;
  private _config: AppConfig | null = null;
  private _state: SearchState = { status: 'idle' };
  private readonly _onMapClick = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    void this.handleMapClick(detail.easting, detail.northing);
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  setServices(config: AppConfig, avService: AvService, router: Router) {
    this._config = config;
    this._avService = avService;
    this._router = router;
    this._searchService = new SearchService(config);
    this.configureMapAfterRender();
  }

  private configureMapAfterRender() {
    requestAnimationFrame(() => {
      this.configureMapElement();
    });
  }

  private configureMapElement() {
    const mapEl = this.shadowRoot?.querySelector('gi-map') as any;
    if (!mapEl || !this._config || mapEl.__giMapConfigured) return;

    mapEl.setConfig(this._config);
    mapEl.addEventListener('map-click', this._onMapClick);
    mapEl.__giMapConfigured = true;

    if (this._state.status === 'results') {
      this.highlightSelected();
    }
  }

  private async handleSearch(query: string) {
    if (!query.trim()) return;

    this._state = { status: 'searching' };
    this.render();

    try {
      const results = await this._searchService.search(query);
      if (results.length === 0) {
        this._state = { status: 'results', message: 'Keine Treffer gefunden.' };
        this.render();
        return;
      }

      // Handle first result (simplified for MVP)
      const first = results[0];

      if (first.origin === 'parcel' && first.egrid) {
        // Direct extract for parcel with EGRID
        this._router.navigate({ path: 'detail', egrid: first.egrid });
      } else {
        // GetEGRID for address or parcel without EGRID
        await this.handleGetEgrid(first.easting, first.northing);
      }
    } catch (err) {
      this._state = { status: 'error', message: 'Fehler bei der Suche.' };
      this.render();
    }
  }

  private async handleMapClick(easting: number, northing: number) {
    await this.handleGetEgrid(easting, northing);
  }

  private async handleGetEgrid(easting: number, northing: number) {
    this._state = { status: 'searching' };
    this.render();

    try {
      const items = await this._avService.getEGRID(easting, northing);
      if (items.length === 0) {
        this._state = { status: 'results', message: 'An dieser Stelle wurde kein Grundstück gefunden.' };
        this.render();
        return;
      }

      this._state = { status: 'results', results: items, selectedIndex: 0 };
      this.render();
      this.highlightSelected();
    } catch (err) {
      this._state = { status: 'error', message: 'Fehler bei der Abfrage.' };
      this.render();
    }
  }

  private highlightSelected() {
    if (this._state.status !== 'results' || !this._state.results) return;
    const idx = this._state.selectedIndex ?? 0;
    const item = this._state.results[idx];

    const mapEl = this.shadowRoot?.querySelector('gi-map') as any;
    if (mapEl && item?.geometry) {
      mapEl.highlightGeometry(item.geometry);
    }
  }

  private selectItem(index: number) {
    this._state = { ...this._state, selectedIndex: index };
    this.render();
    this.highlightSelected();
  }

  private navigateToDetail(egrid: string) {
    this._router.navigate({ path: 'detail', egrid });
  }

  private render() {
    if (!this.shadowRoot) return;

    const hasResults = this._state.status === 'results' && this._state.results && this._state.results.length > 0;
    const hasMessage = this._state.status === 'results' && this._state.message;
    const isSearching = this._state.status === 'searching';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; position: relative; }
        .search-view { display: flex; flex-direction: column; height: 100%; }
        .search-bar { 
          display: flex; gap: 0.5rem; 
          padding: 1rem; 
          background: #f8f8f8; 
          border-bottom: 1px solid #ddd; 
          align-items: center;
        }
        input { 
          flex: 1; 
          padding: 0.5rem 0.75rem; 
          border: 1px solid #ccc; 
          border-radius: 4px; 
          font-size: 1rem; 
        }
        button { 
          padding: 0.5rem 1rem; 
          background: #c00; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
          font-size: 0.9rem;
        }
        button:hover { background: #a00; }
        .map-wrapper { flex: 1; position: relative; }
        gi-map { display: block; width: 100%; height: 100%; }
        .panel {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 320px;
          max-height: calc(100% - 2rem);
          overflow-y: auto;
          background: white;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10;
        }
        .panel-header {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #eee;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .panel-body {
          padding: 0.5rem 0;
        }
        .result-item {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.15s;
        }
        .result-item:hover { background: #f5f5f5; }
        .result-item.selected { 
          background: #fff0f0; 
          border-left: 3px solid #c00; 
          padding-left: calc(1rem - 3px);
        }
        .result-number { font-weight: 600; font-size: 1rem; }
        .result-egrid { font-size: 0.8rem; color: #666; margin-top: 0.2rem; }
        .result-type { font-size: 0.85rem; color: #333; margin-top: 0.2rem; }
        .detail-btn {
          margin-top: 0.5rem;
          padding: 0.35rem 0.75rem;
          background: #c00;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .detail-btn:hover { background: #a00; }
        .message { padding: 1rem; color: #666; font-size: 0.9rem; }
        .searching { padding: 1rem; color: #666; font-style: italic; }
      </style>
      <div class="search-view">
        <div class="search-bar">
          <input type="text" id="searchInput" placeholder="Adresse, Ort, PLZ, Koordinate, Grundstück-Nr, EGRID oder EGID" />
          <button id="searchBtn">Suchen</button>
        </div>
        <div class="map-wrapper">
          <gi-map></gi-map>
          ${this.renderPanel()}
          ${isSearching ? '<div class="panel"><div class="searching">Suche läuft...</div></div>' : ''}
          ${hasMessage ? `<div class="panel"><div class="message">${this._state.message}</div></div>` : ''}
        </div>
      </div>
    `;

    // Attach event listeners
    const input = this.shadowRoot.getElementById('searchInput') as HTMLInputElement;
    const btn = this.shadowRoot.getElementById('searchBtn');

    if (input && btn) {
      btn.addEventListener('click', () => this.handleSearch(input.value));
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleSearch(input.value);
      });
    }

    // Attach result item listeners
    if (hasResults && this._state.results) {
      this._state.results.forEach((_, idx) => {
        const item = this.shadowRoot?.querySelector(`[data-index="${idx}"]`);
        item?.addEventListener('click', () => this.selectItem(idx));

        const detailBtn = this.shadowRoot?.querySelector(`[data-detail="${idx}"]`);
        detailBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          const egrid = this._state.results?.[idx]?.egrid;
          if (egrid) this.navigateToDetail(egrid);
        });
      });
    }

    this.configureMapAfterRender();
  }

  private renderPanel(): string {
    if (this._state.status !== 'results' || !this._state.results || this._state.results.length === 0) {
      return '';
    }

    const items = this._state.results;
    const selectedIdx = this._state.selectedIndex ?? 0;

    return `
      <div class="panel">
        <div class="panel-header">
          ${items.length} Grundstück${items.length > 1 ? 'e' : ''} gefunden
        </div>
        <div class="panel-body">
          ${items.map((item, idx) => `
            <div class="result-item ${idx === selectedIdx ? 'selected' : ''}" data-index="${idx}">
              <div class="result-number">Grundstück ${item.number}</div>
              <div class="result-egrid">${item.egrid}</div>
              <div class="result-type">${item.typeLabel}</div>
              <button class="detail-btn" data-detail="${idx}">Details anzeigen</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

customElements.define('gi-search-view', GiSearchView);

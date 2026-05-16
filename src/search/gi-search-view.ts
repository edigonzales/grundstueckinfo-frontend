import { SearchService } from '../services/search-service';
import '../map/gi-map';
import type { AppConfig } from '../config';
import type { AvService } from '../services/av-service';
import type { SearchServerResult } from '../services/search-service';
import type { GetEgridItem } from '../parsers/types';
import type { Router } from '../router';

interface SearchState {
  status: 'idle' | 'searching' | 'results' | 'error';
  results?: GetEgridItem[];
  selectedIndex?: number;
  message?: string;
}

interface SuggestionState {
  status: 'idle' | 'loading' | 'open' | 'empty' | 'error';
  query: string;
  suggestions: SearchServerResult[];
  activeIndex: number;
}

const MIN_SUGGESTION_LENGTH = 3;
const SUGGESTION_DEBOUNCE_MS = 300;

export class GiSearchView extends HTMLElement {
  private _avService!: AvService;
  private _router!: Router;
  private _searchService!: SearchService;
  private _config: AppConfig | null = null;
  private _state: SearchState = { status: 'idle' };
  private _resultsExpanded = true;
  private _suggestionState: SuggestionState = {
    status: 'idle',
    query: '',
    suggestions: [],
    activeIndex: -1,
  };
  private _suggestionTimer: ReturnType<typeof setTimeout> | null = null;
  private _suggestionRequestId = 0;
  private readonly _onMapClick = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    void this.handleMapClick(detail.easting, detail.northing);
  };
  private readonly _onDocumentPointerDown = (e: Event) => {
    const searchField = this.shadowRoot?.querySelector('.search-field');
    if (searchField && e.composedPath().includes(searchField)) return;
    this.closeSuggestions(false);
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    document.addEventListener('pointerdown', this._onDocumentPointerDown);
    this.renderShell();
    this.updateView();
  }

  disconnectedCallback() {
    document.removeEventListener('pointerdown', this._onDocumentPointerDown);
    this.clearSuggestionTimer();
    this._suggestionRequestId += 1;
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
      this.fitToAllResults();
    }
  }

  private clearSuggestionTimer() {
    if (this._suggestionTimer) {
      clearTimeout(this._suggestionTimer);
      this._suggestionTimer = null;
    }
  }

  private handleQueryInput(query: string) {
    this.clearSuggestionTimer();
    this._suggestionRequestId += 1;

    const trimmed = query.trim();
    const requestId = this._suggestionRequestId;
    this._suggestionState = {
      status: 'idle',
      query,
      suggestions: trimmed.length >= MIN_SUGGESTION_LENGTH ? this._suggestionState.suggestions : [],
      activeIndex: -1,
    };
    this.updateView();

    if (trimmed.length < MIN_SUGGESTION_LENGTH) {
      return;
    }

    this._suggestionTimer = setTimeout(() => {
      void this.fetchSuggestions(trimmed, requestId);
    }, SUGGESTION_DEBOUNCE_MS);
  }

  private async fetchSuggestions(query: string, requestId: number) {
    if (requestId !== this._suggestionRequestId) return;

    this._suggestionState = {
      ...this._suggestionState,
      status: 'loading',
      activeIndex: -1,
    };
    this.updateView();

    try {
      const suggestions = await this._searchService.search(query);
      if (requestId !== this._suggestionRequestId) return;

      this._suggestionState = {
        ...this._suggestionState,
        status: suggestions.length > 0 ? 'open' : 'empty',
        suggestions,
        activeIndex: suggestions.length > 0 ? 0 : -1,
      };
      this.updateView();
    } catch (err) {
      if (requestId !== this._suggestionRequestId) return;

      this._suggestionState = {
        ...this._suggestionState,
        status: 'error',
        suggestions: [],
        activeIndex: -1,
      };
      this.updateView();
    }
  }

  private handleInputFocus() {
    const trimmed = this._suggestionState.query.trim();
    if (
      trimmed.length >= MIN_SUGGESTION_LENGTH &&
      this._suggestionState.status === 'idle' &&
      this._suggestionState.suggestions.length > 0
    ) {
      this._suggestionState = {
        ...this._suggestionState,
        status: 'open',
        activeIndex: 0,
      };
      this.updateView();
    }
  }

  private handleInputKeydown(e: KeyboardEvent) {
    const suggestions = this._suggestionState.suggestions;

    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      const nextIndex =
        this._suggestionState.status === 'open'
          ? (this._suggestionState.activeIndex + 1) % suggestions.length
          : 0;
      this._suggestionState = {
        ...this._suggestionState,
        status: 'open',
        activeIndex: nextIndex,
      };
      this.updateView();
      return;
    }

    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      const activeIndex = this._suggestionState.activeIndex < 0 ? 0 : this._suggestionState.activeIndex;
      const nextIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
      this._suggestionState = {
        ...this._suggestionState,
        status: 'open',
        activeIndex: nextIndex,
      };
      this.updateView();
      return;
    }

    if (e.key === 'Enter' && this._suggestionState.status === 'open' && suggestions.length > 0) {
      e.preventDefault();
      const activeIndex = this._suggestionState.activeIndex >= 0 ? this._suggestionState.activeIndex : 0;
      void this.selectSuggestion(activeIndex);
      return;
    }

    if (e.key === 'Escape' && this._suggestionState.status !== 'idle') {
      e.preventDefault();
      this.closeSuggestions();
    }
  }

  private handleClearInput() {
    this.clearSuggestionTimer();
    this._suggestionRequestId += 1;
    this._suggestionState = {
      status: 'idle',
      query: '',
      suggestions: [],
      activeIndex: -1,
    };
    this.updateView();
    this.getInputElement()?.focus();
  }

  private async selectSuggestion(index: number) {
    const suggestion = this._suggestionState.suggestions[index];
    if (!suggestion) return;

    this.clearSuggestionTimer();
    this._suggestionRequestId += 1;
    this._suggestionState = {
      status: 'idle',
      query: this.getSuggestionLabel(suggestion),
      suggestions: [],
      activeIndex: -1,
    };
    this.updateView();

    await this.executeSearchResult(suggestion);
  }

  private async executeSearchResult(result: SearchServerResult) {
    if (result.origin === 'parcel' && result.egrid) {
      this._router.navigate({ path: 'detail', egrid: result.egrid });
      return;
    }

    await this.handleGetEgrid(result.easting, result.northing);
  }

  private closeSuggestions(clear = false) {
    this.clearSuggestionTimer();
    const shouldUpdate =
      this._suggestionState.status !== 'idle' ||
      (clear && this._suggestionState.suggestions.length > 0);

    this._suggestionState = {
      ...this._suggestionState,
      status: 'idle',
      suggestions: clear ? [] : this._suggestionState.suggestions,
      activeIndex: -1,
    };

    if (shouldUpdate) {
      this.updateView();
    }
  }

  private async handleMapClick(easting: number, northing: number) {
    this.closeSuggestions();
    await this.handleGetEgrid(easting, northing);
  }

  private async handleGetEgrid(easting: number, northing: number) {
    this._state = { status: 'searching' };
    this.updateView();

    try {
      const items = await this._avService.getEGRID(easting, northing);
      if (items.length === 0) {
        this._state = { status: 'results', message: 'An dieser Stelle wurde kein Grundstück gefunden.' };
        this.updateView();
        return;
      }

      this._state = { status: 'results', results: items, selectedIndex: 0 };
      this.updateView();
      this.highlightSelected();
      this.fitToAllResults();
    } catch (err) {
      this._state = { status: 'error', message: 'Fehler bei der Abfrage.' };
      this.updateView();
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
    this.updateView();
    this.highlightSelected();
    this.fitToItem(index);
  }

  private fitToItem(index: number) {
    if (this._state.status !== 'results' || !this._state.results) return;
    const item = this._state.results[index];
    if (!item?.geometry?.exterior?.length) return;
    const extent = this.getExtentFromPolygon(item.geometry.exterior);
    if (!extent) return;
    const mapEl = this.shadowRoot?.querySelector('gi-map') as any;
    if (mapEl) {
      mapEl.fitExtent(extent);
    }
  }

  private fitToAllResults() {
    if (this._state.status !== 'results' || !this._state.results || this._state.results.length === 0) return;
    const extent = this.getTotalExtent(this._state.results);
    if (!extent) return;
    const mapEl = this.shadowRoot?.querySelector('gi-map') as any;
    if (mapEl) {
      mapEl.fitExtent(extent);
    }
  }

  private getExtentFromPolygon(exterior: [number, number][]): [number, number, number, number] | undefined {
    if (!exterior || exterior.length === 0) return undefined;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of exterior) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return [minX, minY, maxX, maxY];
  }

  private getTotalExtent(items: GetEgridItem[]): [number, number, number, number] | undefined {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasExtent = false;
    for (const item of items) {
      if (!item.geometry?.exterior?.length) continue;
      for (const [x, y] of item.geometry.exterior) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      hasExtent = true;
    }
    return hasExtent ? [minX, minY, maxX, maxY] : undefined;
  }

  private toggleResultsExpanded() {
    this._resultsExpanded = !this._resultsExpanded;
    this.updateView();
  }

  private navigateToDetail(egrid: string) {
    this._router.navigate({ path: 'detail', egrid });
  }

  private getSuggestionLabel(result: SearchServerResult): string {
    return this.stripTags(result.label || result.detail || result.id);
  }

  private stripTags(value: string): string {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getInputElement(): HTMLInputElement | null {
    return this.shadowRoot?.getElementById('searchInput') as HTMLInputElement | null;
  }

  private getSuggestionContainer(): HTMLElement | null {
    return this.shadowRoot?.getElementById('suggestionContainer') as HTMLElement | null;
  }

  private getOverlayContainer(): HTMLElement | null {
    return this.shadowRoot?.getElementById('mapOverlay') as HTMLElement | null;
  }

  private renderShell() {
    if (!this.shadowRoot || this.shadowRoot.querySelector('.search-view')) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          position: relative;
          background: #fff;
          color: #222;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; }
        .search-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          padding: 24px;
          gap: 16px;
          background: #fff;
        }
        h2 {
          margin: 0;
          color: #222;
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.2;
        }
        .intro {
          margin: 0;
          max-width: 820px;
          color: #444;
          font-size: 1rem;
          line-height: 1.45;
        }
        .search-bar {
          position: relative;
          width: 100%;
          max-width: 820px;
        }
        .search-field {
          position: relative;
          width: 100%;
        }
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          display: inline-flex;
          width: 16px;
          height: 16px;
          color: #666;
          pointer-events: none;
          transform: translateY(-50%);
        }
        .search-icon svg {
          display: block;
          width: 16px;
          height: 16px;
        }
        .clear-search {
          position: absolute;
          top: 50%;
          right: 0.45rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          padding: 0;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #666;
          cursor: pointer;
          transform: translateY(-50%);
        }
        .clear-search:hover,
        .clear-search:focus {
          background: #f2f2f2;
          color: #222;
          outline: none;
        }
        .clear-search[hidden] {
          display: none;
        }
        input {
          width: 100%;
          min-width: 0;
          padding: 0.5rem 2.75rem 0.5rem 2.35rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
          line-height: 1.4;
        }
        input:focus {
          border-color: #999;
          outline: 2px solid rgba(204, 0, 0, 0.18);
          outline-offset: 0;
        }
        .suggestions {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          max-height: 260px;
          overflow-y: auto;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 30;
        }
        .suggestion-item {
          display: block;
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: none;
          border-bottom: 1px solid #f0f0f0;
          background: white;
          color: #222;
          cursor: pointer;
          font: inherit;
          text-align: left;
        }
        .suggestion-item:last-child {
          border-bottom: none;
        }
        .suggestion-item:hover,
        .suggestion-item.active {
          background: #fff0f0;
        }
        .suggestion-label {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .suggestion-detail {
          display: block;
          margin-top: 0.15rem;
          color: #666;
          font-size: 0.8rem;
        }
        .suggestion-message {
          padding: 0.75rem 0.85rem;
          color: #666;
          font-size: 0.9rem;
        }
        .map-wrapper {
          flex: 1 1 auto;
          min-height: 0;
          position: relative;
          overflow: hidden;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #eee;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .panel-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          padding: 0;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: #666;
          cursor: pointer;
        }
        .panel-toggle:hover,
        .panel-toggle:focus {
          background: #f2f2f2;
          color: #222;
          outline: none;
        }
        .panel-toggle svg {
          display: block;
          transition: transform 0.25s ease;
        }
        .panel-toggle.collapsed svg {
          transform: rotate(180deg);
        }
        .panel-body {
          overflow: hidden;
          transition: max-height 0.25s ease-out, padding 0.25s ease-out;
          max-height: 1000px;
          padding: 0.5rem 0;
        }
        .panel-body.collapsed {
          max-height: 0;
          padding-top: 0;
          padding-bottom: 0;
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
          padding: 0.35rem 0.75rem;
          background: #c00;
          color: white;
          border: 1px solid transparent;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .detail-btn:hover { background: #a00; }
        .result-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }
        .pdf-btn {
          padding: 0.35rem 0.75rem;
          background: transparent;
          color: #c00;
          border: 1px solid #c00;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .pdf-btn:hover { background: #ffe0e0; }
        .message { padding: 1rem; color: #666; font-size: 0.9rem; }
        .searching { padding: 1rem; color: #666; font-style: italic; }
      </style>
      <div class="search-view">
        <h2>Grundstückinformation</h2>
        <p class="intro">Um Grundstückinformationen einzusehen, klicken sie auf das gewünschte Grundstück oder suchen sie eine Adresse oder ein Grundstück im Suchfeld.</p>
        <div class="search-bar">
          <div class="search-field">
            <span class="search-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
              </svg>
            </span>
            <input
              type="text"
              id="searchInput"
              placeholder="Adresse, Ort, PLZ, Koordinate, Grundstück-Nr, EGRID oder EGID"
              autocomplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="searchSuggestions"
            />
            <button class="clear-search" id="clearSearchBtn" type="button" aria-label="Suche löschen" hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
              </svg>
            </button>
            <div id="suggestionContainer"></div>
          </div>
        </div>
        <div class="map-wrapper">
          <gi-map></gi-map>
          <div id="mapOverlay"></div>
        </div>
      </div>
    `;

    const input = this.getInputElement();
    input?.addEventListener('input', () => this.handleQueryInput(input.value));
    input?.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    input?.addEventListener('focus', () => this.handleInputFocus());

    const clearButton = this.shadowRoot.getElementById('clearSearchBtn');
    clearButton?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClearInput();
    });

    this.configureMapAfterRender();
  }

  private updateView() {
    this.renderShell();
    this.updateInput();
    this.updateSuggestions();
    this.updateOverlay();
  }

  private updateInput() {
    const input = this.getInputElement();
    if (!input) return;

    const isInputFocused = this.shadowRoot?.activeElement === input;
    const selectionStart = input.selectionStart ?? this._suggestionState.query.length;
    const selectionEnd = input.selectionEnd ?? this._suggestionState.query.length;

    if (input.value !== this._suggestionState.query) {
      input.value = this._suggestionState.query;
      if (isInputFocused) {
        const cursor = Math.min(selectionStart, input.value.length);
        const cursorEnd = Math.min(selectionEnd, input.value.length);
        input.setSelectionRange(cursor, cursorEnd);
      }
    }

    const activeSuggestionId =
      this._suggestionState.status === 'open' && this._suggestionState.activeIndex >= 0
        ? `searchSuggestion-${this._suggestionState.activeIndex}`
        : '';
    const isSuggestionOpen = this._suggestionState.status !== 'idle';

    input.setAttribute('aria-expanded', isSuggestionOpen ? 'true' : 'false');
    if (activeSuggestionId) {
      input.setAttribute('aria-activedescendant', activeSuggestionId);
    } else {
      input.removeAttribute('aria-activedescendant');
    }

    const clearButton = this.shadowRoot?.getElementById('clearSearchBtn') as HTMLButtonElement | null;
    if (clearButton) {
      clearButton.hidden = this._suggestionState.query.length === 0;
    }
  }

  private updateSuggestions() {
    const container = this.getSuggestionContainer();
    if (!container) return;

    container.innerHTML = this.renderSuggestions();
    this.attachSuggestionListeners();
  }

  private updateOverlay() {
    const container = this.getOverlayContainer();
    if (!container) return;

    const hasResults = this._state.status === 'results' && this._state.results && this._state.results.length > 0;
    const hasMessage = this._state.status === 'results' && this._state.message;
    const isSearching = this._state.status === 'searching';

    container.innerHTML = `
      ${this.renderPanel()}
      ${isSearching ? '<div class="panel"><div class="searching">Suche läuft...</div></div>' : ''}
      ${hasMessage ? `<div class="panel"><div class="message">${this.escapeHtml(this._state.message ?? '')}</div></div>` : ''}
    `;
    this.attachResultListeners(hasResults);
    this.attachPanelToggleListener();
  }

  private attachPanelToggleListener() {
    const toggleBtn = this.shadowRoot?.getElementById('panelToggleBtn');
    toggleBtn?.addEventListener('click', () => this.toggleResultsExpanded());
  }

  private attachSuggestionListeners() {
    if (this._suggestionState.status !== 'open') return;

    this._suggestionState.suggestions.forEach((_, idx) => {
      const item = this.shadowRoot?.querySelector(`[data-suggestion="${idx}"]`);
      item?.addEventListener('click', () => {
        void this.selectSuggestion(idx);
      });
    });
  }

  private attachResultListeners(hasResults?: boolean) {
    if (!hasResults || !this._state.results) return;

    this._state.results.forEach((_, idx) => {
      const item = this.shadowRoot?.querySelector(`[data-index="${idx}"]`);
      item?.addEventListener('click', () => this.selectItem(idx));

      const detailBtn = this.shadowRoot?.querySelector(`[data-detail="${idx}"]`);
      detailBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const egrid = this._state.results?.[idx]?.egrid;
        if (egrid) this.navigateToDetail(egrid);
      });

      const pdfBtn = this.shadowRoot?.querySelector(`[data-pdf="${idx}"]`);
      pdfBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const egrid = this._state.results?.[idx]?.egrid;
        if (egrid && this._config) {
          const url = `${this._config.serviceBaseUrl}/extract/pdf/?EGRID=${egrid}&GEOMETRY=true&WITHIMAGES=true&LANG=${this._config.language}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });
    });
  }

  private renderSuggestions(): string {
    if (this._suggestionState.status === 'idle') {
      return '';
    }

    if (this._suggestionState.status === 'loading') {
      return `
        <div class="suggestions" id="searchSuggestions" role="listbox">
          <div class="suggestion-message">Vorschläge werden geladen...</div>
        </div>
      `;
    }

    if (this._suggestionState.status === 'empty') {
      return `
        <div class="suggestions" id="searchSuggestions" role="listbox">
          <div class="suggestion-message">Keine Vorschläge gefunden.</div>
        </div>
      `;
    }

    if (this._suggestionState.status === 'error') {
      return `
        <div class="suggestions" id="searchSuggestions" role="listbox">
          <div class="suggestion-message">Vorschläge konnten nicht geladen werden.</div>
        </div>
      `;
    }

    const activeIndex = this._suggestionState.activeIndex;
    return `
      <div class="suggestions" id="searchSuggestions" role="listbox">
        ${this._suggestionState.suggestions.map((suggestion, idx) => {
          const label = this.getSuggestionLabel(suggestion);
          const detail = this.stripTags(suggestion.detail ?? '');
          return `
            <button
              type="button"
              class="suggestion-item ${idx === activeIndex ? 'active' : ''}"
              id="searchSuggestion-${idx}"
              role="option"
              aria-selected="${idx === activeIndex ? 'true' : 'false'}"
              data-suggestion="${idx}"
            >
              <span class="suggestion-label">${this.escapeHtml(label)}</span>
              ${detail && detail !== label ? `<span class="suggestion-detail">${this.escapeHtml(detail)}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderPanel(): string {
    if (this._state.status !== 'results' || !this._state.results || this._state.results.length === 0) {
      return '';
    }

    const items = this._state.results;
    const selectedIdx = this._state.selectedIndex ?? 0;
    const expanded = this._resultsExpanded;

    return `
      <div class="panel">
        <div class="panel-header">
          <span>${items.length} Grundstück${items.length > 1 ? 'e' : ''} gefunden</span>
          <button
            type="button"
            class="panel-toggle ${expanded ? '' : 'collapsed'}"
            id="panelToggleBtn"
            aria-expanded="${expanded ? 'true' : 'false'}"
            aria-controls="panelBody"
            title="${expanded ? 'Zuklappen' : 'Aufklappen'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
            </svg>
          </button>
        </div>
        <div class="panel-body ${expanded ? '' : 'collapsed'}" id="panelBody">
          ${items.map((item, idx) => `
            <div class="result-item ${idx === selectedIdx ? 'selected' : ''}" data-index="${idx}">
              <div class="result-number">Grundstück ${this.escapeHtml(item.number)}</div>
              <div class="result-egrid">${this.escapeHtml(item.egrid)}</div>
              <div class="result-type">${this.escapeHtml(item.typeLabel)}</div>
              <div class="result-actions">
                <button class="detail-btn" data-detail="${idx}">Details anzeigen</button>
                <button class="pdf-btn" data-pdf="${idx}">PDF-Auszug</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

customElements.define('gi-search-view', GiSearchView);

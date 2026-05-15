import { afterEach, describe, expect, it, vi } from 'vitest';
import '../search/gi-search-view';
import type { AppConfig } from '../config';
import type { AvService } from '../services/av-service';
import type { GetEgridItem } from '../parsers/types';
import type { Router } from '../router';

const mockConfig: AppConfig = {
  mockEnabled: true,
  language: 'de',
  serviceBaseUrl: 'https://avws.sogeo.services',
  authUrl: '#/auth-dummy',
  projection: 'EPSG:2056',
  startCenter: [2588387, 1226344],
  startZoom: 6,
  startExtent: [2420000, 1030000, 2900000, 1350000],
  searchServerUrlTemplate: 'https://api3.geo.admin.ch/rest/services/ech/SearchServer?sr=2056&searchText={searchText}&lang={language}&type=locations&limit=20&geometryFormat=geojson&origins=address,parcel',
  backgroundStrategy: { switchScaleDenominator: 5000 },
  backgroundWmts: { capabilitiesUrl: '', urlTemplate: '', layer: '', matrixSet: '2056_27', format: 'image/jpeg' },
  backgroundWms: { url: '', layers: '', format: 'image/png', transparent: true, crs: 'EPSG:2056' },
};

const getegridItems: GetEgridItem[] = [
  {
    egrid: 'CH424036463565',
    number: '866',
    identDN: 'BE0200000108',
    typeCode: 'RealEstate',
    typeLabel: 'Liegenschaft',
  },
];

interface TestView {
  el: HTMLElement;
  avService: AvService;
  getEGRID: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
}

function createView(): TestView {
  const getEGRID = vi.fn().mockResolvedValue(getegridItems);
  const avService: AvService = {
    getEGRID,
    getExtractById: vi.fn() as unknown as AvService['getExtractById'],
  };
  const navigate = vi.fn();
  const router: Router = {
    getCurrentRoute: () => ({ path: 'search' }),
    navigate,
    subscribe: () => () => {},
  };
  const el = document.createElement('gi-search-view') as HTMLElement & {
    setServices(config: AppConfig, avService: AvService, router: Router): void;
  };

  document.body.appendChild(el);
  el.setServices(mockConfig, avService, router);

  return { el, avService, getEGRID, navigate };
}

function getInput(el: HTMLElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector<HTMLInputElement>('input#searchInput');
  if (!input) throw new Error('search input not found');
  return input;
}

function setInputValue(el: HTMLElement, value: string) {
  const input = getInput(el);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

function stubSearchFeatures(features: Array<{
  id: string | number;
  label: string;
  detail?: string;
  origin: 'address' | 'parcel';
  y: number;
  x: number;
}>) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          type: 'FeatureCollection',
          features: features.map((feature) => ({
            id: feature.id,
            properties: {
              label: feature.label,
              detail: feature.detail,
              origin: feature.origin,
              y: feature.y,
              x: feature.x,
            },
          })),
        }),
    } as Response)
  );

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function runAutocompleteDebounce() {
  await vi.advanceTimersByTimeAsync(300);
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GiSearchView', () => {
  it('registers the custom element', () => {
    expect(customElements.get('gi-search-view')).toBeDefined();
  });

  it('does not call SearchServer below three characters', async () => {
    vi.useFakeTimers();
    const fetchMock = stubSearchFeatures([]);
    const { el } = createView();

    setInputValue(el, 'ab');
    await runAutocompleteDebounce();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeNull();
  });

  it('renders debounced GeoJSON suggestions with search icon and no button', async () => {
    vi.useFakeTimers();
    const fetchMock = stubSearchFeatures([
      {
        id: 1500467,
        label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588195.5,
        x: 1226272.625,
      },
    ]);
    const { el } = createView();

    setInputValue(el, 'Che');
    await runAutocompleteDebounce();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot?.querySelector('#searchBtn')).toBeNull();
    expect(el.shadowRoot?.querySelector('svg.bi.bi-search')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('.suggestion-label')?.textContent).toBe('Chemin des Esserts 1 2536 Plagne');
    expect(el.shadowRoot?.querySelector('.suggestion-label')?.innerHTML).not.toContain('<b>');
  });

  it('keeps the same map element while typing and loading suggestions', async () => {
    vi.useFakeTimers();
    stubSearchFeatures([
      {
        id: 1500467,
        label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588195.5,
        x: 1226272.625,
      },
    ]);
    const { el } = createView();
    const mapEl = el.shadowRoot?.querySelector('gi-map');

    setInputValue(el, 'Che');
    expect(el.shadowRoot?.querySelector('gi-map')).toBe(mapEl);

    await runAutocompleteDebounce();
    expect(el.shadowRoot?.querySelector('gi-map')).toBe(mapEl);

    getInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(el.shadowRoot?.querySelector('gi-map')).toBe(mapEl);
  });

  it('closes suggestions on outside click but keeps them open inside the search field', async () => {
    vi.useFakeTimers();
    stubSearchFeatures([
      {
        id: 1500467,
        label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588195.5,
        x: 1226272.625,
      },
    ]);
    const { el } = createView();

    setInputValue(el, 'Che');
    await runAutocompleteDebounce();
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeTruthy();

    getInput(el).dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeTruthy();

    el.shadowRoot?.querySelector('.suggestions')?.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeTruthy();

    el.shadowRoot?.querySelector('.map-wrapper')?.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeNull();
  });

  it('selects an address suggestion and calls GetEGRID with its coordinates', async () => {
    vi.useFakeTimers();
    stubSearchFeatures([
      {
        id: 1500467,
        label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588195.5,
        x: 1226272.625,
      },
    ]);
    const { el, getEGRID, navigate } = createView();

    setInputValue(el, 'Che');
    await runAutocompleteDebounce();
    el.shadowRoot?.querySelector<HTMLElement>('.suggestion-item')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(getEGRID).toHaveBeenCalledWith(2588195.5, 1226272.625);
    expect(navigate).not.toHaveBeenCalled();
    expect(el.shadowRoot?.textContent).toContain('1 Grundstück gefunden');
  });

  it('clears input and suggestions without clearing existing property results', async () => {
    vi.useFakeTimers();
    stubSearchFeatures([
      {
        id: 1500467,
        label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588195.5,
        x: 1226272.625,
      },
    ]);
    const { el } = createView();

    setInputValue(el, 'Che');
    await runAutocompleteDebounce();
    el.shadowRoot?.querySelector<HTMLElement>('.suggestion-item')?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(el.shadowRoot?.textContent).toContain('1 Grundstück gefunden');

    setInputValue(el, 'Che');
    await runAutocompleteDebounce();
    const clearButton = el.shadowRoot?.querySelector<HTMLButtonElement>('#clearSearchBtn');
    expect(clearButton?.hidden).toBe(false);

    clearButton?.click();

    expect(getInput(el).value).toBe('');
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeNull();
    expect(clearButton?.hidden).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('1 Grundstück gefunden');
  });

  it('selects a parcel suggestion with EGRID and navigates directly', async () => {
    vi.useFakeTimers();
    stubSearchFeatures([
      {
        id: 'parcel-feature',
        label: 'Parzelle 926',
        detail: 'CH994641443597',
        origin: 'parcel',
        y: 2606500,
        x: 1237000,
      },
    ]);
    const { el, getEGRID, navigate } = createView();

    setInputValue(el, 'Par');
    await runAutocompleteDebounce();
    el.shadowRoot?.querySelector<HTMLElement>('.suggestion-item')?.click();
    await Promise.resolve();

    expect(navigate).toHaveBeenCalledWith({ path: 'detail', egrid: 'CH994641443597' });
    expect(getEGRID).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation, escape close, focus reopen and enter selection', async () => {
    vi.useFakeTimers();
    stubSearchFeatures([
      {
        id: 'first',
        label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588195.5,
        x: 1226272.625,
      },
      {
        id: 'second',
        label: 'Chemin des Esserts 10 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 10 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588066.5,
        x: 1226242.5,
      },
    ]);
    const { el, getEGRID } = createView();

    setInputValue(el, 'Che');
    await runAutocompleteDebounce();

    getInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(el.shadowRoot?.querySelectorAll('.suggestion-item')[1]?.classList.contains('active')).toBe(true);

    getInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeNull();

    getInput(el).dispatchEvent(new Event('focus'));
    expect(el.shadowRoot?.querySelector('.suggestions')).toBeTruthy();

    getInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    getInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(getEGRID).toHaveBeenCalledWith(2588066.5, 1226242.5);
  });

  it('toggles the results panel with a chevron button', async () => {
    vi.useFakeTimers();
    stubSearchFeatures([
      {
        id: 1500467,
        label: 'Chemin des Esserts 1 <b>2536 Plagne</b>',
        detail: 'chemin des esserts 1 2536 plagne 449 sauge ch be',
        origin: 'address',
        y: 2588195.5,
        x: 1226272.625,
      },
    ]);
    const { el } = createView();

    setInputValue(el, 'Che');
    await runAutocompleteDebounce();
    el.shadowRoot?.querySelector<HTMLElement>('.suggestion-item')?.click();
    await Promise.resolve();
    await Promise.resolve();

    const panelBody = el.shadowRoot?.querySelector('.panel-body');
    expect(panelBody).not.toBeNull();
    expect(panelBody?.classList.contains('collapsed')).toBe(false);

    let toggleBtn = el.shadowRoot?.querySelector<HTMLButtonElement>('#panelToggleBtn');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');

    toggleBtn?.click();
    await Promise.resolve();

    const updatedPanelBody = el.shadowRoot?.querySelector('.panel-body');
    expect(updatedPanelBody?.classList.contains('collapsed')).toBe(true);
    const updatedToggleBtn = el.shadowRoot?.querySelector<HTMLButtonElement>('#panelToggleBtn');
    expect(updatedToggleBtn?.classList.contains('collapsed')).toBe(true);
    expect(updatedToggleBtn?.getAttribute('aria-expanded')).toBe('false');

    updatedToggleBtn?.click();
    await Promise.resolve();

    const reopenedPanelBody = el.shadowRoot?.querySelector('.panel-body');
    expect(reopenedPanelBody?.classList.contains('collapsed')).toBe(false);
    const reopenedToggleBtn = el.shadowRoot?.querySelector<HTMLButtonElement>('#panelToggleBtn');
    expect(reopenedToggleBtn?.classList.contains('collapsed')).toBe(false);
    expect(reopenedToggleBtn?.getAttribute('aria-expanded')).toBe('true');
  });
});

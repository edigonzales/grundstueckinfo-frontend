import { test, expect, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';

const WMTS_PIXEL = [255, 0, 255, 255] as const;
const WMS_PIXEL = [0, 214, 255, 255] as const;

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function solidPng([r, g, b, a]: readonly number[], width = 256, height = 256) {
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 4;
      raw[pixelOffset] = r;
      raw[pixelOffset + 1] = g;
      raw[pixelOffset + 2] = b;
      raw[pixelOffset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function routeMapImages(page: Page) {
  const wmtsUrls: string[] = [];
  const wmsUrls: string[] = [];
  const wmtsImage = solidPng(WMTS_PIXEL);
  const headers = {
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  };

  await page.route('https://wmts.geo.admin.ch/**/ch.swisstopo.pixelkarte-farbe/**', async (route) => {
    wmtsUrls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers,
      body: wmtsImage,
    });
  });

  await page.route('https://geodienste.ch/**', async (route) => {
    const requestUrl = route.request().url();
    const url = new URL(requestUrl);
    const width = Number(url.searchParams.get('WIDTH') ?? 256);
    const height = Number(url.searchParams.get('HEIGHT') ?? 256);
    wmsUrls.push(requestUrl);
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers,
      body: solidPng(WMS_PIXEL, width, height),
    });
  });

  return { wmtsUrls, wmsUrls };
}

async function waitForMapReady(page: Page) {
  await expect(page.locator('gi-map')).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => {
    const app = document.querySelector('gi-app');
    const searchView = app?.shadowRoot?.querySelector('gi-search-view');
    const mapEl = searchView?.shadowRoot?.querySelector('gi-map') as any;
    const canvas = mapEl?.shadowRoot?.querySelector('canvas') as HTMLCanvasElement | null;
    return Boolean(mapEl?._map && canvas && canvas.width > 0 && canvas.height > 0);
  });
}

async function getMapState(page: Page) {
  return page.evaluate(() => {
    const app = document.querySelector('gi-app');
    const searchView = app?.shadowRoot?.querySelector('gi-search-view');
    const mapEl = searchView?.shadowRoot?.querySelector('gi-map') as any;
    const view = mapEl?._map?.getView();
    return {
      center: view?.getCenter(),
      zoom: view?.getZoom(),
      wmtsVisible: mapEl?._wmtsLayer?.getVisible(),
      wmsVisible: mapEl?._wmsLayer?.getVisible(),
    };
  });
}

async function setMapZoom(page: Page, zoom: number) {
  await page.evaluate((nextZoom) => {
    const app = document.querySelector('gi-app');
    const searchView = app?.shadowRoot?.querySelector('gi-search-view');
    const mapEl = searchView?.shadowRoot?.querySelector('gi-map') as any;
    mapEl.setZoom(nextZoom);
    mapEl._map.renderSync();
  }, zoom);
}

async function sampleCanvasCenters(page: Page) {
  return page.evaluate(() => {
    const app = document.querySelector('gi-app');
    const searchView = app?.shadowRoot?.querySelector('gi-search-view');
    const mapEl = searchView?.shadowRoot?.querySelector('gi-map') as HTMLElement | null;
    const canvases = Array.from(mapEl?.shadowRoot?.querySelectorAll('canvas') ?? []) as HTMLCanvasElement[];

    return canvases.flatMap((canvas) => {
      const context = canvas.getContext('2d');
      if (!context || canvas.width === 0 || canvas.height === 0) return [];

      const data = context.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1
      ).data;
      return [[data[0], data[1], data[2], data[3]]];
    });
  });
}

async function expectCanvasColor(page: Page, matcher: (rgba: number[]) => boolean) {
  await expect
    .poll(async () => {
      const pixels = await sampleCanvasCenters(page);
      return pixels.some(matcher);
    }, { timeout: 10000 })
    .toBe(true);
}

async function getHighlightFeatureCount(page: Page) {
  return page.evaluate(() => {
    const app = document.querySelector('gi-app');
    const searchView = app?.shadowRoot?.querySelector('gi-search-view');
    const mapEl = searchView?.shadowRoot?.querySelector('gi-map') as any;
    return mapEl?._highlightSource?.getFeatures().length ?? 0;
  });
}

async function getHighlightGeometryKey(page: Page) {
  return page.evaluate(() => {
    const app = document.querySelector('gi-app');
    const searchView = app?.shadowRoot?.querySelector('gi-search-view');
    const mapEl = searchView?.shadowRoot?.querySelector('gi-map') as any;
    const feature = mapEl?._highlightSource?.getFeatures()[0];
    return JSON.stringify(feature?.getGeometry()?.getCoordinates() ?? null);
  });
}

test.describe('App startet', () => {
  test('zeigt Suchseite mit Titel', async ({ page }) => {
    await routeMapImages(page);
    await page.goto('/');
    await waitForMapReady(page);

    await expect(page.getByRole('heading', { name: 'Grundstückinformation', level: 2 })).toBeVisible();
    await expect(page.getByText(
      'Um Grundstückinformationen einzusehen, klicken sie auf das gewünschte Grundstück oder suchen sie eine Adresse oder ein Grundstück im Suchfeld.',
      { exact: true }
    )).toBeVisible();

    const inputExists = await page.evaluate(() => {
      const app = document.querySelector('gi-app');
      const searchView = app?.shadowRoot?.querySelector('gi-search-view');
      const input = searchView?.shadowRoot?.querySelector('input#searchInput');
      return !!input;
    });
    expect(inputExists).toBe(true);

    const layout = await page.evaluate(() => {
      const app = document.querySelector('gi-app');
      const searchView = app?.shadowRoot?.querySelector('gi-search-view');
      const mapWrapper = searchView?.shadowRoot?.querySelector('.map-wrapper') as HTMLElement | null;
      const rect = mapWrapper?.getBoundingClientRect();

      return {
        bodyScrollHeight: document.body.scrollHeight,
        innerHeight: window.innerHeight,
        mapHeight: rect?.height ?? 0,
        mapBottomGap: rect ? window.innerHeight - rect.bottom : 0,
      };
    });

    expect(layout.bodyScrollHeight).toBeLessThanOrEqual(layout.innerHeight + 1);
    expect(layout.mapHeight).toBeGreaterThan(0);
    expect(layout.mapBottomGap).toBeGreaterThanOrEqual(20);
    expect(layout.mapBottomGap).toBeLessThanOrEqual(28);
    await expect(page).toHaveTitle('Grundstückinformation');
  });

  test('zeigt OpenLayers-Controls mit Standard-CSS', async ({ page }) => {
    await routeMapImages(page);
    await page.goto('/#/search');
    await waitForMapReady(page);

    const controlState = await page.evaluate(() => {
      const app = document.querySelector('gi-app');
      const searchView = app?.shadowRoot?.querySelector('gi-search-view');
      const mapEl = searchView?.shadowRoot?.querySelector('gi-map') as HTMLElement | null;
      const zoomButton = mapEl?.shadowRoot?.querySelector('.ol-zoom .ol-zoom-in') as HTMLElement | null;
      const scaleLine = mapEl?.shadowRoot?.querySelector('.ol-scale-line') as HTMLElement | null;
      const scaleInner = mapEl?.shadowRoot?.querySelector('.ol-scale-line-inner') as HTMLElement | null;
      const zoomStyle = zoomButton ? getComputedStyle(zoomButton) : null;
      const scaleLineStyle = scaleLine ? getComputedStyle(scaleLine) : null;
      const scaleInnerStyle = scaleInner ? getComputedStyle(scaleInner) : null;

      return {
        hasZoomButton: Boolean(zoomButton),
        hasScaleLine: Boolean(scaleLine),
        hasScaleInner: Boolean(scaleInner),
        zoomBackground: zoomStyle?.backgroundColor,
        zoomPadding: zoomStyle?.padding,
        zoomWidth: zoomStyle?.width,
        scalePosition: scaleLineStyle?.position,
        scaleBottom: scaleLineStyle?.bottom,
        scaleInnerBorderBottom: scaleInnerStyle?.borderBottomStyle,
        scaleInnerBorderTop: scaleInnerStyle?.borderTopStyle,
        scaleText: scaleInner?.textContent?.trim(),
      };
    });

    expect(controlState.hasZoomButton).toBe(true);
    expect(controlState.hasScaleLine).toBe(true);
    expect(controlState.hasScaleInner).toBe(true);
    expect(controlState.zoomBackground).not.toBe('rgb(204, 0, 0)');
    expect(controlState.zoomPadding).toBe('0px');
    expect(controlState.zoomWidth).toBe('22px');
    expect(controlState.scalePosition).toBe('absolute');
    expect(controlState.scaleBottom).toBe('8px');
    expect(controlState.scaleInnerBorderBottom).toBe('solid');
    expect(controlState.scaleInnerBorderTop).toBe('none');
    expect(controlState.scaleText).toMatch(/\d+ (m|km)/);
  });

  test('lädt swisstopo-WMTS und malt die Testkacheln', async ({ page }) => {
    const requests = await routeMapImages(page);

    await page.goto('/#/search');
    await waitForMapReady(page);
    await setMapZoom(page, 6);

    await expect.poll(() => requests.wmtsUrls.length, { timeout: 10000 }).toBeGreaterThan(0);
    expect(requests.wmtsUrls.some((url) => url.includes('/ch.swisstopo.pixelkarte-farbe/') && url.includes('/2056/18/'))).toBe(true);

    const state = await getMapState(page);
    expect(state.center).toEqual([2588387, 1226344]);
    expect(state.zoom).toBe(6);
    expect(state.wmtsVisible).toBe(true);
    expect(state.wmsVisible).toBe(false);
    await expectCanvasColor(page, ([r, g, b]) => r > 220 && g < 80 && b > 220);
  });

  test('wechselt beim Hineinzoomen auf geodienste-WMS', async ({ page }) => {
    const requests = await routeMapImages(page);

    await page.goto('/#/search');
    await waitForMapReady(page);
    await setMapZoom(page, 6);
    await expect.poll(() => requests.wmtsUrls.length, { timeout: 10000 }).toBeGreaterThan(0);

    await setMapZoom(page, 11);

    await expect.poll(() => requests.wmsUrls.length, { timeout: 10000 }).toBeGreaterThan(0);
    expect(requests.wmsUrls.some((url) => url.includes('SERVICE=WMS') && url.includes('LAYERS=daten'))).toBe(true);

    const state = await getMapState(page);
    expect(state.wmtsVisible).toBe(false);
    expect(state.wmsVisible).toBe(true);
    await expectCanvasColor(page, ([r, g, b]) => r < 80 && g > 180 && b > 220);
  });
});

test.describe('Kartenklick', () => {
  test('echter Kartenklick zeigt Mehrfachauswahl und Highlight', async ({ page }) => {
    await routeMapImages(page);
    await page.goto('/#/search');
    await waitForMapReady(page);

    await page.locator('gi-map').click({ position: { x: 360, y: 260 } });

    await expect(page.getByText(/2 Grundstücke gefunden/)).toBeVisible({ timeout: 10000 });
    const items = page.locator('.result-item');
    await expect(items).toHaveCount(2, { timeout: 10000 });

    await expect.poll(() => getHighlightFeatureCount(page), { timeout: 10000 }).toBe(1);
    const firstGeometry = await getHighlightGeometryKey(page);

    const secondItem = items.nth(1);
    await secondItem.click();
    await expect(secondItem).toHaveClass(/selected/);
    await expect.poll(() => getHighlightGeometryKey(page), { timeout: 10000 }).not.toBe(firstGeometry);
  });
});

test.describe('Suche', () => {
  test('Parzellsuche mit EGRID oeffnet Detailansicht', async ({ page }) => {
    await page.goto('/#/detail/CH994641443597');

    await expect(page.getByRole('heading', { name: /926/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('CH994641443597')).toBeVisible();
  });
});

test.describe('Detailansicht', () => {
  test('Uebersicht zeigt Stammdaten und statisches Bild', async ({ page }) => {
    await page.goto('/#/detail/CH994641443597');

    await expect(page.getByRole('heading', { name: /926/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: 'Liegenschaft' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CH994641443597' })).toBeVisible();
    await expect(page.locator('gi-static-plan#mainPlan img')).toBeVisible();
    await expect(page.getByText('Nummer')).toBeVisible();
    await expect(page.getByText('EGRID')).toBeVisible();
  });

  test('Accordions oeffnen und schliessen', async ({ page }) => {
    await page.goto('/#/detail/CH994641443597');
    await expect(page.getByRole('heading', { name: /926/ })).toBeVisible({ timeout: 10000 });

    await page.getByText('Alles zuklappen').click();
    await expect(page.getByText('Bodenbedeckungsanteile')).not.toBeVisible();

    await page.getByText('Alles aufklappen').click();
    await expect(page.getByText('Bodenbedeckungsanteile')).toBeVisible();
    await expect(page.getByText('Gebäude und Bauten')).toBeVisible();
  });

  test('Eigentumsauskunft zeigt Auth-Button und Zuständige Stelle', async ({ page }) => {
    await page.goto('/#/detail/CH994641443597');
    await expect(page.getByRole('heading', { name: /926/ })).toBeVisible({ timeout: 10000 });

    await page.getByText('Alles aufklappen').click();
    await expect(page.getByText('Authentifizierung')).toBeVisible();
    await expect(page.getByText('Zuständige Stelle')).toBeVisible();
  });

  test('Projektierte Objekte erscheinen bei passender Fixture', async ({ page }) => {
    await page.goto('/#/detail/CH273542614644');
    await expect(page.getByRole('heading', { name: /533/ })).toBeVisible({ timeout: 10000 });

    await page.getByText('Alles aufklappen').click();
    await expect(page.getByText('642')).toBeVisible();
    await expect(page.getByText('CH528461643618')).toBeVisible();
  });

  test('Grundstueckbeschreibung zeigt Gebaeude mit Adressen', async ({ page }) => {
    await page.goto('/#/detail/CH834642351474');
    await expect(page.getByRole('heading', { name: /376/ })).toBeVisible({ timeout: 10000 });

    await page.getByText('Alles aufklappen').click();
    await expect(page.getByText('Gebäude und Bauten')).toBeVisible();
    await expect(page.getByText('191850652')).toBeVisible();
    await expect(page.getByText('Chemin des Oeuchettes').first()).toBeVisible();
    await expect(page.getByText('30a').first()).toBeVisible();
    await expect(page.getByText('30b').first()).toBeVisible();
    await expect(page.getByText('30c').first()).toBeVisible();
  });

  test('Zurueck-Button navigiert zur Suche', async ({ page }) => {
    await routeMapImages(page);
    await page.goto('/#/detail/CH994641443597');
    await expect(page.getByRole('heading', { name: /926/ })).toBeVisible({ timeout: 10000 });

    await page.getByText('Zurück zur Grundstückssuche').click();
    await waitForMapReady(page);
  });
});

test.describe('Fehlerzustaende', () => {
  test('204 zeigt Fehlermeldung fuer unbekanntes EGRID', async ({ page }) => {
    await page.goto('/#/detail/CH000000000000');
    await expect(page.getByText('Für dieses Grundstück ist kein Auszug verfügbar')).toBeVisible({ timeout: 10000 });
  });
});

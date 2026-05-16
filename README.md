# grundstueckinfo-frontend

Desktop-Prototyp fuer eine Vanilla-TypeScript-SPA zur Anzeige von
Grundstueckinformationen auf Basis von OpenLayers, externem AV-Webservice und
XML-Auszug.

## Dokumente

- [SPEC.md](SPEC.md): Fachliche und technische Gesamtspezifikation.
- [AGENT_STEPS.md](AGENT_STEPS.md): Schritt-fuer-Schritt-Anweisungen fuer den
  Coding-Agenten.
- [STATUS.md](STATUS.md): Umsetzungsstand und festgehaltene Entscheidungen.

## Quickstart

```bash
# Dependencies
npm install

# Development Server
npm run dev

# Production Build
npm run build
npm run preview

# Unit-Tests
npm test

# E2E-Tests
npm run test:e2e
```

## Setup

### Voraussetzungen

- Node.js 18+
- Chrome/Chromium (wird automatisch von Playwright installiert)

### Installation

```bash
npm install
```

Playwright-Browser wird bei Bedarf automatisch installiert:
```bash
npx playwright install chromium
```

## Development

```bash
npm run dev
```

Die App wird auf `http://localhost:5173` gestartet.

Das Routing basiert auf Hash-Navigation:

- `#/search` - Suchansicht (Default)
- `#/detail/:egrid` - Detailansicht fuer ein Grundstueck

## Config

Die Konfiguration wird zur Runtime geladen aus `public/config/app.config.json`.
Dabei wird `fetch()` verwendet mit Fallback auf Default-Werte bei Fehlern.

### Konfigurationsoptionen

| Feld | Beschreibung |
|------|--------------|
| `mockEnabled` | `true` = Mock-Service, `false` = Live-Service |
| `language` | Sprache fuer Webservice-Aufrufe (`de`/`fr`/`it`) |
| `serviceBaseUrl` | Basis-URL fuer AV-Webservice |
| `searchServerUrlTemplate` | geo.admin.ch SearchServer URL-Templates |
| `backgroundWmts` | swisstopo WMTS-Konfiguration (layer, matrixSet, format) |
| `backgroundWms` | geodienste.ch WMS-Konfiguration (url, layers) |
| `backgroundStrategy.switchScaleDenominator` | Umschalt-Skala WMTS↔WMS |
| `startCenter` | Startkoordinaten `[E, N]` in EPSG:2056 |
| `startZoom` | Start-Zoomlevel |

### Beispiel

```json
{
  "mockEnabled": true,
  "language": "de",
  "serviceBaseUrl": "https://avws.sogeo.services",
  "startCenter": [2588387, 1226344],
  "backgroundWmts": {
    "urlTemplate": "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/2056/{TileMatrix}/{TileCol}/{TileRow}.jpeg",
    "layer": "ch.swisstopo.pixelkarte-farbe",
    "matrixSet": "2056_27",
    "format": "image/jpeg"
  },
  "backgroundWms": {
    "url": "https://geodienste.ch/db/av_situationsplan_0/deu",
    "layers": "daten",
    "format": "image/png",
    "transparent": true
  },
  "backgroundStrategy": {
    "switchScaleDenominator": 5000
  }
}
```

## Mocking

### Wann Mock?

Der Mock-Modus ist fuer Entwicklung vorgesehen, wenn der produktive Service noch
nicht online ist oder kein Netzwerk verfuegbar ist. Standardmaessig auf `true`.

### Fixture-Dateien

Die verbindlichen Referenzen liegen in `public/mock-data/`:

- `getegrid.xml` - Antwort fuer `GetEGRID` (2 Liegenschaften)
- `CH994641443597.xml` - Standard-Extract mit Bodenbedeckung
- `CH834642351474_mit_proj_geb.xml` - Extract mit Projektiertem Gebaeude
- `CH273542614644_mit_proj_liegen.xml` - Extract mit Projektierten Liegenschaften
- `CH843546415105.xml` - Beispiel-Extract
- `CH273542614644_ohne_proj_liegen.xml` - Extract (Daten-Inkonsistenz!)

Die Fixtures werden per Vite `?raw`-Import in den Build eingebunden (kein Node.js
`fs`-Import). Sie sind 100% browser-kompatibel.

### MockAvService

- `getEGRID()` → parst `public/mock-data/getegrid.xml`
- `getExtractById(egrid)` → parst `public/mock-data/CH*.xml` anhand EGRID
- Unbekannte EGRID → Status 204 (kein Inhalt)

### LiveAvService

- Rufe produktive Endpunkte der sogeo.services AV-Webservices auf
- EGRID-Suche via `getegrid/?EN=`
- Extract via `extract/xml/?EGRID=`
- HTTP-Status: 200 (OK), 204 (kein Inhalt), 500 (Fehler)

## Services

### AvService (Interface)

- `getEGRID(easting, northing)` → Liste von Grundstuecken
- `getExtractById(egrid)` → Automatischer Auszug
- `ServiceError` mit optionalen Feldern `status` und `message`

### SearchService

- Baut SearchServer-URL aus Config-Template
- Parsing von geo.admin.ch SearchServer-Antworten
- Koordinatenregel: `EN = properties.y, properties.x`
- EGRID-Extraktion per Regex `CH[0-9]{12}` aus `detail`/`label`
- `origin=parcel` vs `origin=address` Unterscheidung

### SearchServer Resultatehandling

| Typ | Verhalten |
|-----|-----------|
| Parzelle mit EGRID | Direkt Detailansicht |
| Adresse/EGID ohne EGRID | GetEGRID ueber Koordinate |
| Keine Treffer | Meldung "Keine Treffer gefunden" |

## Karte

### OpenLayers-Konfiguration

- **Projektion**: EPSG:2056 (LV95)
- **Extent**: `[2420000, 1030000, 2900000, 1350000]`
- **Startcenter**: `[2588387, 1226344]`
- **Resolutions**: `[4000, 2000, 1000, 500, 250, 100, 50, 20, 10, 5, 2.5, 1, 0.5, 0.25, 0.1]`
- **WMTS**: OpenLayers `WMTS` mit `WMTSTileGrid`, MatrixSet `2056_27`

### Hintergrundstrategie

| Massstab | Layer | Quelle |
|----------|-------|--------|
| > 1:5000 | WMTS | swisstopo Pixelkarte (REST-Encoding) |
| <= 1:5000 | WMS | geodienste.ch AV-Situationsplan |

### Karteninteraktionen

- **Klick**: Meldet `map-click` Event mit LV95-Koordinaten
- **Highlight**: Roter Stroke + transparent roter Fill fuer Geometrien
- **Zoom**: Zentriert auf Geometrie bei Grundstuecksauswahl

## Suchansicht

- `gi-search-view` Web Component
- OpenLayers-Karte mit Sucheingabe
- SearchServer-Integration
- Klick auf Karte loest GetEGRID aus
- Auswahlpanel mit Grundstuecksliste
- Detail-Navigation per EGRID

## Detailansicht

- `gi-detail-view` Web Component mit 5 Accordion-Bereichen
- `gi-accordion-section`: Generischer Accordion mit aufklappbarem Inhalt
- `gi-static-plan`: Rendert Base64-Bilder oder WMS-URLs

### Bereiche

1. **Uebersicht**: Statischer Plan + Stammdaten-Tabelle
2. **Eigentumsauskunft**: Auth-Dummy-Link + Grundbuchamt-Infos
3. **Grundstueckbeschreibung**: Bodenbedeckungsanteile, Gebaeude, Adressen
4. **Projektierte Objekte**: Projektierte Liegenschaften/Gebaeude (nur bei Mutation)
5. **OEREB-Kataster**: Platzhalter fuer OEREB

### Globale Aktionen

- **Zurueck zur Suche** - Navigiert zurueck zur Search View
- **Alles aufklappen** - Alle Accordion-Sektionen oeffnen
- **Alles zuklappen** - Alle Accordion-Sektionen schliessen

### Fehlerbehandlung

- **204**: "Für dieses Grundstück ist kein Auszug verfügbar."
- **Netzwerkfehler**: "Fehler beim Laden des Auszugs."
- Loading-State mit "Lade Auszug..." Anzeige

## Architektur

### Web Components

Alle UI-Komponenten sind Native Web Components (kein Framework):

| Komponente | Zweck |
|------------|-------|
| `gi-app` | Root-Shell mit Router |
| `gi-search-view` | Suchansicht mit Karte |
| `gi-map` | OpenLayers-Karte mit Hintergrundstrategie |
| `gi-detail-view` | Detailansicht mit Accordion |
| `gi-accordion-section` | Generischer Accordion |
| `gi-static-plan` | Bild/WMS-Renderer |

### Hash-Routing

```
/                  → #/search  (Default)
#/search            → Suchansicht
#/detail/:egrid     → Detailansicht (EGID)
```

Router-Instanz mit `subscribe()` fuer reaktive Navigation.

### Parser-Layer

Die Anwendung verwendet einen dedizierten Parser-Layer fuer XML-Verarbeitung.
XML wird ausschliesslich im Parser-Layer gelesen, niemals direkt in UI-Komponenten.

- `src/parsers/getegrid-parser.ts`: Parst `GetEGRIDResponse`-XML
- `src/parsers/extract-parser.ts`: Parst `GetExtractByIdResponse`-XML
- `src/parsers/xml-utils.ts`: Namespace-tolerante XML-Helfer (localName-basiert)
- `src/parsers/types.ts`: Typisierte ViewModels fuer UI und Parser

### Namespace-tolerante XML-Utils

```typescript
getFirstText(root, tagName)      // Erstes Element mit localName, egal welcher NS
getFirstChild(root, tagName)     // Erstes Child-Element
getAllChildren(root, tagName)    // Alle Child-Elemente
getTextContent(el)               // Text-Content eines Elements
```

## Tests

### Unit-Tests (Vitest)

```bash
npm test
```

- **10 Testdateien**, **49 Tests**
- Config-, Router-, Parser-, Service-, Komponententests
- jsdom-Mocks: `ResizeObserver`, `CustomEvent`

### E2E-Tests (Playwright)

```bash
npm run test:e2e
```

- **12 Tests** (App-Start, Karte, Kartenklick, Suche, Detailansicht, Fehler)
- Headless Chromium
- Shadow DOM Interaktionen

### Test-Abdeckung

| Komponente | Unit-Tests | E2E |
|------------|-----------|-----|
| Config | Fallbacks, externes JSON | ✓ |
| Router | Hash-Parsing, Navigation | ✓ |
| GetEgridParser | Fixtures, Geometrie | ✓ |
| ExtractParser | Alle CH*.xml Fixtures | ✓ |
| AvService | URL-Building, Statuscodes | ✓ |
| SearchService | Koordinatenordnung | ✓ |
| gi-map | WMTS/WMS, LV95, Layerwechsel, Events | ✓ |
| gi-detail-view | Rendering, Accordion | ✓ |

## Bekannte Datenauffaelligkeiten

- `public/mock-data/CH273542614644_ohne_proj_liegen.xml` enthaelt trotz Dateinamen
  `Mutation/projectedProperty`. Dies ist ein Datenproblem der Fixture.
- Die Extract-Parser-Tests verwenden die XML-Dateien aus `public/mock-data/` als Fixtures.

## Technische Entscheidungen

1. **Kein UI-Framework**: Vanilla TypeScript + Web Components fuer
   maximale Kontrolle und minimale Bundle-Groesse (abgesehen von OpenLayers).
2. **Hash-Routing**: Statisch deploybar ohne Serverkonfiguration.
3. **Mock-Modus**: Entkopplung von externen Services zur Entwicklungszeit.
4. **Runtime-Config**: JSON statt Build-Zeit-Konfiguration fuer Flexibilitaet.
5. **Vite `?raw`**: XML-Fixtures als Inline-Strings statt `node:fs` fuer
   Browser-Kompatibilitaet.
6. **REST-Encoding fuer WMTS**: OpenLayers `WMTS`-Source mit
   `WMTSTileGrid` verwendet `requestEncoding: 'REST'`, damit die
   URL-Template-Syntax korrekt aufgeloest wird.
7. **Swisstopo WMTS + geodienste.ch WMS**: Layerstrategie gemaess SPEC.
   Der swisstopo-Layer `ch.swisstopo.pixelkarte-farbe` ist in den aktuellen
   Capabilities an MatrixSet `2056_27` gebunden; die Tile-URL verwendet
   weiterhin den Pfad `/2056/{TileMatrix}/{TileCol}/{TileRow}.jpeg`.

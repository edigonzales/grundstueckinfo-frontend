# STATUS

## Gesamtstatus

Status: done

## Schritte

| Schritt | Titel | Status | Nachweis |
|---|---|---|---|
| 1 | Projektbasis | done | npm install, build, test OK |
| 2 | Config und Routing | done | Config-Loader, Hash-Router, gi-app Root |
| 3 | Parser-Layer | done | GetEgridParser, ExtractParser, Typen, XML-Utils |
| 4 | Mock- und Live-Service | done | AvService Factory, Mock/Live, SearchService, Statuscodes |
| 5 | OpenLayers-Karte | done | gi-map, EPSG:2056, OpenLayers WMTS/WMTSTileGrid, WMTS/WMS Strategie, Highlight |
| 6 | Suchansicht | done | gi-search-view, Suche, Auswahlpanel, Kartenklick |
| 7 | Detailansicht | done | gi-detail-view, gi-accordion-section, gi-static-plan |
| 8 | E2E und Dokumentationshaertung | done | 12 Playwright Tests, README final, WMTS/WMS Request- und Canvas-Pruefung |

## Entscheidungen

- Kein UI-Framework; Vanilla TypeScript und Web Components.
- Hash-Routing.
- Runtime-Config als externe JSON-Datei.
- Default-Sprache `de`.
- Mock-Modus initial aktiv.
- SearchServer-Koordinaten: `EN=properties.y,properties.x`.
- Parcel-EGRID wird aus SearchServer `detail`/`label` extrahiert.
- Desktop-Prototyp zuerst; Mobile folgt spaeter.
- Visueller Stil orientiert sich neutral an den gelieferten Screenshots.
- Hintergrundkarte: swisstopo-WMTS `ch.swisstopo.pixelkarte-farbe` fuer kleine
  Massstaebe, geodienste.ch-WMS ab ca. 1:5000.
- swisstopo-WMTS wird mit OpenLayers `WMTS`/`WMTSTileGrid` und MatrixSet
  `2056_27` konfiguriert; keine `@swissgeo/coordinates`-Abhaengigkeit.
- Startcenter der Karte: `[2588387, 1226344]` in EPSG:2056.

## Bekannte Datenauffaelligkeiten

- `public/mock-data/CH273542614644_ohne_proj_liegen.xml` enthaelt trotz Dateiname
  doch `Mutation/projectedProperty`. Dies ist ein Datenproblem der Fixture.
- Grundstückinformation Benutzerführung Empfehlung_de.docx: siehe
  `input/20260415 Grundstückinformation Benutzerführung Empfehlung_de.docx`
- Entwurf Weisung Amtliche Vermessung Webservice de.docx: siehe
  `input/20250725 Entwurf Weisung Amtliche Vermessung Webservice de.docx`
- GetEGRID-Beispiel: `public/mock-data/getegrid.xml`
- Extract-Beispiele: `public/mock-data/CH*.xml`
- Screenshot-Referenzen: `input/Screenshot*.png`

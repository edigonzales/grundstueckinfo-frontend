# Anweisungen fuer den Coding-Agenten

## Allgemeine Arbeitsregeln

- Nach jedem Schritt muss ein lauffaehiger, fehlerfreier Stand erreicht werden.
- Nach jedem Schritt `STATUS.md` aktualisieren.
- Bei jedem Umsetzungsschritt `README.md` oder ergaenzende Dokumentation
  nachfuehren.
- Keine Frameworks wie React, Vue, Svelte oder Angular verwenden.
- UI-Komponenten als Web Components kapseln.
- XML niemals direkt in UI-Komponenten parsen.
- Tests sind Teil jedes Schrittes, nicht nachgelagert.
- Vor jedem Schritt die relevanten Artefakte in `public/mock-data/` und `input/`
  erneut lesen, wenn sie fuer den Schritt massgebend sind.

## Schritt 1: Projektbasis

Aufgaben:

- Vite + TypeScript initialisieren.
- Package Scripts:
  - `dev`
  - `build`
  - `test`
  - `test:e2e`
  - `preview`
- Vitest einrichten.
- Playwright einrichten.
- Basisdateien pruefen und bei Bedarf ergaenzen:
  - `README.md`
  - `SPEC.md`
  - `AGENT_STEPS.md`
  - `STATUS.md`

Akzeptanz:

- `npm install` funktioniert.
- `npm run build` funktioniert.
- `npm test` funktioniert.
- Startseite zeigt eine einfache App-Shell.
- `STATUS.md` markiert Schritt 1 als `done`.

## Schritt 2: Config und Routing

Aufgaben:

- Runtime-Config aus `/config/app.config.json` laden.
- Fallback-Defaults implementieren.
- Hash-Routing fuer `#/search` und `#/detail/:egrid`.
- `gi-app` als Root-Web-Component implementieren.

Akzeptanz:

- App startet ohne externe Config.
- App nutzt externe Config, wenn vorhanden.
- Hash-Routing ist per Unit-Test abgedeckt.
- `STATUS.md` und `README.md` sind aktualisiert.

## Schritt 3: Parser-Layer

Aufgaben:

- `GetEgridParser` implementieren.
- `ExtractParser` implementieren.
- Namespace-tolerante XML-Helfer implementieren.
- Typisierte ViewModels definieren.
- Fixtures direkt aus `public/mock-data/` in Tests verwenden.

Akzeptanz:

- `public/mock-data/getegrid.xml` ergibt zwei Treffer.
- Alle `public/mock-data/CH*.xml` lassen sich parsen.
- Tests pruefen mindestens Grundstuecknummer, EGRID, Typ, Gemeinde, Flaeche,
  Plaene, LandCover, Buildings, Offices und Mutations.
- UI enthaelt keine XML-Parsing-Logik.
- `STATUS.md` und Dokumentation sind aktualisiert.

## Schritt 4: Mock- und Live-Service

Aufgaben:

- `AvService` mit Interface implementieren.
- Mock-Modus verwendet XML-Dateien aus `public/mock-data/`.
- Live-Modus baut URLs gemaess `SPEC.md`.
- HTTP-Statuscodes `200`, `204`, `500` behandeln.
- `SearchService` fuer geo.admin SearchServer implementieren.

Akzeptanz:

- Unit-Tests fuer URL-Building.
- Unit-Tests fuer Mock-Antworten.
- Unit-Test fuer SearchServer-Koordinatenordnung `properties.y, properties.x`.
- Dokumentation zu Mock/Live-Umschaltung.
- `STATUS.md` ist aktualisiert.

## Schritt 5: OpenLayers-Karte

Aufgaben:

- `gi-map` implementieren.
- `EPSG:2056` mit `proj4` registrieren.
- Hintergrundstrategie aus Config implementieren:
  swisstopo-WMTS `ch.swisstopo.pixelkarte-farbe` fuer kleine Massstaebe,
  geodienste.ch-WMS ab ca. 1:5000.
- Klick-Event nach aussen melden.
- Geometrien aus `GetEGRID` als Vector Highlight anzeigen.
- Auswahlwechsel aktualisiert Highlight.

Akzeptanz:

- Karte rendert im E2E-Test sichtbar.
- Bei herausgezoomter Karte ist der swisstopo-WMTS sichtbar.
- Bei `scaleDenominator <= 5000` ist der geodienste.ch-WMS sichtbar und der
  swisstopo-WMTS ausgeblendet.
- Mock-Klick zeigt Auswahlpanel.
- Zwei Treffer aus `getegrid.xml` werden angezeigt.
- Highlight wechselt bei Auswahlwechsel.
- `STATUS.md` und Dokumentation sind aktualisiert.

## Schritt 6: Suchansicht

Aufgaben:

- `gi-search-view` implementieren.
- Suchfeld mit SearchServer-Abfrage.
- Trefferliste anzeigen.
- Bei Parzellentreffer EGRID extrahieren und direkt Extract laden.
- Bei Adresstreffer `GetEGRID` ueber Koordinate ausloesen.
- Auswahlpanel gemaess Screenshot-Stil bauen.

Akzeptanz:

- Suche kann gemockt getestet werden.
- Parzellen-EGRID wird aus `detail`/`label` extrahiert.
- Adresstreffer nutzt `EN=properties.y,properties.x`.
- Auswahl zeigt Nummer, EGRID und Grundstuecksart.
- `STATUS.md` und Dokumentation sind aktualisiert.

## Schritt 7: Detailansicht

Aufgaben:

- `gi-detail-view`, `gi-accordion-section`, `gi-static-plan` implementieren.
- Uebersicht mit Plan und Stammdaten bauen.
- Accordions fuer Eigentumsauskunft, Grundstueckbeschreibung, Projektierte
  Objekte und OEREB.
- Base64-Bilder als `data:image/png;base64,...` rendern.
- Offices aus XML anzeigen.
- Leere Zustaende implementieren.

Akzeptanz:

- `CH994641443597_eo_mit_egid_geb_mit_zwei_adressen.xml` zeigt mehrere
  Gebaeude/Adressen.
- `CH273542614644_mit_proj_liegen.xml` zeigt projektierte Objekte.
- Eigentumsauskunft zeigt Dummy-Auth und Grundbuchamt.
- OEREB zeigt Platzhalter.
- `Alles aufklappen`/`Alles zuklappen` funktionieren.
- `STATUS.md` und Dokumentation sind aktualisiert.

## Schritt 8: E2E und Dokumentationshaertung

Aufgaben:

- Playwright-Szenarien:
  - App startet.
  - Karte sichtbar.
  - Kartenklick mit Mehrfachauswahl.
  - Suchresultat mit direktem Extract.
  - Detailansicht oeffnet.
  - Accordions funktionieren.
  - Fehler-/Leerzustaende sichtbar.
- README finalisieren:
  - Setup
  - Development
  - Config
  - Mocking
  - Tests
  - bekannte Datenauffaelligkeiten

Akzeptanz:

- `npm run build`
- `npm test`
- `npm run test:e2e`
- `STATUS.md` zeigt alle Schritte als `done`.

## Testplan

Unit-Tests:

- Config-Fallbacks und externe Config.
- Hash-Router.
- `GetEgridParser` mit `public/mock-data/getegrid.xml`.
- `ExtractParser` mit allen `public/mock-data/CH*.xml`.
- Service-URL-Building.
- SearchServer-Koordinatenordnung.
- EGRID-Regex aus Parcel-Treffern.
- Fehlerfaelle `204`, `500`, ungueltiges XML.

E2E-Tests:

- App laedt und zeigt Suchseite.
- Karte rendert nicht leer.
- Kartenklick ruft Mock-GetEGRID auf.
- Mehrfachauswahl zeigt zwei Grundstuecke.
- Auswahlwechsel aendert Highlight.
- Parzellsuche mit EGRID oeffnet Detailansicht.
- Detailansicht zeigt Uebersicht, statisches Bild und Stammdaten.
- Accordions oeffnen/schliessen.
- Eigentumsauskunft zeigt Dummy-Auth und Grundbuchamt.
- Projektierte Objekte erscheinen bei passender Fixture.
- OEREB zeigt Platzhalter.

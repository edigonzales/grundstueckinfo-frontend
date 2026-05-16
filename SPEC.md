# Spezifikation: Grundstueckinformation Frontend

## Ziel

Es soll ein Desktop-Prototyp einer TypeScript-SPA fuer Grundstueckinformationen
entstehen. Die Anwendung erlaubt:

- Suche nach Adresse, Ort, PLZ, Koordinate, Grundstuecknummer, EGRID oder EGID.
- Klick in eine OpenLayers-Karte.
- Ermittlung moeglicher Grundstuecke via `GetEGRID`.
- Auswahl eines Grundstuecks bei Mehrfachtreffern.
- Abruf eines XML-Auszugs via `GetExtractById`.
- Darstellung einer Detailansicht mit Uebersicht, Stammdaten, statischen
  Kartenbildern und aufklappbaren Informationsbereichen.

Die Anwendung wird ohne UI-Framework umgesetzt. Zulaessig sind Vite, Vanilla
TypeScript, Web Components, OpenLayers, `proj4`, Testbibliotheken und kleine
Hilfspakete, sofern sie klar begruendet sind.

## Verbindliche Quellen

Der Coding-Agent muss diese Artefakte lesen und fuer die Umsetzung
beruecksichtigen:

- Benutzerfuehrung/UI:
  `input/20260415 Grundstückinformation Benutzerführung Empfehlung_de.docx`
- Webservice:
  `input/20250725 Entwurf Weisung Amtliche Vermessung Webservice de.docx`
- GetEGRID-Beispiel: `public/mock-data/getegrid.xml`
- Extract-Beispiele:
  - `public/mock-data/CH994641443597.xml`
  - `public/mock-data/CH994641443597_eo_mit_egid.xml`
  - `public/mock-data/CH994641443597_eo_mit_egid_geb_mit_zwei_adressen.xml`
  - `public/mock-data/CH843546415105.xml`
  - `public/mock-data/CH273542614644_mit_proj_liegen.xml`
  - `public/mock-data/CH273542614644_ohne_proj_liegen.xml`
- Visuelle Referenzen:
  - `input/Screenshot 2026-05-13 at 16.40.38.png`: Suche mit Karte und
    Objekt-Auswahl
  - `input/Screenshot 2026-05-13 at 16.40.56.png`: Detailuebersicht Desktop
  - `input/Screenshot 2026-05-13 at 16.41.07.png`: Grundstueckbeschreibung
    ausgeklappt
  - `input/Screenshot 2026-05-13 at 16.41.16.png`: zustaendige Stelle
    ausgeklappt
  - uebrige Screenshots als ergaenzende Referenzen

## Technische Architektur

Die App wird als statisch auslieferbare SPA mit Hash-Routing gebaut:

- `#/search`: Such- und Kartenseite
- `#/detail/:egrid`: Detailansicht
- unbekannte Routes leiten auf `#/search`

Web Components:

- `gi-app`: App-Root, Config-Laden, Routing, globaler State
- `gi-search-view`: Suchfeld, Trefferliste, Hauptkarte, Objekt-Auswahl
- `gi-map`: OpenLayers-Karte, massstabsabhaengiger Hintergrund,
  Klick-Handling, Highlighting
- `gi-detail-view`: Detailseite mit Uebersicht und Accordions
- `gi-accordion-section`: generischer Accordion-Bereich
- `gi-static-plan`: rendert Base64- oder URL-Kartenbilder mit weissem
  Hintergrund

Schichten:

```text
UI Web Components
  -> App State / Router
  -> AvService / SearchService
  -> Parser Layer
  -> typisierte ViewModels
```

Die UI darf nicht direkt XML-Nodes lesen. XML wird ausschliesslich im
Parser-Layer verarbeitet.

## Runtime-Konfiguration

Es wird eine externe JSON-Konfiguration ausgeliefert, z.B.
`public/config/app.config.json`. Werte muessen ohne Rebuild aenderbar sein.

Default-Konfiguration:

```json
{
  "mockEnabled": true,
  "language": "de",
  "serviceBaseUrl": "https://avws.sogeo.services",
  "authUrl": "#/auth-dummy",
  "projection": "EPSG:2056",
  "startCenter": [2606500, 1237000],
  "startZoom": 6,
  "startExtent": [2420000, 1030000, 2900000, 1350000],
  "searchServerUrlTemplate": "https://api3.geo.admin.ch/rest/services/ech/SearchServer?sr=2056&searchText={searchText}&lang={language}&type=locations&limit=20&geometryFormat=geojson&origins=address,parcel",
  "backgroundStrategy": {
    "switchScaleDenominator": 5000
  },
  "backgroundWmts": {
    "capabilitiesUrl": "https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml",
    "urlTemplate": "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/2056/{TileMatrix}/{TileCol}/{TileRow}.jpeg",
    "layer": "ch.swisstopo.pixelkarte-farbe",
    "matrixSet": "2056",
    "format": "image/jpeg"
  },
  "backgroundWms": {
    "url": "https://geodienste.ch/db/av_situationsplan_0/deu",
    "layers": "daten",
    "format": "image/png",
    "transparent": true,
    "crs": "EPSG:2056"
  }
}
```

## Webservice-Verhalten

Live-Endpunkte:

- `GET {serviceBaseUrl}/getegrid/?EN={E},{N}&GEOMETRY=true`
- `GET {serviceBaseUrl}/extract/xml/?EGRID={EGRID}&GEOMETRY=true&WITHIMAGES=true&LANG={language}`

Statuscodes:

- `200`: Daten vorhanden
- `204`: kein Grundstueck gefunden
- `500`: Fehler

Die App muss im MVP mit Mock-Daten laufen, da der Service noch nicht online ist.

## SearchServer-Verhalten

Such-URL gemaess Config. Die SearchServer-Antwort liefert LV95-Koordinaten als
numerische Properties.

Verbindliche Koordinatenregel:

```text
EN = properties.y, properties.x
```

Begruendung: SearchServer liefert im geprueften Beispiel `properties.y` als
Easting und `properties.x` als Northing.

Bei `origin=parcel`:

- EGRID per Regex aus `properties.detail` oder `properties.label` extrahieren.
- Regex: `CH[0-9]{12}`
- Wenn EGRID vorhanden: direkt `extract/xml` aufrufen.
- Wenn keine EGRID extrahierbar ist: mit `properties.y,properties.x` zuerst
  `GetEGRID` aufrufen.

Bei Adresse/Ort:

- Immer `GetEGRID` mit `properties.y,properties.x`.

## OpenLayers-Karte

Die Karte verwendet `EPSG:2056`.

Aus `ask.sogis` werden nur technische OpenLayers-Grundeinstellungen uebernommen:

- `proj4`-Definition fuer `EPSG:2056`
- Schweizer Projection Extent `[2420000, 1030000, 2900000, 1350000]`
- diskrete Resolutions:
  `[4000, 2000, 1000, 500, 250, 100, 50, 20, 10, 5, 2.5, 1, 0.5, 0.25, 0.1]`

Hintergrundkarten:

- Bei kleinen Massstaeben, also herausgezoomt, wird zuerst der farbige
  Landeskarten-/Pixelkarten-WMTS der swisstopo verwendet.
- Ab ca. 1:5000, also wenn die Karte weit genug hineingezoomt ist, wird auf den
  geodienste.ch-WMS gewechselt.
- Die Umschaltung erfolgt ueber `backgroundStrategy.switchScaleDenominator`.
  Fuer `EPSG:2056` gilt als Naeherung: `scaleDenominator = resolution / 0.00028`.
  Der Wechsel auf WMS erfolgt, wenn `scaleDenominator <= 5000`.

swisstopo-WMTS:

- Offizielle Capabilities:
  `https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml`
- Layer: `ch.swisstopo.pixelkarte-farbe`
- REST-Template:
  `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/2056/{TileMatrix}/{TileCol}/{TileRow}.jpeg`
- MatrixSet: `2056`
- Format: `image/jpeg`

geodienste.ch-WMS:

- WMS aus den Beispiel-XMLs
- URL: `https://geodienste.ch/db/av_situationsplan_0/deu`
- Layer: `daten`
- CRS/SRS: `EPSG:2056`

Der Kartenhintergrund muss so implementiert werden, dass beide Layer nicht
gleichzeitig sichtbar sind. Beim Zoomen wird die Sichtbarkeit anhand des
aktuellen Scale Denominators aktualisiert.

Kartenklick:

1. Klickkoordinate in LV95 lesen.
2. `GetEGRID` mit `EN=E,N&GEOMETRY=true`.
3. Treffer parsen.
4. Wenn ein Treffer: Highlight anzeigen und Auswahlpanel mit einem Eintrag.
5. Wenn mehrere Treffer: Auswahlpanel anzeigen.
6. Auswahlwechsel aktualisiert Highlight.
7. Detailansicht wird erst nach expliziter Auswahl/Aktion geoeffnet.

Highlight:

- Stroke rot, ca. `rgba(220,0,0,0.9)`
- Fill rot transparent, ca. `rgba(220,0,0,0.12)`
- ausgewaehltes Grundstueck im Auswahlpanel visuell markiert

Auswahlpanel zeigt pro Treffer:

- Grundstuecknummer
- EGRID
- Grundstuecksart, z.B. `Liegenschaft`, `Baurecht`

## Parser und Datenmodell

Es gibt einen eigenen Parser-Layer:

- `GetEgridParser`
- `ExtractParser`

Alle Parser muessen namespace-tolerant ueber `localName` arbeiten.

`GetEGRIDResponse` ist flach strukturiert. Pro Treffer folgen direkt unter Root:

```text
egrid
number
identDN
type
limit
```

Wenn erneut `egrid` erscheint, beginnt der naechste Treffer.

Zieltypen:

```ts
export interface GetEgridItem {
  egrid: string;
  number: string;
  identDN: string;
  typeCode: string;
  typeLabel: string;
  geometry?: Lv95Polygon;
}

export interface ExtractViewModel {
  metadata: ExtractMetadata;
  property: PropertySummary;
  plans: ExtractPlans;
  landCover: LandCoverItem[];
  buildings: BuildingInfo[];
  singleObjects: SingleObjectInfo[];
  projectedProperties: ProjectedPropertyInfo[];
  offices: ExtractOffices;
  disclaimer?: string;
}

export interface PropertySummary {
  number: string;
  egrid: string;
  identDN: string;
  typeCode: string;
  typeLabel: string;
  canton?: string;
  municipalityName?: string;
  municipalityCode?: string;
  subUnitOfLandRegister?: string;
  subUnitOfLandRegisterDesignation?: string;
  landRegistryArea?: number;
  toponyms: string[];
}

export interface PlanImage {
  kind: "main" | "landDescription" | "projectedObjects";
  imageDataUrl?: string;
  referenceWmsUrl?: string;
  bbox?: [number, number, number, number];
  width?: number;
  height?: number;
}
```

Die genaue interne Typaufteilung darf erweitert werden, aber die UI muss auf
typisierten ViewModels basieren.

Extract-Mapping:

- `RealEstate_DPR/Number` -> Grundstuecknummer
- `RealEstate_DPR/EGRID` -> EGRID
- `RealEstate_DPR/IdentDN` -> IdentDN
- `RealEstate_DPR/Type/Code` und lokalisierter Text -> Grundstuecksart
- `MunicipalityName`, `MunicipalityCode` -> Gemeinde
- `SubUnitOfLandRegister` -> Untereinheit Grundbuch
- `LandRegistryArea` -> Flaeche
- `Toponym` -> Flurname/Flurnamen
- `Building` + `BuildingEntrance` -> Gebaeude/Adressen
- `LandCover` -> Bodenbedeckungsanteile
- `SingleObject` -> Einzelobjekte
- `Mutation/projectedProperty` -> projektierte Grundstuecke
- `ResponsibleOffice` -> zustaendige Stelle Grundstueckbeschreibung/AV
- `LandRegisterOffice` -> Grundbuchamt/Eigentumsauskunft
- `PropertyInformationAuthority` -> System-/Uebersichts-Kontakt
- `PlanForMainPage`, `PlanForLandDescription`, `PlanForProjectedObjects` ->
  statische Plaene

Hinweis: `public/mock-data/CH273542614644_ohne_proj_liegen.xml` enthaelt entgegen dem
Namen trotzdem `Mutation`. Das wird in README/STATUS als Datenproblem
dokumentiert.

## Detailansicht

Visueller Stil:

- neutral wie Screenshots
- helle Flaeche
- klare Tabellen
- rote Akzente
- Desktop zuerst
- keine Marketing-/Landingpage-Optik

Bereiche:

1. `Uebersicht`
   - statischer Plan links
   - Stammdaten rechts
   - Erstellungsdatum aus XML
   - Disclaimer und Systemkontakt darunter

2. `Eigentumsauskunft`
   - Hinweis, dass Authentifizierung erforderlich ist
   - Dummy-Link/Button zur Authentifizierung
   - Grundbuchamt aus `LandRegisterOffice` ausklappbar anzeigen

3. `Grundstueckbeschreibung`
   - statischer Plan aus `PlanForLandDescription`
   - Tabelle Bodenbedeckungsanteile
   - Tabelle Gebaeude und Bauten
   - zustaendige Stelle aus `ResponsibleOffice`

4. `Projektierte Objekte`
   - nur fachlich gefuellt, wenn `Mutation/projectedProperty` vorhanden
   - sonst leerer Zustand: `Keine projektierten Objekte vorhanden.`
   - statischer Plan aus `PlanForProjectedObjects`

5. `OEREB-Kataster`
   - Platzhalter
   - keine externe Integration im MVP

Globale Detailaktionen:

- `Zurueck zur Grundstuecksuche`
- `Alles aufklappen`
- `Alles zuklappen`

## Fehler- und Leerzustaende

- `204 GetEGRID`: Meldung `An dieser Stelle wurde kein Grundstueck gefunden.`
- `204 Extract`: Meldung `Fuer dieses Grundstueck ist kein Auszug verfuegbar.`
- Netzwerkfehler: sichtbare Fehlermeldung mit Retry-Moeglichkeit
- Parserfehler: technische Fehlermeldung plus Logging in Konsole
- fehlende optionale XML-Daten: leere Zellen oder kompakte Leerzustaende, keine
  Runtime-Fehler

## Annahmen

- Der spaetere Produktivservice ist CORS-faehig.
- Der Service folgt strukturell der Word-Spezifikation und den Beispiel-XMLs.
- `WITHIMAGES=true` liefert Base64-Bilder; ohne Bilder wird spaeter optional
  ueber `ReferenceWMS` erweitert.
- Desktop-Prototyp ist Ziel des MVP; Mobile kommt spaeter.
- Visuelle Umsetzung orientiert sich an den Screenshots, nicht an einem
  spezifischen kantonalen Designsystem.
- Der Coding-Agent darf die Artefakte in `public/mock-data/` und `input/` lesen und in Tests verwenden.

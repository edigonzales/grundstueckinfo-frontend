# STATUS

## Gesamtstatus

Status: planned

## Schritte

| Schritt | Titel | Status | Nachweis |
|---|---|---|---|
| 1 | Projektbasis | planned | |
| 2 | Config und Routing | planned | |
| 3 | Parser-Layer | planned | |
| 4 | Mock- und Live-Service | planned | |
| 5 | OpenLayers-Karte | planned | |
| 6 | Suchansicht | planned | |
| 7 | Detailansicht | planned | |
| 8 | E2E und Dokumentationshaertung | planned | |

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

## Bekannte Datenauffaelligkeiten

- `input/CH273542614644_ohne_proj_liegen.xml` enthaelt trotz Dateiname
  `Mutation/projectedProperty`.

## Artefakt-Referenzen

- Benutzerfuehrung/UI:
  `input/20260415 Grundstückinformation Benutzerführung Empfehlung_de.docx`
- Webservice:
  `input/20250725 Entwurf Weisung Amtliche Vermessung Webservice de.docx`
- GetEGRID-Beispiel: `input/getegrid.xml`
- Extract-Beispiele: `input/CH*.xml`
- Screenshot-Referenzen: `input/Screenshot*.png`

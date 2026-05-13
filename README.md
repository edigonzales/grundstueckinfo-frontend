# grundstueckinfo-frontend

Desktop-Prototyp fuer eine Vanilla-TypeScript-SPA zur Anzeige von
Grundstueckinformationen auf Basis von OpenLayers, externem AV-Webservice und
XML-Auszug.

## Dokumente

- [SPEC.md](SPEC.md): fachliche und technische Gesamtspezifikation.
- [AGENT_STEPS.md](AGENT_STEPS.md): Schritt-fuer-Schritt-Anweisungen fuer den
  Coding-Agenten.
- [STATUS.md](STATUS.md): Umsetzungsstand und festgehaltene Entscheidungen.

## Eingabeartefakte

Die verbindlichen Referenzen liegen in `input/`:

- Benutzerfuehrung und UI-Referenz:
  `input/20260415 Grundstückinformation Benutzerführung Empfehlung_de.docx`
- Webservice-Spezifikation:
  `input/20250725 Entwurf Weisung Amtliche Vermessung Webservice de.docx`
- Beispielantwort fuer `GetEGRID`: `input/getegrid.xml`
- Beispielantworten fuer `GetExtractById`: `input/CH*.xml`
- Screenshot-Referenzen: `input/Screenshot*.png`

## Grundentscheidungen

- Keine UI-Frameworks wie React, Vue, Svelte oder Angular.
- Umsetzung mit Vanilla TypeScript und Web Components.
- OpenLayers mit `EPSG:2056`, swisstopo-WMTS fuer kleine Massstaebe und
  geodienste.ch-WMS ab ca. 1:5000.
- Hash-Routing, damit die App statisch deploybar bleibt.
- Externe Runtime-Konfiguration per JSON.
- Entwicklung initial im Mock-Modus, da der produktive Service noch nicht
  online ist.

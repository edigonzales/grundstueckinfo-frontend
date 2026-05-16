import type { AppConfig } from '../config';
import type { AvService } from '../services/av-service';
import type { Router } from '../router';
import type { ExtractViewModel, Office, LandCoverItem, BuildingInfo, ProjectedPropertyInfo } from '../parsers/types';
import { formatNumber } from '../utils/format-number';
import './gi-static-plan';
import './gi-accordion-section';

export class GiDetailView extends HTMLElement {
  private _avService!: AvService;
  private _router!: Router;
  private _config!: AppConfig;
  private _egrid = '';
  private _data: ExtractViewModel | null = null;
  private _error: string | null = null;
  private _loading = true;
  private _onAccordionOpenBound = this.onAccordionOpen.bind(this);

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot?.addEventListener('accordion-open', this._onAccordionOpenBound);
  }

  disconnectedCallback() {
    this.shadowRoot?.removeEventListener('accordion-open', this._onAccordionOpenBound);
  }

  private onAccordionOpen(event: Event) {
    const section = event.target as HTMLElement;
    const title = section.getAttribute('title') || '';
    
    requestAnimationFrame(() => {
      if (title === 'Grundstückbeschreibung') {
        const el = this.shadowRoot?.querySelector('#landPlan') as any;
        if (el && this._data?.plans.landDescription) {
          el.setPlan(this._data.plans.landDescription, this._data.propertyGeometry);
        }
      } else if (title === 'Projektierte Objekte') {
        const el = this.shadowRoot?.querySelector('#projPlan') as any;
        if (el && this._data?.plans.projectedObjects) {
          el.setPlan(this._data.plans.projectedObjects, this._data.propertyGeometry);
        }
      }
    });
  }

  setEgrid(egrid: string) {
    this._egrid = egrid;
    this.loadData();
  }

  setServices(config: AppConfig, avService: AvService, router: Router) {
    this._config = config;
    this._avService = avService;
    this._router = router;
  }

  private async loadData() {
    this._loading = true;
    this._error = null;
    this.render();

    try {
      this._data = await this._avService.getExtractById(this._egrid);
      this._loading = false;
      this.render();
    } catch (err: any) {
      this._loading = false;
      if (err?.status === 204) {
        this._error = 'Für dieses Grundstück ist kein Auszug verfügbar.';
      } else {
        this._error = err?.message || 'Fehler beim Laden des Auszugs.';
      }
      this.render();
    }
  }

  private goBack() {
    this._router.navigate({ path: 'search' });
  }

  private expandAll() {
    const sections = this.shadowRoot?.querySelectorAll('gi-accordion-section');
    sections?.forEach((s: any) => s.setOpen(true));
  }

  private collapseAll() {
    const sections = this.shadowRoot?.querySelectorAll('gi-accordion-section');
    sections?.forEach((s: any) => s.setOpen(false));
  }

  private formatDate(isoDate?: string): string {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('de-CH');
    } catch {
      return isoDate;
    }
  }

  private renderOffice(office?: Office): string {
    if (!office) return '<p>-</p>';
    return `
      <p><strong>${office.name || '-'}</strong></p>
      <p>${office.street || ''} ${office.number || ''}</p>
      <p>${office.postalCode || ''} ${office.city || ''}</p>
      ${office.officeAtWeb ? `<p><a href="${office.officeAtWeb}" target="_blank">${office.officeAtWeb}</a></p>` : ''}
    `;
  }

  private landCoverSortKey(code: string): number {
    if (code === 'buildings') return 10;
    if (code === 'hard_surfaced.roads_tracks') return 20;
    if (code === 'hard_surfaced.sidewalk') return 21;
    if (code === 'hard_surfaced.traffic_island') return 22;
    if (code === 'hard_surfaced.railway') return 23;
    if (code === 'hard_surfaced.airport') return 24;
    if (code === 'hard_surfaced.waterbasin' || code === 'hard_surfaced.water_basin') return 25;
    if (code === 'hard_surfaced.other_hard_surfaced' || code === 'hard_surfaced.other') return 26;
    if (code.startsWith('hard_surfaced.')) return 29;
    if (code === 'vegetated.meadow_arable_land_pasture' || code === 'vegetated.arable_land_meadow_pasture') return 30;
    if (code === 'vegetated.intensive_cultivation.vineyard' || code === 'vegetated.vineyard') return 31;
    if (code === 'vegetated.intensive_cultivation.other_intensive_cultivation' || code === 'vegetated.other_intensive_cultivation') return 32;
    if (code === 'vegetated.garden') return 33;
    if (code === 'vegetated.high_moor' || code === 'vegetated.marsh') return 34;
    if (code === 'vegetated.other_vegetated' || code === 'vegetated.other') return 35;
    if (code.startsWith('vegetated.')) return 39;
    if (code === 'water.standing_water' || code === 'waters.standing_water') return 40;
    if (code === 'water.flowing_water' || code === 'waters.flowing_water') return 41;
    if (code === 'water.reed_belt' || code === 'waters.reed_belt') return 42;
    if (code.startsWith('water.') || code.startsWith('waters.')) return 49;
    if (code === 'wooded.dense_forest' || code === 'stocked.dense_forest') return 50;
    if (code === 'wooded.wooded_pasture.dense' || code === 'stocked.wooded_pasture.dense') return 51;
    if (code === 'wooded.wooded_pasture.sparse' || code === 'stocked.wooded_pasture.sparse') return 52;
    if (code === 'wooded.other_wooded' || code === 'stocked.other_stocked') return 53;
    if (code.startsWith('wooded.') || code.startsWith('stocked.')) return 59;
    if (code === 'without_vegetation.rock' || code === 'vegetationless.rock') return 60;
    if (code === 'without_vegetation.glacier_snowfield' || code === 'vegetationless.glacier_snowfield') return 61;
    if (code === 'without_vegetation.scree_sand' || code === 'vegetationless.scree_sand') return 62;
    if (code === 'without_vegetation.excavation_landfill' || code === 'vegetationless.excavation_landfill') return 63;
    if (code === 'without_vegetation.other_without_vegetation' || code === 'vegetationless.other_vegetationless') return 64;
    if (code.startsWith('without_vegetation.') || code.startsWith('vegetationless.')) return 69;
    return 999;
  }

  private getGroupedLandCover(landCover: LandCoverItem[]): { label: string; code: string; areaShareSum: number }[] {
    const filtered = landCover.filter((lc) => lc.objectStatusCode === 'actual');
    const map = new Map<string, { label: string; code: string; areaShareSum: number }>();
    for (const lc of filtered) {
      const entry = map.get(lc.code);
      if (entry) {
        entry.areaShareSum += lc.areaShare ?? 0;
      } else {
        map.set(lc.code, { label: lc.label || lc.code, code: lc.code, areaShareSum: lc.areaShare ?? 0 });
      }
    }
    return Array.from(map.values()).sort((a, b) => this.landCoverSortKey(a.code) - this.landCoverSortKey(b.code));
  }

  private formatAreaShare(percentage: number): string {
    if (percentage < 1) return '< 1 %';
    return String(Math.round(percentage)) + ' %';
  }

  private buildingOriginSortKey(origin?: string): number {
    if (origin === 'landcover') return 10;
    if (origin === 'singleobject') return 20;
    if (origin === 'fallback') return 30;
    return 40;
  }

  private renderProjectedPropertyTable(properties: ProjectedPropertyInfo[], originalEgrid: string, originalArea?: number): string {
    if (properties.length === 0) return '<p style="font-size:0.9rem;">Keine projektierten Grundstücke vorhanden.</p>';

    return `
      <table class="landcover">
        <thead><tr><th>Nummer</th><th>EGRID</th><th>Grundstückart</th><th class="numeric">Bisherige Fläche (m²)</th><th class="numeric">Neue Fläche (m²)</th></tr></thead>
        <tbody>
          ${properties.map(pp => `
            <tr>
              <td>${pp.number}</td>
              <td>${pp.egrid}</td>
              <td>${pp.typeLabel || '-'}</td>
              <td class="numeric">${pp.egrid === originalEgrid ? (formatNumber(originalArea) ?? '-') : '-'}</td>
              <td class="numeric">${formatNumber(pp.newParcelArea) ?? '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private renderBuildingTable(buildings: BuildingInfo[]): string {
    if (buildings.length === 0) return '<p style="font-size:0.9rem;">Keine Gebäude vorhanden.</p>';

    return `
      <table class="landcover">
        <thead><tr><th>Art</th><th>EGID</th><th>Adresse</th><th>PLZ</th><th>Ortschaft</th></tr></thead>
        <tbody>
          ${buildings.flatMap(b => {
            if (b.addresses.length === 0) {
              return [`
                <tr>
                  <td>${b.typeLabel || b.plannedTypeLabel || '-'}</td>
                  <td>${b.egid ?? '-'}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              `];
            }
            return b.addresses.map((a, idx) => `
              <tr>
                <td>${idx === 0 ? (b.typeLabel || b.plannedTypeLabel || '-') : ''}</td>
                <td>${idx === 0 ? (b.egid ?? '-') : ''}</td>
                <td>${[a.street, a.number].filter(Boolean).join(' ') || ''}</td>
                <td>${a.plz || ''}</td>
                <td>${a.city || ''}</td>
              </tr>
            `);
          }).join('')}
        </tbody>
      </table>
    `;
  }

  private render() {
    if (!this.shadowRoot) return;

    if (this._loading) {
      this.shadowRoot.innerHTML = `<style>:host { display: block; padding: 2rem; }</style><p>Lade Auszug...</p>`;
      return;
    }

    if (this._error) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; padding: 2rem; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
          .error { color: #c00; padding: 1rem; background: #fff0f0; border: 1px solid #fcc; border-radius: 4px; }
          .back { margin-top: 1rem; padding: 0.5rem 1rem; background: #c00; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
        <div class="error">${this._error}</div>
        <button class="back" id="backBtn">Zurück zur Grundstückssuche</button>
      `;
    this.shadowRoot.getElementById('authBtn')?.addEventListener('click', () => window.open(this._config.authUrl, '_blank'));
    this.shadowRoot.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
      return;
    }

    const d = this._data!;
    const p = d.property;

    const actualBuildings = d.buildings
      .filter((b) => b.status === 'actual')
      .sort((a, b) => this.buildingOriginSortKey(a.origin) - this.buildingOriginSortKey(b.origin));

    const plannedBuildings = d.buildings
      .filter((b) => b.status === 'planned');

    const hasProjectedContent = d.projectedProperties.length > 0 || plannedBuildings.length > 0;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        h1 { margin: 0; font-size: 1.5rem; color: #333; }
        .actions { display: flex; gap: 0.5rem; }
        .actions button { padding: 0.4rem 0.8rem; background: white; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
        .actions button:hover { background: #f5f5f5; }
        .actions .back-btn { padding: 0.4rem 0.8rem; background: white; border: 1px solid #c00; border-radius: 4px; cursor: pointer; font-size: 0.85rem; color: #c00; }
        .actions .back-btn:hover { background: #f5f5f5; }
        .auth-btn { padding: 0.4rem 0.8rem; background: white; border: 1px solid #c00; border-radius: 4px; cursor: pointer; font-size: 0.85rem; color: #c00; }
        .auth-btn:hover { background: #f5f5f5; }
        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1rem; }
        @media (max-width: 768px) { .overview-grid { grid-template-columns: 1fr; } }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .data-table th, .data-table td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
        .data-table th { width: 40%; color: #666; font-weight: 500; }
        .plan-wrapper { background: white; }
        h2 { font-size: 1.1rem; margin: 0 0 0.5rem; color: #333; }
        .meta { color: #666; font-size: 0.85rem; margin-top: 0.5rem; }
        .disclaimer { border-radius: 4px; margin-top: 1rem; font-size: 0.9rem; line-height: 1.5; }
        .office-box { border-radius: 4px; margin-top: 0.5rem; }
        .office-box p { margin: 0.2rem 0; font-size: 0.9rem; }
        .placeholder-box { padding: 2rem; text-align: center; color: #999; border: 1px dashed #ddd; }
        .auth-box { padding: 0rem; font-size: 0.9rem; margin-bottom: 1rem; }
        .auth-btn-wrap { margin: 1.8rem 0; }
        table.landcover { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        table.landcover th, table.landcover td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #eee; }
        table.landcover th { background: #f8f8f8; }
        table.landcover th.numeric, table.landcover td.numeric { text-align: right; }
      </style>

      <div class="top-bar">
        <h1>${p.number || '-'} – ${p.typeLabel || ''}</h1>
        <div class="actions">
          <button id="expandBtn">Alles aufklappen</button>
          <button id="collapseBtn">Alles zuklappen</button>
          <button class="back-btn" id="backBtn">Zurück zur Grundstückssuche</button>
        </div>
      </div>

      <gi-accordion-section title="Übersicht" open>
        <div class="overview-grid">
          <div>
            <div class="plan-wrapper">
              <gi-static-plan id="mainPlan"></gi-static-plan>
            </div>
          </div>
          <div>
            <h2>Stammdaten</h2>
            <table class="data-table">
              <tr><th>Nummer</th><td>${p.number || '-'}</td></tr>
              <tr><th>EGRID</th><td>${p.egrid || '-'}</td></tr>
              <tr><th>IdentDN</th><td>${p.identDN || '-'}</td></tr>
              <tr><th>Art</th><td>${p.typeLabel || '-'}</td></tr>
              <tr><th>Kanton</th><td>${p.canton || '-'}</td></tr>
              <tr><th>Gemeinde</th><td>${p.municipalityName || '-'} ${p.municipalityCode ? '(' + p.municipalityCode + ')' : ''}</td></tr>
              <tr><th>Untereinheit GB</th><td>${p.subUnitOfLandRegister || '-'} ${p.subUnitOfLandRegisterDesignation || ''}</td></tr>
              <tr><th>Fläche</th><td>${formatNumber(p.landRegistryArea) ? formatNumber(p.landRegistryArea) + ' m²' : '-'}</td></tr>
              <tr><th>Flurnamen</th><td>${p.toponyms.join(', ') || '-'}</td></tr>
            </table>
            <div class="meta">Erstellt: ${this.formatDate(d.metadata.creationDate)}${d.metadata.updateDateCS ? ' | Stand der amtlichen Vermessung: ' + this.formatDate(d.metadata.updateDateCS) : ''}</div>
          </div>
        </div>
        ${d.disclaimer ? `<div class="disclaimer">${d.disclaimer}</div>` : ''}
        ${d.offices.propertyInformationAuthority ? `
          <div class="office-box">${this.renderOffice(d.offices.propertyInformationAuthority)}</div>
        ` : ''}
      </gi-accordion-section>

      <gi-accordion-section title="Eigentumsauskunft">
        <div class="auth-box">
          <p>Die Eigentumsauskunft erfordert eine Authentifizierung.</p>
          <p class="auth-btn-wrap"><button class="auth-btn" id="authBtn">Authentifizierung</button></p>
        </div>
        ${d.offices.landRegisterOffice ? `
          <div>
            <strong>Zuständige Stelle:</strong>
            <div class="office-box">${this.renderOffice(d.offices.landRegisterOffice)}</div>
          </div>
        ` : ''}
      </gi-accordion-section>

      <gi-accordion-section title="Grundstückbeschreibung">
        <div style="margin-bottom:1rem;">
          <div class="plan-wrapper">
            <gi-static-plan id="landPlan"></gi-static-plan>
          </div>
        </div>
        <h2>Bodenbedeckungsanteile</h2>
        ${(() => {
          const grouped = this.getGroupedLandCover(d.landCover);
          const totalArea = p.landRegistryArea ?? 0;
          return grouped.length > 0 ? `
            <table class="landcover">
              <thead><tr><th>Art</th><th class="numeric">Anteil (m²)</th><th class="numeric">Anteil in %</th></tr></thead>
              <tbody>
                ${grouped.map(g => {
                  const percentage = totalArea > 0 ? (g.areaShareSum / totalArea) * 100 : 0;
                  return `
                    <tr>
                      <td>${g.label || g.code || '-'}</td>
                      <td class="numeric">${formatNumber(g.areaShareSum) ?? '-'}</td>
                      <td class="numeric">${this.formatAreaShare(percentage)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<p>Keine Bodenbedeckungsanteile vorhanden.</p>';
        })()}

        <h2 style="margin-top:1.8rem;">Gebäude und Bauten</h2>
        ${this.renderBuildingTable(actualBuildings)}

        ${d.offices.responsibleOffice ? `
          <div style="margin-top:1.8rem;">
            <strong>Zuständige Stelle:</strong>
            <div class="office-box">${this.renderOffice(d.offices.responsibleOffice)}</div>
          </div>
        ` : ''}
      </gi-accordion-section>

      <gi-accordion-section title="Projektierte Objekte">
        ${hasProjectedContent ? `
          <div style="margin-bottom:1rem;">
            <div class="plan-wrapper">
              <gi-static-plan id="projPlan"></gi-static-plan>
            </div>
          </div>
          ${d.projectedProperties.length > 0 ? `
            <h2 style="margin-top:1rem;">Projektierte Grundstücke</h2>
            ${this.renderProjectedPropertyTable(d.projectedProperties, d.property.egrid, d.property.landRegistryArea)}
          ` : ''}
          ${plannedBuildings.length > 0 ? `
            <h2 style="margin-top:1rem;">Projektierte Gebäude und Bauten</h2>
            ${this.renderBuildingTable(plannedBuildings)}
          ` : ''}
          ${d.offices.responsibleOffice ? `
            <div style="margin-top:1.8rem;">
              <strong>Zuständige Stelle:</strong>
              <div class="office-box">${this.renderOffice(d.offices.responsibleOffice)}</div>
            </div>
          ` : ''}
        ` : '<p>Keine projektierten Objekte vorhanden.</p>'}
      </gi-accordion-section>

      <gi-accordion-section title="OEREB-Kataster">
        <div class="placeholder-box">
          <p>OEREB-Kataster</p>
          <p>Keine externe Integration im MVP.</p>
        </div>
      </gi-accordion-section>
    `;

    // Main-Plan sofort setzen (ist sichtbar)
    const mainPlan = this.shadowRoot.querySelector('#mainPlan') as any;
    if (mainPlan) mainPlan.setPlan(d.plans.main, d.propertyGeometry);

    // Land- und Proj-Plan: Render erfolgt erst bei accordion-open Event

    // Actions
    this.shadowRoot.getElementById('authBtn')?.addEventListener('click', () => window.open(this._config.authUrl, '_blank'));
    this.shadowRoot.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
    this.shadowRoot.getElementById('expandBtn')?.addEventListener('click', () => this.expandAll());
    this.shadowRoot.getElementById('collapseBtn')?.addEventListener('click', () => this.collapseAll());
  }
}

customElements.define('gi-detail-view', GiDetailView);

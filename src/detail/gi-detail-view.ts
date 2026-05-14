import type { AppConfig } from '../config';
import type { AvService } from '../services/av-service';
import type { Router } from '../router';
import type { ExtractViewModel, Office } from '../parsers/types';
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

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
        this._error = 'Fehler beim Laden des Auszugs.';
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
      this.shadowRoot.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
      return;
    }

    const d = this._data!;
    const p = d.property;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        h1 { margin: 0; font-size: 1.5rem; color: #333; }
        .actions { display: flex; gap: 0.5rem; }
        .actions button { padding: 0.4rem 0.8rem; background: white; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
        .actions button:hover { background: #f5f5f5; }
        .back-btn { color: #c00; border-color: #c00 !important; }
        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1rem; }
        @media (max-width: 768px) { .overview-grid { grid-template-columns: 1fr; } }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .data-table th, .data-table td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
        .data-table th { width: 40%; color: #666; font-weight: 500; }
        .plan-wrapper { border: 1px solid #eee; padding: 0.5rem; background: white; }
        h2 { font-size: 1.1rem; margin: 0 0 0.5rem; color: #333; }
        .meta { color: #666; font-size: 0.85rem; margin-top: 0.5rem; }
        .disclaimer { background: #f8f8f8; padding: 1rem; border-radius: 4px; margin-top: 1rem; font-size: 0.85rem; color: #555; }
        .office-box { padding: 1rem; border: 1px solid #eee; border-radius: 4px; margin-top: 0.5rem; }
        .office-box p { margin: 0.2rem 0; font-size: 0.9rem; }
        .placeholder-box { padding: 2rem; text-align: center; color: #999; border: 1px dashed #ddd; }
        .auth-box { padding: 1rem; background: #fff8f0; border: 1px solid #ffe0b0; border-radius: 4px; margin-bottom: 1rem; }
        .auth-box a { color: #c00; }
        table.landcover { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        table.landcover th, table.landcover td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #eee; }
        table.landcover th { background: #f8f8f8; }
        .building-item { padding: 0.75rem; border: 1px solid #eee; border-radius: 4px; margin-bottom: 0.5rem; }
        .building-item h4 { margin: 0 0 0.3rem; font-size: 0.95rem; }
        .building-item p { margin: 0.15rem 0; font-size: 0.85rem; color: #555; }
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
              <tr><th>Fläche</th><td>${p.landRegistryArea ? p.landRegistryArea + ' m²' : '-'}</td></tr>
              <tr><th>Flurnamen</th><td>${p.toponyms.join(', ') || '-'}</td></tr>
            </table>
            <div class="meta">Erstellt: ${this.formatDate(d.metadata.creationDate)}${d.metadata.updateDateCS ? ' | Aktualisiert: ' + this.formatDate(d.metadata.updateDateCS) : ''}</div>
          </div>
        </div>
        ${d.disclaimer ? `<div class="disclaimer">${d.disclaimer}</div>` : ''}
        ${d.offices.propertyInformationAuthority ? `
          <div style="margin-top:1rem;">
            <strong>Systemkontakt:</strong>
            <div class="office-box">${this.renderOffice(d.offices.propertyInformationAuthority)}</div>
          </div>
        ` : ''}
      </gi-accordion-section>

      <gi-accordion-section title="Eigentumsauskunft">
        <div class="auth-box">
          <p>Die Eigentumsauskunft erfordert eine Authentifizierung.</p>
          <p><a href="${this._config.authUrl}">Zur Authentifizierung</a></p>
        </div>
        ${d.offices.landRegisterOffice ? `
          <div>
            <strong>Grundbuchamt:</strong>
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
        ${d.landCover.length > 0 ? `
          <table class="landcover">
            <thead><tr><th>Art</th><th>Status</th><th>Fläche (m²)</th><th>Anteil (m²)</th></tr></thead>
            <tbody>
              ${d.landCover.map(lc => `
                <tr>
                  <td>${lc.label || lc.code || '-'}</td>
                  <td>${lc.objectStatusLabel || lc.objectStatusCode || '-'}</td>
                  <td>${lc.area ?? '-'}</td>
                  <td>${lc.areaShare ?? '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>Keine Bodenbedeckungsanteile vorhanden.</p>'}

        <h2 style="margin-top:1.5rem;">Gebäude und Bauten</h2>
        ${d.buildings.length > 0 ? d.buildings.map((b, i) => `
          <div class="building-item">
            <h4>Gebäude ${i + 1}${b.egid ? ' (EGID: ' + b.egid + ')' : ''}</h4>
            ${b.addresses.map(a => `
              <p>${a.street || ''} ${a.number || ''}, ${a.plz || ''} ${a.city || ''}</p>
            `).join('')}
          </div>
        `).join('') : '<p>Keine Gebäude vorhanden.</p>'}

        ${d.offices.responsibleOffice ? `
          <div style="margin-top:1rem;">
            <strong>Zuständige Stelle:</strong>
            <div class="office-box">${this.renderOffice(d.offices.responsibleOffice)}</div>
          </div>
        ` : ''}
      </gi-accordion-section>

      <gi-accordion-section title="Projektierte Objekte">
        ${d.projectedProperties.length > 0 ? `
          <div style="margin-bottom:1rem;">
            <div class="plan-wrapper">
              <gi-static-plan id="projPlan"></gi-static-plan>
            </div>
          </div>
          ${d.projectedProperties.map(pp => `
            <div class="building-item">
              <h4>Grundstück ${pp.number} – ${pp.typeLabel}</h4>
              <p>EGRID: ${pp.egrid}</p>
              <p>Neue Parzellenfläche: ${pp.newParcelArea ? pp.newParcelArea + ' m²' : '-'}</p>
            </div>
          `).join('')}
        ` : '<p>Keine projektierten Objekte vorhanden.</p>'}
      </gi-accordion-section>

      <gi-accordion-section title="OEREB-Kataster">
        <div class="placeholder-box">
          <p>OEREB-Kataster</p>
          <p>Keine externe Integration im MVP.</p>
        </div>
      </gi-accordion-section>
    `;

    // Set plans
    const mainPlan = this.shadowRoot.querySelector('#mainPlan') as any;
    if (mainPlan) mainPlan.setPlan(d.plans.main);

    const landPlan = this.shadowRoot.querySelector('#landPlan') as any;
    if (landPlan) landPlan.setPlan(d.plans.landDescription);

    const projPlan = this.shadowRoot.querySelector('#projPlan') as any;
    if (projPlan) projPlan.setPlan(d.plans.projectedObjects);

    // Actions
    this.shadowRoot.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
    this.shadowRoot.getElementById('expandBtn')?.addEventListener('click', () => this.expandAll());
    this.shadowRoot.getElementById('collapseBtn')?.addEventListener('click', () => this.collapseAll());
  }
}

customElements.define('gi-detail-view', GiDetailView);

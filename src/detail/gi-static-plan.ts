import type { PlanImage } from '../parsers/types';

export class GiStaticPlan extends HTMLElement {
  static get observedAttributes() {
    return ['src'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  setPlan(plan?: PlanImage) {
    if (!plan) {
      this.renderEmpty();
      return;
    }

    if (plan.imageDataUrl) {
      this.renderImage(plan.imageDataUrl);
    } else if (plan.referenceWmsUrl) {
      this.renderWms(plan.referenceWmsUrl);
    } else {
      this.renderEmpty();
    }
  }

  private renderImage(dataUrl: string) {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        img { max-width: 100%; height: auto; border: 1px solid #ccc; background: white; }
      </style>
      <img src="${dataUrl}" alt="Plan" />
    `;
  }

  private renderWms(url: string) {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .placeholder { 
          padding: 2rem; 
          text-align: center; 
          border: 1px solid #ccc; 
          background: #fafafa; 
          color: #666; 
        }
      </style>
      <div class="placeholder">
        <p>WMS-Plan (extern)</p>
        <a href="${url}" target="_blank">Im Browser öffnen</a>
      </div>
    `;
  }

  private renderEmpty() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .empty { 
          padding: 2rem; 
          text-align: center; 
          border: 1px solid #eee; 
          background: white; 
          color: #999; 
        }
      </style>
      <div class="empty">Kein Plan verfügbar.</div>
    `;
  }

  private render() {
    // Default empty until setPlan is called
    this.renderEmpty();
  }
}

customElements.define('gi-static-plan', GiStaticPlan);

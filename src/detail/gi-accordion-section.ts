export class GiAccordionSection extends HTMLElement {
  private _open = false;

  static get observedAttributes() {
    return ['open'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._open = this.hasAttribute('open');
    this.render();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'open') {
      this._open = newValue !== null;
      this.render();
    }
  }

  toggle() {
    this._open = !this._open;
    if (this._open) {
      this.setAttribute('open', '');
    } else {
      this.removeAttribute('open');
    }
    this.render();
    if (this._open) {
      this.dispatchEvent(new CustomEvent('accordion-open', {
        bubbles: true,
        composed: true,
      }));
    }
  }

  setOpen(open: boolean) {
    const wasClosed = !this._open;
    this._open = open;
    if (open) {
      this.setAttribute('open', '');
    } else {
      this.removeAttribute('open');
    }
    this.render();
    if (wasClosed && this._open) {
      this.dispatchEvent(new CustomEvent('accordion-open', {
        bubbles: true,
        composed: true,
      }));
    }
  }

  isOpen(): boolean {
    return this._open;
  }

  private render() {
    if (!this.shadowRoot) return;

    const title = this.getAttribute('title') || 'Bereich';
    const content = this._open ? '<slot></slot>' : '';
    const icon = this._open ? '&#9660;' : '&#9654;';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; border: 1px solid #ddd; margin-bottom: 0.5rem; border-radius: 4px; overflow: hidden; }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 0.75rem 1rem; 
          background: #f8f8f8; 
          cursor: pointer; 
          font-weight: 600; 
          font-size: 1rem;
          user-select: none;
        }
        .header:hover { background: #f0f0f0; }
        .icon { color: #c00; font-size: 0.8rem; margin-right: 0.5rem; }
        .content { padding: 1rem; background: white; }
      </style>
      <div class="header" id="header">
        <span><span class="icon">${icon}</span>${title}</span>
      </div>
      ${this._open ? `<div class="content">${content}</div>` : ''}
    `;

    const header = this.shadowRoot.getElementById('header');
    header?.addEventListener('click', () => this.toggle());
  }
}

customElements.define('gi-accordion-section', GiAccordionSection);

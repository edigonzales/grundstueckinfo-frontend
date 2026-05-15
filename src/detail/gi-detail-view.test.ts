import { describe, it, expect } from 'vitest';
import '../detail/gi-static-plan';
import '../detail/gi-accordion-section';
import '../detail/gi-detail-view';

describe('Detail Components', () => {
  it('registers gi-static-plan', () => {
    expect(customElements.get('gi-static-plan')).toBeDefined();
  });

  it('registers gi-accordion-section', () => {
    expect(customElements.get('gi-accordion-section')).toBeDefined();
  });

  it('registers gi-detail-view', () => {
    expect(customElements.get('gi-detail-view')).toBeDefined();
  });

  it('accordion toggles open/closed', () => {
    const el = document.createElement('gi-accordion-section') as any;
    document.body.appendChild(el);
    el.setAttribute('title', 'Test');

    expect(el.isOpen()).toBe(false);
    el.toggle();
    expect(el.isOpen()).toBe(true);
    el.toggle();
    expect(el.isOpen()).toBe(false);

    document.body.removeChild(el);
  });

  it('renders buildings table with correct headers when data is set', () => {
    const view = document.createElement('gi-detail-view') as any;
    document.body.appendChild(view);

    view._data = {
      property: {
        number: '123',
        egrid: 'CH123',
        identDN: 'TEST',
        typeCode: 'RealEstate',
        typeLabel: 'Liegenschaft',
        municipalityName: 'Test',
        municipalityCode: '1',
        landRegistryArea: 1000,
        toponyms: [],
        canton: 'BE',
      },
      metadata: { creationDate: '2024-01-01' },
      plans: {},
      landCover: [],
      buildings: [
        {
          egid: 12345,
          addresses: [{ street: 'Teststrasse', number: '1', plz: '3000', city: 'Bern' }],
          status: 'actual',
          origin: 'landcover',
          typeLabel: 'Wohngebäude',
        },
      ],
      singleObjects: [],
      projectedProperties: [],
      offices: {},
    };
    view._loading = false;
    view._error = null;
    view.render();

    const html = view.shadowRoot!.innerHTML;
    expect(html).toContain('Gebäude und Bauten');
    expect(html).toContain('<th>Art</th>');
    expect(html).toContain('<th>EGID</th>');
    expect(html).toContain('<th>Adresse</th>');
    expect(html).toContain('<th>PLZ</th>');
    expect(html).toContain('<th>Ortschaft</th>');
    expect(html).toContain('Wohngebäude');
    expect(html).toContain('12345');
    expect(html).toContain('Teststrasse 1');

    document.body.removeChild(view);
  });
});

import { describe, it, expect } from 'vitest';

describe('GiStaticPlan', () => {
  async function importComponent() {
    const mod = await import('./gi-static-plan');
    return mod;
  }

  it('is registered as custom element', async () => {
    await importComponent();
    expect(customElements.get('gi-static-plan')).toBeDefined();
  });

  it('renders empty state when no plan is provided', async () => {
    await importComponent();
    const el = document.createElement('gi-static-plan') as any;
    document.body.appendChild(el);
    el.setPlan(undefined);

    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Kein Plan verfügbar');

    document.body.removeChild(el);
  });

  it('renders empty state when plan has no imageDataUrl and no referenceWmsUrl', async () => {
    await importComponent();
    const el = document.createElement('gi-static-plan') as any;
    document.body.appendChild(el);
    el.setPlan({ kind: 'main', bbox: [0, 0, 1, 1] });

    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Kein Plan verfügbar');

    document.body.removeChild(el);
  });

  it('renders image fallback when bbox is missing', async () => {
    await importComponent();
    const el = document.createElement('gi-static-plan') as any;
    el.style.width = '400px';
    document.body.appendChild(el);
    el.setPlan({ kind: 'main', imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=' });

    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('img');
    expect(html).toContain('data:image/png;base64');

    document.body.removeChild(el);
  });

  it('renders image fallback for WMS when bbox is missing', async () => {
    await importComponent();
    const el = document.createElement('gi-static-plan') as any;
    el.style.width = '400px';
    document.body.appendChild(el);
    el.setPlan({ kind: 'main', referenceWmsUrl: 'https://example.com/wms?REQUEST=GetMap' });

    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('img');
    expect(html).toContain('https://example.com/wms');

    document.body.removeChild(el);
  });

  it('renders OL map container when plan has WMS url with bbox', async () => {
    await importComponent();
    const el = document.createElement('gi-static-plan') as any;
    el.style.width = '400px';
    document.body.appendChild(el);

    const plan = {
      kind: 'main',
      referenceWmsUrl: 'https://example.com/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=daten&CRS=EPSG%3A2056&BBOX=0,0,100,50&WIDTH=1000&HEIGHT=500',
      bbox: [0, 0, 100, 50] as [number, number, number, number],
    };
    el.setPlan(plan);

    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('map-target');

    document.body.removeChild(el);
  });
});

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
});

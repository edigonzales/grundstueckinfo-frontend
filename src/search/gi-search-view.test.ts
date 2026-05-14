import { describe, it, expect } from 'vitest';
import '../search/gi-search-view';

describe('GiSearchView', () => {
  it('registers the custom element', () => {
    expect(customElements.get('gi-search-view')).toBeDefined();
  });
});

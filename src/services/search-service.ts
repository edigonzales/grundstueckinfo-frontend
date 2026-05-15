import type { AppConfig } from '../config';

export interface SearchServerResult {
  id: string;
  label: string;
  detail?: string;
  easting: number;
  northing: number;
  origin: 'address' | 'parcel';
  egrid?: string;
}

interface SearchServerProperties {
  id?: string | number;
  label?: string;
  detail?: string;
  x?: number;
  y?: number;
  origin?: string;
}

interface SearchServerRawResult {
  id?: string | number;
  properties?: SearchServerProperties;
  attrs?: SearchServerProperties;
}

export class SearchService {
  constructor(private config: AppConfig) {}

  private buildUrl(searchText: string): string {
    return this.config.searchServerUrlTemplate
      .replace('{searchText}', encodeURIComponent(searchText))
      .replace('{language}', this.config.language);
  }

  private extractEgrid(text?: string): string | undefined {
    if (!text) return undefined;
    const match = text.match(/CH\d{12}/);
    return match ? match[0] : undefined;
  }

  private normalizeResult(item: SearchServerRawResult): SearchServerResult {
    const props = item.properties ?? item.attrs ?? {};
    const origin = props.origin;
    const egrid = this.extractEgrid(props.detail || props.label);

    return {
      id: String(item.id ?? props.id ?? ''),
      label: props.label || '',
      detail: props.detail,
      // EN = properties.y (Easting), properties.x (Northing) – lt. SPEC
      easting: props.y ?? 0,
      northing: props.x ?? 0,
      origin: origin === 'parcel' ? 'parcel' : 'address',
      egrid,
    };
  }

  async search(searchText: string): Promise<SearchServerResult[]> {
    const url = this.buildUrl(searchText);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`SearchServer error: ${res.status}`);
    }
    const json = await res.json() as {
      features?: SearchServerRawResult[];
      results?: SearchServerRawResult[];
    };
    const rawResults = Array.isArray(json.features) ? json.features : (json.results ?? []);
    return rawResults.map((item) => this.normalizeResult(item));
  }
}

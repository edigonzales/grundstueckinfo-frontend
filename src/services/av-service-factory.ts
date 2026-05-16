import { parseGetEgridResponse } from '../parsers/getegrid-parser';
import { parseExtract } from '../parsers/extract-parser';
import type { AppConfig } from '../config';
import type { GetEgridItem, ExtractViewModel } from '../parsers/types';
import type { AvService, ServiceError } from './av-service';

const MOCK_XML_BASE_PATH = import.meta.env.VITE_MOCK_XML_BASE_PATH || '/mock-data';

// Lazily loaded XML fixture contents
const fixtureCache: Record<string, string> = {};

async function loadMockXml(filename: string): Promise<string> {
  if (fixtureCache[filename]) {
    return fixtureCache[filename];
  }
  const response = await fetch(`${MOCK_XML_BASE_PATH}/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load mock XML ${filename}: ${response.statusText}`);
  }
  const text = await response.text();
  fixtureCache[filename] = text;
  return text;
}

export class MockAvService implements AvService {
  async getEGRID(_east: number, _north: number): Promise<GetEgridItem[]> {
    const xml = await loadMockXml('getegrid.xml');
    return parseGetEgridResponse(xml);
  }

  async getExtractById(egrid: string): Promise<ExtractViewModel> {
    const filenameMap: Record<string, string> = {
      CH994641443597: 'CH994641443597.xml',
      CH843546415105: 'CH843546415105.xml',
      CH834642351474: 'CH834642351474_mit_proj_geb.xml',
      CH273542614644: 'CH273542614644_mit_proj_liegen.xml',
      CH273542614644ohne: 'CH273542614644_ohne_proj_liegen.xml',
    };
    const filename = filenameMap[egrid];
    if (!filename) {
      const err: ServiceError = { status: 204, message: 'No data for egrid' };
      return Promise.reject(err);
    }
    const xml = await loadMockXml(filename);
    return Promise.resolve(parseExtract(xml));
  }
}

export class LiveAvService implements AvService {
  constructor(private config: AppConfig) {}

  private async fetchXml(url: string): Promise<Response> {
    const res = await fetch(url);
    if (res.status === 204) {
      const err: ServiceError = { status: 204, message: 'No content' };
      throw err;
    }
    if (!res.ok) {
      const err: ServiceError = { status: res.status, message: res.statusText };
      throw err;
    }
    return res;
  }

  async getEGRID(east: number, north: number): Promise<GetEgridItem[]> {
    const url = `${this.config.serviceBaseUrl}/getegrid/?EN=${east},${north}&GEOMETRY=true`;
    const res = await this.fetchXml(url);
    const xml = await res.text();
    return parseGetEgridResponse(xml);
  }

  async getExtractById(egrid: string): Promise<ExtractViewModel> {
    const url = `${this.config.serviceBaseUrl}/extract/xml/?EGRID=${egrid}&GEOMETRY=true&LANG=${this.config.language}`;
    const res = await this.fetchXml(url);
    const xml = await res.text();
    return parseExtract(xml);
  }
}

export function createAvService(config: AppConfig): AvService {
  if (config.mockEnabled) {
    return new MockAvService();
  }
  return new LiveAvService(config);
}

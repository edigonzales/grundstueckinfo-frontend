import { parseGetEgridResponse } from '../parsers/getegrid-parser';
import { parseExtract } from '../parsers/extract-parser';
import type { AppConfig } from '../config';
import type { GetEgridItem, ExtractViewModel } from '../parsers/types';
import type { AvService, ServiceError } from './av-service';

// Vite ?raw imports: XML files loaded as strings at build time
import getegridXml from '../../input/getegrid.xml?raw';
import ch994Xml from '../../input/CH994641443597.xml?raw';
import ch843Xml from '../../input/CH843546415105.xml?raw';
import ch834Xml from '../../input/CH834642351474_mit_proj_geb.xml?raw';
import ch273Xml from '../../input/CH273542614644_mit_proj_liegen.xml?raw';
import ch273ohneXml from '../../input/CH273542614644_ohne_proj_liegen.xml?raw';

const fixtures: Record<string, string> = {
  getegrid: getegridXml,
  CH994641443597: ch994Xml,
  CH843546415105: ch843Xml,
  CH834642351474: ch834Xml,
  CH273542614644: ch273Xml,
  CH273542614644ohne: ch273ohneXml,
};

export class MockAvService implements AvService {
  getEGRID(_east: number, _north: number): Promise<GetEgridItem[]> {
    return Promise.resolve(parseGetEgridResponse(fixtures.getegrid));
  }

  getExtractById(egrid: string): Promise<ExtractViewModel> {
    const xml = fixtures[egrid];
    if (!xml) {
      const err: ServiceError = { status: 204, message: 'No data for egrid' };
      return Promise.reject(err);
    }
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

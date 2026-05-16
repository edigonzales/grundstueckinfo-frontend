import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGetEgridResponse } from './getegrid-parser';

const getegridXml = readFileSync(join(__dirname, '../../public/mock-data/getegrid.xml'), 'utf-8');

describe('GetEgridParser', () => {
  it('parses getegrid.xml into two items with correct egrid', () => {
    const items = parseGetEgridResponse(getegridXml);
    expect(items).toHaveLength(2);
    expect(items[0].egrid).toBe('CH970670323250');
    expect(items[1].egrid).toBe('CH767032065235');
  });

  it('parses number, identDN, type from first item', () => {
    const items = parseGetEgridResponse(getegridXml);
    const first = items[0];
    expect(first.number).toBe('287');
    expect(first.identDN).toBe('SO0200002601');
    expect(first.typeLabel).toBe('Liegenschaft');
    expect(first.geometry).toBeDefined();
    expect(first.geometry!.exterior.length).toBeGreaterThan(0);
  });

  it('parses second item with real estate type', () => {
    const items = parseGetEgridResponse(getegridXml);
    const second = items[1];
    expect(second.number).toBe('4681');
    expect(second.typeLabel.toLowerCase()).toContain('baurecht');
    expect(second.geometry).toBeDefined();
  });

  it('throws on invalid XML', () => {
    expect(() => parseGetEgridResponse('not xml')).toThrow('XML parsing error');
  });
});

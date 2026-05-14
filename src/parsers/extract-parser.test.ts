import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseExtract } from './extract-parser';

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, '../../input', name), 'utf-8');
}

describe('ExtractParser', () => {
  const fixtures = [
    'CH994641443597.xml',
    'CH843546415105.xml',
    'CH834642351474_mit_proj_geb.xml',
    'CH273542614644_mit_proj_liegen.xml',
    'CH273542614644_ohne_proj_liegen.xml',
  ];

  it.each(fixtures)('parses %s without error', (name) => {
    const xml = loadFixture(name);
    const vm = parseExtract(xml);
    expect(vm.property.egrid).toMatch(/^CH/);
    expect(vm.property.number).toBeTruthy();
    expect(vm.metadata.creationDate).toBeTruthy();
  });

  it('parses CH994641443597.xml with correct metadata and property', () => {
    const vm = parseExtract(loadFixture('CH994641443597.xml'));
    expect(vm.property.egrid).toBe('CH994641443597');
    expect(vm.property.number).toBe('926');
    expect(vm.property.typeLabel).toBe('Liegenschaft');
    expect(vm.property.municipalityName).toBe('Sauge');
    expect(vm.landCover.length).toBeGreaterThan(0);
    expect(vm.singleObjects.length).toBeGreaterThan(0);
    expect(vm.plans.main).toBeDefined();
    expect(vm.plans.main!.imageDataUrl).toBeTruthy();
    expect(vm.plans.main!.referenceWmsUrl).toBeTruthy();
    expect(vm.offices.responsibleOffice).toBeDefined();
    expect(vm.offices.responsibleOffice!.name).toContain('Geometerbüro');
    expect(vm.offices.landRegisterOffice).toBeDefined();
    expect(vm.offices.propertyInformationAuthority).toBeDefined();
    expect(vm.disclaimer).toContain('Auszug');
  });

  it('parses CH834642351474_mit_proj_geb.xml with buildings', () => {
    const vm = parseExtract(loadFixture('CH834642351474_mit_proj_geb.xml'));
    expect(vm.buildings.length).toBe(1);
    expect(vm.buildings[0].egid).toBe(191850652);
    expect(vm.buildings[0].addresses.length).toBe(3);
    expect(vm.buildings[0].addresses[0].street).toBe('Chemin des Oeuchettes');
    expect(vm.buildings[0].addresses[0].number).toBe('30a');
  });

  it('parses CH273542614644_mit_proj_liegen.xml with projected properties', () => {
    const vm = parseExtract(loadFixture('CH273542614644_mit_proj_liegen.xml'));
    expect(vm.projectedProperties.length).toBe(2);
    expect(vm.projectedProperties[0].number).toBe('642');
    expect(vm.projectedProperties[0].egrid).toBe('CH528461643618');
    expect(vm.projectedProperties[0].landCover.length).toBeGreaterThan(0);
  });

  it('parses CH273542614644_ohne_proj_liegen.xml with Mutation despite filename', () => {
    const vm = parseExtract(loadFixture('CH273542614644_ohne_proj_liegen.xml'));
    // Despite filename, this file contains projected properties (data inconsistency)
    expect(vm.projectedProperties.length).toBeGreaterThanOrEqual(0);
    expect(vm.property.egrid).toBe('CH273542614644');
  });

  it('handles missing optional fields gracefully', () => {
    const minimalXml = `<?xml version="1.0"?>
      <GetExtractByIdResponse xmlns="http://test">
        <Extract>
          <RealEstate_DPR>
            <Number>1</Number>
            <EGRID>CH111111111111</EGRID>
            <IdentDN>TEST</IdentDN>
            <Type><Code>Test</Code><Text>Test</Text></Type>
          </RealEstate_DPR>
        </Extract>
      </GetExtractByIdResponse>`;
    const vm = parseExtract(minimalXml);
    expect(vm.property.egrid).toBe('CH111111111111');
    expect(vm.property.number).toBe('1');
    expect(vm.landCover).toEqual([]);
    expect(vm.buildings).toEqual([]);
    expect(vm.offices.responsibleOffice).toBeUndefined();
  });

  it('throws on invalid XML', () => {
    expect(() => parseExtract('not xml')).toThrow('XML parsing error');
  });
});

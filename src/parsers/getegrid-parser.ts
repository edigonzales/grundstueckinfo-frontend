import { getFirstText, parseSurface, parseLocalisedText } from './xml-utils';
import type { GetEgridItem, Lv95Polygon } from './types';

function parseEgridItem(root: Element, startIndex: number): { item: GetEgridItem; nextIndex: number } | null {
  const children = Array.from(root.children);
  if (startIndex >= children.length) return null;

  let i = startIndex;
  // Find next egrid element
  while (i < children.length && !children[i].localName.includes('egrid')) {
    i++;
  }
  if (i >= children.length) return null;

  const egrid = children[i].textContent?.trim() ?? '';
  i++;

  let number = '';
  let identDN = '';
  let typeCode = '';
  let typeLabel = '';
  let geometry: Lv95Polygon | undefined;

  while (i < children.length && !children[i].localName.includes('egrid')) {
    const el = children[i];
    const ln = el.localName;
    if (ln === 'number') {
      number = el.textContent?.trim() ?? '';
    } else if (ln === 'identDN') {
      identDN = el.textContent?.trim() ?? '';
    } else if (ln === 'type') {
      typeCode = getFirstText(el, 'Code') ?? '';
      typeLabel = getFirstText(el, 'Text') ?? '';
      // Fallback: LocalisedText inside Text wrapper
      if (!typeLabel) {
        typeLabel = parseLocalisedText(el, 'Text') ?? '';
      }
    } else if (ln === 'limit') {
      const coords = parseSurface(el, 'surface');
      if (coords && coords.length > 0) {
        geometry = { exterior: coords };
      }
    }
    i++;
  }

  return {
    item: { egrid, number, identDN, typeCode, typeLabel, geometry },
    nextIndex: i,
  };
}

export function parseGetEgridResponse(xmlText: string): GetEgridItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const root = doc.documentElement;

  // Check for parsing error
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('XML parsing error');
  }

  const results: GetEgridItem[] = [];
  let idx = 0;
  while (true) {
    const parsed = parseEgridItem(root, idx);
    if (!parsed) break;
    results.push(parsed.item);
    idx = parsed.nextIndex;
  }

  return results;
}

import type { Lv95Surface } from './types';

export function getChildElements(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter(
    (child) => child.localName === localName || child.tagName.endsWith(`:${localName}`)
  );
}

export function getFirstText(parent: Element, localName: string): string | undefined {
  const child = getChildElements(parent, localName)[0];
  if (!child) return undefined;
  const localised = getChildElements(child, 'LocalisedText')[0];
  if (localised) {
    const innerText = getChildElements(localised, 'Text')[0];
    if (innerText) return innerText.textContent?.trim() ?? undefined;
    return localised.textContent?.trim() ?? undefined;
  }
  return child.textContent?.trim() ?? undefined;
}

export function getFirstNumber(parent: Element, localName: string): number | undefined {
  const text = getFirstText(parent, localName);
  if (text === undefined) return undefined;
  const n = Number(text);
  return isNaN(n) ? undefined : n;
}

export function parseLocalisedText(parent: Element, localName: string): string | undefined {
  const wrapper = getChildElements(parent, localName)[0];
  if (!wrapper) return undefined;
  const lt = getChildElements(wrapper, 'LocalisedText')[0];
  if (!lt) return undefined;
  const txt = getChildElements(lt, 'Text')[0];
  return txt?.textContent?.trim() ?? undefined;
}

function closeRing(coords: [number, number][]): [number, number][] {
  if (coords.length === 0) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...coords, [first[0], first[1]] as [number, number]];
  }
  return coords;
}

function parseBoundaryCoords(boundaryEl?: Element): [number, number][] | undefined {
  if (!boundaryEl) return undefined;
  const polyline = getChildElements(boundaryEl, 'polyline')[0];
  if (!polyline) return undefined;
  const coords = getChildElements(polyline, 'coord');
  const result = coords.map((coord) => {
    const c1 = getFirstText(coord, 'c1');
    const c2 = getFirstText(coord, 'c2');
    return [c1 ? Number(c1) : NaN, c2 ? Number(c2) : NaN] as [number, number];
  }).filter(([x, y]) => !isNaN(x) && !isNaN(y));
  if (result.length < 4) return undefined;
  return closeRing(result);
}

export function parseLimitSurface(limitEl?: Element): Lv95Surface | undefined {
  if (!limitEl) return undefined;
  const surface = getChildElements(limitEl, 'surface')[0];
  if (!surface) return undefined;

  const exterior = getChildElements(surface, 'exterior')[0];
  const exteriorCoords = parseBoundaryCoords(exterior);
  if (!exteriorCoords) return undefined;

  const interiors = [] as [number, number][][];
  for (const interior of getChildElements(surface, 'interior')) {
    const interiorCoords = parseBoundaryCoords(interior);
    if (interiorCoords) {
      interiors.push(interiorCoords);
    }
  }

  return { exterior: exteriorCoords, interiors };
}

export function parsePolylineCoords(surfaceEl?: Element): [number, number][] | undefined {
  if (!surfaceEl) return undefined;
  const exterior = getChildElements(surfaceEl, 'exterior')[0];
  if (!exterior) return undefined;
  const polyline = getChildElements(exterior, 'polyline')[0];
  if (!polyline) return undefined;
  const coords = getChildElements(polyline, 'coord');
  return coords.map((coord) => {
    const c1 = getFirstText(coord, 'c1');
    const c2 = getFirstText(coord, 'c2');
    return [c1 ? Number(c1) : NaN, c2 ? Number(c2) : NaN] as [number, number];
  }).filter(([x, y]) => !isNaN(x) && !isNaN(y));
}

export function parseSurface(parent: Element, localName: string): [number, number][] | undefined {
  const el = getChildElements(parent, localName)[0];
  if (!el) return undefined;
  return parsePolylineCoords(el);
}

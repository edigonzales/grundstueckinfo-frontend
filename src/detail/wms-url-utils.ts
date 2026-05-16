/**
 * Parst eine WMS-GetMap-URL und extrahiert:
 * - url: Die Base-URL (ohne Query-String)
 * - params: Die WMS-Parameter als Objekt
 */
export function parseWmsGetMapUrl(getMapUrl: string): { url: string; params: Record<string, string> } {
  const urlObj = new URL(getMapUrl);
  const params: Record<string, string> = {};

  for (const [key, value] of urlObj.searchParams.entries()) {
    // Ignoriere WIDTH, HEIGHT, BBOX, SRS – die steuert OpenLayers
    const ignored = ['WIDTH', 'HEIGHT', 'BBOX', 'SRS'];
    if (!ignored.includes(key.toUpperCase())) {
      params[key] = value;
    }
  }

  // Entferne Query-String von der URL
  urlObj.search = '';
  // Entferne ggf. ein "?" am Ende
  let baseUrl = urlObj.toString();
  if (baseUrl.endsWith('?')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return { url: baseUrl, params };
}

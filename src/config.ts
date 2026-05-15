export interface BackgroundStrategy {
  switchScaleDenominator: number;
}

export interface BackgroundWmts {
  capabilitiesUrl: string;
  urlTemplate: string;
  layer: string;
  matrixSet: string;
  format: string;
}

export interface BackgroundWms {
  url: string;
  layers: string;
  format: string;
  transparent: boolean;
  crs: string;
}

export interface AppConfig {
  mockEnabled: boolean;
  language: string;
  serviceBaseUrl: string;
  authUrl: string;
  projection: string;
  startCenter: [number, number];
  startZoom: number;
  startExtent: [number, number, number, number];
  searchServerUrlTemplate: string;
  backgroundStrategy: BackgroundStrategy;
  backgroundWmts: BackgroundWmts;
  backgroundWms: BackgroundWms;
}

const DEFAULT_CONFIG: AppConfig = {
  mockEnabled: true,
  language: 'de',
  serviceBaseUrl: 'https://avws.sogeo.services',
  authUrl: '#/auth-dummy',
  projection: 'EPSG:2056',
  startCenter: [2588162, 1226286],
  startZoom: 6,
  startExtent: [2420000, 1030000, 2900000, 1350000],
  searchServerUrlTemplate:
    'https://api3.geo.admin.ch/rest/services/ech/SearchServer?sr=2056&searchText={searchText}&lang={language}&type=locations&limit=20&geometryFormat=geojson&origins=address,parcel',
  backgroundStrategy: {
    switchScaleDenominator: 5000,
  },
  backgroundWmts: {
    capabilitiesUrl: 'https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml',
    urlTemplate: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/2056/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
    layer: 'ch.swisstopo.pixelkarte-farbe',
    matrixSet: '2056_27',
    format: 'image/jpeg',
  },
  backgroundWms: {
    url: 'https://geodienste.ch/db/av_situationsplan_0/deu',
    layers: 'daten',
    format: 'image/png',
    transparent: true,
    crs: 'EPSG:2056',
  },
};

export async function loadAppConfig(url = '/config/app.config.json'): Promise<AppConfig> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to load config from ${url}, using defaults.`);
      return { ...DEFAULT_CONFIG };
    }
    const parsed = await response.json();
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.warn('Error loading config, using defaults.', err);
    return { ...DEFAULT_CONFIG };
  }
}

export { DEFAULT_CONFIG };

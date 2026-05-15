export interface Lv95Polygon {
  exterior: [number, number][];
}

export interface Lv95Surface {
  exterior: [number, number][];
  interiors: [number, number][][];
}

export interface GetEgridItem {
  egrid: string;
  number: string;
  identDN: string;
  typeCode: string;
  typeLabel: string;
  geometry?: Lv95Polygon;
}

export interface PlanImage {
  kind: 'main' | 'landDescription' | 'projectedObjects';
  imageDataUrl?: string;
  referenceWmsUrl?: string;
  bbox?: [number, number, number, number];
  width?: number;
  height?: number;
}

export interface ExtractMetadata {
  extractIdentifier?: string;
  creationDate?: string;
  updateDateCS?: string;
}

export interface PropertySummary {
  number: string;
  egrid: string;
  identDN: string;
  typeCode: string;
  typeLabel: string;
  canton?: string;
  municipalityName?: string;
  municipalityCode?: string;
  subUnitOfLandRegister?: string;
  subUnitOfLandRegisterDesignation?: string;
  landRegistryArea?: number;
  toponyms: string[];
}

export interface LandCoverItem {
  code: string;
  label: string;
  objectStatusCode?: string;
  objectStatusLabel?: string;
  area?: number;
  areaShare?: number;
  egid?: string;
}

export interface BuildingInfo {
  egid?: number;
  addresses: BuildingAddress[];
  status: 'actual' | 'planned' | 'none';
  origin?: 'landcover' | 'singleobject' | 'fallback';
  typeLabel?: string;
  plannedTypeLabel?: string;
  plannedAreaShare?: number;
}

export interface BuildingAddress {
  street?: string;
  number?: string;
  plz?: string;
  city?: string;
}

export interface SingleObjectInfo {
  code: string;
  label: string;
  objectStatusCode?: string;
  objectStatusLabel?: string;
  area?: number;
  areaShare?: number;
  egid?: string;
}

export interface ProjectedPropertyInfo {
  number: string;
  egrid: string;
  typeCode: string;
  typeLabel: string;
  newParcelArea?: number;
  landCover: Omit<LandCoverItem, 'areaShare'>[];
  singleObjects: Omit<SingleObjectInfo, 'areaShare'>[];
}

export interface Office {
  name?: string;
  officeAtWeb?: string;
  street?: string;
  number?: string;
  postalCode?: string;
  city?: string;
  line1?: string;
}

export interface ExtractOffices {
  propertyInformationAuthority?: Office;
  responsibleOffice?: Office;
  landRegisterOffice?: Office;
}

export interface ExtractPlans {
  main?: PlanImage;
  landDescription?: PlanImage;
  projectedObjects?: PlanImage;
}

export interface ExtractViewModel {
  metadata: ExtractMetadata;
  property: PropertySummary;
  plans: ExtractPlans;
  landCover: LandCoverItem[];
  buildings: BuildingInfo[];
  singleObjects: SingleObjectInfo[];
  projectedProperties: ProjectedPropertyInfo[];
  offices: ExtractOffices;
  disclaimer?: string;
  propertyGeometry?: Lv95Surface;
}

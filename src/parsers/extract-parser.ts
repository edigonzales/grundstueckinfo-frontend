import {
  getChildElements,
  getFirstText,
  getFirstNumber,
  parseLocalisedText,
  parseLimitSurface,
} from './xml-utils';
import type {
  ExtractViewModel,
  ExtractMetadata,
  PropertySummary,
  LandCoverItem,
  BuildingInfo,
  BuildingAddress,
  SingleObjectInfo,
  ProjectedPropertyInfo,
  Office,
  ExtractOffices,
  ExtractPlans,
  PlanImage,
  Lv95Surface,
} from './types';

function parseOffice(parent: Element, localName: string): Office | undefined {
  const el = getChildElements(parent, localName)[0];
  if (!el) return undefined;
  return {
    name: parseLocalisedText(el, 'Name'),
    officeAtWeb: parseLocalisedText(el, 'OfficeAtWeb'),
    street: getFirstText(el, 'Street'),
    number: getFirstText(el, 'Number'),
    postalCode: getFirstText(el, 'PostalCode'),
    city: getFirstText(el, 'City'),
    line1: getFirstText(el, 'Line1'),
  };
}

function parseTypeText(el: Element): { code: string; label: string } {
  const code = getFirstText(el, 'Code') ?? '';
  let label = getFirstText(el, 'Text') ?? '';
  // Try nested LocalisedText
  if (!label) {
    label = parseLocalisedText(el, 'Text') ?? '';
  }
  return { code, label };
}

function isRealObjectStatus(code?: string): boolean {
  return code === 'actual' || code === 'real';
}

function isPlannedObjectStatus(code?: string): boolean {
  return code === 'planned' || code === 'projected';
}

function parseLandCover(el: Element): LandCoverItem {
  const typeEl = getChildElements(el, 'Type')[0];
  const { code, label } = typeEl ? parseTypeText(typeEl) : { code: '', label: '' };
  const statusEl = getChildElements(el, 'Objectstatus')[0];
  let objectStatusCode: string | undefined;
  let objectStatusLabel: string | undefined;
  if (statusEl) {
    objectStatusCode = getFirstText(statusEl, 'Code') ?? undefined;
    objectStatusLabel = getFirstText(statusEl, 'Text') ?? undefined;
    if (!objectStatusLabel) {
      objectStatusLabel = parseLocalisedText(statusEl, 'Text') ?? undefined;
    }
  }
  return {
    code,
    label,
    objectStatusCode,
    objectStatusLabel,
    area: getFirstNumber(el, 'Area'),
    areaShare: getFirstNumber(el, 'AreaShare'),
    egid: getFirstText(el, 'EGID') ?? undefined,
  };
}

function parseSingleObject(el: Element): SingleObjectInfo {
  const typeEl = getChildElements(el, 'Type')[0];
  const { code, label } = typeEl ? parseTypeText(typeEl) : { code: '', label: '' };
  const statusEl = getChildElements(el, 'Objectstatus')[0];
  let objectStatusCode: string | undefined;
  let objectStatusLabel: string | undefined;
  if (statusEl) {
    objectStatusCode = getFirstText(statusEl, 'Code') ?? undefined;
    objectStatusLabel = getFirstText(statusEl, 'Text') ?? undefined;
    if (!objectStatusLabel) {
      objectStatusLabel = parseLocalisedText(statusEl, 'Text') ?? undefined;
    }
  }
  return {
    code,
    label,
    objectStatusCode,
    objectStatusLabel,
    area: getFirstNumber(el, 'Area'),
    areaShare: getFirstNumber(el, 'AreaShare'),
    egid: getFirstText(el, 'EGID') ?? undefined,
  };
}

function parseBuilding(el: Element): BuildingInfo {
  const egid = getFirstNumber(el, 'EGID');
  const entrances = getChildElements(el, 'BuildingEntrance').map((e): BuildingAddress => {
    return {
      street: getFirstText(e, 'Street') ?? undefined,
      number: getFirstText(e, 'Number') ?? undefined,
      plz: getFirstText(e, 'PostalCode') ?? undefined,
      city: getFirstText(e, 'City') ?? undefined,
    };
  });
  return { egid, addresses: entrances, status: 'none' };
}

function resolveBuildingStatus(
  buildings: BuildingInfo[],
  landCover: LandCoverItem[],
  singleObjects: SingleObjectInfo[]
): void {
  for (const building of buildings) {
    const egidStr = building.egid !== undefined ? String(building.egid) : undefined;
    if (!egidStr) {
      building.status = 'none';
      continue;
    }

    const lcMatchesActual = landCover.filter(
      (lc) => lc.egid === egidStr && isRealObjectStatus(lc.objectStatusCode)
    );
    const soMatchesActual = singleObjects.filter(
      (so) => so.egid === egidStr && isRealObjectStatus(so.objectStatusCode)
    );

    if (lcMatchesActual.length > 0 && soMatchesActual.length > 0) {
      throw new Error(`Ambiguous building type match for EGID ${egidStr}.`);
    }

    if (lcMatchesActual.length > 0) {
      building.status = 'actual';
      building.origin = 'landcover';
      building.typeLabel = lcMatchesActual[0].label || 'Gebäude';
      continue;
    }

    if (soMatchesActual.length > 0) {
      building.status = 'actual';
      building.origin = 'singleobject';
      building.typeLabel = soMatchesActual[0].label || 'Gebäude';
      continue;
    }

    // No actual partner – check for planned
    const lcMatchesPlanned = landCover.filter(
      (lc) => lc.egid === egidStr && isPlannedObjectStatus(lc.objectStatusCode)
    );
    const soMatchesPlanned = singleObjects.filter(
      (so) => so.egid === egidStr && isPlannedObjectStatus(so.objectStatusCode)
    );

    if (lcMatchesPlanned.length > 0) {
      building.status = 'planned';
      building.plannedTypeLabel = lcMatchesPlanned[0].label || 'Gebäude';
      building.plannedAreaShare = lcMatchesPlanned[0].areaShare;
      continue;
    }

    if (soMatchesPlanned.length > 0) {
      building.status = 'planned';
      building.plannedTypeLabel = soMatchesPlanned[0].label || 'Gebäude';
      building.plannedAreaShare = soMatchesPlanned[0].areaShare;
      continue;
    }

    building.status = 'none';
  }
}

function parsePlanImage(el: Element, kind: PlanImage['kind']): PlanImage | undefined {
  if (!el) return undefined;

  let imageDataUrl: string | undefined;
  let referenceWmsUrl: string | undefined;
  let bbox: [number, number, number, number] | undefined;

  // Parse Image -> LocalisedBlob -> Blob
  const imageEl = getChildElements(el, 'Image')[0];
  if (imageEl) {
    const lb = getChildElements(imageEl, 'LocalisedBlob')[0];
    if (lb) {
      const blobText = getFirstText(lb, 'Blob');
      if (blobText) {
        imageDataUrl = `data:image/png;base64,${blobText.trim()}`;
      }
    }
  }

// Parse ReferenceWMS
  const refWms = getChildElements(el, 'ReferenceWMS')[0];
  if (refWms) {
    // ReferenceWMS has structure: LocalisedText -> Text
    const lt = getChildElements(refWms, 'LocalisedText')[0];
    if (lt) {
      const txt = getChildElements(lt, 'Text')[0];
      if (txt) {
        referenceWmsUrl = txt.textContent?.trim() ?? undefined;
      }
    }
  }

  // Parse bbox from min/max
  const minEl = getChildElements(el, 'min')[0];
  const maxEl = getChildElements(el, 'max')[0];
  if (minEl && maxEl) {
    const minX = Number(getFirstText(minEl, 'c1') ?? 'NaN');
    const minY = Number(getFirstText(minEl, 'c2') ?? 'NaN');
    const maxX = Number(getFirstText(maxEl, 'c1') ?? 'NaN');
    const maxY = Number(getFirstText(maxEl, 'c2') ?? 'NaN');
    if (!isNaN(minX) && !isNaN(minY) && !isNaN(maxX) && !isNaN(maxY)) {
      bbox = [minX, minY, maxX, maxY];
    }
  }

  return { kind, imageDataUrl, referenceWmsUrl, bbox };
}

function parseProjectedProperty(el: Element): ProjectedPropertyInfo {
  const number = getFirstText(el, 'Number') ?? '';
  const egrid = getFirstText(el, 'EGRID') ?? '';
  const type = getChildElements(el, 'Type')[0];
  const typeCode = type ? (getFirstText(type, 'Code') ?? '') : '';
  const typeLabel = type ? (parseLocalisedText(type, 'Text') ?? getFirstText(type, 'Text') ?? '') : '';
  const newParcelArea = getFirstNumber(el, 'newParcelArea');

  const landCover = getChildElements(el, 'LandCover').map((lc) => {
    const lcType = getChildElements(lc, 'Type')[0];
    const { code, label } = lcType ? parseTypeText(lcType) : { code: '', label: '' };
    const statusEl = getChildElements(lc, 'Objectstatus')[0];
    let objectStatusCode: string | undefined;
    let objectStatusLabel: string | undefined;
    if (statusEl) {
      objectStatusCode = getFirstText(statusEl, 'Code') ?? undefined;
      objectStatusLabel = getFirstText(statusEl, 'Text') ?? undefined;
      if (!objectStatusLabel) {
        objectStatusLabel = parseLocalisedText(statusEl, 'Text') ?? undefined;
      }
    }
    return { code, label, objectStatusCode, objectStatusLabel, area: getFirstNumber(lc, 'Area') };
  });

  const singleObjects = getChildElements(el, 'SingleObject').map((so) => {
    const soType = getChildElements(so, 'Type')[0];
    const { code, label } = soType ? parseTypeText(soType) : { code: '', label: '' };
    const statusEl = getChildElements(so, 'Objectstatus')[0];
    let objectStatusCode: string | undefined;
    let objectStatusLabel: string | undefined;
    if (statusEl) {
      objectStatusCode = getFirstText(statusEl, 'Code') ?? undefined;
      objectStatusLabel = getFirstText(statusEl, 'Text') ?? undefined;
      if (!objectStatusLabel) {
        objectStatusLabel = parseLocalisedText(statusEl, 'Text') ?? undefined;
      }
    }
    return { code, label, objectStatusCode, objectStatusLabel, area: getFirstNumber(so, 'Area') };
  });

  return { number, egrid, typeCode, typeLabel, newParcelArea, landCover, singleObjects };
}

export function parseExtract(xmlText: string): ExtractViewModel {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const root = doc.documentElement;

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('XML parsing error');
  }

  const extractEl = getChildElements(root, 'Extract')[0] ?? root;

  const metadata: ExtractMetadata = {
    extractIdentifier: getFirstText(extractEl, 'ExtractIdentifier') ?? undefined,
    creationDate: getFirstText(extractEl, 'CreationDate') ?? undefined,
    updateDateCS: getFirstText(extractEl, 'UpdateDateCS') ?? undefined,
  };

  // Disclaimer
  let disclaimer: string | undefined;
  const discEl = getChildElements(extractEl, 'Disclaimer')[0];
  if (discEl) {
    disclaimer = parseLocalisedText(discEl, 'Content') ?? getFirstText(discEl, 'Content') ?? undefined;
  }

  // Property
  const realEstate = getChildElements(extractEl, 'RealEstate_DPR')[0];
  const property: PropertySummary = {
    number: getFirstText(realEstate, 'Number') ?? '',
    egrid: getFirstText(realEstate, 'EGRID') ?? '',
    identDN: getFirstText(realEstate, 'IdentDN') ?? '',
    typeCode: '',
    typeLabel: '',
    canton: getFirstText(realEstate, 'Canton') ?? undefined,
    municipalityName: getFirstText(realEstate, 'MunicipalityName') ?? undefined,
    municipalityCode: getFirstText(realEstate, 'MunicipalityCode') ?? undefined,
    subUnitOfLandRegister: getFirstText(realEstate, 'SubUnitOfLandRegister') ?? undefined,
    subUnitOfLandRegisterDesignation: getFirstText(realEstate, 'SubUnitOfLandRegisterDesignation') ?? undefined,
    landRegistryArea: getFirstNumber(realEstate, 'LandRegistryArea'),
    toponyms: getChildElements(realEstate, 'Toponym').map((t) => t.textContent?.trim() ?? ''),
  };

  const typeEl = getChildElements(realEstate, 'Type')[0];
  if (typeEl) {
    property.typeCode = getFirstText(typeEl, 'Code') ?? '';
    property.typeLabel = parseLocalisedText(typeEl, 'Text') ?? getFirstText(typeEl, 'Text') ?? '';
  }

  // Property geometry (Limit surface)
  const propertyGeometry: Lv95Surface | undefined = parseLimitSurface(getChildElements(realEstate, 'Limit')[0]);

  // Plans
  const plans: ExtractPlans = {
    main: parsePlanImage(getChildElements(realEstate, 'PlanForMainPage')[0], 'main'),
    landDescription: parsePlanImage(getChildElements(realEstate, 'PlanForLandDescription')[0], 'landDescription'),
    projectedObjects: parsePlanImage(getChildElements(realEstate, 'PlanForProjectedObjects')[0], 'projectedObjects'),
  };

  // LandCover, Buildings, SingleObjects
  const landCover = getChildElements(realEstate, 'LandCover').map(parseLandCover);
  const buildings = getChildElements(realEstate, 'Building').map(parseBuilding);
  const singleObjects = getChildElements(realEstate, 'SingleObject').map(parseSingleObject);

  // Resolve building statuses via joins
  resolveBuildingStatus(buildings, landCover, singleObjects);

  // Projected Properties
  const projectedProperties: ProjectedPropertyInfo[] = [];
  getChildElements(realEstate, 'Mutation').forEach((mutation) => {
    getChildElements(mutation, 'projectedProperty').forEach((pp) => {
      projectedProperties.push(parseProjectedProperty(pp));
    });
  });

  // Offices
  const offices: ExtractOffices = {
    propertyInformationAuthority: parseOffice(extractEl, 'PropertyInformationAuthority'),
    responsibleOffice: parseOffice(realEstate, 'ResponsibleOffice'),
    landRegisterOffice: parseOffice(realEstate, 'LandRegisterOffice'),
  };

  return {
    metadata,
    property,
    plans,
    landCover,
    buildings,
    singleObjects,
    projectedProperties,
    offices,
    disclaimer,
    propertyGeometry,
  };
}

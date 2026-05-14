import type { GetEgridItem, ExtractViewModel } from '../parsers/types';

export interface AvService {
  getEGRID(east: number, north: number): Promise<GetEgridItem[]>;
  getExtractById(egrid: string): Promise<ExtractViewModel>;
}

export interface ServiceError {
  status: number;
  message: string;
}

export function isServiceError(err: unknown): err is ServiceError {
  return typeof err === 'object' && err !== null && 'status' in err && typeof (err as any).status === 'number';
}

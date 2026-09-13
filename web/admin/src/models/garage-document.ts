import type { BaseEntity } from './base';
import type { GarageDocType } from './enums';

/** Registration documents for a garage (G-15). */
export interface GarageDocument extends BaseEntity {
  garageId: number;
  docType: GarageDocType;
  fileUrl: string;
  note: string | null;
}

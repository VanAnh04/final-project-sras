import type { BaseEntity } from './base';
import type { PhotoType } from './enums';

/** A photo attached to a rescue request. */
export interface RescueRequestPhoto extends BaseEntity {
  requestId: number;
  photoUrl: string;
  photoType: PhotoType;
  uploadedBy: number;
}

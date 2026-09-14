import type { BaseEntity } from './base';
import type { NotificationType } from './enums';

/** In-app notification. */
export interface Notification extends BaseEntity {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  refType: string | null;
  refId: number | null;
  isRead: boolean;
  sentViaFcm: boolean;
}

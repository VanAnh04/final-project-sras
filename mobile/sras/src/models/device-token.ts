import type { BaseEntity } from './base';
import type { DevicePlatform } from './enums';

/** A device registered to receive FCM push notifications. */
export interface DeviceToken extends BaseEntity {
  userId: number;
  fcmToken: string;
  platform: DevicePlatform;
  lastUsedAt: string;
}

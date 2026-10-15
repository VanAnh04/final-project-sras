// String-literal unions mirroring the VARCHAR enums in docs/database.dbml.
// Values are stored as VARCHAR (native PG enums are banned); keep in sync with the DBML notes.

export type UserRole = 'CUSTOMER' | 'GARAGE_OWNER' | 'GARAGE_STAFF' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED';
export type DevicePlatform = 'ANDROID' | 'IOS';

export type VehicleType = 'CAR' | 'MOTORBIKE';
export type Capability = 'CAR' | 'MOTORBIKE' | 'BOTH';

export type GarageStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type GarageDocType =
  | 'BUSINESS_LICENSE'
  | 'OWNER_ID_CARD_FRONT'
  | 'OWNER_ID_CARD_BACK'
  | 'CRIMINAL_RECORD'
  | 'GARAGE_PHOTO'
  | 'VEHICLE_REGISTRATION';
export type WorkStatus = 'FREE' | 'BUSY';
export type RescueVehicleKind = 'TOW_TRUCK' | 'MOTORBIKE' | 'VAN';

export type FeeType = 'RESCUE_FEE' | 'TOWING_FEE' | 'SERVICE_FEE';
export type ServiceUnit = 'LAN' | 'KM';

export type RequestPaymentMethod = 'CASH' | 'BANK_TRANSFER';
export type RescueStatus =
  | 'DRAFT'
  | 'SEARCHING'
  | 'PENDING_GARAGE'
  | 'NO_GARAGE_FOUND'
  | 'ACCEPTED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'DIAGNOSED'
  | 'REPAIRING_ONSITE'
  | 'TOWING'
  | 'DECLINED'
  | 'COMPLETED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'RATED'
  | 'CANCELLED';
export type CancelledBy = 'CUSTOMER' | 'GARAGE' | 'SYSTEM';
export type ActorType = 'CUSTOMER' | 'GARAGE_OWNER' | 'GARAGE_STAFF' | 'ADMIN' | 'SYSTEM';
export type PhotoType = 'CUSTOMER_ISSUE' | 'STAFF_DIAGNOSIS' | 'STAFF_COMPLETION';
export type OfferStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT' | 'SKIPPED';
export type ItemPhase = 'ONSITE' | 'AT_GARAGE';
export type ItemStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RepairTicketStatus =
  | 'RECEIVED'
  | 'INSPECTING'
  | 'QUOTED'
  | 'REPAIRING'
  | 'QUOTE_REJECTED'
  | 'DONE'
  | 'DELIVERED';

export type WalletType = 'CREDIT' | 'CASH';
export type WalletTxnType =
  | 'TOPUP'
  | 'COMMISSION_DEBIT'
  | 'TAX_DEBIT'
  | 'ORDER_CREDIT'
  | 'WITHDRAWAL_HOLD'
  | 'WITHDRAWAL_DONE'
  | 'WITHDRAWAL_REFUND'
  | 'ADJUSTMENT';
export type WithdrawalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PAYOUT_SENDING'
  | 'PAYOUT_PROCESSING'
  | 'PAYOUT_UNCERTAIN'
  | 'TRANSFERRED'
  | 'REJECTED'
  | 'FAILED';
export type PayoutMode = 'AUTO' | 'MANUAL';
export type PayoutProvider = 'PAYOS' | 'MOCK';
export type PaymentType = 'RESCUE_ORDER' | 'WALLET_TOPUP';
export type PaymentMethod = 'CASH' | 'PAYOS' | 'MANUAL_TRANSFER';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type RatingDirection = 'CUSTOMER_TO_GARAGE' | 'GARAGE_TO_CUSTOMER';
export type ComplaintTargetType = 'GARAGE' | 'CUSTOMER' | 'PLATFORM';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type AiRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED' | 'CANCELLED' | 'FAILED';
/** Vai của một người trong đơn cứu hộ (call_sessions.caller_role / callee_role). */
export type CallPartyRole = 'CUSTOMER' | 'GARAGE' | 'STAFF';
export type NotificationType =
  | 'NEW_ORDER'
  | 'ORDER_ACCEPTED'
  | 'STAFF_EN_ROUTE'
  | 'STAFF_ARRIVED'
  | 'NEW_QUOTE'
  | 'QUOTE_RESPONDED'
  | 'REPAIR_DONE'
  | 'WALLET_LOW'
  | 'WITHDRAWAL_REVIEWED'
  | 'WITHDRAWAL_TRANSFERRED'
  | 'WITHDRAWAL_FAILED'
  | 'PAYOUT_FUND_LOW'
  | 'GARAGE_REVIEWED'
  | 'SYSTEM_WARNING'
  | 'NO_GARAGE_FOUND'
  | 'STAFF_ASSIGNED'
  | 'TASK_ASSIGNED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED';

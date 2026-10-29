import axiosClient from './axiosClient';

// Rút tiền ví tiền mặt về ngân hàng (payOS kênh chi). Không log body/response: có STK và OTP.

export interface Bank {
  bin: string;
  code: string;
  shortName: string;
  name: string;
  transferSupported: boolean;
}

export interface BankAccount {
  /** BIN 6 số. */
  bankCode: string | null;
  bankName: string | null;
  accountNumberMasked: string | null;
  bankAccountHolder: string | null;
  complete: boolean;
  withdrawLockedUntil: string | null;
}

export interface BankAccountInput {
  bankCode: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}

export interface WithdrawalLimits {
  enabled: boolean;
  blockedReason: string | null;
  minAmount: number;
  maxAmountPerRequest: number;
  maxAmountPerDay: number;
  maxRequestsPerDay: number;
  remainingAmountToday: number;
  remainingRequestsToday: number;
  withdrawableBalance: number;
  creditBalance: number | null;
  otpTtlMinutes: number;
  otpResendCooldownSeconds: number;
}

export type WithdrawalDisplayStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface Withdrawal {
  id: number;
  transferCode: string;
  amount: number;
  status: string;
  displayStatus: WithdrawalDisplayStatus;
  bankSnapshot: string | null;
  createdAt: string;
  payoutSettledAt: string | null;
  failureMessage: string | null;
}

export interface WithdrawalPage {
  content: Withdrawal[];
  last: boolean;
  number: number;
}

const unwrap = (res: any) => res?.data?.data || res?.data || res;

// Danh sách ngân hàng gần như không đổi — cache cho cả phiên.
let banksCache: Bank[] | null = null;

export const withdrawalApi = {
  getBanks: async (): Promise<Bank[]> => {
    if (banksCache) return banksCache;
    const res: any = await axiosClient.get('/banks');
    const list: Bank[] = Array.isArray(unwrap(res)) ? unwrap(res) : [];
    banksCache = list.filter((b) => b.transferSupported);
    return banksCache;
  },

  getBankAccount: async (): Promise<BankAccount> => {
    const res: any = await axiosClient.get('/garages/me/bank-account');
    return unwrap(res);
  },

  requestBankAccountOtp: async (input: BankAccountInput): Promise<void> => {
    await axiosClient.post('/garages/me/bank-account/otp', input);
  },

  updateBankAccount: async (input: BankAccountInput, otpCode: string): Promise<BankAccount> => {
    const res: any = await axiosClient.put('/garages/me/bank-account', { ...input, otpCode });
    return unwrap(res);
  },

  getLimits: async (): Promise<WithdrawalLimits> => {
    const res: any = await axiosClient.get('/garages/me/wallet/withdraw/limits');
    return unwrap(res);
  },

  requestWithdrawalOtp: async (amount: number): Promise<void> => {
    await axiosClient.post('/garages/me/wallet/withdraw/otp', { amount });
  },

  // Cổng chi được gọi đồng bộ, một request có thể mất ~75s — timeout riêng dài hơn mặc định 30s.
  withdraw: async (amount: number, otpCode: string): Promise<Withdrawal> => {
    const res: any = await axiosClient.post('/garages/me/wallet/withdraw', { amount, otpCode }, { timeout: 90000 });
    return unwrap(res);
  },

  listWithdrawals: async (page: number, size: number): Promise<WithdrawalPage> => {
    const res: any = await axiosClient.get('/garages/me/wallet/withdrawals', { params: { page, size } });
    const data = unwrap(res);
    return {
      content: Array.isArray(data?.content) ? data.content : [],
      last: data?.last ?? true,
      number: data?.number ?? page,
    };
  },

  getWithdrawal: async (id: number): Promise<Withdrawal> => {
    const res: any = await axiosClient.get(`/garages/me/wallet/withdrawals/${id}`);
    return unwrap(res);
  },
};

/** Chỉ tin message của server khi là lỗi nghiệp vụ 4xx; 5xx có thể mang câu kỹ thuật. */
export function apiErrorMessage(e: any, fallback: string): string {
  const status = e?.response?.status;
  const message = e?.response?.data?.message;
  if (typeof status === 'number' && status >= 400 && status < 500 && typeof message === 'string' && message.trim()) {
    return message;
  }
  return fallback;
}

/** Timeout / mất mạng: không có response ⇒ không biết server đã xử lý hay chưa. */
export const isNetworkError = (e: any) => !e?.response;

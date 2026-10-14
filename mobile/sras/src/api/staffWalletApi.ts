import axiosClient from './axiosClient';

export interface WalletTransactionItem {
  id: number;
  walletType: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  refType?: string;
  refId?: number;
  createdAt: string;
}

export interface StaffWalletData {
  staffId: number;
  walletBalance: number;
  staffName?: string;
  staffCode?: string;
  garageId?: number;
  garageName?: string;
  transactions: WalletTransactionItem[];
}

export interface PayOSTopupResponse {
  checkoutUrl: string;
  qrCode: string;
  orderCode: number;
  paymentLinkId: string;
  amount: number;
  description: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
}

export const staffWalletApi = {
  getWallet: async (): Promise<StaffWalletData> => {
    const res: any = await axiosClient.get('/garages/staff/me/wallet');
    return res?.data?.data || res?.data || res;
  },

  createTopup: async (amount: number): Promise<PayOSTopupResponse> => {
    const res: any = await axiosClient.post('/garages/staff/me/wallet/topup', { amount });
    return res?.data?.data || res?.data || res;
  },

  checkTopupStatus: async (orderCode: number): Promise<StaffWalletData> => {
    const res: any = await axiosClient.get(`/garages/staff/me/wallet/topup/status/${orderCode}`);
    return res?.data?.data || res?.data || res;
  },
};

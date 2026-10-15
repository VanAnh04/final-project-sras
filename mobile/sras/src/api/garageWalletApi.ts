import axiosClient from './axiosClient';

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

export interface DailyChartPoint {
  dayLabel: string;
  amount: number;
  isToday?: boolean;
}

export interface GarageTxn {
  id: number;
  orderCode: string;
  technicianName: string;
  technicianAvatar?: string;
  executedAtText: string;
  amount: number;
  status: string;
  serviceTitle?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | string;
  totalOrderAmount?: number;
  commissionAmount?: number;
  commissionRate?: number;
  txnType?: 'INCOME' | 'DEDUCTION' | 'TOPUP' | string;
  description?: string;
  createdAt?: string;
}

export interface GarageWalletData {
  cashBalance: number;
  creditBalance: number;
  todayIncome: number;
  todayOrdersCount: number;
  pendingOrdersCount: number;
  sevenDaysTotal: number;
  sevenDaysChart: DailyChartPoint[];
  monthlyChart: DailyChartPoint[];
  yearlyChart: DailyChartPoint[];
  transactions: GarageTxn[];
}

export const garageWalletApi = {
  getOverview: async (): Promise<GarageWalletData> => {
    const res: any = await axiosClient.get('/garages/me/wallet/overview');
    return res?.data?.data || res?.data || res;
  },

  createTopup: async (amount: number): Promise<PayOSTopupResponse> => {
    const res: any = await axiosClient.post('/garages/me/wallet/topup', { amount });
    return res?.data?.data || res?.data || res;
  },

  checkTopupStatus: async (orderCode: number): Promise<GarageWalletData> => {
    const res: any = await axiosClient.get(`/garages/me/wallet/topup/status/${orderCode}`);
    return res?.data?.data || res?.data || res;
  },

  withdraw: async (amount: number): Promise<any> => {
    const res: any = await axiosClient.post('/garages/me/wallet/withdraw', { amount });
    return res?.data?.data || res?.data || res;
  },

  transferToCredit: async (amount: number): Promise<GarageWalletData> => {
    const res: any = await axiosClient.post('/garages/me/wallet/transfer-to-credit', { amount });
    return res?.data?.data || res?.data || res;
  },
};

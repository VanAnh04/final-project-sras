import axiosClient from './axiosClient';
import { RescueRequestDto } from './rescueApi';

export interface PayOSPaymentLinkDto {
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

export const paymentApi = {
  createPayOSLink: async (requestId: number): Promise<PayOSPaymentLinkDto> => {
    const res: any = await axiosClient.post('/payments/payos/create-link', null, {
      params: { requestId },
    });
    return (res?.data ?? res) as PayOSPaymentLinkDto;
  },

  checkPayOSStatus: async (orderCode: number): Promise<RescueRequestDto> => {
    const res: any = await axiosClient.get(`/payments/payos/status/${orderCode}`);
    return (res?.data ?? res) as RescueRequestDto;
  },
};

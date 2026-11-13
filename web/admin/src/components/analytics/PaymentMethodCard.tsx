import React from 'react';
import { QrCode, Banknote } from 'lucide-react';
import type { PaymentMethodBreakdown } from '../../types/analytics';

interface Props {
  paymentBreakdown: PaymentMethodBreakdown;
}

export const PaymentMethodCard: React.FC<Props> = ({ paymentBreakdown }) => {
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const totalPayments = paymentBreakdown.bankTransferCount + paymentBreakdown.cashCount;
  const bankPct = totalPayments > 0 
    ? Math.round((paymentBreakdown.bankTransferCount * 1000) / totalPayments) / 10 
    : 0;
  const cashPct = totalPayments > 0 
    ? Math.round((paymentBreakdown.cashCount * 1000) / totalPayments) / 10 
    : 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Phương thức Thanh toán & Đối soát</h3>
            <p className="text-xs text-gray-500">Giám sát luồng tiền số (PayOS QR) vs Tiền mặt</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 my-auto">
        {/* PayOS / Chuyển khoản QR */}
        <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Cổng ngân hàng / PayOS QR</span>
            </div>
            <span className="text-xs font-black text-orange-700 bg-white px-2.5 py-0.5 rounded-md border border-orange-100">
              {bankPct}% ({paymentBreakdown.bankTransferCount} giao dịch)
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-black text-gray-900">{formatVnd(paymentBreakdown.bankTransferAmount)}</span>
            <span className="text-[11px] text-gray-400 font-medium">Tiền vào thẳng ví hệ thống</span>
          </div>
        </div>

        {/* Tiền mặt trực tiếp (CASH) */}
        <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Tiền mặt trực tiếp (Thợ thu)</span>
            </div>
            <span className="text-xs font-black text-amber-700 bg-white px-2.5 py-0.5 rounded-md border border-amber-100">
              {cashPct}% ({paymentBreakdown.cashCount} giao dịch)
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-black text-gray-900">{formatVnd(paymentBreakdown.cashAmount)}</span>
            <span className="text-[11px] text-gray-400 font-medium">Đối soát trừ vào ví cọc Gara</span>
          </div>
        </div>
      </div>
    </div>
  );
};

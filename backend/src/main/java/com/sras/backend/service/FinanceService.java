package com.sras.backend.service;

import com.sras.backend.dto.response.AdminFinanceOverviewResponse;
import com.sras.backend.dto.response.CustomerWalletOverviewResponse;
import com.sras.backend.dto.response.GarageWalletOverviewResponse;
import com.sras.backend.entity.User;

public interface FinanceService {
    AdminFinanceOverviewResponse getAdminFinanceOverview();
    GarageWalletOverviewResponse getGarageWalletOverview(User user);
    CustomerWalletOverviewResponse getCustomerWalletOverview(User user);
    GarageWalletOverviewResponse transferCashToCredit(User user, Long amount);
}

package com.sras.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseConstraintFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
        } catch (Exception e) {
            log.warn("Could not drop notifications_type_check constraint: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE garage_documents ALTER COLUMN file_url TYPE TEXT");
            jdbcTemplate.execute("ALTER TABLE garage_documents ALTER COLUMN note TYPE TEXT");
            log.info("Successfully updated garage_documents (file_url, note) column types to TEXT");
        } catch (Exception e) {
            log.warn("Could not alter garage_documents column types: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT");
        } catch (Exception e) {
            log.warn("Could not alter users avatar_url column type: {}", e.getMessage());
        }

        ensureWalletLedgerGuards();
    }

    /**
     * Hàng rào ở tầng DB cho tiền (JPA không biểu diễn được partial index):
     * mỗi lệnh rút tối đa 1 dòng HOLD / REFUND / DONE, mỗi đơn chỉ được cộng ví gara 1 lần.
     */
    private void ensureWalletLedgerGuards() {
        // CHECK do Hibernate sinh từ enum có thể đã cũ hơn enum hiện tại ⇒ ghi WITHDRAWAL_* / trạng thái payout mới bị chặn.
        execQuietly("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check");
        execQuietly("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check");
        execQuietly("ALTER TABLE rescue_requests DROP CONSTRAINT IF EXISTS rescue_requests_deposit_status_check");
        execQuietly("ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check");
        execQuietly("ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check");

        execQuietly("CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_txn_withdrawal_once "
                + "ON wallet_transactions (ref_id, type) WHERE ref_type = 'WITHDRAWAL'");

        try {
            Integer dup = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM (SELECT ref_id FROM wallet_transactions "
                            + "WHERE ref_type = 'RESCUE_REQUEST' AND type = 'ORDER_SPLIT_GARAGE' "
                            + "GROUP BY ref_id HAVING COUNT(*) > 1) d", Integer.class);
            if (dup != null && dup > 0) {
                log.error("Có {} đơn đã bị cộng ví gara NHIỀU LẦN (ORDER_SPLIT_GARAGE trùng) — cần đối soát tay; "
                        + "chưa tạo được uq_wallet_txn_order_split_garage_once", dup);
            } else {
                execQuietly("CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_txn_order_split_garage_once "
                        + "ON wallet_transactions (ref_id) WHERE ref_type = 'RESCUE_REQUEST' AND type = 'ORDER_SPLIT_GARAGE'");
            }
        } catch (Exception e) {
            log.warn("Không kiểm tra được sổ cái ORDER_SPLIT_GARAGE trùng: {}", e.getMessage());
        }

        execQuietly("CREATE INDEX IF NOT EXISTS idx_withdrawal_payout_pending "
                + "ON withdrawal_requests (status, payout_sent_at) WHERE payout_mode = 'AUTO'");
        execQuietly("CREATE INDEX IF NOT EXISTS idx_withdrawal_needs_review "
                + "ON withdrawal_requests (created_at DESC) WHERE needs_manual_review");
    }

    private void execQuietly(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception e) {
            log.warn("Không chạy được [{}]: {}", sql, e.getMessage());
        }
    }
}

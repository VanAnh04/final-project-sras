-- Tạo bảng call_sessions (nhật ký cuộc gọi thoại trong app) và các index của nó.
--
-- Khi nào cần chạy: môi trường chạy JPA_DDL_AUTO=validate (production) — Hibernate khi đó chỉ đối chiếu,
-- không tự tạo bảng, nên phải chạy file này TRƯỚC khi deploy bản có tính năng gọi thoại.
-- Môi trường dev dùng JPA_DDL_AUTO=update thì Hibernate tự tạo, không cần chạy.
--
-- Kiểu cột khớp entity CallSession + BaseEntity (id, created_at, updated_at, is_deleted).
-- An toàn chạy lại nhiều lần (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS call_sessions (
    id                bigserial   PRIMARY KEY,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    is_deleted        boolean     NOT NULL DEFAULT false,

    rescue_request_id bigint      NOT NULL REFERENCES rescue_requests (id),
    caller_id         bigint      NOT NULL REFERENCES users (id),
    callee_id         bigint      NOT NULL REFERENCES users (id),
    caller_role       varchar(16) NOT NULL,   -- CUSTOMER | GARAGE | STAFF
    callee_role       varchar(16) NOT NULL,   -- CUSTOMER | GARAGE | STAFF
    status            varchar(16) NOT NULL,   -- RINGING | ONGOING | ENDED | MISSED | REJECTED | CANCELLED | FAILED

    answered_at       timestamptz,
    ended_at          timestamptz,
    duration_sec      integer,
    ended_by_id       bigint      REFERENCES users (id)   -- NULL = hệ thống kết thúc
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_status        ON call_sessions (status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_status ON call_sessions (caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee_status ON call_sessions (callee_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_request       ON call_sessions (rescue_request_id);

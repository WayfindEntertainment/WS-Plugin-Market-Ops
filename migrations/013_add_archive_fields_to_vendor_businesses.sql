-- 013_add_archive_fields_to_vendor_businesses.sql
-- Add soft-archive metadata to vendor businesses.

ALTER TABLE market_ops_vendor_businesses
    ADD COLUMN archived_at BIGINT NULL AFTER rejected_by_user_id,
    ADD COLUMN archived_by_user_id INT UNSIGNED NULL AFTER archived_at,
    ADD KEY idx_market_ops_vendor_businesses_archived_at (archived_at),
    ADD CONSTRAINT fk_market_ops_vendor_businesses_archived_by_user
        FOREIGN KEY (archived_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;

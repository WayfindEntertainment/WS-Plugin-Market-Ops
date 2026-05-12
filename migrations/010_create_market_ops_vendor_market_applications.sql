-- 010_create_market_ops_vendor_market_applications.sql
-- Market Ops plugin-owned vendor market applications table.

CREATE TABLE market_ops_vendor_market_applications (
    vendor_application_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_business_id INT UNSIGNED NOT NULL,
    market_group_id INT UNSIGNED NOT NULL,
    application_key CHAR(26) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    fee_mode_snapshot VARCHAR(32) NOT NULL,
    fee_total_cents INT UNSIGNED NOT NULL DEFAULT 0,
    submitted_at BIGINT NULL,
    submitted_by_user_id INT UNSIGNED NULL,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (vendor_application_id),
    UNIQUE KEY uk_market_ops_vendor_market_applications_key (application_key),
    UNIQUE KEY uk_market_ops_vendor_market_applications_vendor_group (
        vendor_business_id,
        market_group_id
    ),
    KEY idx_market_ops_vendor_market_applications_status (status),
    CONSTRAINT fk_market_ops_vendor_market_applications_vendor_business
        FOREIGN KEY (vendor_business_id)
        REFERENCES market_ops_vendor_businesses(vendor_business_id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_market_applications_market_group
        FOREIGN KEY (market_group_id)
        REFERENCES market_ops_market_groups(market_group_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_market_applications_submitted_by_user
        FOREIGN KEY (submitted_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_market_applications_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_market_applications_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT chk_market_ops_vendor_market_applications_status
        CHECK (status IN ('draft', 'submitted', 'withdrawn')),
    CONSTRAINT chk_market_ops_vendor_market_applications_fee_mode_snapshot
        CHECK (fee_mode_snapshot IN ('none', 'per_group', 'per_market'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

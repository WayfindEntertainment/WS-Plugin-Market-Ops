-- 001_create_market_ops_vendor_businesses.sql
-- Market Ops plugin-owned vendor business table.

CREATE TABLE market_ops_vendor_businesses (
    vendor_business_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug VARCHAR(128) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NULL,
    summary TEXT NULL,
    description MEDIUMTEXT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    website_url VARCHAR(255) NULL,
    approval_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    approval_notes TEXT NULL,
    approved_at BIGINT NULL,
    approved_by_user_id INT UNSIGNED NULL,
    rejected_at BIGINT NULL,
    rejected_by_user_id INT UNSIGNED NULL,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (vendor_business_id),
    UNIQUE KEY uk_market_ops_vendor_businesses_slug (slug),
    KEY idx_market_ops_vendor_businesses_approval_status (approval_status),
    KEY idx_market_ops_vendor_businesses_business_name (business_name),
    CONSTRAINT fk_market_ops_vendor_businesses_approved_by_user
        FOREIGN KEY (approved_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_businesses_rejected_by_user
        FOREIGN KEY (rejected_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_businesses_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_businesses_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT chk_market_ops_vendor_businesses_approval_status
        CHECK (approval_status IN ('pending', 'approved', 'rejected'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

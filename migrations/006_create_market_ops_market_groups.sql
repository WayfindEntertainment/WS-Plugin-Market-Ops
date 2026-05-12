-- 006_create_market_ops_market_groups.sql
-- Market Ops plugin-owned market groups table.

CREATE TABLE market_ops_market_groups (
    market_group_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug VARCHAR(128) NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    summary TEXT NULL,
    description MEDIUMTEXT NULL,
    fee_mode VARCHAR(32) NOT NULL DEFAULT 'none',
    fee_amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (market_group_id),
    UNIQUE KEY uk_market_ops_market_groups_slug (slug),
    KEY idx_market_ops_market_groups_group_name (group_name),
    KEY idx_market_ops_market_groups_public_slug (is_public, slug),
    CONSTRAINT fk_market_ops_market_groups_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_market_groups_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT chk_market_ops_market_groups_fee_mode
        CHECK (fee_mode IN ('none', 'per_group', 'per_market'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

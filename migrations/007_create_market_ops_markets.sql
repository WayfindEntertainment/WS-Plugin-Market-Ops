-- 007_create_market_ops_markets.sql
-- Market Ops plugin-owned individual markets table.

CREATE TABLE market_ops_markets (
    market_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    market_group_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,
    slug VARCHAR(128) NOT NULL,
    market_name VARCHAR(255) NOT NULL,
    summary TEXT NULL,
    description MEDIUMTEXT NULL,
    starts_at BIGINT NOT NULL,
    ends_at BIGINT NOT NULL,
    applications_open TINYINT(1) NOT NULL DEFAULT 0,
    applications_open_at BIGINT NULL,
    applications_close_at BIGINT NULL,
    fee_amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (market_id),
    UNIQUE KEY uk_market_ops_markets_group_slug (market_group_id, slug),
    KEY idx_market_ops_markets_location_id (location_id),
    KEY idx_market_ops_markets_group_public_slug (market_group_id, is_public, slug),
    CONSTRAINT fk_market_ops_markets_market_group
        FOREIGN KEY (market_group_id)
        REFERENCES market_ops_market_groups(market_group_id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_markets_location
        FOREIGN KEY (location_id)
        REFERENCES market_ops_locations(location_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_markets_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_markets_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- 005_create_market_ops_locations.sql
-- Market Ops plugin-owned canonical locations table.

CREATE TABLE market_ops_locations (
    location_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug VARCHAR(128) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    address_line_1 VARCHAR(255) NULL,
    address_line_2 VARCHAR(255) NULL,
    city VARCHAR(128) NULL,
    state_code CHAR(2) NULL,
    postal_code VARCHAR(32) NULL,
    public_notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (location_id),
    UNIQUE KEY uk_market_ops_locations_slug (slug),
    KEY idx_market_ops_locations_location_name (location_name),
    KEY idx_market_ops_locations_is_active_location_name (is_active, location_name),
    CONSTRAINT fk_market_ops_locations_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_locations_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

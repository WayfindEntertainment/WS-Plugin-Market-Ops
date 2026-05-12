-- 009_create_market_ops_market_booth_offerings.sql
-- Market Ops plugin-owned market booth offerings table.

CREATE TABLE market_ops_market_booth_offerings (
    market_booth_offering_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    market_id INT UNSIGNED NOT NULL,
    booth_type_id INT UNSIGNED NOT NULL,
    booth_number INT UNSIGNED NOT NULL,
    price_cents INT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (market_booth_offering_id),
    UNIQUE KEY uk_market_ops_market_booth_offerings_market_booth_number (market_id, booth_number),
    KEY idx_market_ops_market_booth_offerings_market_active_sort (market_id, is_active, sort_order),
    KEY idx_market_ops_market_booth_offerings_booth_type_id (booth_type_id),
    CONSTRAINT fk_market_ops_market_booth_offerings_market
        FOREIGN KEY (market_id)
        REFERENCES market_ops_markets(market_id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_market_booth_offerings_booth_type
        FOREIGN KEY (booth_type_id)
        REFERENCES market_ops_booth_types(booth_type_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_market_booth_offerings_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_market_booth_offerings_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

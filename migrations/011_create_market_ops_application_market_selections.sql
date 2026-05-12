-- 011_create_market_ops_application_market_selections.sql
-- Market Ops plugin-owned application market selections table.

CREATE TABLE market_ops_application_market_selections (
    application_market_selection_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_application_id INT UNSIGNED NOT NULL,
    market_id INT UNSIGNED NOT NULL,
    selection_status VARCHAR(32) NOT NULL DEFAULT 'requested',
    requested_booth_quantity INT UNSIGNED NOT NULL DEFAULT 1,
    assigned_booth_quantity INT UNSIGNED NULL,
    assigned_market_booth_offering_id INT UNSIGNED NULL,
    booth_fee_total_cents INT UNSIGNED NOT NULL DEFAULT 0,
    willing_to_volunteer TINYINT(1) NULL,
    decision_notes TEXT NULL,
    decided_at BIGINT NULL,
    decided_by_user_id INT UNSIGNED NULL,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (application_market_selection_id),
    UNIQUE KEY uk_market_ops_app_market_selections_application_market (
        vendor_application_id,
        market_id
    ),
    KEY idx_market_ops_app_market_selections_market_id (market_id),
    KEY idx_market_ops_app_market_selections_status (selection_status),
    CONSTRAINT fk_market_ops_app_market_selections_vendor_application
        FOREIGN KEY (vendor_application_id)
        REFERENCES market_ops_vendor_market_applications(vendor_application_id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_app_market_selections_market
        FOREIGN KEY (market_id)
        REFERENCES market_ops_markets(market_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_app_market_selections_assigned_offering
        FOREIGN KEY (assigned_market_booth_offering_id)
        REFERENCES market_ops_market_booth_offerings(market_booth_offering_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_app_market_selections_decided_by_user
        FOREIGN KEY (decided_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_app_market_selections_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_app_market_selections_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT chk_market_ops_app_market_selections_status
        CHECK (selection_status IN ('requested', 'approved', 'waitlisted', 'rejected', 'withdrawn'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

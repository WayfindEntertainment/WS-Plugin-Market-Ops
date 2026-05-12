-- 012_create_market_ops_application_market_booth_preferences.sql
-- Market Ops plugin-owned application market booth preferences table.

CREATE TABLE market_ops_application_market_booth_preferences (
    application_market_selection_id INT UNSIGNED NOT NULL,
    preference_rank INT UNSIGNED NOT NULL,
    market_booth_offering_id INT UNSIGNED NOT NULL,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (application_market_selection_id, preference_rank),
    UNIQUE KEY uk_market_ops_app_market_booth_prefs_selection_offering (
        application_market_selection_id,
        market_booth_offering_id
    ),
    KEY idx_market_ops_app_market_booth_prefs_offering_id (market_booth_offering_id),
    CONSTRAINT fk_market_ops_app_market_booth_prefs_selection
        FOREIGN KEY (application_market_selection_id)
        REFERENCES market_ops_application_market_selections(application_market_selection_id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_app_market_booth_prefs_offering
        FOREIGN KEY (market_booth_offering_id)
        REFERENCES market_ops_market_booth_offerings(market_booth_offering_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_app_market_booth_prefs_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

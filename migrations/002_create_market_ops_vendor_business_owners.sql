-- 002_create_market_ops_vendor_business_owners.sql
-- Market Ops plugin-owned vendor business owner join table.

CREATE TABLE market_ops_vendor_business_owners (
    vendor_business_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,

    PRIMARY KEY (vendor_business_id, user_id),
    KEY idx_market_ops_vendor_business_owners_user_id (user_id),
    CONSTRAINT fk_market_ops_vendor_business_owners_vendor_business
        FOREIGN KEY (vendor_business_id)
        REFERENCES market_ops_vendor_businesses(vendor_business_id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_business_owners_user
        FOREIGN KEY (user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- 004_create_market_ops_vendor_business_product_categories.sql
-- Market Ops plugin-owned vendor business to product category join table.

CREATE TABLE market_ops_vendor_business_product_categories (
    vendor_business_id INT UNSIGNED NOT NULL,
    vendor_product_category_id INT UNSIGNED NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,

    PRIMARY KEY (vendor_business_id, vendor_product_category_id),
    KEY idx_market_ops_vendor_business_product_categories_category (vendor_product_category_id),
    CONSTRAINT fk_market_ops_vendor_business_product_categories_vendor_business
        FOREIGN KEY (vendor_business_id)
        REFERENCES market_ops_vendor_businesses(vendor_business_id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_business_product_categories_category
        FOREIGN KEY (vendor_product_category_id)
        REFERENCES market_ops_vendor_product_categories(vendor_product_category_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

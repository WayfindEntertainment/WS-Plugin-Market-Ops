-- 003_create_market_ops_vendor_product_categories.sql
-- Market Ops plugin-owned vendor product categories table.

CREATE TABLE market_ops_vendor_product_categories (
    vendor_product_category_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug VARCHAR(128) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_at BIGINT NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,

    PRIMARY KEY (vendor_product_category_id),
    UNIQUE KEY uk_market_ops_vendor_product_categories_slug (slug),
    KEY idx_market_ops_vendor_product_categories_active_sort_label (
        is_active,
        sort_order,
        label
    ),
    CONSTRAINT fk_market_ops_vendor_product_categories_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT fk_market_ops_vendor_product_categories_updated_by_user
        FOREIGN KEY (updated_by_user_id)
        REFERENCES kernel_users(user_id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

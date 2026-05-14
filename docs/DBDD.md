# Database Design Document (DBDD)

**ws_plugin_market_ops — Expected Plugin Tables**

This document defines the **expected plugin-owned** database objects for the first Market Ops schema
pass.

- **Kernel = infrastructure** (authentication, authorization, sessions, system settings, pages)
- **Plugin = business logic** (vendors, markets, applications, approvals)
- **Theme = presentation only** (no schema ownership)

This file is intentionally forward-looking. It describes the tables the upcoming plugin migrations
are expected to create so the domain model is clear before the migrations are written.

---

## Assumptions

- Database: MySQL 8.4
- Storage engine: InnoDB
- Character set: `utf8mb4`, collation `utf8mb4_0900_ai_ci`
- Timestamps:
    - `created_at` / `updated_at`: `BIGINT` Node.js epoch milliseconds
    - Review / approval / submission timestamps also use `BIGINT`
- Plugin id / namespace: `ws_plugin_market_ops`
- Kernel user identities continue to live in `kernel_users`

---

## Conventions

**Key Legend Used in Tables**

- PK = Primary Key
- FK = Foreign Key
- UK = Unique Key
- PK/FK = Column is both part of the primary key and a foreign key reference

**Plugin Table Naming**

- Expected plugin tables use the prefix `market_ops_`.
- This keeps business-domain ownership obvious and avoids collisions with kernel objects.

**Current-State vs History**

- This first schema pass is expected to store the **current** state of vendor approval and market
  application approval directly on the primary rows.
- If later workflow/history requirements expand, append-only audit/history tables can be added
  without reshaping the launch-critical routes.

**User Deletion / Kernel References**

- Kernel users are not hard-deleted.
- Plugin rows that reference `kernel_users.user_id` should usually use `ON DELETE RESTRICT` or
  `ON DELETE SET NULL` depending on whether the actor reference is operationally required.

---

# Tables

## market_ops_vendor_businesses

Canonical vendor business records.

> NOTE:
>
> - This is the primary business entity vendors create and manage.
> - Approval is separate from market applications.
> - Public vendor pages will route from `slug`.
> - `approval_status` is expected to hold the current review state directly on the row for the
>   launch build.
> - One kernel user may own multiple vendor businesses through `market_ops_vendor_business_owners`.

| KEY | FIELD               |           TYPE | REQUIRED | DEFAULT   | DESCRIPTION                                                       |
| --- | ------------------- | -------------: | :------: | --------- | ----------------------------------------------------------------- |
| PK  | vendor_business_id  | `INT UNSIGNED` |   YES    | AI        | Stable vendor business identifier.                                |
| UK  | slug                | `VARCHAR(128)` |   YES    |           | Public URL slug for `/vendors/:vendorSlug`.                       |
|     | business_name       | `VARCHAR(255)` |   YES    |           | Public-facing vendor business name.                               |
|     | legal_name          | `VARCHAR(255)` |          |           | Optional legal or registered business name.                       |
|     | summary             |         `TEXT` |          |           | Short directory/profile summary.                                  |
|     | description         |   `MEDIUMTEXT` |          |           | Longer public profile copy or business description.               |
|     | email               | `VARCHAR(255)` |          |           | Public or business-contact email address.                         |
|     | phone               |  `VARCHAR(64)` |          |           | Public or business-contact phone number.                          |
|     | website_url         | `VARCHAR(255)` |          |           | Optional business website.                                        |
|     | approval_status     |  `VARCHAR(32)` |   YES    | `pending` | Current business review state: `pending`, `approved`, `rejected`. |
|     | approval_notes      |         `TEXT` |          |           | Internal reviewer notes or rejection rationale.                   |
|     | approved_at         |       `BIGINT` |          |           | Epoch ms when the business was approved.                          |
| FK  | approved_by_user_id | `INT UNSIGNED` |          |           | Kernel user that approved the business.                           |
|     | rejected_at         |       `BIGINT` |          |           | Epoch ms when the business was rejected.                          |
| FK  | rejected_by_user_id | `INT UNSIGNED` |          |           | Kernel user that rejected the business.                           |
|     | created_at          |       `BIGINT` |   YES    |           | Epoch ms when the vendor business row was created.                |
| FK  | created_by_user_id  | `INT UNSIGNED` |          |           | Optional kernel user that created the row.                        |
|     | updated_at          |       `BIGINT` |   YES    |           | Epoch ms when the vendor business row was last updated.           |
| FK  | updated_by_user_id  | `INT UNSIGNED` |          |           | Optional kernel user that last updated the row.                   |

**Indexes / constraints**

- Primary key on `vendor_business_id`.
- Unique key on `slug`.
- Index on `approval_status`.
- Index on `(business_name)`.
- Foreign key `approved_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `rejected_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- `approval_status` is constrained to `pending`, `approved`, `rejected`.

---

## market_ops_vendor_business_owners

Associates kernel users to the vendor businesses they can manage.

> NOTE:
>
> - This table supports the launch requirement that one account may manage more than one vendor
>   business.
> - The association shape remains compatible with future multi-owner support.
> - The first implementation pass can treat every row here as full management ownership.
> - Ownership grant history is intentionally left to system logs in v1 rather than duplicated on
>   this simple association table.

| KEY   | FIELD              |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                   |
| ----- | ------------------ | -------------: | :------: | ------- | ------------------------------------------------------------- |
| PK/FK | vendor_business_id | `INT UNSIGNED` |   YES    |         | References `market_ops_vendor_businesses.vendor_business_id`. |
| PK/FK | user_id            | `INT UNSIGNED` |   YES    |         | References `kernel_users.user_id`.                            |

**Indexes / constraints**

- Composite primary key `(vendor_business_id, user_id)`.
- Index on `user_id`.
- Foreign key `vendor_business_id` -> `market_ops_vendor_businesses.vendor_business_id`
  (`ON DELETE CASCADE`, `ON UPDATE RESTRICT`).
- Foreign key `user_id` -> `kernel_users.user_id` (`ON DELETE RESTRICT`, `ON UPDATE RESTRICT`).

---

## market_ops_vendor_product_categories

Admin-managed canonical list of product-category labels vendors may choose from.

> NOTE:
>
> - This table exists so vendor product types come from a controlled list rather than free text.
> - Market Ops administrators are expected to curate this list.
> - Examples include `Hot Food`, `Candy`, `Souvenirs`, `Woodworking`, `3D Prints`, `Coffee Beans`,
>   `Art Prints`, and `Stickers`.
> - These categories support:
>     - public communication about what vendors sell
>     - booth-placement decisions
>     - market-composition awareness for operations planning
> - `is_active` allows categories to be retired without losing historical assignments.

| KEY | FIELD                      |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                    |
| --- | -------------------------- | -------------: | :------: | ------- | -------------------------------------------------------------- |
| PK  | vendor_product_category_id | `INT UNSIGNED` |   YES    | AI      | Stable vendor product category identifier.                     |
| UK  | slug                       | `VARCHAR(128)` |   YES    |         | Stable internal/public slug for the category.                  |
|     | label                      | `VARCHAR(255)` |   YES    |         | Human-readable category label shown in admin and vendor flows. |
|     | description                |         `TEXT` |          |         | Optional admin-facing or explanatory description.              |
|     | is_active                  |   `TINYINT(1)` |   YES    | `1`     | Whether the category remains available for new vendor choices. |
|     | sort_order                 | `INT UNSIGNED` |   YES    | `0`     | Explicit display order for admin/vendor selection UIs.         |
|     | created_at                 |       `BIGINT` |   YES    |         | Epoch ms when the category row was created.                    |
| FK  | created_by_user_id         | `INT UNSIGNED` |          |         | Optional kernel user that created the category row.            |
|     | updated_at                 |       `BIGINT` |   YES    |         | Epoch ms when the category row was last updated.               |
| FK  | updated_by_user_id         | `INT UNSIGNED` |          |         | Optional kernel user that last updated the category row.       |

**Indexes / constraints**

- Primary key on `vendor_product_category_id`.
- Unique key on `slug`.
- Index on `(is_active, sort_order, label)`.
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).

---

## market_ops_vendor_business_product_categories

Associates vendor businesses with one or more admin-managed product categories.

> NOTE:
>
> - This table is intentionally many-to-many because one vendor may sell multiple product types.
> - The parent vendor business row answers: “who is this business?”
> - This child table answers: “what categories of products does this business sell?”
> - Category order is explicit through `sort_order`.
> - The category with the lowest `sort_order` is treated as the vendor's primary category for
>   directory and profile presentation.

| KEY   | FIELD                      |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                                    |
| ----- | -------------------------- | -------------: | :------: | ------- | ------------------------------------------------------------------------------ |
| PK/FK | vendor_business_id         | `INT UNSIGNED` |   YES    |         | References `market_ops_vendor_businesses.vendor_business_id`.                  |
| PK/FK | vendor_product_category_id | `INT UNSIGNED` |   YES    |         | References `market_ops_vendor_product_categories.vendor_product_category_id`.  |
|       | sort_order                 | `INT UNSIGNED` |   YES    | `0`     | Explicit category order for this vendor; the lowest value is treated as primary. |

**Indexes / constraints**

- Composite primary key `(vendor_business_id, vendor_product_category_id)`.
- Index on `(vendor_business_id, sort_order, vendor_product_category_id)`.
- Index on `vendor_product_category_id`.
- Foreign key `vendor_business_id` -> `market_ops_vendor_businesses.vendor_business_id`
  (`ON DELETE CASCADE`, `ON UPDATE RESTRICT`).
- Foreign key `vendor_product_category_id` ->
  `market_ops_vendor_product_categories.vendor_product_category_id` (`ON DELETE RESTRICT`,
  `ON UPDATE RESTRICT`).

---

## market_ops_locations

Canonical physical venue/location records.

> NOTE:
>
> - Locations are managed by Market Ops administrators.
> - A market references one location.
> - The launch pass keeps address/contact information directly on the location row.

| KEY | FIELD              |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                           |
| --- | ------------------ | -------------: | :------: | ------- | ----------------------------------------------------- |
| PK  | location_id        | `INT UNSIGNED` |   YES    | AI      | Stable location identifier.                           |
| UK  | slug               | `VARCHAR(128)` |   YES    |         | Stable slug for future public/admin URLs if used.     |
|     | location_name      | `VARCHAR(255)` |   YES    |         | Human-readable location name.                         |
|     | address_line_1     | `VARCHAR(255)` |          |         | Street address line 1.                                |
|     | address_line_2     | `VARCHAR(255)` |          |         | Street address line 2.                                |
|     | city               | `VARCHAR(128)` |          |         | City or locality.                                     |
|     | state_code         |      `CHAR(2)` |          |         | State code such as `WA`.                              |
|     | postal_code        |  `VARCHAR(32)` |          |         | Postal code.                                          |
|     | public_notes       |         `TEXT` |          |         | Optional public-facing or admin-friendly notes.       |
|     | is_active          |   `TINYINT(1)` |   YES    | `1`     | Whether the location remains available for new setup. |
|     | created_at         |       `BIGINT` |   YES    |         | Epoch ms when the location row was created.           |
| FK  | created_by_user_id | `INT UNSIGNED` |          |         | Optional kernel user that created the row.            |
|     | updated_at         |       `BIGINT` |   YES    |         | Epoch ms when the location row was last updated.      |
| FK  | updated_by_user_id | `INT UNSIGNED` |          |         | Optional kernel user that last updated the row.       |

**Indexes / constraints**

- Primary key on `location_id`.
- Unique key on `slug`.
- Index on `(location_name)`.
- Index on `(is_active, location_name)`.
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).

> Notes:
>
> - Inactive locations are preserved for historical references and existing market relationships.
> - Inactive locations should no longer be used for new setup by default, even though the first
>   implementation pass may still show them in admin selectors.

---

## market_ops_market_groups

Top-level market grouping rows that control public structure and fee mode.

> NOTE:
>
> - Market groups are the top-level public and administrative organization model.
> - Public routes are group-first under `/markets/:groupSlug`.
> - Fee policy is group-owned and constrained to the launch modes:
>     - `none`
>     - `per_group`
>     - `per_market`

| KEY | FIELD              |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                 |
| --- | ------------------ | -------------: | :------: | ------- | ----------------------------------------------------------- |
| PK  | market_group_id    | `INT UNSIGNED` |   YES    | AI      | Stable market group identifier.                             |
| UK  | slug               | `VARCHAR(128)` |   YES    |         | Public/admin route slug for the market group.               |
|     | group_name         | `VARCHAR(255)` |   YES    |         | Human-readable market group name.                           |
|     | summary            |         `TEXT` |          |         | Optional summary copy.                                      |
|     | description        |   `MEDIUMTEXT` |          |         | Longer public/admin description.                            |
|     | fee_mode           |  `VARCHAR(32)` |   YES    | `none`  | Launch fee mode: `none`, `per_group`, or `per_market`.      |
|     | fee_amount_cents   | `INT UNSIGNED` |   YES    | `0`     | Group-level fee amount in cents when fee mode requires one. |
|     | is_public          |   `TINYINT(1)` |   YES    | `1`     | Whether the market group is visible on the public surface.  |
|     | created_at         |       `BIGINT` |   YES    |         | Epoch ms when the market group row was created.             |
| FK  | created_by_user_id | `INT UNSIGNED` |          |         | Optional kernel user that created the row.                  |
|     | updated_at         |       `BIGINT` |   YES    |         | Epoch ms when the market group row was last updated.        |
| FK  | updated_by_user_id | `INT UNSIGNED` |          |         | Optional kernel user that last updated the row.             |

**Indexes / constraints**

- Primary key on `market_group_id`.
- Unique key on `slug`.
- Index on `(group_name)`.
- Index on `(is_public, slug)`.
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- `fee_mode` is constrained to `none`, `per_group`, `per_market`.

---

## market_ops_markets

Individual markets nested under one market group.

> NOTE:
>
> - Markets are publicly nested under their parent market group: `/markets/:groupSlug/:marketSlug`.
> - Each market belongs to exactly one market group and one location.
> - Per-market fees, when needed, live here so they can differ across markets inside one group.
> - Each market carries its own concrete start/end event time.
> - Market groups do not store their own start/end because those values can be inferred from the
>   markets assigned to the group.
> - Application availability is controlled directly on each market row.
> - If `applications_open = 0`, applications are closed regardless of the optional window fields.
> - If `applications_open = 1`, `applications_open_at` and `applications_close_at` define the
>   optional application window when provided.
> - `fee_amount_cents` here represents the per-market **application-fee component** used when the
>   parent market group runs in `per_market` fee mode.

| KEY    | FIELD                 |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                             |
| ------ | --------------------- | -------------: | :------: | ------- | ----------------------------------------------------------------------- |
| PK     | market_id             | `INT UNSIGNED` |   YES    | AI      | Stable market identifier.                                               |
| FK     | market_group_id       | `INT UNSIGNED` |   YES    |         | References `market_ops_market_groups.market_group_id`.                  |
| FK     | location_id           | `INT UNSIGNED` |   YES    |         | References `market_ops_locations.location_id`.                          |
| UNIQUE | slug                  | `VARCHAR(128)` |   YES    |         | Market slug unique within one market group.                             |
|        | market_name           | `VARCHAR(255)` |   YES    |         | Human-readable market name.                                             |
|        | summary               |         `TEXT` |          |         | Optional summary copy.                                                  |
|        | description           |   `MEDIUMTEXT` |          |         | Longer public/admin description.                                        |
|        | starts_at             |       `BIGINT` |   YES    |         | Epoch ms when the market event begins.                                  |
|        | ends_at               |       `BIGINT` |   YES    |         | Epoch ms when the market event ends, including overnight/multi-day use. |
|        | applications_open     |   `TINYINT(1)` |   YES    | `0`     | Manual on/off switch for whether applications are open for this market. |
|        | applications_open_at  |       `BIGINT` |          |         | Optional epoch ms when the application window opens.                    |
|        | applications_close_at |       `BIGINT` |          |         | Optional epoch ms when the application window closes.                   |
|        | fee_amount_cents      | `INT UNSIGNED` |   YES    | `0`     | Per-market fee amount in cents when the group uses it.                  |
|        | is_public             |   `TINYINT(1)` |   YES    | `1`     | Whether the market is visible on the public surface.                    |
|        | created_at            |       `BIGINT` |   YES    |         | Epoch ms when the market row was created.                               |
| FK     | created_by_user_id    | `INT UNSIGNED` |          |         | Optional kernel user that created the row.                              |
|        | updated_at            |       `BIGINT` |   YES    |         | Epoch ms when the market row was last updated.                          |
| FK     | updated_by_user_id    | `INT UNSIGNED` |          |         | Optional kernel user that last updated the row.                         |

**Indexes / constraints**

- Primary key on `market_id`.
- Unique key on `(market_group_id, slug)`.
- Index on `location_id`.
- Index on `(market_group_id, is_public, slug)`.
- Foreign key `market_group_id` -> `market_ops_market_groups.market_group_id` (`ON DELETE CASCADE`,
  `ON UPDATE RESTRICT`).
- Foreign key `location_id` -> `market_ops_locations.location_id` (`ON DELETE RESTRICT`,
  `ON UPDATE RESTRICT`).
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).

---

## market_ops_booth_types

Admin-managed canonical booth-type definitions.

> NOTE:
>
> - This table defines the reusable booth option kinds Keldy works with across markets.
> - Examples include:
>     - `8'x8'`
>     - `8'x6'`
>     - `9'x9'`
>     - `Parking Space`
> - This table defines the booth **kind**, not whether a specific market offers it.
> - Market-specific availability, pricing, and booth-number assignment live in
>   `market_ops_market_booth_offerings`.

| KEY | FIELD              |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                  |
| --- | ------------------ | -------------: | :------: | ------- | ------------------------------------------------------------ |
| PK  | booth_type_id      | `INT UNSIGNED` |   YES    | AI      | Stable booth-type identifier.                                |
| UK  | slug               | `VARCHAR(128)` |   YES    |         | Stable slug for the booth type.                              |
|     | label              | `VARCHAR(255)` |   YES    |         | Human-readable booth-type label.                             |
|     | description        |         `TEXT` |          |         | Optional explanatory description for admins or applicants.   |
|     | is_active          |   `TINYINT(1)` |   YES    | `1`     | Whether the booth type remains available for market setup.   |
|     | sort_order         | `INT UNSIGNED` |   YES    | `0`     | Explicit display order for admin and applicant selection UI. |
|     | created_at         |       `BIGINT` |   YES    |         | Epoch ms when the booth-type row was created.                |
| FK  | created_by_user_id | `INT UNSIGNED` |          |         | Optional kernel user that created the booth-type row.        |
|     | updated_at         |       `BIGINT` |   YES    |         | Epoch ms when the booth-type row was last updated.           |
| FK  | updated_by_user_id | `INT UNSIGNED` |          |         | Optional kernel user that last updated the booth-type row.   |

**Indexes / constraints**

- Primary key on `booth_type_id`.
- Unique key on `slug`.
- Index on `(is_active, sort_order, label)`.
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).

---

## market_ops_market_booth_offerings

Market-specific booth offerings and booth-number inventory.

> NOTE:
>
> - This table answers: “what booth options exist for this specific market?”
> - It links one market to one booth type and adds market-specific pricing/inventory details.
> - `booth_number` is the human-usable booth assignment identifier Keldy needs for real placement:
>   “You are in booth 6.”
> - `booth_number` must be unique within one market.
> - This model supports the common case where most markets share the same booth types while still
>   allowing a one-off offering such as `Parking Space` at a specific market only.

| KEY    | FIELD                    |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                     |
| ------ | ------------------------ | -------------: | :------: | ------- | --------------------------------------------------------------- |
| PK     | market_booth_offering_id | `INT UNSIGNED` |   YES    | AI      | Stable market-specific booth-offering identifier.               |
| FK     | market_id                | `INT UNSIGNED` |   YES    |         | References `market_ops_markets.market_id`.                      |
| FK     | booth_type_id            | `INT UNSIGNED` |   YES    |         | References `market_ops_booth_types.booth_type_id`.              |
| UNIQUE | booth_number             | `INT UNSIGNED` |   YES    |         | Human-readable booth number unique within the market.           |
|        | price_cents              | `INT UNSIGNED` |   YES    | `0`     | Booth fee price in cents for this specific market offering.     |
|        | is_active                |   `TINYINT(1)` |   YES    | `1`     | Whether this booth offering can currently be assigned/offered.  |
|        | sort_order               | `INT UNSIGNED` |   YES    | `0`     | Explicit display order for applicant/admin booth-selection UIs. |
|        | created_at               |       `BIGINT` |   YES    |         | Epoch ms when the market booth offering row was created.        |
| FK     | created_by_user_id       | `INT UNSIGNED` |          |         | Optional kernel user that created the row.                      |
|        | updated_at               |       `BIGINT` |   YES    |         | Epoch ms when the market booth offering row was last updated.   |
| FK     | updated_by_user_id       | `INT UNSIGNED` |          |         | Optional kernel user that last updated the row.                 |

**Indexes / constraints**

- Primary key on `market_booth_offering_id`.
- Unique key on `(market_id, booth_number)`.
- Index on `(market_id, is_active, sort_order)`.
- Index on `booth_type_id`.
- Foreign key `market_id` -> `market_ops_markets.market_id` (`ON DELETE CASCADE`,
  `ON UPDATE RESTRICT`).
- Foreign key `booth_type_id` -> `market_ops_booth_types.booth_type_id` (`ON DELETE RESTRICT`,
  `ON UPDATE RESTRICT`).
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).

---

## market_ops_vendor_market_applications

Vendor application rows scoped to one vendor business and one market group.

> NOTE:
>
> - Applications are group-scoped because fee mode and user workflow are group-first.
> - The parent row represents the vendor’s submission to the market group as a whole.
> - Selected individual markets, per-market decisions, booth assignments, and booth billing live in
>   `market_ops_application_market_selections`.
> - `application_key` is intended to be a ULID-style stable external reference for payments handoff
>   and operator-facing references without exposing a sequential integer id.
> - Parent `status` is intentionally limited to the submission lifecycle, not the per-market
>   approval lifecycle.
> - The intended workflow is:
>     - `draft`: application exists but has not been submitted
>     - `submitted`: vendor has submitted it for review/payment flow
>     - `withdrawn`: vendor withdrew it
> - `created_by_user_id` captures who opened/created the draft.
> - `submitted_by_user_id` separately captures who actually submitted it.
> - `fee_total_cents` here represents the **application fee total** due at submission time, not the
>   later booth fees.

| KEY    | FIELD                 |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                             |
| ------ | --------------------- | -------------: | :------: | ------- | ----------------------------------------------------------------------- |
| PK     | vendor_application_id | `INT UNSIGNED` |   YES    | AI      | Stable vendor market application identifier.                            |
| FK     | vendor_business_id    | `INT UNSIGNED` |   YES    |         | References `market_ops_vendor_businesses.vendor_business_id`.           |
| FK     | market_group_id       | `INT UNSIGNED` |   YES    |         | References `market_ops_market_groups.market_group_id`.                  |
| UNIQUE | application_key       |     `CHAR(26)` |   YES    |         | ULID-style stable external/internal reference key for payments handoff. |
|        | status                |  `VARCHAR(32)` |   YES    | `draft` | Current workflow state for the application.                             |
|        | fee_mode_snapshot     |  `VARCHAR(32)` |   YES    |         | Fee mode copied from the market group at submission time.               |
|        | fee_total_cents       | `INT UNSIGNED` |   YES    | `0`     | Calculated application-fee total owed for this submission snapshot.     |
|        | submitted_at          |       `BIGINT` |          |         | Epoch ms when the application was submitted.                            |
| FK     | submitted_by_user_id  | `INT UNSIGNED` |          |         | Kernel user that submitted the application.                             |
|        | created_at            |       `BIGINT` |   YES    |         | Epoch ms when the application row was created.                          |
| FK     | created_by_user_id    | `INT UNSIGNED` |          |         | Optional kernel user that created/opened the draft row.                 |
|        | updated_at            |       `BIGINT` |   YES    |         | Epoch ms when the application row was last updated.                     |
| FK     | updated_by_user_id    | `INT UNSIGNED` |          |         | Optional kernel user that last updated the row.                         |

**Indexes / constraints**

- Primary key on `vendor_application_id`.
- Unique key on `application_key`.
- Unique key on `(vendor_business_id, market_group_id)` for one active/current application row per
  vendor business per group in the launch model.
- Index on `status`.
- Foreign key `vendor_business_id` -> `market_ops_vendor_businesses.vendor_business_id`
  (`ON DELETE CASCADE`, `ON UPDATE RESTRICT`).
- Foreign key `market_group_id` -> `market_ops_market_groups.market_group_id` (`ON DELETE RESTRICT`,
  `ON UPDATE RESTRICT`).
- Foreign key `submitted_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- `status` is constrained to `draft`, `submitted`, `withdrawn`.
- `fee_mode_snapshot` is constrained to `none`, `per_group`, `per_market`.

---

## market_ops_application_market_selections

Per-market workflow rows inside one group-scoped vendor application.

> NOTE:
>
> - This table exists because one market-group application may select one or more individual markets
>   inside that group, and each selected market may have a different decision outcome.
> - The parent application row answers: “this vendor is applying to this market group.”
> - This child table answers:
>     - which specific markets inside that group were selected
>     - what status each selected market is in
>     - how many booths were requested/assigned
>     - which final booth offering was assigned
>     - what booth fee is due after approval
> - Example:
>     - one application row for `Sunny Bakery` applying to `Summer Markets`
>     - child selection rows for `Downtown Saturday Market` and `Waterfront Sunday Market`
>     - one row may end in `approved` while another ends in `waitlisted`
> - For `per_group` fee mode, multiple rows may exist while the fee total still comes from the
>   single parent application row.
> - For `per_market` fee mode, the application total is expected to be derived from these selected
>   rows at submission time and stored back on `market_ops_vendor_market_applications`.
> - `selection_status` is the real per-market approval/waitlist/rejection state:
>     - `requested`
>     - `approved`
>     - `waitlisted`
>     - `rejected`
>     - `withdrawn`

| KEY | FIELD                             |           TYPE | REQUIRED | DEFAULT     | DESCRIPTION                                                               |
| --- | --------------------------------- | -------------: | :------: | ----------- | ------------------------------------------------------------------------- |
| PK  | application_market_selection_id   | `INT UNSIGNED` |   YES    | AI          | Stable per-market application selection identifier.                       |
| FK  | vendor_application_id             | `INT UNSIGNED` |   YES    |             | References `market_ops_vendor_market_applications.vendor_application_id`. |
| FK  | market_id                         | `INT UNSIGNED` |   YES    |             | References `market_ops_markets.market_id`.                                |
|     | selection_status                  |  `VARCHAR(32)` |   YES    | `requested` | Current per-market workflow state.                                        |
|     | requested_booth_quantity          | `INT UNSIGNED` |   YES    | `1`         | Number of booths the vendor requested for this market.                    |
|     | assigned_booth_quantity           | `INT UNSIGNED` |          |             | Number of booths actually assigned after review.                          |
| FK  | assigned_market_booth_offering_id | `INT UNSIGNED` |          |             | Final assigned booth offering for this market selection.                  |
|     | booth_fee_total_cents             | `INT UNSIGNED` |   YES    | `0`         | Final booth-fee total due after approval for this market.                 |
|     | willing_to_volunteer              |   `TINYINT(1)` |          |             | Nullable volunteer-interest flag: `NULL` unanswered, `0` no, `1` yes.     |
|     | decision_notes                    |         `TEXT` |          |             | Internal admin notes for approval, rejection, or waitlist decisions.      |
|     | decided_at                        |       `BIGINT` |          |             | Epoch ms when the current decision status was set.                        |
| FK  | decided_by_user_id                | `INT UNSIGNED` |          |             | Kernel user that made the current decision.                               |
|     | created_at                        |       `BIGINT` |   YES    |             | Epoch ms when the market-selection row was created.                       |
| FK  | created_by_user_id                | `INT UNSIGNED` |          |             | Optional kernel user that added the market selection.                     |
|     | updated_at                        |       `BIGINT` |   YES    |             | Epoch ms when the market-selection row was last updated.                  |
| FK  | updated_by_user_id                | `INT UNSIGNED` |          |             | Optional kernel user that last updated the market-selection row.          |

**Indexes / constraints**

- Primary key on `application_market_selection_id`.
- Unique key on `(vendor_application_id, market_id)`.
- Index on `market_id`.
- Index on `selection_status`.
- Foreign key `vendor_application_id` ->
  `market_ops_vendor_market_applications.vendor_application_id` (`ON DELETE CASCADE`,
  `ON UPDATE RESTRICT`).
- Foreign key `market_id` -> `market_ops_markets.market_id` (`ON DELETE RESTRICT`,
  `ON UPDATE RESTRICT`).
- Foreign key `assigned_market_booth_offering_id` ->
  `market_ops_market_booth_offerings.market_booth_offering_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `decided_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- Foreign key `updated_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).
- `selection_status` is constrained to `requested`, `approved`, `waitlisted`, `rejected`,
  `withdrawn`.

---

## market_ops_application_market_booth_preferences

Ranked booth preferences for one selected market inside an application.

> NOTE:
>
> - This table exists because vendors provide an ordered preference list:
>     - first choice
>     - fallback choices
> - Preferences are market-specific because the available booth offerings differ by market.
> - Example:
>     - first choice: booth offering `8'x8'`
>     - second choice: booth offering `8'x6'`
> - The final booth assignment, if approved, lives back on
>   `market_ops_application_market_selections.assigned_market_booth_offering_id`.

| KEY   | FIELD                           |           TYPE | REQUIRED | DEFAULT | DESCRIPTION                                                                            |
| ----- | ------------------------------- | -------------: | :------: | ------- | -------------------------------------------------------------------------------------- |
| PK/FK | application_market_selection_id | `INT UNSIGNED` |   YES    |         | References `market_ops_application_market_selections.application_market_selection_id`. |
| PK    | preference_rank                 | `INT UNSIGNED` |   YES    |         | Rank order starting at `1` for highest preference.                                     |
| FK    | market_booth_offering_id        | `INT UNSIGNED` |   YES    |         | References `market_ops_market_booth_offerings.market_booth_offering_id`.               |
|       | created_at                      |       `BIGINT` |   YES    |         | Epoch ms when the booth-preference row was created.                                    |
| FK    | created_by_user_id              | `INT UNSIGNED` |          |         | Optional kernel user that created the preference row.                                  |

**Indexes / constraints**

- Composite primary key `(application_market_selection_id, preference_rank)`.
- Unique key on `(application_market_selection_id, market_booth_offering_id)`.
- Index on `market_booth_offering_id`.
- Foreign key `application_market_selection_id` ->
  `market_ops_application_market_selections.application_market_selection_id` (`ON DELETE CASCADE`,
  `ON UPDATE RESTRICT`).
- Foreign key `market_booth_offering_id` ->
  `market_ops_market_booth_offerings.market_booth_offering_id` (`ON DELETE RESTRICT`,
  `ON UPDATE RESTRICT`).
- Foreign key `created_by_user_id` -> `kernel_users.user_id` (`ON DELETE SET NULL`,
  `ON UPDATE RESTRICT`).

---

## Expected Migration Notes

The first Market Ops migration pass is expected to create:

- `market_ops_vendor_businesses`
- `market_ops_vendor_business_owners`
- `market_ops_vendor_product_categories`
- `market_ops_vendor_business_product_categories`
- `market_ops_locations`
- `market_ops_market_groups`
- `market_ops_markets`
- `market_ops_booth_types`
- `market_ops_market_booth_offerings`
- `market_ops_vendor_market_applications`
- `market_ops_application_market_selections`
- `market_ops_application_market_booth_preferences`

The exact migration file names have not been created yet, but the expectation is that they will be
kept small and ordered so parent tables exist before child foreign keys are added.

---

## Out of Scope (This First Schema Pass)

The following are intentionally deferred unless a later slice proves they are launch-critical:

- Append-only vendor approval history tables
- Append-only market application status history tables
- Rich reporting/materialized reporting tables
- Stripe-specific payment settlement tables
- Vendor media/gallery tables
- Advanced contact, taxonomy, or merchandising tables

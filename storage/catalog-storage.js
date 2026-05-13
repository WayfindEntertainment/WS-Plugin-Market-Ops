import {
    assertAffectedRows,
    assertInsertId,
    assertPlainObject,
    assertPositiveInteger,
    assertQueryable,
    createStorageError,
    firstRow,
    normalizeBooleanFlag,
    normalizeEpochMs,
    normalizeOptionalPositiveInteger,
    normalizeOptionalString,
    normalizeRows
} from './storage-helpers.js'

/**
 * Convert one vendor product category row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw vendor product category row.
 * @returns {{
 *   vendorProductCategoryId: number,
 *   slug: string,
 *   label: string,
 *   description: string|null,
 *   isActive: number,
 *   sortOrder: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized vendor product category.
 */
function mapVendorProductCategoryRow(row) {
    return {
        vendorProductCategoryId: Number(row.vendor_product_category_id),
        slug: String(row.slug),
        label: String(row.label),
        description: typeof row.description === 'string' ? row.description : null,
        isActive: Number(row.is_active),
        sortOrder: Number(row.sort_order),
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Convert one vendor business product category row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw vendor business product category row.
 * @returns {{ vendorBusinessId: number, vendorProductCategoryId: number, isPrimary: number }} Normalized join row.
 */
function mapVendorBusinessProductCategoryRow(row) {
    return {
        vendorBusinessId: Number(row.vendor_business_id),
        vendorProductCategoryId: Number(row.vendor_product_category_id),
        isPrimary: Number(row.is_primary)
    }
}

/**
 * Convert one booth type row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw booth type row.
 * @returns {{
 *   boothTypeId: number,
 *   slug: string,
 *   label: string,
 *   description: string|null,
 *   isActive: number,
 *   sortOrder: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized booth type.
 */
function mapBoothTypeRow(row) {
    return {
        boothTypeId: Number(row.booth_type_id),
        slug: String(row.slug),
        label: String(row.label),
        description: typeof row.description === 'string' ? row.description : null,
        isActive: Number(row.is_active),
        sortOrder: Number(row.sort_order),
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Normalize one vendor product category payload.
 *
 * @param {unknown} input - Candidate payload.
 * @param {ReturnType<typeof mapVendorProductCategoryRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   slug: string,
 *   label: string,
 *   description: string|null,
 *   isActive: 0|1,
 *   sortOrder: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized category payload.
 */
function normalizeVendorProductCategoryInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(
        input,
        'vendorProductCategory',
        'INVALID_VENDOR_PRODUCT_CATEGORY_INPUT'
    )
    const now = Date.now()

    return {
        slug:
            typeof normalizedInput.slug === 'undefined'
                ? (existingRecord?.slug ?? '')
                : String(normalizedInput.slug).trim(),
        label:
            typeof normalizedInput.label === 'undefined'
                ? (existingRecord?.label ?? '')
                : String(normalizedInput.label).trim(),
        description:
            typeof normalizedInput.description === 'undefined'
                ? (existingRecord?.description ?? null)
                : normalizeOptionalString(
                      normalizedInput.description,
                      'description',
                      'INVALID_VENDOR_PRODUCT_CATEGORY_DESCRIPTION'
                  ),
        isActive:
            typeof normalizedInput.isActive === 'undefined'
                ? /** @type {0|1} */ (existingRecord?.isActive ?? 1)
                : normalizeBooleanFlag(
                      normalizedInput.isActive,
                      'isActive',
                      'INVALID_VENDOR_PRODUCT_CATEGORY_IS_ACTIVE'
                  ),
        sortOrder:
            typeof normalizedInput.sortOrder === 'undefined'
                ? (existingRecord?.sortOrder ?? 0)
                : Number(normalizedInput.sortOrder),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_VENDOR_PRODUCT_CATEGORY_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_VENDOR_PRODUCT_CATEGORY_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_VENDOR_PRODUCT_CATEGORY_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_VENDOR_PRODUCT_CATEGORY_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Normalize one booth type payload.
 *
 * @param {unknown} input - Candidate payload.
 * @param {ReturnType<typeof mapBoothTypeRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   slug: string,
 *   label: string,
 *   description: string|null,
 *   isActive: 0|1,
 *   sortOrder: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized booth type payload.
 */
function normalizeBoothTypeInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(input, 'boothType', 'INVALID_BOOTH_TYPE_INPUT')
    const now = Date.now()

    return {
        slug:
            typeof normalizedInput.slug === 'undefined'
                ? (existingRecord?.slug ?? '')
                : String(normalizedInput.slug).trim(),
        label:
            typeof normalizedInput.label === 'undefined'
                ? (existingRecord?.label ?? '')
                : String(normalizedInput.label).trim(),
        description:
            typeof normalizedInput.description === 'undefined'
                ? (existingRecord?.description ?? null)
                : normalizeOptionalString(
                      normalizedInput.description,
                      'description',
                      'INVALID_BOOTH_TYPE_DESCRIPTION'
                  ),
        isActive:
            typeof normalizedInput.isActive === 'undefined'
                ? /** @type {0|1} */ (existingRecord?.isActive ?? 1)
                : normalizeBooleanFlag(
                      normalizedInput.isActive,
                      'isActive',
                      'INVALID_BOOTH_TYPE_IS_ACTIVE'
                  ),
        sortOrder:
            typeof normalizedInput.sortOrder === 'undefined'
                ? (existingRecord?.sortOrder ?? 0)
                : Number(normalizedInput.sortOrder),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_BOOTH_TYPE_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_BOOTH_TYPE_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_BOOTH_TYPE_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_BOOTH_TYPE_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Read one vendor product category by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorProductCategoryId - Vendor product category id.
 * @returns {Promise<ReturnType<typeof mapVendorProductCategoryRow>|null>} Matching row or `null`.
 */
async function readVendorProductCategoryById(queryable, vendorProductCategoryId) {
    const [rows] = await queryable.query(
        `
        SELECT
            vendor_product_category_id,
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_vendor_product_categories
        WHERE vendor_product_category_id = ?
        LIMIT 1
        `,
        [vendorProductCategoryId]
    )
    const row = firstRow(rows)

    return row ? mapVendorProductCategoryRow(row) : null
}

/**
 * Read one booth type by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} boothTypeId - Booth type id.
 * @returns {Promise<ReturnType<typeof mapBoothTypeRow>|null>} Matching row or `null`.
 */
async function readBoothTypeById(queryable, boothTypeId) {
    const [rows] = await queryable.query(
        `
        SELECT
            booth_type_id,
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_booth_types
        WHERE booth_type_id = ?
        LIMIT 1
        `,
        [boothTypeId]
    )
    const row = firstRow(rows)

    return row ? mapBoothTypeRow(row) : null
}

/**
 * Insert one vendor product category row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Vendor product category payload.
 * @returns {Promise<ReturnType<typeof mapVendorProductCategoryRow>>} Created category.
 */
export async function insertVendorProductCategory(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeVendorProductCategoryInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_vendor_product_categories (
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.slug,
            normalizedInput.label,
            normalizedInput.description,
            normalizedInput.isActive,
            normalizedInput.sortOrder,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const vendorProductCategoryId = assertInsertId(
        result,
        'INVALID_VENDOR_PRODUCT_CATEGORY_INSERT_ID',
        'Vendor product category'
    )
    const createdRecord = await readVendorProductCategoryById(
        normalizedQueryable,
        vendorProductCategoryId
    )

    if (!createdRecord) {
        throw createStorageError(
            'VENDOR_PRODUCT_CATEGORY_READ_AFTER_WRITE_FAILED',
            `Vendor product category was not readable after insert: ${vendorProductCategoryId}`
        )
    }

    return createdRecord
}

/**
 * Read one vendor product category by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorProductCategoryId - Vendor product category id.
 * @returns {Promise<ReturnType<typeof mapVendorProductCategoryRow>|null>} Matching category or `null`.
 */
export async function getVendorProductCategoryById(queryable, vendorProductCategoryId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorProductCategoryId = assertPositiveInteger(
        vendorProductCategoryId,
        'vendorProductCategoryId',
        'INVALID_VENDOR_PRODUCT_CATEGORY_ID'
    )

    return readVendorProductCategoryById(normalizedQueryable, normalizedVendorProductCategoryId)
}

/**
 * List vendor product categories in display order.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @returns {Promise<Array<ReturnType<typeof mapVendorProductCategoryRow>>>} Vendor product categories.
 */
export async function listVendorProductCategories(queryable) {
    const normalizedQueryable = assertQueryable(queryable)
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            vendor_product_category_id,
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_vendor_product_categories
        ORDER BY sort_order ASC, label ASC, vendor_product_category_id ASC
        `
    )

    return normalizeRows(rows).map(mapVendorProductCategoryRow)
}

/**
 * Update one vendor product category row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorProductCategoryId - Vendor product category id.
 * @param {unknown} input - Partial category patch payload.
 * @returns {Promise<ReturnType<typeof mapVendorProductCategoryRow>>} Updated category.
 */
export async function updateVendorProductCategoryById(queryable, vendorProductCategoryId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorProductCategoryId = assertPositiveInteger(
        vendorProductCategoryId,
        'vendorProductCategoryId',
        'INVALID_VENDOR_PRODUCT_CATEGORY_ID'
    )
    const currentRecord = await readVendorProductCategoryById(
        normalizedQueryable,
        normalizedVendorProductCategoryId
    )

    if (!currentRecord) {
        throw createStorageError(
            'VENDOR_PRODUCT_CATEGORY_NOT_FOUND',
            `Vendor product category was not found: ${normalizedVendorProductCategoryId}`
        )
    }

    const normalizedInput = normalizeVendorProductCategoryInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_vendor_product_categories
        SET
            slug = ?,
            label = ?,
            description = ?,
            is_active = ?,
            sort_order = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE vendor_product_category_id = ?
        `,
        [
            normalizedInput.slug,
            normalizedInput.label,
            normalizedInput.description,
            normalizedInput.isActive,
            normalizedInput.sortOrder,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedVendorProductCategoryId
        ]
    )
    assertAffectedRows(result, 'VENDOR_PRODUCT_CATEGORY_NOT_FOUND', 'Vendor product category')
    const updatedRecord = await readVendorProductCategoryById(
        normalizedQueryable,
        normalizedVendorProductCategoryId
    )

    if (!updatedRecord) {
        throw createStorageError(
            'VENDOR_PRODUCT_CATEGORY_READ_AFTER_WRITE_FAILED',
            `Vendor product category was not readable after update: ${normalizedVendorProductCategoryId}`
        )
    }

    return updatedRecord
}

/**
 * Insert one vendor business to product category association row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {{ vendorBusinessId: number, vendorProductCategoryId: number, isPrimary?: unknown }} input - Association payload.
 * @returns {Promise<ReturnType<typeof mapVendorBusinessProductCategoryRow>>} Created association.
 */
export async function insertVendorBusinessProductCategory(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = assertPlainObject(
        input,
        'vendorBusinessProductCategory',
        'INVALID_VENDOR_BUSINESS_PRODUCT_CATEGORY_INPUT'
    )
    const vendorBusinessId = assertPositiveInteger(
        normalizedInput.vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_PRODUCT_CATEGORY_VENDOR_BUSINESS_ID'
    )
    const vendorProductCategoryId = assertPositiveInteger(
        normalizedInput.vendorProductCategoryId,
        'vendorProductCategoryId',
        'INVALID_VENDOR_BUSINESS_PRODUCT_CATEGORY_CATEGORY_ID'
    )
    const isPrimary =
        typeof normalizedInput.isPrimary === 'undefined'
            ? 0
            : normalizeBooleanFlag(
                  normalizedInput.isPrimary,
                  'isPrimary',
                  'INVALID_VENDOR_BUSINESS_PRODUCT_CATEGORY_IS_PRIMARY'
              )

    await normalizedQueryable.query(
        `
        INSERT INTO market_ops_vendor_business_product_categories (
            vendor_business_id,
            vendor_product_category_id,
            is_primary
        ) VALUES (?, ?, ?)
        `,
        [vendorBusinessId, vendorProductCategoryId, isPrimary]
    )

    return {
        vendorBusinessId,
        vendorProductCategoryId,
        isPrimary
    }
}

/**
 * List vendor business product category association rows by vendor business id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Vendor business id.
 * @returns {Promise<Array<ReturnType<typeof mapVendorBusinessProductCategoryRow>>>} Category associations.
 */
export async function listVendorBusinessProductCategoriesByVendorBusinessId(
    queryable,
    vendorBusinessId
) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorBusinessId = assertPositiveInteger(
        vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_ID'
    )
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            vendor_business_id,
            vendor_product_category_id,
            is_primary
        FROM market_ops_vendor_business_product_categories
        WHERE vendor_business_id = ?
        ORDER BY is_primary DESC, vendor_product_category_id ASC
        `,
        [normalizedVendorBusinessId]
    )

    return normalizeRows(rows).map(mapVendorBusinessProductCategoryRow)
}

/**
 * Delete all vendor business product category association rows for one vendor business.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Vendor business id.
 * @returns {Promise<void>} Resolves after the associations are removed.
 */
export async function deleteVendorBusinessProductCategoriesByVendorBusinessId(
    queryable,
    vendorBusinessId
) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorBusinessId = assertPositiveInteger(
        vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_ID'
    )

    await normalizedQueryable.query(
        `
        DELETE FROM market_ops_vendor_business_product_categories
        WHERE vendor_business_id = ?
        `,
        [normalizedVendorBusinessId]
    )
}

/**
 * Insert one booth type row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Booth type payload.
 * @returns {Promise<ReturnType<typeof mapBoothTypeRow>>} Created booth type.
 */
export async function insertBoothType(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeBoothTypeInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_booth_types (
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.slug,
            normalizedInput.label,
            normalizedInput.description,
            normalizedInput.isActive,
            normalizedInput.sortOrder,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const boothTypeId = assertInsertId(result, 'INVALID_BOOTH_TYPE_INSERT_ID', 'Booth type')
    const createdRecord = await readBoothTypeById(normalizedQueryable, boothTypeId)

    if (!createdRecord) {
        throw createStorageError(
            'BOOTH_TYPE_READ_AFTER_WRITE_FAILED',
            `Booth type was not readable after insert: ${boothTypeId}`
        )
    }

    return createdRecord
}

/**
 * Read one booth type by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} boothTypeId - Booth type id.
 * @returns {Promise<ReturnType<typeof mapBoothTypeRow>|null>} Matching booth type or `null`.
 */
export async function getBoothTypeById(queryable, boothTypeId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedBoothTypeId = assertPositiveInteger(
        boothTypeId,
        'boothTypeId',
        'INVALID_BOOTH_TYPE_ID'
    )

    return readBoothTypeById(normalizedQueryable, normalizedBoothTypeId)
}

/**
 * List booth types with active records first, then sort order and label.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @returns {Promise<Array<ReturnType<typeof mapBoothTypeRow>>>} Booth types.
 */
export async function listBoothTypes(queryable) {
    const normalizedQueryable = assertQueryable(queryable)
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            booth_type_id,
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_booth_types
        ORDER BY is_active DESC, sort_order ASC, label ASC, booth_type_id ASC
        `
    )

    return normalizeRows(rows).map(mapBoothTypeRow)
}

/**
 * Update one booth type row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} boothTypeId - Booth type id.
 * @param {unknown} input - Partial booth type patch payload.
 * @returns {Promise<ReturnType<typeof mapBoothTypeRow>>} Updated booth type.
 */
export async function updateBoothTypeById(queryable, boothTypeId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedBoothTypeId = assertPositiveInteger(
        boothTypeId,
        'boothTypeId',
        'INVALID_BOOTH_TYPE_ID'
    )
    const currentRecord = await readBoothTypeById(normalizedQueryable, normalizedBoothTypeId)

    if (!currentRecord) {
        throw createStorageError(
            'BOOTH_TYPE_NOT_FOUND',
            `Booth type was not found: ${normalizedBoothTypeId}`
        )
    }

    const normalizedInput = normalizeBoothTypeInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_booth_types
        SET
            slug = ?,
            label = ?,
            description = ?,
            is_active = ?,
            sort_order = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE booth_type_id = ?
        `,
        [
            normalizedInput.slug,
            normalizedInput.label,
            normalizedInput.description,
            normalizedInput.isActive,
            normalizedInput.sortOrder,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedBoothTypeId
        ]
    )
    assertAffectedRows(result, 'BOOTH_TYPE_NOT_FOUND', 'Booth type')
    const updatedRecord = await readBoothTypeById(normalizedQueryable, normalizedBoothTypeId)

    if (!updatedRecord) {
        throw createStorageError(
            'BOOTH_TYPE_READ_AFTER_WRITE_FAILED',
            `Booth type was not readable after update: ${normalizedBoothTypeId}`
        )
    }

    return updatedRecord
}

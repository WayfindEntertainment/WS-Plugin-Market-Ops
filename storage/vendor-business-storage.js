import {
    assertAffectedRows,
    assertInsertId,
    assertPlainObject,
    assertPositiveInteger,
    assertQueryable,
    createStorageError,
    firstRow,
    normalizeEnumString,
    normalizeEpochMs,
    normalizeOptionalEpochMs,
    normalizeOptionalPositiveInteger,
    normalizeOptionalString,
    normalizeRows
} from './storage-helpers.js'

const VENDOR_APPROVAL_STATUSES = ['pending', 'approved', 'rejected']

/**
 * Convert one vendor business row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw vendor business row.
 * @returns {{
 *   vendorBusinessId: number,
 *   slug: string,
 *   businessName: string,
 *   legalName: string|null,
 *   summary: string|null,
 *   description: string|null,
 *   email: string|null,
 *   phone: string|null,
 *   websiteUrl: string|null,
 *   approvalStatus: string,
 *   approvalNotes: string|null,
 *   approvedAt: number|null,
 *   approvedByUserId: number|null,
 *   rejectedAt: number|null,
 *   rejectedByUserId: number|null,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized vendor business.
 */
function mapVendorBusinessRow(row) {
    return {
        vendorBusinessId: Number(row.vendor_business_id),
        slug: String(row.slug),
        businessName: String(row.business_name),
        legalName: typeof row.legal_name === 'string' ? row.legal_name : null,
        summary: typeof row.summary === 'string' ? row.summary : null,
        description: typeof row.description === 'string' ? row.description : null,
        email: typeof row.email === 'string' ? row.email : null,
        phone: typeof row.phone === 'string' ? row.phone : null,
        websiteUrl: typeof row.website_url === 'string' ? row.website_url : null,
        approvalStatus: String(row.approval_status),
        approvalNotes: typeof row.approval_notes === 'string' ? row.approval_notes : null,
        approvedAt: typeof row.approved_at === 'number' ? row.approved_at : null,
        approvedByUserId:
            typeof row.approved_by_user_id === 'number' ? row.approved_by_user_id : null,
        rejectedAt: typeof row.rejected_at === 'number' ? row.rejected_at : null,
        rejectedByUserId:
            typeof row.rejected_by_user_id === 'number' ? row.rejected_by_user_id : null,
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Convert one vendor business owner association row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw owner association row.
 * @returns {{ vendorBusinessId: number, userId: number }} Normalized owner association.
 */
function mapVendorBusinessOwnerRow(row) {
    return {
        vendorBusinessId: Number(row.vendor_business_id),
        userId: Number(row.user_id)
    }
}

/**
 * Normalize one vendor business payload.
 *
 * @param {unknown} input - Candidate vendor business payload.
 * @param {ReturnType<typeof mapVendorBusinessRow>=} existingRecord - Existing row for patch-style updates.
 * @returns {{
 *   slug: string,
 *   businessName: string,
 *   legalName: string|null,
 *   summary: string|null,
 *   description: string|null,
 *   email: string|null,
 *   phone: string|null,
 *   websiteUrl: string|null,
 *   approvalStatus: string,
 *   approvalNotes: string|null,
 *   approvedAt: number|null,
 *   approvedByUserId: number|null,
 *   rejectedAt: number|null,
 *   rejectedByUserId: number|null,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized vendor business payload.
 */
function normalizeVendorBusinessInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(
        input,
        'vendorBusiness',
        'INVALID_VENDOR_BUSINESS_INPUT'
    )
    const now = Date.now()

    return {
        slug:
            typeof normalizedInput.slug === 'undefined'
                ? (existingRecord?.slug ?? '')
                : String(normalizedInput.slug).trim(),
        businessName:
            typeof normalizedInput.businessName === 'undefined'
                ? (existingRecord?.businessName ?? '')
                : String(normalizedInput.businessName).trim(),
        legalName:
            typeof normalizedInput.legalName === 'undefined'
                ? (existingRecord?.legalName ?? null)
                : normalizeOptionalString(
                      normalizedInput.legalName,
                      'legalName',
                      'INVALID_VENDOR_BUSINESS_LEGAL_NAME'
                  ),
        summary:
            typeof normalizedInput.summary === 'undefined'
                ? (existingRecord?.summary ?? null)
                : normalizeOptionalString(
                      normalizedInput.summary,
                      'summary',
                      'INVALID_VENDOR_BUSINESS_SUMMARY'
                  ),
        description:
            typeof normalizedInput.description === 'undefined'
                ? (existingRecord?.description ?? null)
                : normalizeOptionalString(
                      normalizedInput.description,
                      'description',
                      'INVALID_VENDOR_BUSINESS_DESCRIPTION'
                  ),
        email:
            typeof normalizedInput.email === 'undefined'
                ? (existingRecord?.email ?? null)
                : normalizeOptionalString(
                      normalizedInput.email,
                      'email',
                      'INVALID_VENDOR_BUSINESS_EMAIL'
                  ),
        phone:
            typeof normalizedInput.phone === 'undefined'
                ? (existingRecord?.phone ?? null)
                : normalizeOptionalString(
                      normalizedInput.phone,
                      'phone',
                      'INVALID_VENDOR_BUSINESS_PHONE'
                  ),
        websiteUrl:
            typeof normalizedInput.websiteUrl === 'undefined'
                ? (existingRecord?.websiteUrl ?? null)
                : normalizeOptionalString(
                      normalizedInput.websiteUrl,
                      'websiteUrl',
                      'INVALID_VENDOR_BUSINESS_WEBSITE_URL'
                  ),
        approvalStatus:
            typeof normalizedInput.approvalStatus === 'undefined'
                ? (existingRecord?.approvalStatus ?? 'pending')
                : normalizeEnumString(
                      normalizedInput.approvalStatus,
                      'approvalStatus',
                      VENDOR_APPROVAL_STATUSES,
                      'INVALID_VENDOR_BUSINESS_APPROVAL_STATUS'
                  ),
        approvalNotes:
            typeof normalizedInput.approvalNotes === 'undefined'
                ? (existingRecord?.approvalNotes ?? null)
                : normalizeOptionalString(
                      normalizedInput.approvalNotes,
                      'approvalNotes',
                      'INVALID_VENDOR_BUSINESS_APPROVAL_NOTES'
                  ),
        approvedAt:
            typeof normalizedInput.approvedAt === 'undefined'
                ? (existingRecord?.approvedAt ?? null)
                : normalizeOptionalEpochMs(
                      normalizedInput.approvedAt,
                      'approvedAt',
                      'INVALID_VENDOR_BUSINESS_APPROVED_AT'
                  ),
        approvedByUserId:
            typeof normalizedInput.approvedByUserId === 'undefined'
                ? (existingRecord?.approvedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.approvedByUserId,
                      'approvedByUserId',
                      'INVALID_VENDOR_BUSINESS_APPROVED_BY_USER_ID'
                  ),
        rejectedAt:
            typeof normalizedInput.rejectedAt === 'undefined'
                ? (existingRecord?.rejectedAt ?? null)
                : normalizeOptionalEpochMs(
                      normalizedInput.rejectedAt,
                      'rejectedAt',
                      'INVALID_VENDOR_BUSINESS_REJECTED_AT'
                  ),
        rejectedByUserId:
            typeof normalizedInput.rejectedByUserId === 'undefined'
                ? (existingRecord?.rejectedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.rejectedByUserId,
                      'rejectedByUserId',
                      'INVALID_VENDOR_BUSINESS_REJECTED_BY_USER_ID'
                  ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_VENDOR_BUSINESS_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_VENDOR_BUSINESS_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_VENDOR_BUSINESS_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_VENDOR_BUSINESS_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Read one vendor business row by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Vendor business id.
 * @returns {Promise<ReturnType<typeof mapVendorBusinessRow>|null>} Matching vendor business or `null`.
 */
async function readVendorBusinessById(queryable, vendorBusinessId) {
    const [rows] = await queryable.query(
        `
        SELECT
            vendor_business_id,
            slug,
            business_name,
            legal_name,
            summary,
            description,
            email,
            phone,
            website_url,
            approval_status,
            approval_notes,
            approved_at,
            approved_by_user_id,
            rejected_at,
            rejected_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_vendor_businesses
        WHERE vendor_business_id = ?
        LIMIT 1
        `,
        [vendorBusinessId]
    )
    const row = firstRow(rows)

    return row ? mapVendorBusinessRow(row) : null
}

/**
 * Insert one vendor business row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Vendor business payload.
 * @returns {Promise<ReturnType<typeof mapVendorBusinessRow>>} Created vendor business.
 */
export async function insertVendorBusiness(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeVendorBusinessInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_vendor_businesses (
            slug,
            business_name,
            legal_name,
            summary,
            description,
            email,
            phone,
            website_url,
            approval_status,
            approval_notes,
            approved_at,
            approved_by_user_id,
            rejected_at,
            rejected_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.slug,
            normalizedInput.businessName,
            normalizedInput.legalName,
            normalizedInput.summary,
            normalizedInput.description,
            normalizedInput.email,
            normalizedInput.phone,
            normalizedInput.websiteUrl,
            normalizedInput.approvalStatus,
            normalizedInput.approvalNotes,
            normalizedInput.approvedAt,
            normalizedInput.approvedByUserId,
            normalizedInput.rejectedAt,
            normalizedInput.rejectedByUserId,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const vendorBusinessId = assertInsertId(
        result,
        'INVALID_VENDOR_BUSINESS_INSERT_ID',
        'Vendor business'
    )
    const createdRecord = await readVendorBusinessById(normalizedQueryable, vendorBusinessId)

    if (!createdRecord) {
        throw createStorageError(
            'VENDOR_BUSINESS_READ_AFTER_WRITE_FAILED',
            `Vendor business was not readable after insert: ${vendorBusinessId}`
        )
    }

    return createdRecord
}

/**
 * Read one vendor business by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Vendor business id.
 * @returns {Promise<ReturnType<typeof mapVendorBusinessRow>|null>} Matching vendor business or `null`.
 */
export async function getVendorBusinessById(queryable, vendorBusinessId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorBusinessId = assertPositiveInteger(
        vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_ID'
    )

    return readVendorBusinessById(normalizedQueryable, normalizedVendorBusinessId)
}

/**
 * List all vendor businesses in name order.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @returns {Promise<Array<ReturnType<typeof mapVendorBusinessRow>>>} Vendor businesses.
 */
export async function listVendorBusinesses(queryable) {
    const normalizedQueryable = assertQueryable(queryable)
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            vendor_business_id,
            slug,
            business_name,
            legal_name,
            summary,
            description,
            email,
            phone,
            website_url,
            approval_status,
            approval_notes,
            approved_at,
            approved_by_user_id,
            rejected_at,
            rejected_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_vendor_businesses
        ORDER BY business_name ASC, vendor_business_id ASC
        `
    )

    return normalizeRows(rows).map(mapVendorBusinessRow)
}

/**
 * Update one vendor business row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Vendor business id.
 * @param {unknown} input - Partial vendor business patch payload.
 * @returns {Promise<ReturnType<typeof mapVendorBusinessRow>>} Updated vendor business.
 */
export async function updateVendorBusinessById(queryable, vendorBusinessId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorBusinessId = assertPositiveInteger(
        vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_ID'
    )
    const currentRecord = await readVendorBusinessById(
        normalizedQueryable,
        normalizedVendorBusinessId
    )

    if (!currentRecord) {
        throw createStorageError(
            'VENDOR_BUSINESS_NOT_FOUND',
            `Vendor business was not found: ${normalizedVendorBusinessId}`
        )
    }

    const normalizedInput = normalizeVendorBusinessInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_vendor_businesses
        SET
            slug = ?,
            business_name = ?,
            legal_name = ?,
            summary = ?,
            description = ?,
            email = ?,
            phone = ?,
            website_url = ?,
            approval_status = ?,
            approval_notes = ?,
            approved_at = ?,
            approved_by_user_id = ?,
            rejected_at = ?,
            rejected_by_user_id = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE vendor_business_id = ?
        `,
        [
            normalizedInput.slug,
            normalizedInput.businessName,
            normalizedInput.legalName,
            normalizedInput.summary,
            normalizedInput.description,
            normalizedInput.email,
            normalizedInput.phone,
            normalizedInput.websiteUrl,
            normalizedInput.approvalStatus,
            normalizedInput.approvalNotes,
            normalizedInput.approvedAt,
            normalizedInput.approvedByUserId,
            normalizedInput.rejectedAt,
            normalizedInput.rejectedByUserId,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedVendorBusinessId
        ]
    )
    assertAffectedRows(result, 'VENDOR_BUSINESS_NOT_FOUND', 'Vendor business')
    const updatedRecord = await readVendorBusinessById(
        normalizedQueryable,
        normalizedVendorBusinessId
    )

    if (!updatedRecord) {
        throw createStorageError(
            'VENDOR_BUSINESS_READ_AFTER_WRITE_FAILED',
            `Vendor business was not readable after update: ${normalizedVendorBusinessId}`
        )
    }

    return updatedRecord
}

/**
 * Insert one vendor business owner association row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {{ vendorBusinessId: number, userId: number }} input - Owner association payload.
 * @returns {Promise<ReturnType<typeof mapVendorBusinessOwnerRow>>} Created owner association.
 */
export async function insertVendorBusinessOwner(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = assertPlainObject(
        input,
        'vendorBusinessOwner',
        'INVALID_VENDOR_BUSINESS_OWNER_INPUT'
    )
    const vendorBusinessId = assertPositiveInteger(
        normalizedInput.vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_OWNER_VENDOR_BUSINESS_ID'
    )
    const userId = assertPositiveInteger(
        normalizedInput.userId,
        'userId',
        'INVALID_VENDOR_BUSINESS_OWNER_USER_ID'
    )

    await normalizedQueryable.query(
        `
        INSERT INTO market_ops_vendor_business_owners (
            vendor_business_id,
            user_id
        ) VALUES (?, ?)
        `,
        [vendorBusinessId, userId]
    )

    return {
        vendorBusinessId,
        userId
    }
}

/**
 * List owner association rows by vendor business id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Vendor business id.
 * @returns {Promise<Array<ReturnType<typeof mapVendorBusinessOwnerRow>>>} Owner associations.
 */
export async function listVendorBusinessOwnersByVendorBusinessId(queryable, vendorBusinessId) {
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
            user_id
        FROM market_ops_vendor_business_owners
        WHERE vendor_business_id = ?
        ORDER BY user_id ASC
        `,
        [normalizedVendorBusinessId]
    )

    return normalizeRows(rows).map(mapVendorBusinessOwnerRow)
}

/**
 * List owner association rows by user id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} userId - Kernel user id.
 * @returns {Promise<Array<ReturnType<typeof mapVendorBusinessOwnerRow>>>} Owner associations.
 */
export async function listVendorBusinessOwnershipsByUserId(queryable, userId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedUserId = assertPositiveInteger(
        userId,
        'userId',
        'INVALID_VENDOR_BUSINESS_OWNER_USER_ID'
    )
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            vendor_business_id,
            user_id
        FROM market_ops_vendor_business_owners
        WHERE user_id = ?
        ORDER BY vendor_business_id ASC
        `,
        [normalizedUserId]
    )

    return normalizeRows(rows).map(mapVendorBusinessOwnerRow)
}

/**
 * Delete one vendor business owner association row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Vendor business id.
 * @param {number} userId - Kernel user id.
 * @returns {Promise<void>} Resolves after the association is removed.
 */
export async function deleteVendorBusinessOwner(queryable, vendorBusinessId, userId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorBusinessId = assertPositiveInteger(
        vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_ID'
    )
    const normalizedUserId = assertPositiveInteger(
        userId,
        'userId',
        'INVALID_VENDOR_BUSINESS_OWNER_USER_ID'
    )
    const [result] = await normalizedQueryable.query(
        `
        DELETE FROM market_ops_vendor_business_owners
        WHERE vendor_business_id = ?
          AND user_id = ?
        `,
        [normalizedVendorBusinessId, normalizedUserId]
    )

    assertAffectedRows(result, 'VENDOR_BUSINESS_OWNER_NOT_FOUND', 'Vendor business owner')
}

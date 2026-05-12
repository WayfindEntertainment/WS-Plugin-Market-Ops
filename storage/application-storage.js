import {
    assertAffectedRows,
    assertInsertId,
    assertNonEmptyString,
    assertNonNegativeInteger,
    assertPlainObject,
    assertPositiveInteger,
    assertQueryable,
    createStorageError,
    firstRow,
    normalizeEnumString,
    normalizeEpochMs,
    normalizeNullableBooleanFlag,
    normalizeOptionalEpochMs,
    normalizeOptionalPositiveInteger,
    normalizeOptionalString,
    normalizeRows
} from './storage-helpers.js'

const APPLICATION_STATUSES = ['draft', 'submitted', 'withdrawn']
const FEE_MODES = ['none', 'per_group', 'per_market']
const SELECTION_STATUSES = ['requested', 'approved', 'waitlisted', 'rejected', 'withdrawn']

/**
 * Convert one vendor market application row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw application row.
 * @returns {{
 *   vendorApplicationId: number,
 *   vendorBusinessId: number,
 *   marketGroupId: number,
 *   applicationKey: string,
 *   status: string,
 *   feeModeSnapshot: string,
 *   feeTotalCents: number,
 *   submittedAt: number|null,
 *   submittedByUserId: number|null,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized application row.
 */
function mapVendorMarketApplicationRow(row) {
    return {
        vendorApplicationId: Number(row.vendor_application_id),
        vendorBusinessId: Number(row.vendor_business_id),
        marketGroupId: Number(row.market_group_id),
        applicationKey: String(row.application_key),
        status: String(row.status),
        feeModeSnapshot: String(row.fee_mode_snapshot),
        feeTotalCents: Number(row.fee_total_cents),
        submittedAt: typeof row.submitted_at === 'number' ? row.submitted_at : null,
        submittedByUserId:
            typeof row.submitted_by_user_id === 'number' ? row.submitted_by_user_id : null,
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Convert one application market selection row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw selection row.
 * @returns {{
 *   applicationMarketSelectionId: number,
 *   vendorApplicationId: number,
 *   marketId: number,
 *   selectionStatus: string,
 *   requestedBoothQuantity: number,
 *   assignedBoothQuantity: number|null,
 *   assignedMarketBoothOfferingId: number|null,
 *   boothFeeTotalCents: number,
 *   willingToVolunteer: number|null,
 *   decisionNotes: string|null,
 *   decidedAt: number|null,
 *   decidedByUserId: number|null,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized selection row.
 */
function mapApplicationMarketSelectionRow(row) {
    return {
        applicationMarketSelectionId: Number(row.application_market_selection_id),
        vendorApplicationId: Number(row.vendor_application_id),
        marketId: Number(row.market_id),
        selectionStatus: String(row.selection_status),
        requestedBoothQuantity: Number(row.requested_booth_quantity),
        assignedBoothQuantity:
            typeof row.assigned_booth_quantity === 'number' ? row.assigned_booth_quantity : null,
        assignedMarketBoothOfferingId:
            typeof row.assigned_market_booth_offering_id === 'number'
                ? row.assigned_market_booth_offering_id
                : null,
        boothFeeTotalCents: Number(row.booth_fee_total_cents),
        willingToVolunteer:
            typeof row.willing_to_volunteer === 'number' ? row.willing_to_volunteer : null,
        decisionNotes: typeof row.decision_notes === 'string' ? row.decision_notes : null,
        decidedAt: typeof row.decided_at === 'number' ? row.decided_at : null,
        decidedByUserId: typeof row.decided_by_user_id === 'number' ? row.decided_by_user_id : null,
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Convert one booth preference row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw booth preference row.
 * @returns {{
 *   applicationMarketSelectionId: number,
 *   preferenceRank: number,
 *   marketBoothOfferingId: number,
 *   createdAt: number,
 *   createdByUserId: number|null
 * }} Normalized booth preference row.
 */
function mapApplicationMarketBoothPreferenceRow(row) {
    return {
        applicationMarketSelectionId: Number(row.application_market_selection_id),
        preferenceRank: Number(row.preference_rank),
        marketBoothOfferingId: Number(row.market_booth_offering_id),
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null
    }
}

/**
 * Normalize one vendor market application payload.
 *
 * @param {unknown} input - Candidate payload.
 * @param {ReturnType<typeof mapVendorMarketApplicationRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   vendorBusinessId: number,
 *   marketGroupId: number,
 *   applicationKey: string,
 *   status: string,
 *   feeModeSnapshot: string,
 *   feeTotalCents: number,
 *   submittedAt: number|null,
 *   submittedByUserId: number|null,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized application payload.
 */
function normalizeVendorMarketApplicationInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(
        input,
        'vendorMarketApplication',
        'INVALID_VENDOR_MARKET_APPLICATION_INPUT'
    )
    const now = Date.now()

    return {
        vendorBusinessId:
            typeof normalizedInput.vendorBusinessId === 'undefined'
                ? (existingRecord?.vendorBusinessId ?? 0)
                : assertPositiveInteger(
                      normalizedInput.vendorBusinessId,
                      'vendorBusinessId',
                      'INVALID_VENDOR_BUSINESS_ID'
                  ),
        marketGroupId:
            typeof normalizedInput.marketGroupId === 'undefined'
                ? (existingRecord?.marketGroupId ?? 0)
                : assertPositiveInteger(
                      normalizedInput.marketGroupId,
                      'marketGroupId',
                      'INVALID_MARKET_GROUP_ID'
                  ),
        applicationKey:
            typeof normalizedInput.applicationKey === 'undefined'
                ? (existingRecord?.applicationKey ?? '')
                : assertNonEmptyString(
                      normalizedInput.applicationKey,
                      'applicationKey',
                      'INVALID_VENDOR_MARKET_APPLICATION_KEY'
                  ),
        status:
            typeof normalizedInput.status === 'undefined'
                ? (existingRecord?.status ?? 'draft')
                : normalizeEnumString(
                      normalizedInput.status,
                      'status',
                      APPLICATION_STATUSES,
                      'INVALID_VENDOR_MARKET_APPLICATION_STATUS'
                  ),
        feeModeSnapshot:
            typeof normalizedInput.feeModeSnapshot === 'undefined'
                ? (existingRecord?.feeModeSnapshot ?? 'none')
                : normalizeEnumString(
                      normalizedInput.feeModeSnapshot,
                      'feeModeSnapshot',
                      FEE_MODES,
                      'INVALID_VENDOR_MARKET_APPLICATION_FEE_MODE'
                  ),
        feeTotalCents:
            typeof normalizedInput.feeTotalCents === 'undefined'
                ? (existingRecord?.feeTotalCents ?? 0)
                : assertNonNegativeInteger(
                      normalizedInput.feeTotalCents,
                      'feeTotalCents',
                      'INVALID_VENDOR_MARKET_APPLICATION_FEE_TOTAL_CENTS'
                  ),
        submittedAt:
            typeof normalizedInput.submittedAt === 'undefined'
                ? (existingRecord?.submittedAt ?? null)
                : normalizeOptionalEpochMs(
                      normalizedInput.submittedAt,
                      'submittedAt',
                      'INVALID_VENDOR_MARKET_APPLICATION_SUBMITTED_AT'
                  ),
        submittedByUserId:
            typeof normalizedInput.submittedByUserId === 'undefined'
                ? (existingRecord?.submittedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.submittedByUserId,
                      'submittedByUserId',
                      'INVALID_VENDOR_MARKET_APPLICATION_SUBMITTED_BY_USER_ID'
                  ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_VENDOR_MARKET_APPLICATION_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_VENDOR_MARKET_APPLICATION_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_VENDOR_MARKET_APPLICATION_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_VENDOR_MARKET_APPLICATION_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Normalize one application market selection payload.
 *
 * @param {unknown} input - Candidate payload.
 * @param {ReturnType<typeof mapApplicationMarketSelectionRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   vendorApplicationId: number,
 *   marketId: number,
 *   selectionStatus: string,
 *   requestedBoothQuantity: number,
 *   assignedBoothQuantity: number|null,
 *   assignedMarketBoothOfferingId: number|null,
 *   boothFeeTotalCents: number,
 *   willingToVolunteer: 0|1|null,
 *   decisionNotes: string|null,
 *   decidedAt: number|null,
 *   decidedByUserId: number|null,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized selection payload.
 */
function normalizeApplicationMarketSelectionInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(
        input,
        'applicationMarketSelection',
        'INVALID_APPLICATION_MARKET_SELECTION_INPUT'
    )
    const now = Date.now()

    return {
        vendorApplicationId:
            typeof normalizedInput.vendorApplicationId === 'undefined'
                ? (existingRecord?.vendorApplicationId ?? 0)
                : assertPositiveInteger(
                      normalizedInput.vendorApplicationId,
                      'vendorApplicationId',
                      'INVALID_VENDOR_APPLICATION_ID'
                  ),
        marketId:
            typeof normalizedInput.marketId === 'undefined'
                ? (existingRecord?.marketId ?? 0)
                : assertPositiveInteger(normalizedInput.marketId, 'marketId', 'INVALID_MARKET_ID'),
        selectionStatus:
            typeof normalizedInput.selectionStatus === 'undefined'
                ? (existingRecord?.selectionStatus ?? 'requested')
                : normalizeEnumString(
                      normalizedInput.selectionStatus,
                      'selectionStatus',
                      SELECTION_STATUSES,
                      'INVALID_APPLICATION_MARKET_SELECTION_STATUS'
                  ),
        requestedBoothQuantity:
            typeof normalizedInput.requestedBoothQuantity === 'undefined'
                ? (existingRecord?.requestedBoothQuantity ?? 1)
                : assertPositiveInteger(
                      normalizedInput.requestedBoothQuantity,
                      'requestedBoothQuantity',
                      'INVALID_APPLICATION_MARKET_SELECTION_REQUESTED_BOOTH_QUANTITY'
                  ),
        assignedBoothQuantity:
            typeof normalizedInput.assignedBoothQuantity === 'undefined'
                ? (existingRecord?.assignedBoothQuantity ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.assignedBoothQuantity,
                      'assignedBoothQuantity',
                      'INVALID_APPLICATION_MARKET_SELECTION_ASSIGNED_BOOTH_QUANTITY'
                  ),
        assignedMarketBoothOfferingId:
            typeof normalizedInput.assignedMarketBoothOfferingId === 'undefined'
                ? (existingRecord?.assignedMarketBoothOfferingId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.assignedMarketBoothOfferingId,
                      'assignedMarketBoothOfferingId',
                      'INVALID_APPLICATION_MARKET_SELECTION_ASSIGNED_MARKET_BOOTH_OFFERING_ID'
                  ),
        boothFeeTotalCents:
            typeof normalizedInput.boothFeeTotalCents === 'undefined'
                ? (existingRecord?.boothFeeTotalCents ?? 0)
                : assertNonNegativeInteger(
                      normalizedInput.boothFeeTotalCents,
                      'boothFeeTotalCents',
                      'INVALID_APPLICATION_MARKET_SELECTION_BOOTH_FEE_TOTAL_CENTS'
                  ),
        willingToVolunteer:
            typeof normalizedInput.willingToVolunteer === 'undefined'
                ? (existingRecord?.willingToVolunteer ?? null)
                : normalizeNullableBooleanFlag(
                      normalizedInput.willingToVolunteer,
                      'willingToVolunteer',
                      'INVALID_APPLICATION_MARKET_SELECTION_WILLING_TO_VOLUNTEER'
                  ),
        decisionNotes:
            typeof normalizedInput.decisionNotes === 'undefined'
                ? (existingRecord?.decisionNotes ?? null)
                : normalizeOptionalString(
                      normalizedInput.decisionNotes,
                      'decisionNotes',
                      'INVALID_APPLICATION_MARKET_SELECTION_DECISION_NOTES'
                  ),
        decidedAt:
            typeof normalizedInput.decidedAt === 'undefined'
                ? (existingRecord?.decidedAt ?? null)
                : normalizeOptionalEpochMs(
                      normalizedInput.decidedAt,
                      'decidedAt',
                      'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_AT'
                  ),
        decidedByUserId:
            typeof normalizedInput.decidedByUserId === 'undefined'
                ? (existingRecord?.decidedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.decidedByUserId,
                      'decidedByUserId',
                      'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_BY_USER_ID'
                  ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_APPLICATION_MARKET_SELECTION_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_APPLICATION_MARKET_SELECTION_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_APPLICATION_MARKET_SELECTION_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_APPLICATION_MARKET_SELECTION_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Normalize one booth preference payload.
 *
 * @param {unknown} input - Candidate payload.
 * @returns {{
 *   applicationMarketSelectionId: number,
 *   preferenceRank: number,
 *   marketBoothOfferingId: number,
 *   createdAt: number,
 *   createdByUserId: number|null
 * }} Normalized booth preference payload.
 */
function normalizeApplicationMarketBoothPreferenceInput(input) {
    const normalizedInput = assertPlainObject(
        input,
        'applicationMarketBoothPreference',
        'INVALID_APPLICATION_MARKET_BOOTH_PREFERENCE_INPUT'
    )
    const now = Date.now()

    return {
        applicationMarketSelectionId: assertPositiveInteger(
            normalizedInput.applicationMarketSelectionId,
            'applicationMarketSelectionId',
            'INVALID_APPLICATION_MARKET_SELECTION_ID'
        ),
        preferenceRank: assertPositiveInteger(
            normalizedInput.preferenceRank,
            'preferenceRank',
            'INVALID_APPLICATION_MARKET_BOOTH_PREFERENCE_RANK'
        ),
        marketBoothOfferingId: assertPositiveInteger(
            normalizedInput.marketBoothOfferingId,
            'marketBoothOfferingId',
            'INVALID_MARKET_BOOTH_OFFERING_ID'
        ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_APPLICATION_MARKET_BOOTH_PREFERENCE_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? null
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_APPLICATION_MARKET_BOOTH_PREFERENCE_CREATED_BY_USER_ID'
                  )
    }
}

/**
 * Read one application row by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorApplicationId - Vendor application id.
 * @returns {Promise<ReturnType<typeof mapVendorMarketApplicationRow>|null>} Matching row or `null`.
 */
async function readVendorMarketApplicationById(queryable, vendorApplicationId) {
    const [rows] = await queryable.query(
        `
        SELECT
            vendor_application_id,
            vendor_business_id,
            market_group_id,
            application_key,
            status,
            fee_mode_snapshot,
            fee_total_cents,
            submitted_at,
            submitted_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_vendor_market_applications
        WHERE vendor_application_id = ?
        LIMIT 1
        `,
        [vendorApplicationId]
    )
    const row = firstRow(rows)

    return row ? mapVendorMarketApplicationRow(row) : null
}

/**
 * Read one selection row by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} applicationMarketSelectionId - Selection id.
 * @returns {Promise<ReturnType<typeof mapApplicationMarketSelectionRow>|null>} Matching row or `null`.
 */
async function readApplicationMarketSelectionById(queryable, applicationMarketSelectionId) {
    const [rows] = await queryable.query(
        `
        SELECT
            application_market_selection_id,
            vendor_application_id,
            market_id,
            selection_status,
            requested_booth_quantity,
            assigned_booth_quantity,
            assigned_market_booth_offering_id,
            booth_fee_total_cents,
            willing_to_volunteer,
            decision_notes,
            decided_at,
            decided_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_application_market_selections
        WHERE application_market_selection_id = ?
        LIMIT 1
        `,
        [applicationMarketSelectionId]
    )
    const row = firstRow(rows)

    return row ? mapApplicationMarketSelectionRow(row) : null
}

/**
 * Insert one vendor market application row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Application payload.
 * @returns {Promise<ReturnType<typeof mapVendorMarketApplicationRow>>} Created application.
 */
export async function insertVendorMarketApplication(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeVendorMarketApplicationInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_vendor_market_applications (
            vendor_business_id,
            market_group_id,
            application_key,
            status,
            fee_mode_snapshot,
            fee_total_cents,
            submitted_at,
            submitted_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.vendorBusinessId,
            normalizedInput.marketGroupId,
            normalizedInput.applicationKey,
            normalizedInput.status,
            normalizedInput.feeModeSnapshot,
            normalizedInput.feeTotalCents,
            normalizedInput.submittedAt,
            normalizedInput.submittedByUserId,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const vendorApplicationId = assertInsertId(
        result,
        'INVALID_VENDOR_MARKET_APPLICATION_INSERT_ID',
        'Vendor market application'
    )
    const createdRecord = await readVendorMarketApplicationById(
        normalizedQueryable,
        vendorApplicationId
    )

    if (!createdRecord) {
        throw createStorageError(
            'VENDOR_MARKET_APPLICATION_READ_AFTER_WRITE_FAILED',
            `Vendor market application was not readable after insert: ${vendorApplicationId}`
        )
    }

    return createdRecord
}

/**
 * Read one vendor market application by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorApplicationId - Vendor application id.
 * @returns {Promise<ReturnType<typeof mapVendorMarketApplicationRow>|null>} Matching application or `null`.
 */
export async function getVendorMarketApplicationById(queryable, vendorApplicationId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorApplicationId = assertPositiveInteger(
        vendorApplicationId,
        'vendorApplicationId',
        'INVALID_VENDOR_APPLICATION_ID'
    )

    return readVendorMarketApplicationById(normalizedQueryable, normalizedVendorApplicationId)
}

/**
 * List vendor market applications by vendor business id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorBusinessId - Parent vendor business id.
 * @returns {Promise<Array<ReturnType<typeof mapVendorMarketApplicationRow>>>} Applications.
 */
export async function listVendorMarketApplicationsByVendorBusinessId(queryable, vendorBusinessId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorBusinessId = assertPositiveInteger(
        vendorBusinessId,
        'vendorBusinessId',
        'INVALID_VENDOR_BUSINESS_ID'
    )
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            vendor_application_id,
            vendor_business_id,
            market_group_id,
            application_key,
            status,
            fee_mode_snapshot,
            fee_total_cents,
            submitted_at,
            submitted_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_vendor_market_applications
        WHERE vendor_business_id = ?
        ORDER BY created_at DESC, vendor_application_id DESC
        `,
        [normalizedVendorBusinessId]
    )

    return normalizeRows(rows).map(mapVendorMarketApplicationRow)
}

/**
 * Update one vendor market application row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorApplicationId - Vendor application id.
 * @param {unknown} input - Partial application patch payload.
 * @returns {Promise<ReturnType<typeof mapVendorMarketApplicationRow>>} Updated application.
 */
export async function updateVendorMarketApplicationById(queryable, vendorApplicationId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorApplicationId = assertPositiveInteger(
        vendorApplicationId,
        'vendorApplicationId',
        'INVALID_VENDOR_APPLICATION_ID'
    )
    const currentRecord = await readVendorMarketApplicationById(
        normalizedQueryable,
        normalizedVendorApplicationId
    )

    if (!currentRecord) {
        throw createStorageError(
            'VENDOR_MARKET_APPLICATION_NOT_FOUND',
            `Vendor market application was not found: ${normalizedVendorApplicationId}`
        )
    }

    const normalizedInput = normalizeVendorMarketApplicationInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_vendor_market_applications
        SET
            vendor_business_id = ?,
            market_group_id = ?,
            application_key = ?,
            status = ?,
            fee_mode_snapshot = ?,
            fee_total_cents = ?,
            submitted_at = ?,
            submitted_by_user_id = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE vendor_application_id = ?
        `,
        [
            normalizedInput.vendorBusinessId,
            normalizedInput.marketGroupId,
            normalizedInput.applicationKey,
            normalizedInput.status,
            normalizedInput.feeModeSnapshot,
            normalizedInput.feeTotalCents,
            normalizedInput.submittedAt,
            normalizedInput.submittedByUserId,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedVendorApplicationId
        ]
    )
    assertAffectedRows(result, 'VENDOR_MARKET_APPLICATION_NOT_FOUND', 'Vendor market application')
    const updatedRecord = await readVendorMarketApplicationById(
        normalizedQueryable,
        normalizedVendorApplicationId
    )

    if (!updatedRecord) {
        throw createStorageError(
            'VENDOR_MARKET_APPLICATION_READ_AFTER_WRITE_FAILED',
            `Vendor market application was not readable after update: ${normalizedVendorApplicationId}`
        )
    }

    return updatedRecord
}

/**
 * Insert one application market selection row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Selection payload.
 * @returns {Promise<ReturnType<typeof mapApplicationMarketSelectionRow>>} Created selection.
 */
export async function insertApplicationMarketSelection(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeApplicationMarketSelectionInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_application_market_selections (
            vendor_application_id,
            market_id,
            selection_status,
            requested_booth_quantity,
            assigned_booth_quantity,
            assigned_market_booth_offering_id,
            booth_fee_total_cents,
            willing_to_volunteer,
            decision_notes,
            decided_at,
            decided_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.vendorApplicationId,
            normalizedInput.marketId,
            normalizedInput.selectionStatus,
            normalizedInput.requestedBoothQuantity,
            normalizedInput.assignedBoothQuantity,
            normalizedInput.assignedMarketBoothOfferingId,
            normalizedInput.boothFeeTotalCents,
            normalizedInput.willingToVolunteer,
            normalizedInput.decisionNotes,
            normalizedInput.decidedAt,
            normalizedInput.decidedByUserId,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const applicationMarketSelectionId = assertInsertId(
        result,
        'INVALID_APPLICATION_MARKET_SELECTION_INSERT_ID',
        'Application market selection'
    )
    const createdRecord = await readApplicationMarketSelectionById(
        normalizedQueryable,
        applicationMarketSelectionId
    )

    if (!createdRecord) {
        throw createStorageError(
            'APPLICATION_MARKET_SELECTION_READ_AFTER_WRITE_FAILED',
            `Application market selection was not readable after insert: ${applicationMarketSelectionId}`
        )
    }

    return createdRecord
}

/**
 * Read one application market selection by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} applicationMarketSelectionId - Selection id.
 * @returns {Promise<ReturnType<typeof mapApplicationMarketSelectionRow>|null>} Matching selection or `null`.
 */
export async function getApplicationMarketSelectionById(queryable, applicationMarketSelectionId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedSelectionId = assertPositiveInteger(
        applicationMarketSelectionId,
        'applicationMarketSelectionId',
        'INVALID_APPLICATION_MARKET_SELECTION_ID'
    )

    return readApplicationMarketSelectionById(normalizedQueryable, normalizedSelectionId)
}

/**
 * List application market selections by parent vendor application id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorApplicationId - Parent vendor application id.
 * @returns {Promise<Array<ReturnType<typeof mapApplicationMarketSelectionRow>>>} Selection rows.
 */
export async function listApplicationMarketSelectionsByVendorApplicationId(
    queryable,
    vendorApplicationId
) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorApplicationId = assertPositiveInteger(
        vendorApplicationId,
        'vendorApplicationId',
        'INVALID_VENDOR_APPLICATION_ID'
    )
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            application_market_selection_id,
            vendor_application_id,
            market_id,
            selection_status,
            requested_booth_quantity,
            assigned_booth_quantity,
            assigned_market_booth_offering_id,
            booth_fee_total_cents,
            willing_to_volunteer,
            decision_notes,
            decided_at,
            decided_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_application_market_selections
        WHERE vendor_application_id = ?
        ORDER BY market_id ASC, application_market_selection_id ASC
        `,
        [normalizedVendorApplicationId]
    )

    return normalizeRows(rows).map(mapApplicationMarketSelectionRow)
}

/**
 * Update one application market selection row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} applicationMarketSelectionId - Selection id.
 * @param {unknown} input - Partial selection patch payload.
 * @returns {Promise<ReturnType<typeof mapApplicationMarketSelectionRow>>} Updated selection.
 */
export async function updateApplicationMarketSelectionById(
    queryable,
    applicationMarketSelectionId,
    input
) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedSelectionId = assertPositiveInteger(
        applicationMarketSelectionId,
        'applicationMarketSelectionId',
        'INVALID_APPLICATION_MARKET_SELECTION_ID'
    )
    const currentRecord = await readApplicationMarketSelectionById(
        normalizedQueryable,
        normalizedSelectionId
    )

    if (!currentRecord) {
        throw createStorageError(
            'APPLICATION_MARKET_SELECTION_NOT_FOUND',
            `Application market selection was not found: ${normalizedSelectionId}`
        )
    }

    const normalizedInput = normalizeApplicationMarketSelectionInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_application_market_selections
        SET
            vendor_application_id = ?,
            market_id = ?,
            selection_status = ?,
            requested_booth_quantity = ?,
            assigned_booth_quantity = ?,
            assigned_market_booth_offering_id = ?,
            booth_fee_total_cents = ?,
            willing_to_volunteer = ?,
            decision_notes = ?,
            decided_at = ?,
            decided_by_user_id = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE application_market_selection_id = ?
        `,
        [
            normalizedInput.vendorApplicationId,
            normalizedInput.marketId,
            normalizedInput.selectionStatus,
            normalizedInput.requestedBoothQuantity,
            normalizedInput.assignedBoothQuantity,
            normalizedInput.assignedMarketBoothOfferingId,
            normalizedInput.boothFeeTotalCents,
            normalizedInput.willingToVolunteer,
            normalizedInput.decisionNotes,
            normalizedInput.decidedAt,
            normalizedInput.decidedByUserId,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedSelectionId
        ]
    )
    assertAffectedRows(
        result,
        'APPLICATION_MARKET_SELECTION_NOT_FOUND',
        'Application market selection'
    )
    const updatedRecord = await readApplicationMarketSelectionById(
        normalizedQueryable,
        normalizedSelectionId
    )

    if (!updatedRecord) {
        throw createStorageError(
            'APPLICATION_MARKET_SELECTION_READ_AFTER_WRITE_FAILED',
            `Application market selection was not readable after update: ${normalizedSelectionId}`
        )
    }

    return updatedRecord
}

/**
 * Delete all application market selections by parent vendor application id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} vendorApplicationId - Parent vendor application id.
 * @returns {Promise<void>} Resolves after the selection rows are removed.
 */
export async function deleteApplicationMarketSelectionsByVendorApplicationId(
    queryable,
    vendorApplicationId
) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedVendorApplicationId = assertPositiveInteger(
        vendorApplicationId,
        'vendorApplicationId',
        'INVALID_VENDOR_APPLICATION_ID'
    )

    await normalizedQueryable.query(
        `
        DELETE FROM market_ops_application_market_selections
        WHERE vendor_application_id = ?
        `,
        [normalizedVendorApplicationId]
    )
}

/**
 * Insert one application market booth preference row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Booth preference payload.
 * @returns {Promise<ReturnType<typeof mapApplicationMarketBoothPreferenceRow>>} Created booth preference.
 */
export async function insertApplicationMarketBoothPreference(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeApplicationMarketBoothPreferenceInput(input)

    await normalizedQueryable.query(
        `
        INSERT INTO market_ops_application_market_booth_preferences (
            application_market_selection_id,
            preference_rank,
            market_booth_offering_id,
            created_at,
            created_by_user_id
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.applicationMarketSelectionId,
            normalizedInput.preferenceRank,
            normalizedInput.marketBoothOfferingId,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId
        ]
    )

    return {
        applicationMarketSelectionId: normalizedInput.applicationMarketSelectionId,
        preferenceRank: normalizedInput.preferenceRank,
        marketBoothOfferingId: normalizedInput.marketBoothOfferingId,
        createdAt: normalizedInput.createdAt,
        createdByUserId: normalizedInput.createdByUserId
    }
}

/**
 * List booth preferences by parent application market selection id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} applicationMarketSelectionId - Parent selection id.
 * @returns {Promise<Array<ReturnType<typeof mapApplicationMarketBoothPreferenceRow>>>} Booth preference rows.
 */
export async function listApplicationMarketBoothPreferencesBySelectionId(
    queryable,
    applicationMarketSelectionId
) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedSelectionId = assertPositiveInteger(
        applicationMarketSelectionId,
        'applicationMarketSelectionId',
        'INVALID_APPLICATION_MARKET_SELECTION_ID'
    )
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            application_market_selection_id,
            preference_rank,
            market_booth_offering_id,
            created_at,
            created_by_user_id
        FROM market_ops_application_market_booth_preferences
        WHERE application_market_selection_id = ?
        ORDER BY preference_rank ASC
        `,
        [normalizedSelectionId]
    )

    return normalizeRows(rows).map(mapApplicationMarketBoothPreferenceRow)
}

/**
 * Delete all booth preferences by parent application market selection id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} applicationMarketSelectionId - Parent selection id.
 * @returns {Promise<void>} Resolves after the booth preference rows are removed.
 */
export async function deleteApplicationMarketBoothPreferencesBySelectionId(
    queryable,
    applicationMarketSelectionId
) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedSelectionId = assertPositiveInteger(
        applicationMarketSelectionId,
        'applicationMarketSelectionId',
        'INVALID_APPLICATION_MARKET_SELECTION_ID'
    )

    await normalizedQueryable.query(
        `
        DELETE FROM market_ops_application_market_booth_preferences
        WHERE application_market_selection_id = ?
        `,
        [normalizedSelectionId]
    )
}

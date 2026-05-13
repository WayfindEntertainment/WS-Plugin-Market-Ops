import {
    assertAffectedRows,
    assertInsertId,
    assertNonNegativeInteger,
    assertPlainObject,
    assertPositiveInteger,
    assertQueryable,
    createStorageError,
    firstRow,
    normalizeBooleanFlag,
    normalizeEnumString,
    normalizeEpochMs,
    normalizeOptionalEpochMs,
    normalizeOptionalPositiveInteger,
    normalizeOptionalString,
    normalizeRows
} from './storage-helpers.js'

const FEE_MODES = ['none', 'per_group', 'per_market']

/**
 * Convert one location row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw location row.
 * @returns {{
 *   locationId: number,
 *   slug: string,
 *   locationName: string,
 *   addressLine1: string|null,
 *   addressLine2: string|null,
 *   city: string|null,
 *   stateCode: string|null,
 *   postalCode: string|null,
 *   publicNotes: string|null,
 *   isActive: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized location.
 */
function mapLocationRow(row) {
    return {
        locationId: Number(row.location_id),
        slug: String(row.slug),
        locationName: String(row.location_name),
        addressLine1: typeof row.address_line_1 === 'string' ? row.address_line_1 : null,
        addressLine2: typeof row.address_line_2 === 'string' ? row.address_line_2 : null,
        city: typeof row.city === 'string' ? row.city : null,
        stateCode: typeof row.state_code === 'string' ? row.state_code : null,
        postalCode: typeof row.postal_code === 'string' ? row.postal_code : null,
        publicNotes: typeof row.public_notes === 'string' ? row.public_notes : null,
        isActive: Number(row.is_active),
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Convert one market group row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw market group row.
 * @returns {{
 *   marketGroupId: number,
 *   slug: string,
 *   groupName: string,
 *   summary: string|null,
 *   description: string|null,
 *   feeMode: string,
 *   feeAmountCents: number,
 *   isPublic: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized market group.
 */
function mapMarketGroupRow(row) {
    return {
        marketGroupId: Number(row.market_group_id),
        slug: String(row.slug),
        groupName: String(row.group_name),
        summary: typeof row.summary === 'string' ? row.summary : null,
        description: typeof row.description === 'string' ? row.description : null,
        feeMode: String(row.fee_mode),
        feeAmountCents: Number(row.fee_amount_cents),
        isPublic: Number(row.is_public),
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Convert one market row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw market row.
 * @returns {{
 *   marketId: number,
 *   marketGroupId: number,
 *   locationId: number,
 *   slug: string,
 *   marketName: string,
 *   summary: string|null,
 *   description: string|null,
 *   startsAt: number,
 *   endsAt: number,
 *   applicationsOpen: number,
 *   applicationsOpenAt: number|null,
 *   applicationsCloseAt: number|null,
 *   feeAmountCents: number,
 *   isPublic: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized market.
 */
function mapMarketRow(row) {
    return {
        marketId: Number(row.market_id),
        marketGroupId: Number(row.market_group_id),
        locationId: Number(row.location_id),
        slug: String(row.slug),
        marketName: String(row.market_name),
        summary: typeof row.summary === 'string' ? row.summary : null,
        description: typeof row.description === 'string' ? row.description : null,
        startsAt: Number(row.starts_at),
        endsAt: Number(row.ends_at),
        applicationsOpen: Number(row.applications_open),
        applicationsOpenAt:
            typeof row.applications_open_at === 'number' ? row.applications_open_at : null,
        applicationsCloseAt:
            typeof row.applications_close_at === 'number' ? row.applications_close_at : null,
        feeAmountCents: Number(row.fee_amount_cents),
        isPublic: Number(row.is_public),
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Convert one market booth offering row into the public storage shape.
 *
 * @param {Record<string, unknown>} row - Raw booth offering row.
 * @returns {{
 *   marketBoothOfferingId: number,
 *   marketId: number,
 *   boothTypeId: number,
 *   boothNumber: number,
 *   priceCents: number,
 *   isActive: number,
 *   sortOrder: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized booth offering.
 */
function mapMarketBoothOfferingRow(row) {
    return {
        marketBoothOfferingId: Number(row.market_booth_offering_id),
        marketId: Number(row.market_id),
        boothTypeId: Number(row.booth_type_id),
        boothNumber: Number(row.booth_number),
        priceCents: Number(row.price_cents),
        isActive: Number(row.is_active),
        sortOrder: Number(row.sort_order),
        createdAt: Number(row.created_at),
        createdByUserId: typeof row.created_by_user_id === 'number' ? row.created_by_user_id : null,
        updatedAt: Number(row.updated_at),
        updatedByUserId: typeof row.updated_by_user_id === 'number' ? row.updated_by_user_id : null
    }
}

/**
 * Normalize one location payload.
 *
 * @param {unknown} input - Candidate location payload.
 * @param {ReturnType<typeof mapLocationRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   slug: string,
 *   locationName: string,
 *   addressLine1: string|null,
 *   addressLine2: string|null,
 *   city: string|null,
 *   stateCode: string|null,
 *   postalCode: string|null,
 *   publicNotes: string|null,
 *   isActive: 0|1,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized location payload.
 */
function normalizeLocationInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(input, 'location', 'INVALID_LOCATION_INPUT')
    const now = Date.now()

    return {
        slug:
            typeof normalizedInput.slug === 'undefined'
                ? (existingRecord?.slug ?? '')
                : String(normalizedInput.slug).trim(),
        locationName:
            typeof normalizedInput.locationName === 'undefined'
                ? (existingRecord?.locationName ?? '')
                : String(normalizedInput.locationName).trim(),
        addressLine1:
            typeof normalizedInput.addressLine1 === 'undefined'
                ? (existingRecord?.addressLine1 ?? null)
                : normalizeOptionalString(
                      normalizedInput.addressLine1,
                      'addressLine1',
                      'INVALID_LOCATION_ADDRESS_LINE_1'
                  ),
        addressLine2:
            typeof normalizedInput.addressLine2 === 'undefined'
                ? (existingRecord?.addressLine2 ?? null)
                : normalizeOptionalString(
                      normalizedInput.addressLine2,
                      'addressLine2',
                      'INVALID_LOCATION_ADDRESS_LINE_2'
                  ),
        city:
            typeof normalizedInput.city === 'undefined'
                ? (existingRecord?.city ?? null)
                : normalizeOptionalString(normalizedInput.city, 'city', 'INVALID_LOCATION_CITY'),
        stateCode:
            typeof normalizedInput.stateCode === 'undefined'
                ? (existingRecord?.stateCode ?? null)
                : normalizeOptionalString(
                      normalizedInput.stateCode,
                      'stateCode',
                      'INVALID_LOCATION_STATE_CODE'
                  ),
        postalCode:
            typeof normalizedInput.postalCode === 'undefined'
                ? (existingRecord?.postalCode ?? null)
                : normalizeOptionalString(
                      normalizedInput.postalCode,
                      'postalCode',
                      'INVALID_LOCATION_POSTAL_CODE'
                  ),
        publicNotes:
            typeof normalizedInput.publicNotes === 'undefined'
                ? (existingRecord?.publicNotes ?? null)
                : normalizeOptionalString(
                      normalizedInput.publicNotes,
                      'publicNotes',
                      'INVALID_LOCATION_PUBLIC_NOTES'
                  ),
        isActive:
            typeof normalizedInput.isActive === 'undefined'
                ? /** @type {0|1} */ (existingRecord?.isActive ?? 1)
                : normalizeBooleanFlag(
                      normalizedInput.isActive,
                      'isActive',
                      'INVALID_LOCATION_IS_ACTIVE'
                  ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_LOCATION_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_LOCATION_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_LOCATION_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_LOCATION_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Normalize one market group payload.
 *
 * @param {unknown} input - Candidate market group payload.
 * @param {ReturnType<typeof mapMarketGroupRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   slug: string,
 *   groupName: string,
 *   summary: string|null,
 *   description: string|null,
 *   feeMode: string,
 *   feeAmountCents: number,
 *   isPublic: 0|1,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized market group payload.
 */
function normalizeMarketGroupInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(input, 'marketGroup', 'INVALID_MARKET_GROUP_INPUT')
    const now = Date.now()

    return {
        slug:
            typeof normalizedInput.slug === 'undefined'
                ? (existingRecord?.slug ?? '')
                : String(normalizedInput.slug).trim(),
        groupName:
            typeof normalizedInput.groupName === 'undefined'
                ? (existingRecord?.groupName ?? '')
                : String(normalizedInput.groupName).trim(),
        summary:
            typeof normalizedInput.summary === 'undefined'
                ? (existingRecord?.summary ?? null)
                : normalizeOptionalString(
                      normalizedInput.summary,
                      'summary',
                      'INVALID_MARKET_GROUP_SUMMARY'
                  ),
        description:
            typeof normalizedInput.description === 'undefined'
                ? (existingRecord?.description ?? null)
                : normalizeOptionalString(
                      normalizedInput.description,
                      'description',
                      'INVALID_MARKET_GROUP_DESCRIPTION'
                  ),
        feeMode:
            typeof normalizedInput.feeMode === 'undefined'
                ? (existingRecord?.feeMode ?? 'none')
                : normalizeEnumString(
                      normalizedInput.feeMode,
                      'feeMode',
                      FEE_MODES,
                      'INVALID_MARKET_GROUP_FEE_MODE'
                  ),
        feeAmountCents:
            typeof normalizedInput.feeAmountCents === 'undefined'
                ? (existingRecord?.feeAmountCents ?? 0)
                : assertNonNegativeInteger(
                      normalizedInput.feeAmountCents,
                      'feeAmountCents',
                      'INVALID_MARKET_GROUP_FEE_AMOUNT_CENTS'
                  ),
        isPublic:
            typeof normalizedInput.isPublic === 'undefined'
                ? /** @type {0|1} */ (existingRecord?.isPublic ?? 1)
                : normalizeBooleanFlag(
                      normalizedInput.isPublic,
                      'isPublic',
                      'INVALID_MARKET_GROUP_IS_PUBLIC'
                  ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_MARKET_GROUP_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_MARKET_GROUP_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_MARKET_GROUP_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_MARKET_GROUP_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Normalize one market payload.
 *
 * @param {unknown} input - Candidate market payload.
 * @param {ReturnType<typeof mapMarketRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   marketGroupId: number,
 *   locationId: number,
 *   slug: string,
 *   marketName: string,
 *   summary: string|null,
 *   description: string|null,
 *   startsAt: number,
 *   endsAt: number,
 *   applicationsOpen: 0|1,
 *   applicationsOpenAt: number|null,
 *   applicationsCloseAt: number|null,
 *   feeAmountCents: number,
 *   isPublic: 0|1,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized market payload.
 */
function normalizeMarketInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(input, 'market', 'INVALID_MARKET_INPUT')
    const now = Date.now()

    return {
        marketGroupId:
            typeof normalizedInput.marketGroupId === 'undefined'
                ? (existingRecord?.marketGroupId ?? 0)
                : assertPositiveInteger(
                      normalizedInput.marketGroupId,
                      'marketGroupId',
                      'INVALID_MARKET_GROUP_ID'
                  ),
        locationId:
            typeof normalizedInput.locationId === 'undefined'
                ? (existingRecord?.locationId ?? 0)
                : assertPositiveInteger(
                      normalizedInput.locationId,
                      'locationId',
                      'INVALID_LOCATION_ID'
                  ),
        slug:
            typeof normalizedInput.slug === 'undefined'
                ? (existingRecord?.slug ?? '')
                : String(normalizedInput.slug).trim(),
        marketName:
            typeof normalizedInput.marketName === 'undefined'
                ? (existingRecord?.marketName ?? '')
                : String(normalizedInput.marketName).trim(),
        summary:
            typeof normalizedInput.summary === 'undefined'
                ? (existingRecord?.summary ?? null)
                : normalizeOptionalString(
                      normalizedInput.summary,
                      'summary',
                      'INVALID_MARKET_SUMMARY'
                  ),
        description:
            typeof normalizedInput.description === 'undefined'
                ? (existingRecord?.description ?? null)
                : normalizeOptionalString(
                      normalizedInput.description,
                      'description',
                      'INVALID_MARKET_DESCRIPTION'
                  ),
        startsAt:
            typeof normalizedInput.startsAt === 'undefined'
                ? (existingRecord?.startsAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.startsAt,
                      'startsAt',
                      'INVALID_MARKET_STARTS_AT'
                  ),
        endsAt:
            typeof normalizedInput.endsAt === 'undefined'
                ? (existingRecord?.endsAt ?? now)
                : normalizeEpochMs(normalizedInput.endsAt, 'endsAt', 'INVALID_MARKET_ENDS_AT'),
        applicationsOpen:
            typeof normalizedInput.applicationsOpen === 'undefined'
                ? /** @type {0|1} */ (existingRecord?.applicationsOpen ?? 0)
                : normalizeBooleanFlag(
                      normalizedInput.applicationsOpen,
                      'applicationsOpen',
                      'INVALID_MARKET_APPLICATIONS_OPEN'
                  ),
        applicationsOpenAt:
            typeof normalizedInput.applicationsOpenAt === 'undefined'
                ? (existingRecord?.applicationsOpenAt ?? null)
                : normalizeOptionalEpochMs(
                      normalizedInput.applicationsOpenAt,
                      'applicationsOpenAt',
                      'INVALID_MARKET_APPLICATIONS_OPEN_AT'
                  ),
        applicationsCloseAt:
            typeof normalizedInput.applicationsCloseAt === 'undefined'
                ? (existingRecord?.applicationsCloseAt ?? null)
                : normalizeOptionalEpochMs(
                      normalizedInput.applicationsCloseAt,
                      'applicationsCloseAt',
                      'INVALID_MARKET_APPLICATIONS_CLOSE_AT'
                  ),
        feeAmountCents:
            typeof normalizedInput.feeAmountCents === 'undefined'
                ? (existingRecord?.feeAmountCents ?? 0)
                : assertNonNegativeInteger(
                      normalizedInput.feeAmountCents,
                      'feeAmountCents',
                      'INVALID_MARKET_FEE_AMOUNT_CENTS'
                  ),
        isPublic:
            typeof normalizedInput.isPublic === 'undefined'
                ? /** @type {0|1} */ (existingRecord?.isPublic ?? 1)
                : normalizeBooleanFlag(
                      normalizedInput.isPublic,
                      'isPublic',
                      'INVALID_MARKET_IS_PUBLIC'
                  ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_MARKET_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_MARKET_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_MARKET_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_MARKET_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Normalize one market booth offering payload.
 *
 * @param {unknown} input - Candidate booth offering payload.
 * @param {ReturnType<typeof mapMarketBoothOfferingRow>=} existingRecord - Existing row for patch updates.
 * @returns {{
 *   marketId: number,
 *   boothTypeId: number,
 *   boothNumber: number,
 *   priceCents: number,
 *   isActive: 0|1,
 *   sortOrder: number,
 *   createdAt: number,
 *   createdByUserId: number|null,
 *   updatedAt: number,
 *   updatedByUserId: number|null
 * }} Normalized booth offering payload.
 */
function normalizeMarketBoothOfferingInput(input, existingRecord) {
    const normalizedInput = assertPlainObject(
        input,
        'marketBoothOffering',
        'INVALID_MARKET_BOOTH_OFFERING_INPUT'
    )
    const now = Date.now()

    return {
        marketId:
            typeof normalizedInput.marketId === 'undefined'
                ? (existingRecord?.marketId ?? 0)
                : assertPositiveInteger(normalizedInput.marketId, 'marketId', 'INVALID_MARKET_ID'),
        boothTypeId:
            typeof normalizedInput.boothTypeId === 'undefined'
                ? (existingRecord?.boothTypeId ?? 0)
                : assertPositiveInteger(
                      normalizedInput.boothTypeId,
                      'boothTypeId',
                      'INVALID_BOOTH_TYPE_ID'
                  ),
        boothNumber:
            typeof normalizedInput.boothNumber === 'undefined'
                ? (existingRecord?.boothNumber ?? 0)
                : assertPositiveInteger(
                      normalizedInput.boothNumber,
                      'boothNumber',
                      'INVALID_MARKET_BOOTH_OFFERING_BOOTH_NUMBER'
                  ),
        priceCents:
            typeof normalizedInput.priceCents === 'undefined'
                ? (existingRecord?.priceCents ?? 0)
                : assertNonNegativeInteger(
                      normalizedInput.priceCents,
                      'priceCents',
                      'INVALID_MARKET_BOOTH_OFFERING_PRICE_CENTS'
                  ),
        isActive:
            typeof normalizedInput.isActive === 'undefined'
                ? /** @type {0|1} */ (existingRecord?.isActive ?? 1)
                : normalizeBooleanFlag(
                      normalizedInput.isActive,
                      'isActive',
                      'INVALID_MARKET_BOOTH_OFFERING_IS_ACTIVE'
                  ),
        sortOrder:
            typeof normalizedInput.sortOrder === 'undefined'
                ? (existingRecord?.sortOrder ?? 0)
                : assertNonNegativeInteger(
                      normalizedInput.sortOrder,
                      'sortOrder',
                      'INVALID_MARKET_BOOTH_OFFERING_SORT_ORDER'
                  ),
        createdAt:
            typeof normalizedInput.createdAt === 'undefined'
                ? (existingRecord?.createdAt ?? now)
                : normalizeEpochMs(
                      normalizedInput.createdAt,
                      'createdAt',
                      'INVALID_MARKET_BOOTH_OFFERING_CREATED_AT'
                  ),
        createdByUserId:
            typeof normalizedInput.createdByUserId === 'undefined'
                ? (existingRecord?.createdByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.createdByUserId,
                      'createdByUserId',
                      'INVALID_MARKET_BOOTH_OFFERING_CREATED_BY_USER_ID'
                  ),
        updatedAt:
            typeof normalizedInput.updatedAt === 'undefined'
                ? now
                : normalizeEpochMs(
                      normalizedInput.updatedAt,
                      'updatedAt',
                      'INVALID_MARKET_BOOTH_OFFERING_UPDATED_AT'
                  ),
        updatedByUserId:
            typeof normalizedInput.updatedByUserId === 'undefined'
                ? (existingRecord?.updatedByUserId ?? null)
                : normalizeOptionalPositiveInteger(
                      normalizedInput.updatedByUserId,
                      'updatedByUserId',
                      'INVALID_MARKET_BOOTH_OFFERING_UPDATED_BY_USER_ID'
                  )
    }
}

/**
 * Read one location row by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} locationId - Location id.
 * @returns {Promise<ReturnType<typeof mapLocationRow>|null>} Matching row or `null`.
 */
async function readLocationById(queryable, locationId) {
    const [rows] = await queryable.query(
        `
        SELECT
            location_id,
            slug,
            location_name,
            address_line_1,
            address_line_2,
            city,
            state_code,
            postal_code,
            public_notes,
            is_active,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_locations
        WHERE location_id = ?
        LIMIT 1
        `,
        [locationId]
    )
    const row = firstRow(rows)

    return row ? mapLocationRow(row) : null
}

/**
 * Read one market group row by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketGroupId - Market group id.
 * @returns {Promise<ReturnType<typeof mapMarketGroupRow>|null>} Matching row or `null`.
 */
async function readMarketGroupById(queryable, marketGroupId) {
    const [rows] = await queryable.query(
        `
        SELECT
            market_group_id,
            slug,
            group_name,
            summary,
            description,
            fee_mode,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_market_groups
        WHERE market_group_id = ?
        LIMIT 1
        `,
        [marketGroupId]
    )
    const row = firstRow(rows)

    return row ? mapMarketGroupRow(row) : null
}

/**
 * Read one market row by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketId - Market id.
 * @returns {Promise<ReturnType<typeof mapMarketRow>|null>} Matching row or `null`.
 */
async function readMarketById(queryable, marketId) {
    const [rows] = await queryable.query(
        `
        SELECT
            market_id,
            market_group_id,
            location_id,
            slug,
            market_name,
            summary,
            description,
            starts_at,
            ends_at,
            applications_open,
            applications_open_at,
            applications_close_at,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_markets
        WHERE market_id = ?
        LIMIT 1
        `,
        [marketId]
    )
    const row = firstRow(rows)

    return row ? mapMarketRow(row) : null
}

/**
 * Read one market booth offering row by id from the provided query seam.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketBoothOfferingId - Market booth offering id.
 * @returns {Promise<ReturnType<typeof mapMarketBoothOfferingRow>|null>} Matching row or `null`.
 */
async function readMarketBoothOfferingById(queryable, marketBoothOfferingId) {
    const [rows] = await queryable.query(
        `
        SELECT
            market_booth_offering_id,
            market_id,
            booth_type_id,
            booth_number,
            price_cents,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_market_booth_offerings
        WHERE market_booth_offering_id = ?
        LIMIT 1
        `,
        [marketBoothOfferingId]
    )
    const row = firstRow(rows)

    return row ? mapMarketBoothOfferingRow(row) : null
}

/**
 * Insert one location row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Location payload.
 * @returns {Promise<ReturnType<typeof mapLocationRow>>} Created location.
 */
export async function insertLocation(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeLocationInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_locations (
            slug,
            location_name,
            address_line_1,
            address_line_2,
            city,
            state_code,
            postal_code,
            public_notes,
            is_active,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.slug,
            normalizedInput.locationName,
            normalizedInput.addressLine1,
            normalizedInput.addressLine2,
            normalizedInput.city,
            normalizedInput.stateCode,
            normalizedInput.postalCode,
            normalizedInput.publicNotes,
            normalizedInput.isActive,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const locationId = assertInsertId(result, 'INVALID_LOCATION_INSERT_ID', 'Location')
    const createdRecord = await readLocationById(normalizedQueryable, locationId)

    if (!createdRecord) {
        throw createStorageError(
            'LOCATION_READ_AFTER_WRITE_FAILED',
            `Location was not readable after insert: ${locationId}`
        )
    }

    return createdRecord
}

/**
 * Read one location by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} locationId - Location id.
 * @returns {Promise<ReturnType<typeof mapLocationRow>|null>} Matching location or `null`.
 */
export async function getLocationById(queryable, locationId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedLocationId = assertPositiveInteger(
        locationId,
        'locationId',
        'INVALID_LOCATION_ID'
    )

    return readLocationById(normalizedQueryable, normalizedLocationId)
}

/**
 * List locations with active records first, then alphabetical by name.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @returns {Promise<Array<ReturnType<typeof mapLocationRow>>>} Locations.
 */
export async function listLocations(queryable) {
    const normalizedQueryable = assertQueryable(queryable)
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            location_id,
            slug,
            location_name,
            address_line_1,
            address_line_2,
            city,
            state_code,
            postal_code,
            public_notes,
            is_active,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_locations
        ORDER BY is_active DESC, location_name ASC, location_id ASC
        `
    )

    return normalizeRows(rows).map(mapLocationRow)
}

/**
 * Update one location row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} locationId - Location id.
 * @param {unknown} input - Partial location patch payload.
 * @returns {Promise<ReturnType<typeof mapLocationRow>>} Updated location.
 */
export async function updateLocationById(queryable, locationId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedLocationId = assertPositiveInteger(
        locationId,
        'locationId',
        'INVALID_LOCATION_ID'
    )
    const currentRecord = await readLocationById(normalizedQueryable, normalizedLocationId)

    if (!currentRecord) {
        throw createStorageError(
            'LOCATION_NOT_FOUND',
            `Location was not found: ${normalizedLocationId}`
        )
    }

    const normalizedInput = normalizeLocationInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_locations
        SET
            slug = ?,
            location_name = ?,
            address_line_1 = ?,
            address_line_2 = ?,
            city = ?,
            state_code = ?,
            postal_code = ?,
            public_notes = ?,
            is_active = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE location_id = ?
        `,
        [
            normalizedInput.slug,
            normalizedInput.locationName,
            normalizedInput.addressLine1,
            normalizedInput.addressLine2,
            normalizedInput.city,
            normalizedInput.stateCode,
            normalizedInput.postalCode,
            normalizedInput.publicNotes,
            normalizedInput.isActive,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedLocationId
        ]
    )
    assertAffectedRows(result, 'LOCATION_NOT_FOUND', 'Location')
    const updatedRecord = await readLocationById(normalizedQueryable, normalizedLocationId)

    if (!updatedRecord) {
        throw createStorageError(
            'LOCATION_READ_AFTER_WRITE_FAILED',
            `Location was not readable after update: ${normalizedLocationId}`
        )
    }

    return updatedRecord
}

/**
 * Insert one market group row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Market group payload.
 * @returns {Promise<ReturnType<typeof mapMarketGroupRow>>} Created market group.
 */
export async function insertMarketGroup(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeMarketGroupInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_market_groups (
            slug,
            group_name,
            summary,
            description,
            fee_mode,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.slug,
            normalizedInput.groupName,
            normalizedInput.summary,
            normalizedInput.description,
            normalizedInput.feeMode,
            normalizedInput.feeAmountCents,
            normalizedInput.isPublic,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const marketGroupId = assertInsertId(result, 'INVALID_MARKET_GROUP_INSERT_ID', 'Market group')
    const createdRecord = await readMarketGroupById(normalizedQueryable, marketGroupId)

    if (!createdRecord) {
        throw createStorageError(
            'MARKET_GROUP_READ_AFTER_WRITE_FAILED',
            `Market group was not readable after insert: ${marketGroupId}`
        )
    }

    return createdRecord
}

/**
 * Read one market group by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketGroupId - Market group id.
 * @returns {Promise<ReturnType<typeof mapMarketGroupRow>|null>} Matching market group or `null`.
 */
export async function getMarketGroupById(queryable, marketGroupId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketGroupId = assertPositiveInteger(
        marketGroupId,
        'marketGroupId',
        'INVALID_MARKET_GROUP_ID'
    )

    return readMarketGroupById(normalizedQueryable, normalizedMarketGroupId)
}

/**
 * List market groups in name order.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @returns {Promise<Array<ReturnType<typeof mapMarketGroupRow>>>} Market groups.
 */
export async function listMarketGroups(queryable) {
    const normalizedQueryable = assertQueryable(queryable)
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            market_group_id,
            slug,
            group_name,
            summary,
            description,
            fee_mode,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_market_groups
        ORDER BY group_name ASC, market_group_id ASC
        `
    )

    return normalizeRows(rows).map(mapMarketGroupRow)
}

/**
 * Update one market group row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketGroupId - Market group id.
 * @param {unknown} input - Partial market group patch payload.
 * @returns {Promise<ReturnType<typeof mapMarketGroupRow>>} Updated market group.
 */
export async function updateMarketGroupById(queryable, marketGroupId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketGroupId = assertPositiveInteger(
        marketGroupId,
        'marketGroupId',
        'INVALID_MARKET_GROUP_ID'
    )
    const currentRecord = await readMarketGroupById(normalizedQueryable, normalizedMarketGroupId)

    if (!currentRecord) {
        throw createStorageError(
            'MARKET_GROUP_NOT_FOUND',
            `Market group was not found: ${normalizedMarketGroupId}`
        )
    }

    const normalizedInput = normalizeMarketGroupInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_market_groups
        SET
            slug = ?,
            group_name = ?,
            summary = ?,
            description = ?,
            fee_mode = ?,
            fee_amount_cents = ?,
            is_public = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE market_group_id = ?
        `,
        [
            normalizedInput.slug,
            normalizedInput.groupName,
            normalizedInput.summary,
            normalizedInput.description,
            normalizedInput.feeMode,
            normalizedInput.feeAmountCents,
            normalizedInput.isPublic,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedMarketGroupId
        ]
    )
    assertAffectedRows(result, 'MARKET_GROUP_NOT_FOUND', 'Market group')
    const updatedRecord = await readMarketGroupById(normalizedQueryable, normalizedMarketGroupId)

    if (!updatedRecord) {
        throw createStorageError(
            'MARKET_GROUP_READ_AFTER_WRITE_FAILED',
            `Market group was not readable after update: ${normalizedMarketGroupId}`
        )
    }

    return updatedRecord
}

/**
 * Insert one market row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Market payload.
 * @returns {Promise<ReturnType<typeof mapMarketRow>>} Created market.
 */
export async function insertMarket(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeMarketInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_markets (
            market_group_id,
            location_id,
            slug,
            market_name,
            summary,
            description,
            starts_at,
            ends_at,
            applications_open,
            applications_open_at,
            applications_close_at,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.marketGroupId,
            normalizedInput.locationId,
            normalizedInput.slug,
            normalizedInput.marketName,
            normalizedInput.summary,
            normalizedInput.description,
            normalizedInput.startsAt,
            normalizedInput.endsAt,
            normalizedInput.applicationsOpen,
            normalizedInput.applicationsOpenAt,
            normalizedInput.applicationsCloseAt,
            normalizedInput.feeAmountCents,
            normalizedInput.isPublic,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const marketId = assertInsertId(result, 'INVALID_MARKET_INSERT_ID', 'Market')
    const createdRecord = await readMarketById(normalizedQueryable, marketId)

    if (!createdRecord) {
        throw createStorageError(
            'MARKET_READ_AFTER_WRITE_FAILED',
            `Market was not readable after insert: ${marketId}`
        )
    }

    return createdRecord
}

/**
 * Read one market by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketId - Market id.
 * @returns {Promise<ReturnType<typeof mapMarketRow>|null>} Matching market or `null`.
 */
export async function getMarketById(queryable, marketId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketId = assertPositiveInteger(marketId, 'marketId', 'INVALID_MARKET_ID')

    return readMarketById(normalizedQueryable, normalizedMarketId)
}

/**
 * List markets by parent market group id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketGroupId - Parent market group id.
 * @returns {Promise<Array<ReturnType<typeof mapMarketRow>>>} Markets.
 */
export async function listMarketsByMarketGroupId(queryable, marketGroupId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketGroupId = assertPositiveInteger(
        marketGroupId,
        'marketGroupId',
        'INVALID_MARKET_GROUP_ID'
    )
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            market_id,
            market_group_id,
            location_id,
            slug,
            market_name,
            summary,
            description,
            starts_at,
            ends_at,
            applications_open,
            applications_open_at,
            applications_close_at,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_markets
        WHERE market_group_id = ?
        ORDER BY starts_at ASC, market_id ASC
        `,
        [normalizedMarketGroupId]
    )

    return normalizeRows(rows).map(mapMarketRow)
}

/**
 * Update one market row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketId - Market id.
 * @param {unknown} input - Partial market patch payload.
 * @returns {Promise<ReturnType<typeof mapMarketRow>>} Updated market.
 */
export async function updateMarketById(queryable, marketId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketId = assertPositiveInteger(marketId, 'marketId', 'INVALID_MARKET_ID')
    const currentRecord = await readMarketById(normalizedQueryable, normalizedMarketId)

    if (!currentRecord) {
        throw createStorageError('MARKET_NOT_FOUND', `Market was not found: ${normalizedMarketId}`)
    }

    const normalizedInput = normalizeMarketInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_markets
        SET
            market_group_id = ?,
            location_id = ?,
            slug = ?,
            market_name = ?,
            summary = ?,
            description = ?,
            starts_at = ?,
            ends_at = ?,
            applications_open = ?,
            applications_open_at = ?,
            applications_close_at = ?,
            fee_amount_cents = ?,
            is_public = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE market_id = ?
        `,
        [
            normalizedInput.marketGroupId,
            normalizedInput.locationId,
            normalizedInput.slug,
            normalizedInput.marketName,
            normalizedInput.summary,
            normalizedInput.description,
            normalizedInput.startsAt,
            normalizedInput.endsAt,
            normalizedInput.applicationsOpen,
            normalizedInput.applicationsOpenAt,
            normalizedInput.applicationsCloseAt,
            normalizedInput.feeAmountCents,
            normalizedInput.isPublic,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedMarketId
        ]
    )
    assertAffectedRows(result, 'MARKET_NOT_FOUND', 'Market')
    const updatedRecord = await readMarketById(normalizedQueryable, normalizedMarketId)

    if (!updatedRecord) {
        throw createStorageError(
            'MARKET_READ_AFTER_WRITE_FAILED',
            `Market was not readable after update: ${normalizedMarketId}`
        )
    }

    return updatedRecord
}

/**
 * Insert one market booth offering row.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {unknown} input - Market booth offering payload.
 * @returns {Promise<ReturnType<typeof mapMarketBoothOfferingRow>>} Created booth offering.
 */
export async function insertMarketBoothOffering(queryable, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedInput = normalizeMarketBoothOfferingInput(input)
    const [result] = await normalizedQueryable.query(
        `
        INSERT INTO market_ops_market_booth_offerings (
            market_id,
            booth_type_id,
            booth_number,
            price_cents,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedInput.marketId,
            normalizedInput.boothTypeId,
            normalizedInput.boothNumber,
            normalizedInput.priceCents,
            normalizedInput.isActive,
            normalizedInput.sortOrder,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId
        ]
    )
    const marketBoothOfferingId = assertInsertId(
        result,
        'INVALID_MARKET_BOOTH_OFFERING_INSERT_ID',
        'Market booth offering'
    )
    const createdRecord = await readMarketBoothOfferingById(
        normalizedQueryable,
        marketBoothOfferingId
    )

    if (!createdRecord) {
        throw createStorageError(
            'MARKET_BOOTH_OFFERING_READ_AFTER_WRITE_FAILED',
            `Market booth offering was not readable after insert: ${marketBoothOfferingId}`
        )
    }

    return createdRecord
}

/**
 * Read one market booth offering by id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketBoothOfferingId - Market booth offering id.
 * @returns {Promise<ReturnType<typeof mapMarketBoothOfferingRow>|null>} Matching booth offering or `null`.
 */
export async function getMarketBoothOfferingById(queryable, marketBoothOfferingId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketBoothOfferingId = assertPositiveInteger(
        marketBoothOfferingId,
        'marketBoothOfferingId',
        'INVALID_MARKET_BOOTH_OFFERING_ID'
    )

    return readMarketBoothOfferingById(normalizedQueryable, normalizedMarketBoothOfferingId)
}

/**
 * List booth offerings by market id.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketId - Parent market id.
 * @returns {Promise<Array<ReturnType<typeof mapMarketBoothOfferingRow>>>} Market booth offerings.
 */
export async function listMarketBoothOfferingsByMarketId(queryable, marketId) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketId = assertPositiveInteger(marketId, 'marketId', 'INVALID_MARKET_ID')
    const [rows] = await normalizedQueryable.query(
        `
        SELECT
            market_booth_offering_id,
            market_id,
            booth_type_id,
            booth_number,
            price_cents,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        FROM market_ops_market_booth_offerings
        WHERE market_id = ?
        ORDER BY sort_order ASC, booth_number ASC, market_booth_offering_id ASC
        `,
        [normalizedMarketId]
    )

    return normalizeRows(rows).map(mapMarketBoothOfferingRow)
}

/**
 * Update one market booth offering row and return the normalized stored record.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
 * @param {number} marketBoothOfferingId - Market booth offering id.
 * @param {unknown} input - Partial booth offering patch payload.
 * @returns {Promise<ReturnType<typeof mapMarketBoothOfferingRow>>} Updated booth offering.
 */
export async function updateMarketBoothOfferingById(queryable, marketBoothOfferingId, input) {
    const normalizedQueryable = assertQueryable(queryable)
    const normalizedMarketBoothOfferingId = assertPositiveInteger(
        marketBoothOfferingId,
        'marketBoothOfferingId',
        'INVALID_MARKET_BOOTH_OFFERING_ID'
    )
    const currentRecord = await readMarketBoothOfferingById(
        normalizedQueryable,
        normalizedMarketBoothOfferingId
    )

    if (!currentRecord) {
        throw createStorageError(
            'MARKET_BOOTH_OFFERING_NOT_FOUND',
            `Market booth offering was not found: ${normalizedMarketBoothOfferingId}`
        )
    }

    const normalizedInput = normalizeMarketBoothOfferingInput(input, currentRecord)
    const [result] = await normalizedQueryable.query(
        `
        UPDATE market_ops_market_booth_offerings
        SET
            market_id = ?,
            booth_type_id = ?,
            booth_number = ?,
            price_cents = ?,
            is_active = ?,
            sort_order = ?,
            created_at = ?,
            created_by_user_id = ?,
            updated_at = ?,
            updated_by_user_id = ?
        WHERE market_booth_offering_id = ?
        `,
        [
            normalizedInput.marketId,
            normalizedInput.boothTypeId,
            normalizedInput.boothNumber,
            normalizedInput.priceCents,
            normalizedInput.isActive,
            normalizedInput.sortOrder,
            normalizedInput.createdAt,
            normalizedInput.createdByUserId,
            normalizedInput.updatedAt,
            normalizedInput.updatedByUserId,
            normalizedMarketBoothOfferingId
        ]
    )
    assertAffectedRows(result, 'MARKET_BOOTH_OFFERING_NOT_FOUND', 'Market booth offering')
    const updatedRecord = await readMarketBoothOfferingById(
        normalizedQueryable,
        normalizedMarketBoothOfferingId
    )

    if (!updatedRecord) {
        throw createStorageError(
            'MARKET_BOOTH_OFFERING_READ_AFTER_WRITE_FAILED',
            `Market booth offering was not readable after update: ${normalizedMarketBoothOfferingId}`
        )
    }

    return updatedRecord
}

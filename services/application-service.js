import {
    getMarketBoothOfferingById,
    getMarketById,
    getMarketGroupById,
    listMarketBoothOfferingsByMarketId,
    listMarketsByMarketGroupId
} from '../storage/market-storage.js'
import {
    deleteApplicationMarketSelectionsByVendorApplicationId,
    getVendorMarketApplicationById,
    insertApplicationMarketBoothPreference,
    insertApplicationMarketSelection,
    insertVendorMarketApplication,
    listApplicationMarketBoothPreferencesBySelectionId,
    listApplicationMarketSelectionsByVendorApplicationId,
    listVendorMarketApplicationsByVendorBusinessId,
    updateVendorMarketApplicationById
} from '../storage/application-storage.js'
import { getVendorBusinessById } from '../storage/vendor-business-storage.js'
import {
    assertArray,
    assertDatabase,
    assertNonEmptyString,
    assertPlainObject,
    assertPositiveInteger,
    assertUniqueIds,
    createServiceError,
    mapById,
    normalizeBooleanFlag,
    normalizeOptionalPositiveInteger
} from './service-helpers.js'

const APPLICATION_STATUSES = ['draft', 'submitted', 'withdrawn']

/**
 * Normalize one booth-preference input row.
 *
 * @param {unknown} input - Candidate booth-preference row.
 * @param {number} index - Source array index.
 * @returns {{ marketBoothOfferingId: number, preferenceRank: number }} Normalized preference row.
 */
function normalizeBoothPreferenceInput(input, index) {
    const normalizedInput = assertPlainObject(
        input,
        `boothPreferences[${index}]`,
        'INVALID_APPLICATION_MARKET_BOOTH_PREFERENCE_INPUT'
    )

    return {
        marketBoothOfferingId: assertPositiveInteger(
            normalizedInput.marketBoothOfferingId,
            `boothPreferences[${index}].marketBoothOfferingId`,
            'INVALID_MARKET_BOOTH_OFFERING_ID'
        ),
        preferenceRank:
            typeof normalizedInput.preferenceRank === 'undefined'
                ? index + 1
                : assertPositiveInteger(
                      normalizedInput.preferenceRank,
                      `boothPreferences[${index}].preferenceRank`,
                      'INVALID_APPLICATION_MARKET_BOOTH_PREFERENCE_RANK'
                  )
    }
}

/**
 * Normalize one draft selection input row.
 *
 * @param {unknown} input - Candidate selection input.
 * @param {number} index - Source array index.
 * @returns {{
 *   marketId: number,
 *   requestedBoothQuantity: number,
 *   willingToVolunteer: 0|1|null,
 *   boothPreferences: Array<{ marketBoothOfferingId: number, preferenceRank: number }>
 * }} Normalized draft selection.
 */
function normalizeDraftSelectionInput(input, index) {
    const normalizedInput = assertPlainObject(
        input,
        `selections[${index}]`,
        'INVALID_APPLICATION_MARKET_SELECTION_INPUT'
    )
    const boothPreferences =
        typeof normalizedInput.boothPreferences === 'undefined'
            ? []
            : assertArray(
                  normalizedInput.boothPreferences,
                  `selections[${index}].boothPreferences`,
                  'INVALID_APPLICATION_MARKET_BOOTH_PREFERENCES'
              ).map((preference, preferenceIndex) =>
                  normalizeBoothPreferenceInput(preference, preferenceIndex)
              )

    assertUniqueIds(
        boothPreferences.map((preference) => preference.preferenceRank),
        `selections[${index}].boothPreferences.preferenceRank`,
        'DUPLICATE_APPLICATION_MARKET_BOOTH_PREFERENCE_RANKS'
    )
    assertUniqueIds(
        boothPreferences.map((preference) => preference.marketBoothOfferingId),
        `selections[${index}].boothPreferences.marketBoothOfferingId`,
        'DUPLICATE_APPLICATION_MARKET_BOOTH_OFFERING_IDS'
    )

    let willingToVolunteer = null

    if (typeof normalizedInput.willingToVolunteer !== 'undefined') {
        willingToVolunteer =
            normalizedInput.willingToVolunteer == null
                ? null
                : normalizeBooleanFlag(
                      normalizedInput.willingToVolunteer,
                      `selections[${index}].willingToVolunteer`,
                      'INVALID_APPLICATION_MARKET_SELECTION_WILLING_TO_VOLUNTEER'
                  )
    }

    return {
        marketId: assertPositiveInteger(
            normalizedInput.marketId,
            `selections[${index}].marketId`,
            'INVALID_MARKET_ID'
        ),
        requestedBoothQuantity: assertPositiveInteger(
            normalizedInput.requestedBoothQuantity,
            `selections[${index}].requestedBoothQuantity`,
            'INVALID_APPLICATION_MARKET_SELECTION_REQUESTED_BOOTH_QUANTITY'
        ),
        willingToVolunteer,
        boothPreferences
    }
}

/**
 * Normalize one draft selection list.
 *
 * @param {unknown} input - Candidate selection list.
 * @returns {Array<ReturnType<typeof normalizeDraftSelectionInput>>} Normalized selections.
 */
function normalizeDraftSelections(input) {
    const selections = assertArray(
        input,
        'selections',
        'INVALID_APPLICATION_MARKET_SELECTIONS'
    ).map((selection, index) => normalizeDraftSelectionInput(selection, index))

    assertUniqueIds(
        selections.map((selection) => selection.marketId),
        'selections.marketId',
        'DUPLICATE_APPLICATION_MARKET_SELECTION_MARKET_IDS'
    )

    return selections
}

/**
 * Determine whether one market is currently accepting applications.
 *
 * @param {{
 *   applicationsOpen: number,
 *   applicationsOpenAt: number|null,
 *   applicationsCloseAt: number|null
 * }} market - Market row.
 * @param {number} now - Comparison timestamp.
 * @returns {boolean} `true` when the market currently accepts applications.
 */
function isMarketAcceptingApplications(market, now) {
    if (market.applicationsOpen !== 1) {
        return false
    }

    if (typeof market.applicationsOpenAt === 'number' && now < market.applicationsOpenAt) {
        return false
    }

    if (typeof market.applicationsCloseAt === 'number' && now > market.applicationsCloseAt) {
        return false
    }

    return true
}

/**
 * Calculate one application fee total from the parent group fee mode.
 *
 * @param {{ feeMode: string, feeAmountCents: number }} marketGroup - Parent market group.
 * @param {number} selectionCount - Selected market count.
 * @returns {{ feeModeSnapshot: string, feeTotalCents: number }} Calculated fee snapshot.
 */
function calculateApplicationFeeSnapshot(marketGroup, selectionCount) {
    switch (marketGroup.feeMode) {
        case 'none':
            return {
                feeModeSnapshot: 'none',
                feeTotalCents: 0
            }
        case 'per_group':
            return {
                feeModeSnapshot: 'per_group',
                feeTotalCents: marketGroup.feeAmountCents
            }
        case 'per_market':
            return {
                feeModeSnapshot: 'per_market',
                feeTotalCents: marketGroup.feeAmountCents * selectionCount
            }
        default:
            throw createServiceError(
                'INVALID_MARKET_GROUP_FEE_MODE',
                `Unsupported market group fee mode: ${marketGroup.feeMode}`
            )
    }
}

/**
 * Create one route-friendly application detail object.
 *
 * @param {{
 *   application: NonNullable<Awaited<ReturnType<typeof getVendorMarketApplicationById>>>,
 *   vendorBusiness: Awaited<ReturnType<typeof getVendorBusinessById>>,
 *   marketGroup: Awaited<ReturnType<typeof getMarketGroupById>>,
 *   selections: Awaited<ReturnType<typeof listApplicationMarketSelectionsByVendorApplicationId>>,
 *   marketsById: Map<number, Awaited<ReturnType<typeof getMarketById>>>,
 *   boothOfferingsById: Map<number, Awaited<ReturnType<typeof getMarketBoothOfferingById>>>,
 *   boothPreferencesBySelectionId: Map<number, Array<Awaited<ReturnType<typeof listApplicationMarketBoothPreferencesBySelectionId>>[number]>>
 * }} input - Detail parts.
 * @returns {{
 *   application: NonNullable<Awaited<ReturnType<typeof getVendorMarketApplicationById>>>,
 *   vendorBusiness: Awaited<ReturnType<typeof getVendorBusinessById>>,
 *   marketGroup: Awaited<ReturnType<typeof getMarketGroupById>>,
 *   selections: Array<
 *     Awaited<ReturnType<typeof listApplicationMarketSelectionsByVendorApplicationId>>[number] & {
 *       market: Awaited<ReturnType<typeof getMarketById>>|null,
 *       assignedMarketBoothOffering: Awaited<ReturnType<typeof getMarketBoothOfferingById>>|null,
 *       boothPreferences: Array<
 *         Awaited<ReturnType<typeof listApplicationMarketBoothPreferencesBySelectionId>>[number] & {
 *           marketBoothOffering: Awaited<ReturnType<typeof getMarketBoothOfferingById>>|null
 *         }
 *       >
 *     }
 *   >
 * }} Application detail.
 */
function buildApplicationDetail({
    application,
    vendorBusiness,
    marketGroup,
    selections,
    marketsById,
    boothOfferingsById,
    boothPreferencesBySelectionId
}) {
    return {
        application,
        vendorBusiness,
        marketGroup,
        selections: selections.map((selection) => ({
            ...selection,
            market: marketsById.get(selection.marketId) ?? null,
            assignedMarketBoothOffering:
                selection.assignedMarketBoothOfferingId == null
                    ? null
                    : (boothOfferingsById.get(selection.assignedMarketBoothOfferingId) ?? null),
            boothPreferences: (
                boothPreferencesBySelectionId.get(selection.applicationMarketSelectionId) ?? []
            ).map((preference) => ({
                ...preference,
                marketBoothOffering:
                    boothOfferingsById.get(preference.marketBoothOfferingId) ?? null
            }))
        }))
    }
}

const defaultDependencies = {
    getVendorBusinessById,
    getMarketGroupById,
    listMarketsByMarketGroupId,
    getMarketById,
    listMarketBoothOfferingsByMarketId,
    getMarketBoothOfferingById,
    insertVendorMarketApplication,
    getVendorMarketApplicationById,
    listVendorMarketApplicationsByVendorBusinessId,
    updateVendorMarketApplicationById,
    insertApplicationMarketSelection,
    listApplicationMarketSelectionsByVendorApplicationId,
    deleteApplicationMarketSelectionsByVendorApplicationId,
    insertApplicationMarketBoothPreference,
    listApplicationMarketBoothPreferencesBySelectionId
}

/**
 * Create one Market Ops application service.
 *
 * @param {{
 *   query: (sql: string, params?: unknown[]) => Promise<unknown>,
 *   withTransaction: <T>(work: (conn: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>) => Promise<T>
 * }} database - SDK database seam.
 * @param {Partial<typeof defaultDependencies>} [overrides] - Optional test overrides.
 * @returns {{
 *   createVendorMarketApplicationDraft: (input: {
 *     application: unknown,
 *     selections?: unknown[]
 *   }) => Promise<ReturnType<typeof buildApplicationDetail>>,
 *   getVendorMarketApplicationById: (vendorApplicationId: number) => Promise<Awaited<ReturnType<typeof getVendorMarketApplicationById>>>,
 *   getVendorMarketApplicationDetailById: (vendorApplicationId: number) => Promise<ReturnType<typeof buildApplicationDetail>>,
 *   listVendorMarketApplicationsByVendorBusinessId: (vendorBusinessId: number) => Promise<Awaited<ReturnType<typeof listVendorMarketApplicationsByVendorBusinessId>>>,
 *   updateVendorMarketApplicationDraft: (vendorApplicationId: number, input: {
 *     application?: unknown,
 *     selections?: unknown[]
 *   }) => Promise<ReturnType<typeof buildApplicationDetail>>,
 *   submitVendorMarketApplication: (vendorApplicationId: number, input?: {
 *     submittedAt?: number,
 *     submittedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildApplicationDetail>>,
 *   resubmitVendorMarketApplication: (vendorApplicationId: number, input?: {
 *     submittedAt?: number,
 *     submittedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildApplicationDetail>>,
 *   withdrawVendorMarketApplication: (vendorApplicationId: number, input?: {
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildApplicationDetail>>
 * }} Application service.
 */
export function createMarketOpsApplicationService(database, overrides = {}) {
    const normalizedDatabase = assertDatabase(database)
    const dependencies = {
        ...defaultDependencies,
        ...overrides
    }

    /**
     * Read one vendor business or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorBusinessId - Vendor business id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getVendorBusinessById>>>>} Matching vendor business.
     */
    async function requireVendorBusiness(queryable, vendorBusinessId) {
        const vendorBusiness = await dependencies.getVendorBusinessById(queryable, vendorBusinessId)

        if (!vendorBusiness) {
            throw createServiceError(
                'VENDOR_BUSINESS_NOT_FOUND',
                `Vendor business was not found: ${vendorBusinessId}`
            )
        }

        return vendorBusiness
    }

    /**
     * Read one approved vendor business or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorBusinessId - Vendor business id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getVendorBusinessById>>>>} Matching approved vendor business.
     */
    async function requireApprovedVendorBusiness(queryable, vendorBusinessId) {
        const vendorBusiness = await requireVendorBusiness(queryable, vendorBusinessId)

        if (vendorBusiness.approvalStatus !== 'approved') {
            throw createServiceError(
                'VENDOR_BUSINESS_NOT_APPROVED',
                `Vendor business must be approved before applying: ${vendorBusinessId}`
            )
        }

        return vendorBusiness
    }

    /**
     * Read one market group or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} marketGroupId - Market group id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getMarketGroupById>>>>} Matching market group.
     */
    async function requireMarketGroup(queryable, marketGroupId) {
        const marketGroup = await dependencies.getMarketGroupById(queryable, marketGroupId)

        if (!marketGroup) {
            throw createServiceError(
                'MARKET_GROUP_NOT_FOUND',
                `Market group was not found: ${marketGroupId}`
            )
        }

        return marketGroup
    }

    /**
     * Read one vendor application or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorApplicationId - Vendor application id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getVendorMarketApplicationById>>>>} Matching application.
     */
    async function requireVendorApplication(queryable, vendorApplicationId) {
        const application = await dependencies.getVendorMarketApplicationById(
            queryable,
            vendorApplicationId
        )

        if (!application) {
            throw createServiceError(
                'VENDOR_MARKET_APPLICATION_NOT_FOUND',
                `Vendor market application was not found: ${vendorApplicationId}`
            )
        }

        return application
    }

    /**
     * Load one route-friendly application detail payload.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorApplicationId - Vendor application id.
     * @returns {Promise<ReturnType<typeof buildApplicationDetail>>} Enriched application detail.
     */
    async function loadApplicationDetail(queryable, vendorApplicationId) {
        const application = await requireVendorApplication(queryable, vendorApplicationId)
        const [vendorBusiness, marketGroup, selections] = await Promise.all([
            dependencies.getVendorBusinessById(queryable, application.vendorBusinessId),
            dependencies.getMarketGroupById(queryable, application.marketGroupId),
            dependencies.listApplicationMarketSelectionsByVendorApplicationId(
                queryable,
                vendorApplicationId
            )
        ])
        const markets = await Promise.all(
            selections.map((selection) => dependencies.getMarketById(queryable, selection.marketId))
        )
        const assignedOfferingIds = selections
            .map((selection) => selection.assignedMarketBoothOfferingId)
            .filter((offeringId) => typeof offeringId === 'number')
        const marketBoothOfferings = await Promise.all(
            Array.from(new Set(assignedOfferingIds)).map((offeringId) =>
                dependencies.getMarketBoothOfferingById(queryable, offeringId)
            )
        )
        const boothPreferencesLists = await Promise.all(
            selections.map((selection) =>
                dependencies.listApplicationMarketBoothPreferencesBySelectionId(
                    queryable,
                    selection.applicationMarketSelectionId
                )
            )
        )
        const boothPreferenceOfferingIds = boothPreferencesLists
            .flat()
            .map((preference) => preference.marketBoothOfferingId)
        const allOfferingIds = Array.from(
            new Set([...assignedOfferingIds, ...boothPreferenceOfferingIds])
        )
        const allOfferings = await Promise.all(
            allOfferingIds.map((offeringId) =>
                dependencies.getMarketBoothOfferingById(queryable, offeringId)
            )
        )

        return buildApplicationDetail({
            application,
            vendorBusiness,
            marketGroup,
            selections,
            marketsById: mapById(markets.filter(Boolean), (market) => market.marketId),
            boothOfferingsById: mapById(
                [...marketBoothOfferings, ...allOfferings].filter(Boolean),
                (offering) => offering.marketBoothOfferingId
            ),
            boothPreferencesBySelectionId: new Map(
                selections.map((selection, index) => [
                    selection.applicationMarketSelectionId,
                    boothPreferencesLists[index]
                ])
            )
        })
    }

    /**
     * Validate one draft selection set against the current market group state.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} marketGroupId - Market group id.
     * @param {unknown} selections - Candidate draft selection list.
     * @param {{ enforceOpenMarkets?: boolean, now?: number }} [options] - Optional validation flags.
     * @returns {Promise<Array<ReturnType<typeof normalizeDraftSelectionInput>>>} Validated draft selections.
     */
    async function normalizeValidatedSelections(
        queryable,
        marketGroupId,
        selections,
        { enforceOpenMarkets = false, now = Date.now() } = {}
    ) {
        const normalizedSelections = normalizeDraftSelections(selections)
        const markets = await dependencies.listMarketsByMarketGroupId(queryable, marketGroupId)
        const marketsById = mapById(markets, (market) => market.marketId)

        await Promise.all(
            normalizedSelections.map(async (selection) => {
                const market = marketsById.get(selection.marketId)

                if (!market) {
                    throw createServiceError(
                        'MARKET_NOT_IN_GROUP',
                        `Selected market does not belong to market group: ${selection.marketId}`
                    )
                }

                if (enforceOpenMarkets && !isMarketAcceptingApplications(market, now)) {
                    throw createServiceError(
                        'MARKET_APPLICATIONS_CLOSED',
                        `Market is not accepting applications: ${selection.marketId}`
                    )
                }

                const boothOfferings = await dependencies.listMarketBoothOfferingsByMarketId(
                    queryable,
                    selection.marketId
                )
                const boothOfferingsById = mapById(
                    boothOfferings,
                    (offering) => offering.marketBoothOfferingId
                )

                for (const preference of selection.boothPreferences) {
                    if (!boothOfferingsById.has(preference.marketBoothOfferingId)) {
                        throw createServiceError(
                            'MARKET_BOOTH_OFFERING_NOT_IN_MARKET',
                            `Booth offering does not belong to selected market: ${preference.marketBoothOfferingId}`
                        )
                    }
                }
            })
        )

        return normalizedSelections
    }

    /**
     * Replace all child selection rows and booth preferences for one application.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorApplicationId - Vendor application id.
     * @param {number} marketGroupId - Parent market group id.
     * @param {unknown} selections - Candidate draft selections.
     * @returns {Promise<Array<ReturnType<typeof normalizeDraftSelectionInput>>>} Validated draft selections.
     */
    async function replaceSelections(queryable, vendorApplicationId, marketGroupId, selections) {
        const validatedSelections = await normalizeValidatedSelections(
            queryable,
            marketGroupId,
            selections
        )

        await dependencies.deleteApplicationMarketSelectionsByVendorApplicationId(
            queryable,
            vendorApplicationId
        )

        for (const selection of validatedSelections) {
            const insertedSelection = await dependencies.insertApplicationMarketSelection(
                queryable,
                {
                    vendorApplicationId,
                    marketId: selection.marketId,
                    selectionStatus: 'requested',
                    requestedBoothQuantity: selection.requestedBoothQuantity,
                    assignedBoothQuantity: null,
                    assignedMarketBoothOfferingId: null,
                    boothFeeTotalCents: 0,
                    willingToVolunteer: selection.willingToVolunteer,
                    decisionNotes: null,
                    decidedAt: null,
                    decidedByUserId: null
                }
            )

            for (const preference of selection.boothPreferences) {
                await dependencies.insertApplicationMarketBoothPreference(queryable, {
                    applicationMarketSelectionId: insertedSelection.applicationMarketSelectionId,
                    preferenceRank: preference.preferenceRank,
                    marketBoothOfferingId: preference.marketBoothOfferingId
                })
            }
        }

        return validatedSelections
    }

    return {
        async createVendorMarketApplicationDraft(input) {
            const normalizedInput = assertPlainObject(
                input,
                'input',
                'INVALID_VENDOR_MARKET_APPLICATION_CREATE_INPUT'
            )
            const applicationInput = assertPlainObject(
                normalizedInput.application,
                'input.application',
                'INVALID_VENDOR_MARKET_APPLICATION_INPUT'
            )
            const vendorBusinessId = assertPositiveInteger(
                applicationInput.vendorBusinessId,
                'input.application.vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )
            const marketGroupId = assertPositiveInteger(
                applicationInput.marketGroupId,
                'input.application.marketGroupId',
                'INVALID_MARKET_GROUP_ID'
            )
            const applicationKey = assertNonEmptyString(
                applicationInput.applicationKey,
                'input.application.applicationKey',
                'INVALID_VENDOR_MARKET_APPLICATION_KEY'
            )
            const selections =
                typeof normalizedInput.selections === 'undefined' ? [] : normalizedInput.selections

            return normalizedDatabase.withTransaction(async (conn) => {
                const [vendorBusiness, marketGroup] = await Promise.all([
                    requireApprovedVendorBusiness(conn, vendorBusinessId),
                    requireMarketGroup(conn, marketGroupId)
                ])
                const validatedSelections = await normalizeValidatedSelections(
                    conn,
                    marketGroup.marketGroupId,
                    selections
                )
                const feeSnapshot = calculateApplicationFeeSnapshot(
                    marketGroup,
                    validatedSelections.length
                )
                const createdApplication = await dependencies.insertVendorMarketApplication(conn, {
                    ...applicationInput,
                    vendorBusinessId: vendorBusiness.vendorBusinessId,
                    marketGroupId: marketGroup.marketGroupId,
                    applicationKey,
                    status: 'draft',
                    feeModeSnapshot: feeSnapshot.feeModeSnapshot,
                    feeTotalCents: feeSnapshot.feeTotalCents,
                    submittedAt: null,
                    submittedByUserId: null
                })

                await replaceSelections(
                    conn,
                    createdApplication.vendorApplicationId,
                    marketGroup.marketGroupId,
                    validatedSelections
                )

                return loadApplicationDetail(conn, createdApplication.vendorApplicationId)
            })
        },

        async getVendorMarketApplicationById(vendorApplicationId) {
            const normalizedVendorApplicationId = assertPositiveInteger(
                vendorApplicationId,
                'vendorApplicationId',
                'INVALID_VENDOR_APPLICATION_ID'
            )

            return dependencies.getVendorMarketApplicationById(
                normalizedDatabase,
                normalizedVendorApplicationId
            )
        },

        async getVendorMarketApplicationDetailById(vendorApplicationId) {
            const normalizedVendorApplicationId = assertPositiveInteger(
                vendorApplicationId,
                'vendorApplicationId',
                'INVALID_VENDOR_APPLICATION_ID'
            )

            return loadApplicationDetail(normalizedDatabase, normalizedVendorApplicationId)
        },

        async listVendorMarketApplicationsByVendorBusinessId(vendorBusinessId) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )

            return dependencies.listVendorMarketApplicationsByVendorBusinessId(
                normalizedDatabase,
                normalizedVendorBusinessId
            )
        },

        async updateVendorMarketApplicationDraft(vendorApplicationId, input) {
            const normalizedVendorApplicationId = assertPositiveInteger(
                vendorApplicationId,
                'vendorApplicationId',
                'INVALID_VENDOR_APPLICATION_ID'
            )
            const normalizedInput = assertPlainObject(
                input,
                'input',
                'INVALID_VENDOR_MARKET_APPLICATION_UPDATE_INPUT'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                const currentApplication = await requireVendorApplication(
                    conn,
                    normalizedVendorApplicationId
                )

                if (currentApplication.status !== 'draft') {
                    throw createServiceError(
                        'VENDOR_MARKET_APPLICATION_NOT_DRAFT',
                        `Only draft applications can be edited: ${normalizedVendorApplicationId}`
                    )
                }

                const [vendorBusiness, marketGroup] = await Promise.all([
                    requireApprovedVendorBusiness(conn, currentApplication.vendorBusinessId),
                    requireMarketGroup(conn, currentApplication.marketGroupId)
                ])

                if (typeof normalizedInput.application !== 'undefined') {
                    const applicationPatch = assertPlainObject(
                        normalizedInput.application,
                        'input.application',
                        'INVALID_VENDOR_MARKET_APPLICATION_INPUT'
                    )

                    if (
                        typeof applicationPatch.vendorBusinessId !== 'undefined' &&
                        applicationPatch.vendorBusinessId !== vendorBusiness.vendorBusinessId
                    ) {
                        throw createServiceError(
                            'IMMUTABLE_VENDOR_APPLICATION_VENDOR_BUSINESS_ID',
                            'Draft applications cannot be moved to another vendor business'
                        )
                    }

                    if (
                        typeof applicationPatch.marketGroupId !== 'undefined' &&
                        applicationPatch.marketGroupId !== marketGroup.marketGroupId
                    ) {
                        throw createServiceError(
                            'IMMUTABLE_VENDOR_APPLICATION_MARKET_GROUP_ID',
                            'Draft applications cannot be moved to another market group'
                        )
                    }

                    if (
                        typeof applicationPatch.applicationKey !== 'undefined' &&
                        applicationPatch.applicationKey !== currentApplication.applicationKey
                    ) {
                        throw createServiceError(
                            'IMMUTABLE_VENDOR_APPLICATION_KEY',
                            'Draft applications cannot change applicationKey after creation'
                        )
                    }
                }

                const selections =
                    typeof normalizedInput.selections === 'undefined'
                        ? await dependencies.listApplicationMarketSelectionsByVendorApplicationId(
                              conn,
                              normalizedVendorApplicationId
                          )
                        : normalizedInput.selections
                const validatedSelections =
                    typeof normalizedInput.selections === 'undefined'
                        ? selections.map((selection) => ({
                              marketId: selection.marketId,
                              requestedBoothQuantity: selection.requestedBoothQuantity,
                              willingToVolunteer: selection.willingToVolunteer,
                              boothPreferences: []
                          }))
                        : await normalizeValidatedSelections(
                              conn,
                              marketGroup.marketGroupId,
                              selections
                          )
                const feeSnapshot = calculateApplicationFeeSnapshot(
                    marketGroup,
                    validatedSelections.length
                )

                await dependencies.updateVendorMarketApplicationById(
                    conn,
                    normalizedVendorApplicationId,
                    {
                        ...(typeof normalizedInput.application === 'undefined'
                            ? {}
                            : normalizedInput.application),
                        feeModeSnapshot: feeSnapshot.feeModeSnapshot,
                        feeTotalCents: feeSnapshot.feeTotalCents
                    }
                )

                if (typeof normalizedInput.selections !== 'undefined') {
                    await replaceSelections(
                        conn,
                        normalizedVendorApplicationId,
                        marketGroup.marketGroupId,
                        normalizedInput.selections
                    )
                }

                return loadApplicationDetail(conn, normalizedVendorApplicationId)
            })
        },

        async submitVendorMarketApplication(vendorApplicationId, input = {}) {
            const normalizedVendorApplicationId = assertPositiveInteger(
                vendorApplicationId,
                'vendorApplicationId',
                'INVALID_VENDOR_APPLICATION_ID'
            )
            const submittedAt =
                typeof input.submittedAt === 'undefined'
                    ? Date.now()
                    : assertPositiveInteger(
                          input.submittedAt,
                          'submittedAt',
                          'INVALID_VENDOR_MARKET_APPLICATION_SUBMITTED_AT'
                      )
            const submittedByUserId = normalizeOptionalPositiveInteger(
                input.submittedByUserId,
                'submittedByUserId',
                'INVALID_VENDOR_MARKET_APPLICATION_SUBMITTED_BY_USER_ID'
            )
            const updatedByUserId = normalizeOptionalPositiveInteger(
                input.updatedByUserId,
                'updatedByUserId',
                'INVALID_VENDOR_MARKET_APPLICATION_UPDATED_BY_USER_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                const currentApplication = await requireVendorApplication(
                    conn,
                    normalizedVendorApplicationId
                )

                if (currentApplication.status !== 'draft') {
                    throw createServiceError(
                        'VENDOR_MARKET_APPLICATION_NOT_DRAFT',
                        `Only draft applications can be submitted: ${normalizedVendorApplicationId}`
                    )
                }

                const [vendorBusiness, marketGroup] = await Promise.all([
                    requireApprovedVendorBusiness(conn, currentApplication.vendorBusinessId),
                    requireMarketGroup(conn, currentApplication.marketGroupId)
                ])
                const currentSelections =
                    await dependencies.listApplicationMarketSelectionsByVendorApplicationId(
                        conn,
                        normalizedVendorApplicationId
                    )

                if (currentSelections.length === 0) {
                    throw createServiceError(
                        'VENDOR_MARKET_APPLICATION_HAS_NO_SELECTIONS',
                        `Vendor market application must select at least one market before submission: ${normalizedVendorApplicationId}`
                    )
                }

                const draftSelections = await Promise.all(
                    currentSelections.map(async (selection) => ({
                        marketId: selection.marketId,
                        requestedBoothQuantity: selection.requestedBoothQuantity,
                        willingToVolunteer: selection.willingToVolunteer,
                        boothPreferences: (
                            await dependencies.listApplicationMarketBoothPreferencesBySelectionId(
                                conn,
                                selection.applicationMarketSelectionId
                            )
                        ).map((preference) => ({
                            marketBoothOfferingId: preference.marketBoothOfferingId,
                            preferenceRank: preference.preferenceRank
                        }))
                    }))
                )

                await normalizeValidatedSelections(
                    conn,
                    marketGroup.marketGroupId,
                    draftSelections,
                    {
                        enforceOpenMarkets: true,
                        now: submittedAt
                    }
                )

                const feeSnapshot = calculateApplicationFeeSnapshot(
                    marketGroup,
                    currentSelections.length
                )

                await dependencies.updateVendorMarketApplicationById(
                    conn,
                    normalizedVendorApplicationId,
                    {
                        vendorBusinessId: vendorBusiness.vendorBusinessId,
                        marketGroupId: marketGroup.marketGroupId,
                        applicationKey: currentApplication.applicationKey,
                        status: 'submitted',
                        feeModeSnapshot: feeSnapshot.feeModeSnapshot,
                        feeTotalCents: feeSnapshot.feeTotalCents,
                        submittedAt,
                        submittedByUserId,
                        updatedByUserId
                    }
                )

                return loadApplicationDetail(conn, normalizedVendorApplicationId)
            })
        },

        async resubmitVendorMarketApplication(vendorApplicationId, input = {}) {
            const normalizedVendorApplicationId = assertPositiveInteger(
                vendorApplicationId,
                'vendorApplicationId',
                'INVALID_VENDOR_APPLICATION_ID'
            )
            const submittedAt =
                typeof input.submittedAt === 'undefined'
                    ? Date.now()
                    : assertPositiveInteger(
                          input.submittedAt,
                          'submittedAt',
                          'INVALID_VENDOR_MARKET_APPLICATION_SUBMITTED_AT'
                      )
            const submittedByUserId = normalizeOptionalPositiveInteger(
                input.submittedByUserId,
                'submittedByUserId',
                'INVALID_VENDOR_MARKET_APPLICATION_SUBMITTED_BY_USER_ID'
            )
            const updatedByUserId = normalizeOptionalPositiveInteger(
                input.updatedByUserId,
                'updatedByUserId',
                'INVALID_VENDOR_MARKET_APPLICATION_UPDATED_BY_USER_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                const currentApplication = await requireVendorApplication(
                    conn,
                    normalizedVendorApplicationId
                )

                if (currentApplication.status !== 'withdrawn') {
                    throw createServiceError(
                        'VENDOR_MARKET_APPLICATION_NOT_WITHDRAWN',
                        `Only withdrawn applications can be resubmitted: ${normalizedVendorApplicationId}`
                    )
                }

                const [vendorBusiness, currentSelections] = await Promise.all([
                    requireApprovedVendorBusiness(conn, currentApplication.vendorBusinessId),
                    dependencies.listApplicationMarketSelectionsByVendorApplicationId(
                        conn,
                        normalizedVendorApplicationId
                    )
                ])

                if (currentSelections.length === 0) {
                    throw createServiceError(
                        'VENDOR_MARKET_APPLICATION_HAS_NO_SELECTIONS',
                        `Vendor market application must select at least one market before resubmission: ${normalizedVendorApplicationId}`
                    )
                }

                await dependencies.updateVendorMarketApplicationById(
                    conn,
                    normalizedVendorApplicationId,
                    {
                        vendorBusinessId: vendorBusiness.vendorBusinessId,
                        marketGroupId: currentApplication.marketGroupId,
                        applicationKey: currentApplication.applicationKey,
                        status: 'submitted',
                        feeModeSnapshot: currentApplication.feeModeSnapshot,
                        feeTotalCents: currentApplication.feeTotalCents,
                        submittedAt,
                        submittedByUserId,
                        updatedByUserId
                    }
                )

                return loadApplicationDetail(conn, normalizedVendorApplicationId)
            })
        },

        async withdrawVendorMarketApplication(vendorApplicationId, input = {}) {
            const normalizedVendorApplicationId = assertPositiveInteger(
                vendorApplicationId,
                'vendorApplicationId',
                'INVALID_VENDOR_APPLICATION_ID'
            )
            const updatedByUserId = normalizeOptionalPositiveInteger(
                input.updatedByUserId,
                'updatedByUserId',
                'INVALID_VENDOR_MARKET_APPLICATION_UPDATED_BY_USER_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                const currentApplication = await requireVendorApplication(
                    conn,
                    normalizedVendorApplicationId
                )

                if (!APPLICATION_STATUSES.includes(currentApplication.status)) {
                    throw createServiceError(
                        'INVALID_VENDOR_MARKET_APPLICATION_STATUS',
                        `Vendor market application has unsupported status: ${currentApplication.status}`
                    )
                }

                if (currentApplication.status !== 'submitted') {
                    throw createServiceError(
                        'VENDOR_MARKET_APPLICATION_NOT_SUBMITTED',
                        `Only submitted applications can be withdrawn: ${normalizedVendorApplicationId}`
                    )
                }

                const currentSelections =
                    await dependencies.listApplicationMarketSelectionsByVendorApplicationId(
                        conn,
                        normalizedVendorApplicationId
                    )

                if (
                    currentSelections.some((selection) => selection.selectionStatus !== 'requested')
                ) {
                    throw createServiceError(
                        'VENDOR_MARKET_APPLICATION_REVIEW_ALREADY_STARTED',
                        `Reviewed applications can no longer be withdrawn: ${normalizedVendorApplicationId}`
                    )
                }

                await dependencies.updateVendorMarketApplicationById(
                    conn,
                    normalizedVendorApplicationId,
                    {
                        status: 'withdrawn',
                        updatedByUserId
                    }
                )

                return loadApplicationDetail(conn, normalizedVendorApplicationId)
            })
        }
    }
}

export default createMarketOpsApplicationService

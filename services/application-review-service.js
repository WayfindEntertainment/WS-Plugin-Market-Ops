import {
    getApplicationMarketSelectionById,
    getVendorMarketApplicationById,
    listApplicationMarketBoothPreferencesBySelectionId,
    listApplicationMarketSelectionsByVendorApplicationId,
    updateApplicationMarketSelectionById
} from '../storage/application-storage.js'
import {
    getMarketBoothOfferingById,
    getMarketById,
    getMarketGroupById
} from '../storage/market-storage.js'
import { getVendorBusinessById } from '../storage/vendor-business-storage.js'
import {
    assertDatabase,
    assertNonNegativeInteger,
    assertPositiveInteger,
    createServiceError,
    mapById,
    normalizeOptionalPositiveInteger,
    normalizeOptionalString
} from './service-helpers.js'

const REVIEWABLE_SELECTION_STATUSES = [
    'requested',
    'approved',
    'waitlisted',
    'rejected',
    'withdrawn'
]

/**
 * Create one route-friendly application review detail object.
 *
 * @param {{
 *   application: NonNullable<Awaited<ReturnType<typeof getVendorMarketApplicationById>>>,
 *   vendorBusiness: Awaited<ReturnType<typeof getVendorBusinessById>>,
 *   marketGroup: Awaited<ReturnType<typeof getMarketGroupById>>,
 *   selections: Awaited<ReturnType<typeof listApplicationMarketSelectionsByVendorApplicationId>>,
 *   marketsById: Map<number, Awaited<ReturnType<typeof getMarketById>>>,
 *   boothOfferingsById: Map<number, Awaited<ReturnType<typeof getMarketBoothOfferingById>>>,
 *   boothPreferencesBySelectionId: Map<number, Array<Awaited<ReturnType<typeof listApplicationMarketBoothPreferencesBySelectionId>>[number]>>
 * }} input - Review detail parts.
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
 * }} Review detail object.
 */
function buildReviewDetail({
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
    getMarketById,
    getMarketBoothOfferingById,
    getVendorMarketApplicationById,
    getApplicationMarketSelectionById,
    listApplicationMarketSelectionsByVendorApplicationId,
    listApplicationMarketBoothPreferencesBySelectionId,
    updateApplicationMarketSelectionById
}

/**
 * Create one Market Ops application review service.
 *
 * @param {{
 *   query: (sql: string, params?: unknown[]) => Promise<unknown>,
 *   withTransaction: <T>(work: (conn: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>) => Promise<T>
 * }} database - SDK database seam.
 * @param {Partial<typeof defaultDependencies>} [overrides] - Optional test overrides.
 * @returns {{
 *   getVendorMarketApplicationReviewById: (vendorApplicationId: number) => Promise<ReturnType<typeof buildReviewDetail>>,
 *   approveApplicationMarketSelection: (applicationMarketSelectionId: number, input: {
 *     assignedMarketBoothOfferingId: number,
 *     assignedBoothQuantity: number,
 *     boothFeeTotalCents: number,
 *     decisionNotes?: unknown,
 *     decidedAt?: number,
 *     decidedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildReviewDetail>>,
 *   waitlistApplicationMarketSelection: (applicationMarketSelectionId: number, input?: {
 *     decisionNotes?: unknown,
 *     decidedAt?: number,
 *     decidedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildReviewDetail>>,
 *   rejectApplicationMarketSelection: (applicationMarketSelectionId: number, input?: {
 *     decisionNotes?: unknown,
 *     decidedAt?: number,
 *     decidedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildReviewDetail>>,
 *   withdrawApplicationMarketSelection: (applicationMarketSelectionId: number, input?: {
 *     decisionNotes?: unknown,
 *     decidedAt?: number,
 *     decidedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildReviewDetail>>
 * }} Application review service.
 */
export function createMarketOpsApplicationReviewService(database, overrides = {}) {
    const normalizedDatabase = assertDatabase(database)
    const dependencies = {
        ...defaultDependencies,
        ...overrides
    }

    /**
     * Read one vendor application or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorApplicationId - Vendor application id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getVendorMarketApplicationById>>>>} Matching vendor application.
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
     * Read one application market selection or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} applicationMarketSelectionId - Application market selection id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getApplicationMarketSelectionById>>>>} Matching selection.
     */
    async function requireSelection(queryable, applicationMarketSelectionId) {
        const selection = await dependencies.getApplicationMarketSelectionById(
            queryable,
            applicationMarketSelectionId
        )

        if (!selection) {
            throw createServiceError(
                'APPLICATION_MARKET_SELECTION_NOT_FOUND',
                `Application market selection was not found: ${applicationMarketSelectionId}`
            )
        }

        if (!REVIEWABLE_SELECTION_STATUSES.includes(selection.selectionStatus)) {
            throw createServiceError(
                'INVALID_APPLICATION_MARKET_SELECTION_STATUS',
                `Application market selection has unsupported status: ${selection.selectionStatus}`
            )
        }

        return selection
    }

    /**
     * Read one market or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} marketId - Market id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getMarketById>>>>} Matching market.
     */
    async function requireMarket(queryable, marketId) {
        const market = await dependencies.getMarketById(queryable, marketId)

        if (!market) {
            throw createServiceError('MARKET_NOT_FOUND', `Market was not found: ${marketId}`)
        }

        return market
    }

    /**
     * Read one market booth offering or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} marketBoothOfferingId - Market booth offering id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getMarketBoothOfferingById>>>>} Matching booth offering.
     */
    async function requireBoothOffering(queryable, marketBoothOfferingId) {
        const boothOffering = await dependencies.getMarketBoothOfferingById(
            queryable,
            marketBoothOfferingId
        )

        if (!boothOffering) {
            throw createServiceError(
                'MARKET_BOOTH_OFFERING_NOT_FOUND',
                `Market booth offering was not found: ${marketBoothOfferingId}`
            )
        }

        return boothOffering
    }

    /**
     * Load one route-friendly review detail payload for one application.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorApplicationId - Vendor application id.
     * @returns {Promise<ReturnType<typeof buildReviewDetail>>} Enriched application review detail.
     */
    async function loadReviewDetail(queryable, vendorApplicationId) {
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
        const boothPreferencesLists = await Promise.all(
            selections.map((selection) =>
                dependencies.listApplicationMarketBoothPreferencesBySelectionId(
                    queryable,
                    selection.applicationMarketSelectionId
                )
            )
        )
        const offeringIds = Array.from(
            new Set(
                selections
                    .map((selection) => selection.assignedMarketBoothOfferingId)
                    .filter((offeringId) => typeof offeringId === 'number')
                    .concat(
                        boothPreferencesLists
                            .flat()
                            .map((preference) => preference.marketBoothOfferingId)
                    )
            )
        )
        const boothOfferings = await Promise.all(
            offeringIds.map((offeringId) =>
                dependencies.getMarketBoothOfferingById(queryable, offeringId)
            )
        )

        return buildReviewDetail({
            application,
            vendorBusiness,
            marketGroup,
            selections,
            marketsById: mapById(markets.filter(Boolean), (market) => market.marketId),
            boothOfferingsById: mapById(
                boothOfferings.filter(Boolean),
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
     * Persist one selection decision patch, then return the parent review detail.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} applicationMarketSelectionId - Application market selection id.
     * @param {Record<string, unknown>} patch - Selection patch payload.
     * @returns {Promise<ReturnType<typeof buildReviewDetail>>} Updated application review detail.
     */
    async function updateSelectionDecision(queryable, applicationMarketSelectionId, patch) {
        const currentSelection = await requireSelection(queryable, applicationMarketSelectionId)

        await dependencies.updateApplicationMarketSelectionById(
            queryable,
            applicationMarketSelectionId,
            {
                ...patch,
                updatedByUserId:
                    typeof patch.updatedByUserId === 'undefined'
                        ? currentSelection.updatedByUserId
                        : patch.updatedByUserId
            }
        )

        return loadReviewDetail(queryable, currentSelection.vendorApplicationId)
    }

    return {
        async getVendorMarketApplicationReviewById(vendorApplicationId) {
            const normalizedVendorApplicationId = assertPositiveInteger(
                vendorApplicationId,
                'vendorApplicationId',
                'INVALID_VENDOR_APPLICATION_ID'
            )

            return loadReviewDetail(normalizedDatabase, normalizedVendorApplicationId)
        },

        async approveApplicationMarketSelection(applicationMarketSelectionId, input) {
            const normalizedSelectionId = assertPositiveInteger(
                applicationMarketSelectionId,
                'applicationMarketSelectionId',
                'INVALID_APPLICATION_MARKET_SELECTION_ID'
            )
            const assignedMarketBoothOfferingId = assertPositiveInteger(
                input?.assignedMarketBoothOfferingId,
                'assignedMarketBoothOfferingId',
                'INVALID_MARKET_BOOTH_OFFERING_ID'
            )
            const assignedBoothQuantity = assertPositiveInteger(
                input?.assignedBoothQuantity,
                'assignedBoothQuantity',
                'INVALID_APPLICATION_MARKET_SELECTION_ASSIGNED_BOOTH_QUANTITY'
            )
            const boothFeeTotalCents = assertNonNegativeInteger(
                input?.boothFeeTotalCents,
                'boothFeeTotalCents',
                'INVALID_APPLICATION_MARKET_SELECTION_BOOTH_FEE_TOTAL_CENTS'
            )
            const decidedAt =
                typeof input?.decidedAt === 'undefined'
                    ? Date.now()
                    : assertPositiveInteger(
                          input.decidedAt,
                          'decidedAt',
                          'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_AT'
                      )
            const decidedByUserId = normalizeOptionalPositiveInteger(
                input?.decidedByUserId,
                'decidedByUserId',
                'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_BY_USER_ID'
            )
            const updatedByUserId = normalizeOptionalPositiveInteger(
                input?.updatedByUserId,
                'updatedByUserId',
                'INVALID_APPLICATION_MARKET_SELECTION_UPDATED_BY_USER_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                const currentSelection = await requireSelection(conn, normalizedSelectionId)
                const [market, boothOffering] = await Promise.all([
                    requireMarket(conn, currentSelection.marketId),
                    requireBoothOffering(conn, assignedMarketBoothOfferingId)
                ])

                if (boothOffering.marketId !== market.marketId) {
                    throw createServiceError(
                        'MARKET_BOOTH_OFFERING_NOT_IN_MARKET',
                        `Assigned booth offering does not belong to selected market: ${assignedMarketBoothOfferingId}`
                    )
                }

                return updateSelectionDecision(conn, normalizedSelectionId, {
                    selectionStatus: 'approved',
                    assignedMarketBoothOfferingId,
                    assignedBoothQuantity,
                    boothFeeTotalCents,
                    decisionNotes: normalizeOptionalString(
                        input?.decisionNotes,
                        'decisionNotes',
                        'INVALID_APPLICATION_MARKET_SELECTION_DECISION_NOTES'
                    ),
                    decidedAt,
                    decidedByUserId,
                    updatedByUserId
                })
            })
        },

        async waitlistApplicationMarketSelection(applicationMarketSelectionId, input = {}) {
            const normalizedSelectionId = assertPositiveInteger(
                applicationMarketSelectionId,
                'applicationMarketSelectionId',
                'INVALID_APPLICATION_MARKET_SELECTION_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) =>
                updateSelectionDecision(conn, normalizedSelectionId, {
                    selectionStatus: 'waitlisted',
                    assignedMarketBoothOfferingId: null,
                    assignedBoothQuantity: null,
                    boothFeeTotalCents: 0,
                    decisionNotes: normalizeOptionalString(
                        input.decisionNotes,
                        'decisionNotes',
                        'INVALID_APPLICATION_MARKET_SELECTION_DECISION_NOTES'
                    ),
                    decidedAt:
                        typeof input.decidedAt === 'undefined'
                            ? Date.now()
                            : assertPositiveInteger(
                                  input.decidedAt,
                                  'decidedAt',
                                  'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_AT'
                              ),
                    decidedByUserId: normalizeOptionalPositiveInteger(
                        input.decidedByUserId,
                        'decidedByUserId',
                        'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_BY_USER_ID'
                    ),
                    updatedByUserId: normalizeOptionalPositiveInteger(
                        input.updatedByUserId,
                        'updatedByUserId',
                        'INVALID_APPLICATION_MARKET_SELECTION_UPDATED_BY_USER_ID'
                    )
                })
            )
        },

        async rejectApplicationMarketSelection(applicationMarketSelectionId, input = {}) {
            const normalizedSelectionId = assertPositiveInteger(
                applicationMarketSelectionId,
                'applicationMarketSelectionId',
                'INVALID_APPLICATION_MARKET_SELECTION_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) =>
                updateSelectionDecision(conn, normalizedSelectionId, {
                    selectionStatus: 'rejected',
                    assignedMarketBoothOfferingId: null,
                    assignedBoothQuantity: null,
                    boothFeeTotalCents: 0,
                    decisionNotes: normalizeOptionalString(
                        input.decisionNotes,
                        'decisionNotes',
                        'INVALID_APPLICATION_MARKET_SELECTION_DECISION_NOTES'
                    ),
                    decidedAt:
                        typeof input.decidedAt === 'undefined'
                            ? Date.now()
                            : assertPositiveInteger(
                                  input.decidedAt,
                                  'decidedAt',
                                  'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_AT'
                              ),
                    decidedByUserId: normalizeOptionalPositiveInteger(
                        input.decidedByUserId,
                        'decidedByUserId',
                        'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_BY_USER_ID'
                    ),
                    updatedByUserId: normalizeOptionalPositiveInteger(
                        input.updatedByUserId,
                        'updatedByUserId',
                        'INVALID_APPLICATION_MARKET_SELECTION_UPDATED_BY_USER_ID'
                    )
                })
            )
        },

        async withdrawApplicationMarketSelection(applicationMarketSelectionId, input = {}) {
            const normalizedSelectionId = assertPositiveInteger(
                applicationMarketSelectionId,
                'applicationMarketSelectionId',
                'INVALID_APPLICATION_MARKET_SELECTION_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) =>
                updateSelectionDecision(conn, normalizedSelectionId, {
                    selectionStatus: 'withdrawn',
                    assignedMarketBoothOfferingId: null,
                    assignedBoothQuantity: null,
                    boothFeeTotalCents: 0,
                    decisionNotes: normalizeOptionalString(
                        input.decisionNotes,
                        'decisionNotes',
                        'INVALID_APPLICATION_MARKET_SELECTION_DECISION_NOTES'
                    ),
                    decidedAt:
                        typeof input.decidedAt === 'undefined'
                            ? Date.now()
                            : assertPositiveInteger(
                                  input.decidedAt,
                                  'decidedAt',
                                  'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_AT'
                              ),
                    decidedByUserId: normalizeOptionalPositiveInteger(
                        input.decidedByUserId,
                        'decidedByUserId',
                        'INVALID_APPLICATION_MARKET_SELECTION_DECIDED_BY_USER_ID'
                    ),
                    updatedByUserId: normalizeOptionalPositiveInteger(
                        input.updatedByUserId,
                        'updatedByUserId',
                        'INVALID_APPLICATION_MARKET_SELECTION_UPDATED_BY_USER_ID'
                    )
                })
            )
        }
    }
}

export default createMarketOpsApplicationReviewService

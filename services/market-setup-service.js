import {
    getBoothTypeById,
    insertBoothType,
    listBoothTypes,
    updateBoothTypeById
} from '../storage/catalog-storage.js'
import {
    getLocationById,
    getMarketBoothOfferingById,
    getMarketById,
    getMarketGroupById,
    insertLocation,
    insertMarket,
    insertMarketBoothOffering,
    insertMarketGroup,
    listLocations,
    listMarketBoothOfferingsByMarketId,
    listMarketGroups,
    listMarketsByMarketGroupId,
    updateLocationById,
    updateMarketBoothOfferingById,
    updateMarketById,
    updateMarketGroupById
} from '../storage/market-storage.js'
import { assertDatabase, assertPositiveInteger, createServiceError } from './service-helpers.js'

/**
 * Create one route-friendly market group detail object.
 *
 * @param {{
 *   marketGroup: NonNullable<Awaited<ReturnType<typeof getMarketGroupById>>>,
 *   markets: Awaited<ReturnType<typeof listMarketsByMarketGroupId>>
 * }} input - Group detail parts.
 * @returns {{
 *   marketGroup: NonNullable<Awaited<ReturnType<typeof getMarketGroupById>>>,
 *   markets: Awaited<ReturnType<typeof listMarketsByMarketGroupId>>
 * }} Market group detail.
 */
function buildMarketGroupDetail({ marketGroup, markets }) {
    return { marketGroup, markets }
}

/**
 * Create one route-friendly market detail object.
 *
 * @param {{
 *   market: NonNullable<Awaited<ReturnType<typeof getMarketById>>>,
 *   marketGroup: Awaited<ReturnType<typeof getMarketGroupById>>,
 *   location: Awaited<ReturnType<typeof getLocationById>>,
 *   boothOfferings: Awaited<ReturnType<typeof listMarketBoothOfferingsByMarketId>>
 * }} input - Market detail parts.
 * @returns {{
 *   market: NonNullable<Awaited<ReturnType<typeof getMarketById>>>,
 *   marketGroup: Awaited<ReturnType<typeof getMarketGroupById>>,
 *   location: Awaited<ReturnType<typeof getLocationById>>,
 *   boothOfferings: Awaited<ReturnType<typeof listMarketBoothOfferingsByMarketId>>
 * }} Market detail.
 */
function buildMarketDetail({ market, marketGroup, location, boothOfferings }) {
    return {
        market,
        marketGroup,
        location,
        boothOfferings
    }
}

const defaultDependencies = {
    insertLocation,
    getLocationById,
    listLocations,
    updateLocationById,
    insertMarketGroup,
    getMarketGroupById,
    listMarketGroups,
    updateMarketGroupById,
    insertMarket,
    getMarketById,
    listMarketsByMarketGroupId,
    updateMarketById,
    insertBoothType,
    getBoothTypeById,
    listBoothTypes,
    updateBoothTypeById,
    insertMarketBoothOffering,
    getMarketBoothOfferingById,
    listMarketBoothOfferingsByMarketId,
    updateMarketBoothOfferingById
}

/**
 * Create one Market Ops market setup service.
 *
 * @param {{
 *   query: (sql: string, params?: unknown[]) => Promise<unknown>,
 *   withTransaction: <T>(work: (conn: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>) => Promise<T>
 * }} database - SDK database seam.
 * @param {Partial<typeof defaultDependencies>} [overrides] - Optional test overrides.
 * @returns {{
 *   createLocation: (input: unknown) => Promise<Awaited<ReturnType<typeof getLocationById>>>,
 *   getLocationById: (locationId: number) => Promise<Awaited<ReturnType<typeof getLocationById>>>,
 *   listLocations: () => Promise<Awaited<ReturnType<typeof listLocations>>>,
 *   updateLocationById: (locationId: number, input: unknown) => Promise<Awaited<ReturnType<typeof getLocationById>>>,
 *   createMarketGroup: (input: unknown) => Promise<Awaited<ReturnType<typeof getMarketGroupById>>>,
 *   getMarketGroupById: (marketGroupId: number) => Promise<Awaited<ReturnType<typeof getMarketGroupById>>>,
 *   getMarketGroupDetailById: (marketGroupId: number) => Promise<ReturnType<typeof buildMarketGroupDetail>>,
 *   listMarketGroups: () => Promise<Awaited<ReturnType<typeof listMarketGroups>>>,
 *   updateMarketGroupById: (marketGroupId: number, input: unknown) => Promise<Awaited<ReturnType<typeof getMarketGroupById>>>,
 *   createMarket: (input: unknown) => Promise<ReturnType<typeof buildMarketDetail>>,
 *   getMarketById: (marketId: number) => Promise<Awaited<ReturnType<typeof getMarketById>>>,
 *   getMarketDetailById: (marketId: number) => Promise<ReturnType<typeof buildMarketDetail>>,
 *   listMarketsByMarketGroupId: (marketGroupId: number) => Promise<Awaited<ReturnType<typeof listMarketsByMarketGroupId>>>,
 *   updateMarketById: (marketId: number, input: unknown) => Promise<ReturnType<typeof buildMarketDetail>>,
 *   createBoothType: (input: unknown) => Promise<Awaited<ReturnType<typeof getBoothTypeById>>>,
 *   getBoothTypeById: (boothTypeId: number) => Promise<Awaited<ReturnType<typeof getBoothTypeById>>>,
 *   listBoothTypes: () => Promise<Awaited<ReturnType<typeof listBoothTypes>>>,
 *   updateBoothTypeById: (boothTypeId: number, input: unknown) => Promise<Awaited<ReturnType<typeof getBoothTypeById>>>,
 *   createMarketBoothOffering: (input: unknown) => Promise<Awaited<ReturnType<typeof getMarketBoothOfferingById>>>,
 *   getMarketBoothOfferingById: (marketBoothOfferingId: number) => Promise<Awaited<ReturnType<typeof getMarketBoothOfferingById>>>,
 *   listMarketBoothOfferingsByMarketId: (marketId: number) => Promise<Awaited<ReturnType<typeof listMarketBoothOfferingsByMarketId>>>,
 *   updateMarketBoothOfferingById: (marketBoothOfferingId: number, input: unknown) => Promise<Awaited<ReturnType<typeof getMarketBoothOfferingById>>>
 * }} Market setup service.
 */
export function createMarketOpsMarketSetupService(database, overrides = {}) {
    const normalizedDatabase = assertDatabase(database)
    const dependencies = {
        ...defaultDependencies,
        ...overrides
    }

    /**
     * Read one location or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} locationId - Location id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getLocationById>>>>} Matching location.
     */
    async function requireLocation(queryable, locationId) {
        const location = await dependencies.getLocationById(queryable, locationId)

        if (!location) {
            throw createServiceError('LOCATION_NOT_FOUND', `Location was not found: ${locationId}`)
        }

        return location
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
     * Read one booth type or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} boothTypeId - Booth type id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getBoothTypeById>>>>} Matching booth type.
     */
    async function requireBoothType(queryable, boothTypeId) {
        const boothType = await dependencies.getBoothTypeById(queryable, boothTypeId)

        if (!boothType) {
            throw createServiceError(
                'BOOTH_TYPE_NOT_FOUND',
                `Booth type was not found: ${boothTypeId}`
            )
        }

        return boothType
    }

    /**
     * Read one market booth offering or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} marketBoothOfferingId - Market booth offering id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getMarketBoothOfferingById>>>>} Matching booth offering.
     */
    async function requireMarketBoothOffering(queryable, marketBoothOfferingId) {
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
     * Load one market group with its child markets.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} marketGroupId - Market group id.
     * @returns {Promise<ReturnType<typeof buildMarketGroupDetail>>} Enriched market group detail.
     */
    async function loadMarketGroupDetail(queryable, marketGroupId) {
        const marketGroup = await requireMarketGroup(queryable, marketGroupId)
        const markets = await dependencies.listMarketsByMarketGroupId(queryable, marketGroupId)

        return buildMarketGroupDetail({
            marketGroup,
            markets
        })
    }

    /**
     * Load one market with its parent group, location, and booth offerings.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} marketId - Market id.
     * @returns {Promise<ReturnType<typeof buildMarketDetail>>} Enriched market detail.
     */
    async function loadMarketDetail(queryable, marketId) {
        const market = await requireMarket(queryable, marketId)
        const marketGroup = await dependencies.getMarketGroupById(queryable, market.marketGroupId)
        const location = await dependencies.getLocationById(queryable, market.locationId)
        const boothOfferings = await dependencies.listMarketBoothOfferingsByMarketId(
            queryable,
            marketId
        )

        return buildMarketDetail({
            market,
            marketGroup,
            location,
            boothOfferings
        })
    }

    return {
        async createLocation(input) {
            return dependencies.insertLocation(normalizedDatabase, input)
        },

        async getLocationById(locationId) {
            const normalizedLocationId = assertPositiveInteger(
                locationId,
                'locationId',
                'INVALID_LOCATION_ID'
            )

            return dependencies.getLocationById(normalizedDatabase, normalizedLocationId)
        },

        async listLocations() {
            return dependencies.listLocations(normalizedDatabase)
        },

        async updateLocationById(locationId, input) {
            const normalizedLocationId = assertPositiveInteger(
                locationId,
                'locationId',
                'INVALID_LOCATION_ID'
            )

            return dependencies.updateLocationById(normalizedDatabase, normalizedLocationId, input)
        },

        async createMarketGroup(input) {
            return dependencies.insertMarketGroup(normalizedDatabase, input)
        },

        async getMarketGroupById(marketGroupId) {
            const normalizedMarketGroupId = assertPositiveInteger(
                marketGroupId,
                'marketGroupId',
                'INVALID_MARKET_GROUP_ID'
            )

            return dependencies.getMarketGroupById(normalizedDatabase, normalizedMarketGroupId)
        },

        async getMarketGroupDetailById(marketGroupId) {
            const normalizedMarketGroupId = assertPositiveInteger(
                marketGroupId,
                'marketGroupId',
                'INVALID_MARKET_GROUP_ID'
            )

            return loadMarketGroupDetail(normalizedDatabase, normalizedMarketGroupId)
        },

        async listMarketGroups() {
            return dependencies.listMarketGroups(normalizedDatabase)
        },

        async updateMarketGroupById(marketGroupId, input) {
            const normalizedMarketGroupId = assertPositiveInteger(
                marketGroupId,
                'marketGroupId',
                'INVALID_MARKET_GROUP_ID'
            )

            return dependencies.updateMarketGroupById(
                normalizedDatabase,
                normalizedMarketGroupId,
                input
            )
        },

        async createMarket(input) {
            return normalizedDatabase.withTransaction(async (conn) => {
                const draftMarket = await dependencies.insertMarket(conn, input)

                await requireMarketGroup(conn, draftMarket.marketGroupId)
                await requireLocation(conn, draftMarket.locationId)

                return loadMarketDetail(conn, draftMarket.marketId)
            })
        },

        async getMarketById(marketId) {
            const normalizedMarketId = assertPositiveInteger(
                marketId,
                'marketId',
                'INVALID_MARKET_ID'
            )

            return dependencies.getMarketById(normalizedDatabase, normalizedMarketId)
        },

        async getMarketDetailById(marketId) {
            const normalizedMarketId = assertPositiveInteger(
                marketId,
                'marketId',
                'INVALID_MARKET_ID'
            )

            return loadMarketDetail(normalizedDatabase, normalizedMarketId)
        },

        async listMarketsByMarketGroupId(marketGroupId) {
            const normalizedMarketGroupId = assertPositiveInteger(
                marketGroupId,
                'marketGroupId',
                'INVALID_MARKET_GROUP_ID'
            )

            return dependencies.listMarketsByMarketGroupId(
                normalizedDatabase,
                normalizedMarketGroupId
            )
        },

        async updateMarketById(marketId, input) {
            const normalizedMarketId = assertPositiveInteger(
                marketId,
                'marketId',
                'INVALID_MARKET_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                const updatedMarket = await dependencies.updateMarketById(
                    conn,
                    normalizedMarketId,
                    input
                )

                await requireMarketGroup(conn, updatedMarket.marketGroupId)
                await requireLocation(conn, updatedMarket.locationId)

                return loadMarketDetail(conn, normalizedMarketId)
            })
        },

        async createBoothType(input) {
            return dependencies.insertBoothType(normalizedDatabase, input)
        },

        async getBoothTypeById(boothTypeId) {
            const normalizedBoothTypeId = assertPositiveInteger(
                boothTypeId,
                'boothTypeId',
                'INVALID_BOOTH_TYPE_ID'
            )

            return dependencies.getBoothTypeById(normalizedDatabase, normalizedBoothTypeId)
        },

        async listBoothTypes() {
            return dependencies.listBoothTypes(normalizedDatabase)
        },

        async updateBoothTypeById(boothTypeId, input) {
            const normalizedBoothTypeId = assertPositiveInteger(
                boothTypeId,
                'boothTypeId',
                'INVALID_BOOTH_TYPE_ID'
            )

            return dependencies.updateBoothTypeById(
                normalizedDatabase,
                normalizedBoothTypeId,
                input
            )
        },

        async createMarketBoothOffering(input) {
            return normalizedDatabase.withTransaction(async (conn) => {
                const draftBoothOffering = await dependencies.insertMarketBoothOffering(conn, input)

                await requireMarket(conn, draftBoothOffering.marketId)
                await requireBoothType(conn, draftBoothOffering.boothTypeId)

                return requireMarketBoothOffering(conn, draftBoothOffering.marketBoothOfferingId)
            })
        },

        async getMarketBoothOfferingById(marketBoothOfferingId) {
            const normalizedMarketBoothOfferingId = assertPositiveInteger(
                marketBoothOfferingId,
                'marketBoothOfferingId',
                'INVALID_MARKET_BOOTH_OFFERING_ID'
            )

            return dependencies.getMarketBoothOfferingById(
                normalizedDatabase,
                normalizedMarketBoothOfferingId
            )
        },

        async listMarketBoothOfferingsByMarketId(marketId) {
            const normalizedMarketId = assertPositiveInteger(
                marketId,
                'marketId',
                'INVALID_MARKET_ID'
            )

            return dependencies.listMarketBoothOfferingsByMarketId(
                normalizedDatabase,
                normalizedMarketId
            )
        },

        async updateMarketBoothOfferingById(marketBoothOfferingId, input) {
            const normalizedMarketBoothOfferingId = assertPositiveInteger(
                marketBoothOfferingId,
                'marketBoothOfferingId',
                'INVALID_MARKET_BOOTH_OFFERING_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                const updatedBoothOffering = await dependencies.updateMarketBoothOfferingById(
                    conn,
                    normalizedMarketBoothOfferingId,
                    input
                )

                await requireMarket(conn, updatedBoothOffering.marketId)
                await requireBoothType(conn, updatedBoothOffering.boothTypeId)

                return requireMarketBoothOffering(conn, normalizedMarketBoothOfferingId)
            })
        }
    }
}

export default createMarketOpsMarketSetupService

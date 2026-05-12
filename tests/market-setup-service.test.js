import { jest } from '@jest/globals'

import createMarketOpsMarketSetupService from '../services/market-setup-service.js'

/**
 * Create one tiny SDK-style database seam stub for service tests.
 *
 * @returns {{
 *   query: jest.Mock<Promise<[unknown[], unknown]>, [string, unknown[]?]>,
 *   withTransaction: jest.Mock<Promise<unknown>, [(conn: { query: jest.Mock<Promise<[unknown[], unknown]>, [string, unknown[]?]> }) => Promise<unknown>]>
 * }} Database stub.
 */
function createDatabase() {
    const database = {
        query: jest.fn(async () => [[], undefined])
    }

    database.withTransaction = jest.fn(async (work) => work({ query: database.query }))

    return database
}

describe('createMarketOpsMarketSetupService', () => {
    test('rejects a missing database seam', () => {
        expect(() => createMarketOpsMarketSetupService(null)).toThrow(
            expect.objectContaining({
                code: 'INVALID_MARKET_OPS_DATABASE'
            })
        )
    })

    test('returns one market group detail with its markets', async () => {
        const database = createDatabase()
        const marketGroup = {
            marketGroupId: 4,
            slug: 'summer-2026',
            groupName: 'Summer 2026',
            summary: null,
            description: null,
            feeMode: 'per_market',
            feeAmountCents: 2500,
            isPublic: 1,
            createdAt: 1000,
            createdByUserId: 1,
            updatedAt: 1000,
            updatedByUserId: 1
        }
        const markets = [
            {
                marketId: 8,
                marketGroupId: 4,
                locationId: 2,
                slug: 'may-1',
                marketName: 'May 1',
                summary: null,
                description: null,
                startsAt: 2000,
                endsAt: 3000,
                applicationsOpen: 1,
                applicationsOpenAt: null,
                applicationsCloseAt: null,
                feeAmountCents: 0,
                isPublic: 1,
                createdAt: 1000,
                createdByUserId: 1,
                updatedAt: 1000,
                updatedByUserId: 1
            }
        ]
        const service = createMarketOpsMarketSetupService(database, {
            insertLocation: jest.fn(),
            getLocationById: jest.fn(),
            listLocations: jest.fn(),
            updateLocationById: jest.fn(),
            insertMarketGroup: jest.fn(),
            getMarketGroupById: jest.fn(async () => marketGroup),
            listMarketGroups: jest.fn(),
            updateMarketGroupById: jest.fn(),
            insertMarket: jest.fn(),
            getMarketById: jest.fn(),
            listMarketsByMarketGroupId: jest.fn(async () => markets),
            updateMarketById: jest.fn(),
            insertBoothType: jest.fn(),
            getBoothTypeById: jest.fn(),
            listBoothTypes: jest.fn(),
            updateBoothTypeById: jest.fn(),
            insertMarketBoothOffering: jest.fn(),
            getMarketBoothOfferingById: jest.fn(),
            listMarketBoothOfferingsByMarketId: jest.fn(),
            updateMarketBoothOfferingById: jest.fn()
        })

        await expect(service.getMarketGroupDetailById(4)).resolves.toEqual({
            marketGroup,
            markets
        })
    })

    test('creates one market and returns enriched market detail', async () => {
        const database = createDatabase()
        const location = {
            locationId: 2,
            slug: 'crossroads',
            locationName: 'Crossroads',
            addressLine1: null,
            addressLine2: null,
            city: null,
            stateCode: null,
            postalCode: null,
            publicNotes: null,
            createdAt: 1000,
            createdByUserId: 1,
            updatedAt: 1000,
            updatedByUserId: 1
        }
        const marketGroup = {
            marketGroupId: 4,
            slug: 'summer-2026',
            groupName: 'Summer 2026',
            summary: null,
            description: null,
            feeMode: 'per_market',
            feeAmountCents: 2500,
            isPublic: 1,
            createdAt: 1000,
            createdByUserId: 1,
            updatedAt: 1000,
            updatedByUserId: 1
        }
        const market = {
            marketId: 8,
            marketGroupId: 4,
            locationId: 2,
            slug: 'may-1',
            marketName: 'May 1',
            summary: null,
            description: null,
            startsAt: 2000,
            endsAt: 3000,
            applicationsOpen: 1,
            applicationsOpenAt: null,
            applicationsCloseAt: null,
            feeAmountCents: 0,
            isPublic: 1,
            createdAt: 1000,
            createdByUserId: 1,
            updatedAt: 1000,
            updatedByUserId: 1
        }
        const dependencies = {
            insertLocation: jest.fn(),
            getLocationById: jest.fn(async () => location),
            listLocations: jest.fn(),
            updateLocationById: jest.fn(),
            insertMarketGroup: jest.fn(),
            getMarketGroupById: jest.fn(async () => marketGroup),
            listMarketGroups: jest.fn(),
            updateMarketGroupById: jest.fn(),
            insertMarket: jest.fn(async () => market),
            getMarketById: jest.fn(async () => market),
            listMarketsByMarketGroupId: jest.fn(),
            updateMarketById: jest.fn(),
            insertBoothType: jest.fn(),
            getBoothTypeById: jest.fn(),
            listBoothTypes: jest.fn(),
            updateBoothTypeById: jest.fn(),
            insertMarketBoothOffering: jest.fn(),
            getMarketBoothOfferingById: jest.fn(),
            listMarketBoothOfferingsByMarketId: jest.fn(async () => []),
            updateMarketBoothOfferingById: jest.fn()
        }
        const service = createMarketOpsMarketSetupService(database, dependencies)

        await expect(
            service.createMarket({
                marketGroupId: 4,
                locationId: 2,
                slug: 'may-1',
                marketName: 'May 1'
            })
        ).resolves.toEqual({
            market,
            marketGroup,
            location,
            boothOfferings: []
        })
    })
})

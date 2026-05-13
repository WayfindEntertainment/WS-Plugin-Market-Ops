import { jest } from '@jest/globals'

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

/**
 * Create one query seam stub for storage primitive tests.
 *
 * @param {(sql: string, params?: unknown[]) => Promise<unknown>} [queryImpl] - Query implementation override.
 * @returns {{ query: jest.Mock<Promise<unknown>, [string, unknown[]?]> }} Query seam stub.
 */
function createQueryable(queryImpl = async () => [[], undefined]) {
    return {
        query: jest.fn(queryImpl)
    }
}

describe('market-storage', () => {
    test('creates, reads, lists, and updates locations', async () => {
        let updated = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_locations')) {
                return [{ insertId: 2 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_locations')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_locations')) {
                return [
                    [
                        {
                            location_id: 2,
                            slug: 'crossroads-inside',
                            location_name: updated ? 'Crossroads Main Hall' : 'Crossroads Inside',
                            address_line_1: '123 Main',
                            address_line_2: null,
                            city: 'Port Orchard',
                            state_code: 'WA',
                            postal_code: '98366',
                            public_notes: null,
                            is_active: updated ? 0 : 1,
                            created_at: 10,
                            created_by_user_id: 1,
                            updated_at: updated ? 30 : 20,
                            updated_by_user_id: updated ? 3 : 2
                        }
                    ],
                    undefined
                ]
            }

            return [[], undefined]
        })

        await expect(
            insertLocation(queryable, {
                slug: 'crossroads-inside',
                locationName: 'Crossroads Inside',
                addressLine1: '123 Main',
                city: 'Port Orchard',
                stateCode: 'WA',
                postalCode: '98366',
                isActive: 1,
                createdAt: 10,
                createdByUserId: 1,
                updatedAt: 20,
                updatedByUserId: 2
            })
        ).resolves.toEqual(expect.objectContaining({ locationId: 2, isActive: 1 }))
        await expect(getLocationById(queryable, 2)).resolves.toEqual(
            expect.objectContaining({ locationId: 2, isActive: 1 })
        )
        await expect(listLocations(queryable)).resolves.toHaveLength(1)
        expect(queryable.query).toHaveBeenCalledWith(
            expect.stringContaining('ORDER BY is_active DESC, location_name ASC, location_id ASC')
        )
        await expect(
            updateLocationById(queryable, 2, {
                locationName: 'Crossroads Main Hall',
                isActive: 0,
                updatedAt: 30,
                updatedByUserId: 3
            })
        ).resolves.toEqual(
            expect.objectContaining({ locationName: 'Crossroads Main Hall', isActive: 0 })
        )
    })

    test('getLocationById selects is_active so editor reads active state correctly', async () => {
        const queryable = createQueryable(async () => [
            [
                {
                    location_id: 2,
                    slug: 'crossroads-inside',
                    location_name: 'Crossroads Inside',
                    address_line_1: null,
                    address_line_2: null,
                    city: null,
                    state_code: null,
                    postal_code: null,
                    public_notes: null,
                    is_active: 0,
                    created_at: 10,
                    created_by_user_id: 1,
                    updated_at: 20,
                    updated_by_user_id: 2
                }
            ],
            undefined
        ])

        await expect(getLocationById(queryable, 2)).resolves.toEqual(
            expect.objectContaining({ isActive: 0 })
        )
        expect(queryable.query).toHaveBeenCalledWith(expect.stringContaining('is_active'), [2])
    })

    test('creates, reads, lists, and updates market groups', async () => {
        let updated = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_market_groups')) {
                return [{ insertId: 5 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_market_groups')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_market_groups')) {
                return [
                    [
                        {
                            market_group_id: 5,
                            slug: 'summer-2026',
                            group_name: updated ? 'Summer 2026 Markets' : 'Summer 2026',
                            summary: null,
                            description: null,
                            fee_mode: 'per_market',
                            fee_amount_cents: 0,
                            is_public: 1,
                            created_at: 100,
                            created_by_user_id: 1,
                            updated_at: updated ? 130 : 120,
                            updated_by_user_id: updated ? 7 : 2
                        }
                    ],
                    undefined
                ]
            }

            return [[], undefined]
        })

        await expect(
            insertMarketGroup(queryable, {
                slug: 'summer-2026',
                groupName: 'Summer 2026',
                feeMode: 'per_market',
                createdAt: 100,
                createdByUserId: 1,
                updatedAt: 120,
                updatedByUserId: 2
            })
        ).resolves.toEqual(expect.objectContaining({ marketGroupId: 5 }))
        await expect(getMarketGroupById(queryable, 5)).resolves.toEqual(
            expect.objectContaining({ marketGroupId: 5 })
        )
        await expect(listMarketGroups(queryable)).resolves.toHaveLength(1)
        expect(queryable.query).toHaveBeenCalledWith(
            expect.stringContaining('ORDER BY is_public DESC, group_name ASC, market_group_id ASC')
        )
        await expect(
            updateMarketGroupById(queryable, 5, {
                groupName: 'Summer 2026 Markets',
                updatedAt: 130,
                updatedByUserId: 7
            })
        ).resolves.toEqual(expect.objectContaining({ groupName: 'Summer 2026 Markets' }))
    })

    test('creates, reads, lists, and updates markets', async () => {
        let updated = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_markets')) {
                return [{ insertId: 8 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_markets')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_markets')) {
                return [
                    [
                        {
                            market_id: 8,
                            market_group_id: 5,
                            location_id: 2,
                            slug: 'may-1',
                            market_name: updated ? 'May 1 Opening Market' : 'May 1 Market',
                            summary: null,
                            description: null,
                            starts_at: 1000,
                            ends_at: 2000,
                            applications_open: 1,
                            applications_open_at: 700,
                            applications_close_at: 900,
                            fee_amount_cents: 2500,
                            is_public: 1,
                            created_at: 100,
                            created_by_user_id: 1,
                            updated_at: updated ? 400 : 300,
                            updated_by_user_id: updated ? 9 : 2
                        }
                    ],
                    undefined
                ]
            }

            return [[], undefined]
        })

        await expect(
            insertMarket(queryable, {
                marketGroupId: 5,
                locationId: 2,
                slug: 'may-1',
                marketName: 'May 1 Market',
                startsAt: 1000,
                endsAt: 2000,
                applicationsOpen: 1,
                applicationsOpenAt: 700,
                applicationsCloseAt: 900,
                feeAmountCents: 2500,
                createdAt: 100,
                createdByUserId: 1,
                updatedAt: 300,
                updatedByUserId: 2
            })
        ).resolves.toEqual(expect.objectContaining({ marketId: 8 }))
        await expect(getMarketById(queryable, 8)).resolves.toEqual(
            expect.objectContaining({ marketId: 8 })
        )
        await expect(listMarketsByMarketGroupId(queryable, 5)).resolves.toHaveLength(1)
        await expect(
            updateMarketById(queryable, 8, {
                marketName: 'May 1 Opening Market',
                updatedAt: 400,
                updatedByUserId: 9
            })
        ).resolves.toEqual(expect.objectContaining({ marketName: 'May 1 Opening Market' }))
    })

    test('creates, reads, lists, and updates market booth offerings', async () => {
        let updated = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_market_booth_offerings')) {
                return [{ insertId: 11 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_market_booth_offerings')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_market_booth_offerings')) {
                return [
                    [
                        {
                            market_booth_offering_id: 11,
                            market_id: 8,
                            booth_type_id: 3,
                            booth_number: updated ? 37 : 35,
                            price_cents: 12000,
                            is_active: 1,
                            sort_order: 1,
                            created_at: 500,
                            created_by_user_id: 1,
                            updated_at: updated ? 700 : 600,
                            updated_by_user_id: updated ? 4 : 2
                        }
                    ],
                    undefined
                ]
            }

            return [[], undefined]
        })

        await expect(
            insertMarketBoothOffering(queryable, {
                marketId: 8,
                boothTypeId: 3,
                boothNumber: 35,
                priceCents: 12000,
                sortOrder: 1,
                createdAt: 500,
                createdByUserId: 1,
                updatedAt: 600,
                updatedByUserId: 2
            })
        ).resolves.toEqual(expect.objectContaining({ marketBoothOfferingId: 11 }))
        await expect(getMarketBoothOfferingById(queryable, 11)).resolves.toEqual(
            expect.objectContaining({ marketBoothOfferingId: 11 })
        )
        await expect(listMarketBoothOfferingsByMarketId(queryable, 8)).resolves.toHaveLength(1)
        await expect(
            updateMarketBoothOfferingById(queryable, 11, {
                boothNumber: 37,
                updatedAt: 700,
                updatedByUserId: 4
            })
        ).resolves.toEqual(expect.objectContaining({ boothNumber: 37 }))
    })
})

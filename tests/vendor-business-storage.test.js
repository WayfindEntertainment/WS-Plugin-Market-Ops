import { jest } from '@jest/globals'

import {
    deleteVendorBusinessOwner,
    getVendorBusinessById,
    insertVendorBusiness,
    insertVendorBusinessOwner,
    listVendorBusinessOwnersByVendorBusinessId,
    listVendorBusinessOwnershipsByUserId,
    listVendorBusinesses,
    updateVendorBusinessById
} from '../storage/vendor-business-storage.js'

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

describe('vendor-business-storage', () => {
    test('rejects a missing query seam', async () => {
        await expect(getVendorBusinessById(null, 1)).rejects.toMatchObject({
            code: 'INVALID_MARKET_OPS_QUERYABLE'
        })
    })

    test('inserts a vendor business, reads it back, and normalizes nullable fields', async () => {
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_vendor_businesses')) {
                return [{ insertId: 7 }, undefined]
            }

            return [
                [
                    {
                        vendor_business_id: 7,
                        slug: 'sunny-bakery',
                        business_name: 'Sunny Bakery',
                        legal_name: null,
                        summary: 'Bread and pastry vendor',
                        description: null,
                        email: 'bakery@example.com',
                        phone: null,
                        website_url: null,
                        approval_status: 'pending',
                        approval_notes: null,
                        approved_at: null,
                        approved_by_user_id: null,
                        rejected_at: null,
                        rejected_by_user_id: null,
                        created_at: 100,
                        created_by_user_id: 1,
                        updated_at: 100,
                        updated_by_user_id: 1
                    }
                ],
                undefined
            ]
        })

        await expect(
            insertVendorBusiness(queryable, {
                slug: 'sunny-bakery',
                businessName: 'Sunny Bakery',
                summary: 'Bread and pastry vendor',
                email: 'bakery@example.com',
                createdAt: 100,
                createdByUserId: 1,
                updatedAt: 100,
                updatedByUserId: 1
            })
        ).resolves.toEqual({
            vendorBusinessId: 7,
            slug: 'sunny-bakery',
            businessName: 'Sunny Bakery',
            legalName: null,
            summary: 'Bread and pastry vendor',
            description: null,
            email: 'bakery@example.com',
            phone: null,
            websiteUrl: null,
            approvalStatus: 'pending',
            approvalNotes: null,
            approvedAt: null,
            approvedByUserId: null,
            rejectedAt: null,
            rejectedByUserId: null,
            createdAt: 100,
            createdByUserId: 1,
            updatedAt: 100,
            updatedByUserId: 1
        })

        expect(queryable.query).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('INSERT INTO market_ops_vendor_businesses'),
            [
                'sunny-bakery',
                'Sunny Bakery',
                null,
                'Bread and pastry vendor',
                null,
                'bakery@example.com',
                null,
                null,
                'pending',
                null,
                null,
                null,
                null,
                null,
                100,
                1,
                100,
                1
            ]
        )
    })

    test('lists vendor businesses and falls back to an empty list when mysql returns a non-array row bag', async () => {
        let callCount = 0
        const queryable = createQueryable(async () => {
            callCount += 1

            if (callCount === 1) {
                return [
                    [
                        {
                            vendor_business_id: 2,
                            slug: 'coffee-cart',
                            business_name: 'Coffee Cart',
                            legal_name: null,
                            summary: null,
                            description: null,
                            email: null,
                            phone: null,
                            website_url: null,
                            approval_status: 'approved',
                            approval_notes: null,
                            approved_at: 40,
                            approved_by_user_id: 3,
                            rejected_at: null,
                            rejected_by_user_id: null,
                            created_at: 20,
                            created_by_user_id: 3,
                            updated_at: 30,
                            updated_by_user_id: 3
                        }
                    ],
                    undefined
                ]
            }

            return [{ notRows: true }, undefined]
        })

        await expect(listVendorBusinesses(queryable)).resolves.toHaveLength(1)
        await expect(listVendorBusinesses(queryable)).resolves.toEqual([])
    })

    test('updates a vendor business via patch semantics and returns the refreshed row', async () => {
        const queryable = createQueryable(async (sql, params) => {
            if (sql.includes('WHERE vendor_business_id = ?') && sql.includes('LIMIT 1')) {
                const updated = queryable.query.mock.calls.some((call) =>
                    String(call[0]).includes('UPDATE market_ops_vendor_businesses')
                )

                if (!updated) {
                    return [
                        [
                            {
                                vendor_business_id: 7,
                                slug: 'sunny-bakery',
                                business_name: 'Sunny Bakery',
                                legal_name: null,
                                summary: 'Bread and pastry vendor',
                                description: null,
                                email: 'bakery@example.com',
                                phone: null,
                                website_url: null,
                                approval_status: 'pending',
                                approval_notes: null,
                                approved_at: null,
                                approved_by_user_id: null,
                                rejected_at: null,
                                rejected_by_user_id: null,
                                created_at: 100,
                                created_by_user_id: 1,
                                updated_at: 100,
                                updated_by_user_id: 1
                            }
                        ],
                        undefined
                    ]
                }

                return [
                    [
                        {
                            vendor_business_id: params[0],
                            slug: 'sunny-bakery',
                            business_name: 'Sunny Bakery LLC',
                            legal_name: null,
                            summary: 'Bread and pastry vendor',
                            description: null,
                            email: 'bakery@example.com',
                            phone: null,
                            website_url: null,
                            approval_status: 'approved',
                            approval_notes: 'Looks good',
                            approved_at: 200,
                            approved_by_user_id: 9,
                            rejected_at: null,
                            rejected_by_user_id: null,
                            created_at: 100,
                            created_by_user_id: 1,
                            updated_at: 200,
                            updated_by_user_id: 9
                        }
                    ],
                    undefined
                ]
            }

            if (sql.includes('UPDATE market_ops_vendor_businesses')) {
                return [{ affectedRows: 1 }, undefined]
            }

            return [[], undefined]
        })

        await expect(
            updateVendorBusinessById(queryable, 7, {
                businessName: 'Sunny Bakery LLC',
                approvalStatus: 'approved',
                approvalNotes: 'Looks good',
                approvedAt: 200,
                approvedByUserId: 9,
                updatedAt: 200,
                updatedByUserId: 9
            })
        ).resolves.toEqual(
            expect.objectContaining({
                vendorBusinessId: 7,
                businessName: 'Sunny Bakery LLC',
                approvalStatus: 'approved',
                approvedByUserId: 9,
                updatedAt: 200
            })
        )
    })

    test('creates, lists, and deletes owner associations', async () => {
        let deleted = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_vendor_business_owners')) {
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('DELETE FROM market_ops_vendor_business_owners')) {
                deleted = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('WHERE vendor_business_id = ?')) {
                return deleted
                    ? [[], undefined]
                    : [
                          [
                              { vendor_business_id: 7, user_id: 12 },
                              { vendor_business_id: 7, user_id: 15 }
                          ],
                          undefined
                      ]
            }

            if (sql.includes('WHERE user_id = ?')) {
                return deleted
                    ? [[], undefined]
                    : [[{ vendor_business_id: 7, user_id: 12 }], undefined]
            }

            return [[], undefined]
        })

        await expect(
            insertVendorBusinessOwner(queryable, {
                vendorBusinessId: 7,
                userId: 12
            })
        ).resolves.toEqual({
            vendorBusinessId: 7,
            userId: 12
        })

        await expect(listVendorBusinessOwnersByVendorBusinessId(queryable, 7)).resolves.toEqual([
            { vendorBusinessId: 7, userId: 12 },
            { vendorBusinessId: 7, userId: 15 }
        ])
        await expect(listVendorBusinessOwnershipsByUserId(queryable, 12)).resolves.toEqual([
            { vendorBusinessId: 7, userId: 12 }
        ])

        await expect(deleteVendorBusinessOwner(queryable, 7, 12)).resolves.toBeUndefined()
    })
})

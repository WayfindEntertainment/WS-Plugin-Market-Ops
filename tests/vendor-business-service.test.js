import { jest } from '@jest/globals'

import createMarketOpsVendorBusinessService from '../services/vendor-business-service.js'

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

describe('createMarketOpsVendorBusinessService', () => {
    test('rejects a missing database seam', () => {
        expect(() => createMarketOpsVendorBusinessService(null)).toThrow(
            expect.objectContaining({
                code: 'INVALID_MARKET_OPS_DATABASE'
            })
        )
    })

    test('creates one vendor business with an owner and product categories', async () => {
        const database = createDatabase()
        const vendorBusiness = {
            vendorBusinessId: 41,
            slug: 'coffee-beans',
            businessName: 'Coffee Beans',
            legalName: null,
            summary: null,
            description: null,
            email: null,
            phone: null,
            websiteUrl: null,
            approvalStatus: 'pending',
            approvalNotes: null,
            approvedAt: null,
            approvedByUserId: null,
            rejectedAt: null,
            rejectedByUserId: null,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1001,
            updatedByUserId: 7
        }
        const dependencies = {
            insertVendorBusiness: jest.fn(async () => vendorBusiness),
            getVendorBusinessById: jest.fn(async () => vendorBusiness),
            listVendorBusinesses: jest.fn(),
            updateVendorBusinessById: jest.fn(),
            insertVendorBusinessOwner: jest.fn(async () => ({
                vendorBusinessId: 41,
                userId: 7
            })),
            listVendorBusinessOwnersByVendorBusinessId: jest.fn(async () => [
                {
                    vendorBusinessId: 41,
                    userId: 7
                }
            ]),
            listVendorBusinessOwnershipsByUserId: jest.fn(),
            deleteVendorBusinessOwner: jest.fn(),
            getVendorProductCategoryById: jest.fn(async (_queryable, categoryId) => ({
                vendorProductCategoryId: categoryId,
                slug: categoryId === 3 ? 'coffee-beans' : 'stickers',
                label: categoryId === 3 ? 'Coffee Beans' : 'Stickers'
            })),
            insertVendorBusinessProductCategory: jest.fn(async (queryable, input) => input),
            listVendorBusinessProductCategoriesByVendorBusinessId: jest.fn(async () => [
                {
                    vendorBusinessId: 41,
                    vendorProductCategoryId: 3,
                    sortOrder: 0
                },
                {
                    vendorBusinessId: 41,
                    vendorProductCategoryId: 8,
                    sortOrder: 1
                }
            ]),
            deleteVendorBusinessProductCategoriesByVendorBusinessId: jest.fn(async () => undefined)
        }
        const service = createMarketOpsVendorBusinessService(database, dependencies)

        await expect(
            service.createVendorBusiness({
                vendorBusiness: {
                    slug: 'coffee-beans',
                    businessName: 'Coffee Beans',
                    createdByUserId: 7
                },
                ownerUserId: 7,
                productCategories: [{ vendorProductCategoryId: 3 }, { vendorProductCategoryId: 8 }]
            })
        ).resolves.toEqual({
            vendorBusiness,
            owners: [
                {
                    vendorBusinessId: 41,
                    userId: 7
                }
            ],
            productCategoryAssignments: [
                expect.objectContaining({
                    vendorProductCategoryId: 3,
                    sortOrder: 0,
                    category: expect.objectContaining({ label: 'Coffee Beans' })
                }),
                expect.objectContaining({
                    vendorProductCategoryId: 8,
                    sortOrder: 1,
                    category: expect.objectContaining({ label: 'Stickers' })
                })
            ]
        })

        expect(dependencies.insertVendorBusinessOwner).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                vendorBusinessId: 41,
                userId: 7
            })
        )
        expect(dependencies.insertVendorBusinessProductCategory).toHaveBeenCalledTimes(2)
        expect(dependencies.insertVendorBusinessProductCategory).toHaveBeenNthCalledWith(
            1,
            expect.any(Object),
            expect.objectContaining({
                vendorBusinessId: 41,
                vendorProductCategoryId: 3,
                sortOrder: 0
            })
        )
        expect(dependencies.insertVendorBusinessProductCategory).toHaveBeenNthCalledWith(
            2,
            expect.any(Object),
            expect.objectContaining({
                vendorBusinessId: 41,
                vendorProductCategoryId: 8,
                sortOrder: 1
            })
        )
    })

    test('rejects duplicate vendor product category ids', async () => {
        const database = createDatabase()
        const service = createMarketOpsVendorBusinessService(database, {
            insertVendorBusiness: jest.fn(),
            getVendorBusinessById: jest.fn(),
            listVendorBusinesses: jest.fn(),
            updateVendorBusinessById: jest.fn(),
            insertVendorBusinessOwner: jest.fn(),
            listVendorBusinessOwnersByVendorBusinessId: jest.fn(async () => []),
            listVendorBusinessOwnershipsByUserId: jest.fn(),
            deleteVendorBusinessOwner: jest.fn(),
            getVendorProductCategoryById: jest.fn(),
            insertVendorBusinessProductCategory: jest.fn(),
            listVendorBusinessProductCategoriesByVendorBusinessId: jest.fn(async () => []),
            deleteVendorBusinessProductCategoriesByVendorBusinessId: jest.fn()
        })

        await expect(
            service.createVendorBusiness({
                vendorBusiness: {
                    slug: 'coffee-beans',
                    businessName: 'Coffee Beans',
                    createdByUserId: 7
                },
                ownerUserId: 7,
                productCategories: [{ vendorProductCategoryId: 3 }, { vendorProductCategoryId: 3 }]
            })
        ).rejects.toEqual(
            expect.objectContaining({
                code: 'DUPLICATE_VENDOR_BUSINESS_PRODUCT_CATEGORY_IDS'
            })
        )
    })

    test('approves one vendor business and clears rejection fields', async () => {
        const database = createDatabase()
        const currentVendorBusiness = {
            vendorBusinessId: 41,
            slug: 'coffee-beans',
            businessName: 'Coffee Beans',
            legalName: null,
            summary: null,
            description: null,
            email: null,
            phone: null,
            websiteUrl: null,
            approvalStatus: 'rejected',
            approvalNotes: 'old note',
            approvedAt: null,
            approvedByUserId: null,
            rejectedAt: 500,
            rejectedByUserId: 9,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1001,
            updatedByUserId: 9
        }
        const updatedVendorBusiness = {
            ...currentVendorBusiness,
            approvalStatus: 'approved',
            approvalNotes: null,
            approvedAt: 2000,
            approvedByUserId: 11,
            rejectedAt: null,
            rejectedByUserId: null,
            updatedAt: 2000,
            updatedByUserId: 11
        }
        const dependencies = {
            insertVendorBusiness: jest.fn(),
            getVendorBusinessById: jest
                .fn()
                .mockResolvedValueOnce(currentVendorBusiness)
                .mockResolvedValueOnce(updatedVendorBusiness),
            listVendorBusinesses: jest.fn(),
            updateVendorBusinessById: jest.fn(async () => updatedVendorBusiness),
            insertVendorBusinessOwner: jest.fn(),
            listVendorBusinessOwnersByVendorBusinessId: jest.fn(async () => []),
            listVendorBusinessOwnershipsByUserId: jest.fn(),
            deleteVendorBusinessOwner: jest.fn(),
            getVendorProductCategoryById: jest.fn(),
            insertVendorBusinessProductCategory: jest.fn(),
            listVendorBusinessProductCategoriesByVendorBusinessId: jest.fn(async () => []),
            deleteVendorBusinessProductCategoriesByVendorBusinessId: jest.fn()
        }
        const service = createMarketOpsVendorBusinessService(database, dependencies)

        await service.approveVendorBusiness(41, {
            approvalNotes: 'approved now',
            approvedAt: 2000,
            approvedByUserId: 11,
            updatedByUserId: 11
        })

        expect(dependencies.updateVendorBusinessById).toHaveBeenCalledWith(
            expect.any(Object),
            41,
            expect.objectContaining({
                approvalStatus: 'approved',
                approvalNotes: null,
                approvedAt: 2000,
                approvedByUserId: 11,
                rejectedAt: null,
                rejectedByUserId: null,
                updatedByUserId: 11
            })
        )
    })

    test('updates vendor approval notes without changing approval state', async () => {
        const database = createDatabase()
        const currentVendorBusiness = {
            vendorBusinessId: 41,
            slug: 'coffee-beans',
            businessName: 'Coffee Beans',
            legalName: null,
            summary: null,
            description: null,
            email: null,
            phone: null,
            websiteUrl: null,
            approvalStatus: 'rejected',
            approvalNotes: 'old note',
            approvedAt: null,
            approvedByUserId: null,
            rejectedAt: 500,
            rejectedByUserId: 9,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1001,
            updatedByUserId: 9
        }
        const updatedVendorBusiness = {
            ...currentVendorBusiness,
            approvalNotes: 'new note',
            updatedAt: 2000,
            updatedByUserId: 11
        }
        const dependencies = {
            insertVendorBusiness: jest.fn(),
            getVendorBusinessById: jest
                .fn()
                .mockResolvedValueOnce(currentVendorBusiness)
                .mockResolvedValueOnce(updatedVendorBusiness),
            listVendorBusinesses: jest.fn(),
            updateVendorBusinessById: jest.fn(async () => updatedVendorBusiness),
            insertVendorBusinessOwner: jest.fn(),
            listVendorBusinessOwnersByVendorBusinessId: jest.fn(async () => []),
            listVendorBusinessOwnershipsByUserId: jest.fn(),
            deleteVendorBusinessOwner: jest.fn(),
            getVendorProductCategoryById: jest.fn(),
            insertVendorBusinessProductCategory: jest.fn(),
            listVendorBusinessProductCategoriesByVendorBusinessId: jest.fn(async () => []),
            deleteVendorBusinessProductCategoriesByVendorBusinessId: jest.fn()
        }
        const service = createMarketOpsVendorBusinessService(database, dependencies)

        await service.updateVendorBusinessApprovalNotes(41, {
            approvalNotes: 'new note',
            updatedByUserId: 11
        })

        expect(dependencies.updateVendorBusinessById).toHaveBeenCalledWith(
            expect.any(Object),
            41,
            expect.objectContaining({
                approvalStatus: 'rejected',
                approvalNotes: 'new note',
                approvedAt: null,
                approvedByUserId: null,
                rejectedAt: 500,
                rejectedByUserId: 9,
                updatedByUserId: 11
            })
        )
    })
})

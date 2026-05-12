import { jest } from '@jest/globals'

import {
    deleteVendorBusinessProductCategoriesByVendorBusinessId,
    getBoothTypeById,
    getVendorProductCategoryById,
    insertBoothType,
    insertVendorBusinessProductCategory,
    insertVendorProductCategory,
    listBoothTypes,
    listVendorBusinessProductCategoriesByVendorBusinessId,
    listVendorProductCategories,
    updateBoothTypeById,
    updateVendorProductCategoryById
} from '../storage/catalog-storage.js'

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

describe('catalog-storage', () => {
    test('creates, reads, lists, and updates vendor product categories', async () => {
        let updated = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_vendor_product_categories')) {
                return [{ insertId: 4 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_vendor_product_categories')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_vendor_product_categories')) {
                const row = {
                    vendor_product_category_id: 4,
                    slug: 'coffee-beans',
                    label: updated ? 'Coffee and Tea' : 'Coffee Beans',
                    description: null,
                    is_active: 1,
                    sort_order: 2,
                    created_at: 10,
                    created_by_user_id: 1,
                    updated_at: updated ? 30 : 20,
                    updated_by_user_id: updated ? 3 : 2
                }

                return sql.includes('LIMIT 1') ? [[row], undefined] : [[row], undefined]
            }

            return [[], undefined]
        })

        await expect(
            insertVendorProductCategory(queryable, {
                slug: 'coffee-beans',
                label: 'Coffee Beans',
                sortOrder: 2,
                createdAt: 10,
                createdByUserId: 1,
                updatedAt: 20,
                updatedByUserId: 2
            })
        ).resolves.toEqual(
            expect.objectContaining({
                vendorProductCategoryId: 4,
                label: 'Coffee Beans'
            })
        )
        await expect(getVendorProductCategoryById(queryable, 4)).resolves.toEqual(
            expect.objectContaining({
                vendorProductCategoryId: 4
            })
        )
        await expect(listVendorProductCategories(queryable)).resolves.toHaveLength(1)
        await expect(
            updateVendorProductCategoryById(queryable, 4, {
                label: 'Coffee and Tea',
                updatedAt: 30,
                updatedByUserId: 3
            })
        ).resolves.toEqual(
            expect.objectContaining({
                label: 'Coffee and Tea',
                updatedByUserId: 3
            })
        )
    })

    test('creates, lists, and clears vendor business product category assignments', async () => {
        let deleted = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_vendor_business_product_categories')) {
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('DELETE FROM market_ops_vendor_business_product_categories')) {
                deleted = true
                return [{ affectedRows: 2 }, undefined]
            }

            if (sql.includes('FROM market_ops_vendor_business_product_categories')) {
                return deleted
                    ? [[], undefined]
                    : [
                          [
                              {
                                  vendor_business_id: 9,
                                  vendor_product_category_id: 1,
                                  is_primary: 1
                              },
                              {
                                  vendor_business_id: 9,
                                  vendor_product_category_id: 2,
                                  is_primary: 0
                              }
                          ],
                          undefined
                      ]
            }

            return [[], undefined]
        })

        await expect(
            insertVendorBusinessProductCategory(queryable, {
                vendorBusinessId: 9,
                vendorProductCategoryId: 1,
                isPrimary: true
            })
        ).resolves.toEqual({
            vendorBusinessId: 9,
            vendorProductCategoryId: 1,
            isPrimary: 1
        })
        await expect(
            listVendorBusinessProductCategoriesByVendorBusinessId(queryable, 9)
        ).resolves.toEqual([
            { vendorBusinessId: 9, vendorProductCategoryId: 1, isPrimary: 1 },
            { vendorBusinessId: 9, vendorProductCategoryId: 2, isPrimary: 0 }
        ])
        await expect(
            deleteVendorBusinessProductCategoriesByVendorBusinessId(queryable, 9)
        ).resolves.toBeUndefined()
    })

    test('creates, reads, lists, and updates booth types', async () => {
        let updated = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_booth_types')) {
                return [{ insertId: 6 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_booth_types')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_booth_types')) {
                const row = {
                    booth_type_id: 6,
                    slug: 'parking-space',
                    label: updated ? 'Parking Space XL' : 'Parking Space',
                    description: null,
                    is_active: 1,
                    sort_order: 4,
                    created_at: 20,
                    created_by_user_id: 1,
                    updated_at: updated ? 50 : 30,
                    updated_by_user_id: updated ? 5 : 2
                }

                return [[row], undefined]
            }

            return [[], undefined]
        })

        await expect(
            insertBoothType(queryable, {
                slug: 'parking-space',
                label: 'Parking Space',
                sortOrder: 4,
                createdAt: 20,
                createdByUserId: 1,
                updatedAt: 30,
                updatedByUserId: 2
            })
        ).resolves.toEqual(
            expect.objectContaining({
                boothTypeId: 6,
                label: 'Parking Space'
            })
        )
        await expect(getBoothTypeById(queryable, 6)).resolves.toEqual(
            expect.objectContaining({
                boothTypeId: 6
            })
        )
        await expect(listBoothTypes(queryable)).resolves.toHaveLength(1)
        await expect(
            updateBoothTypeById(queryable, 6, {
                label: 'Parking Space XL',
                updatedAt: 50,
                updatedByUserId: 5
            })
        ).resolves.toEqual(
            expect.objectContaining({
                label: 'Parking Space XL',
                updatedByUserId: 5
            })
        )
    })
})

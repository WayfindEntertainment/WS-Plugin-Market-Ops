import { jest } from '@jest/globals'

import {
    deleteApplicationMarketBoothPreferencesBySelectionId,
    deleteApplicationMarketSelectionsByVendorApplicationId,
    getApplicationMarketSelectionById,
    getVendorMarketApplicationById,
    insertApplicationMarketBoothPreference,
    insertApplicationMarketSelection,
    insertVendorMarketApplication,
    listApplicationMarketBoothPreferencesBySelectionId,
    listApplicationMarketSelectionsByVendorApplicationId,
    listVendorMarketApplicationsByVendorBusinessId,
    updateApplicationMarketSelectionById,
    updateVendorMarketApplicationById
} from '../storage/application-storage.js'

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

describe('application-storage', () => {
    test('creates, reads, lists, and updates vendor market applications', async () => {
        let updated = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_vendor_market_applications')) {
                return [{ insertId: 13 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_vendor_market_applications')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_vendor_market_applications')) {
                return [
                    [
                        {
                            vendor_application_id: 13,
                            vendor_business_id: 9,
                            market_group_id: 5,
                            application_key: '01HZYXWVUTSRQPONMLKJIHGFED',
                            status: updated ? 'submitted' : 'draft',
                            fee_mode_snapshot: 'per_market',
                            fee_total_cents: 7500,
                            submitted_at: updated ? 300 : null,
                            submitted_by_user_id: updated ? 9 : null,
                            created_at: 100,
                            created_by_user_id: 9,
                            updated_at: updated ? 300 : 200,
                            updated_by_user_id: updated ? 9 : 2
                        }
                    ],
                    undefined
                ]
            }

            return [[], undefined]
        })

        await expect(
            insertVendorMarketApplication(queryable, {
                vendorBusinessId: 9,
                marketGroupId: 5,
                applicationKey: '01HZYXWVUTSRQPONMLKJIHGFED',
                status: 'draft',
                feeModeSnapshot: 'per_market',
                feeTotalCents: 7500,
                createdAt: 100,
                createdByUserId: 9,
                updatedAt: 200,
                updatedByUserId: 2
            })
        ).resolves.toEqual(expect.objectContaining({ vendorApplicationId: 13 }))
        await expect(getVendorMarketApplicationById(queryable, 13)).resolves.toEqual(
            expect.objectContaining({ vendorApplicationId: 13 })
        )
        await expect(
            listVendorMarketApplicationsByVendorBusinessId(queryable, 9)
        ).resolves.toHaveLength(1)
        await expect(
            updateVendorMarketApplicationById(queryable, 13, {
                status: 'submitted',
                submittedAt: 300,
                submittedByUserId: 9,
                updatedAt: 300,
                updatedByUserId: 9
            })
        ).resolves.toEqual(expect.objectContaining({ status: 'submitted', submittedByUserId: 9 }))
    })

    test('creates, reads, lists, updates, and clears application market selections', async () => {
        let updated = false
        let deleted = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_application_market_selections')) {
                return [{ insertId: 21 }, undefined]
            }

            if (sql.includes('UPDATE market_ops_application_market_selections')) {
                updated = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('DELETE FROM market_ops_application_market_selections')) {
                deleted = true
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('FROM market_ops_application_market_selections')) {
                if (deleted) {
                    return [[], undefined]
                }

                return [
                    [
                        {
                            application_market_selection_id: 21,
                            vendor_application_id: 13,
                            market_id: 8,
                            selection_status: updated ? 'approved' : 'requested',
                            requested_booth_quantity: 1,
                            assigned_booth_quantity: updated ? 1 : null,
                            assigned_market_booth_offering_id: updated ? 11 : null,
                            booth_fee_total_cents: updated ? 12000 : 0,
                            willing_to_volunteer: 1,
                            decision_notes: updated ? 'Approved for one booth' : null,
                            decided_at: updated ? 800 : null,
                            decided_by_user_id: updated ? 4 : null,
                            created_at: 400,
                            created_by_user_id: 9,
                            updated_at: updated ? 800 : 500,
                            updated_by_user_id: updated ? 4 : 2
                        }
                    ],
                    undefined
                ]
            }

            return [[], undefined]
        })

        await expect(
            insertApplicationMarketSelection(queryable, {
                vendorApplicationId: 13,
                marketId: 8,
                requestedBoothQuantity: 1,
                willingToVolunteer: 1,
                createdAt: 400,
                createdByUserId: 9,
                updatedAt: 500,
                updatedByUserId: 2
            })
        ).resolves.toEqual(expect.objectContaining({ applicationMarketSelectionId: 21 }))
        await expect(getApplicationMarketSelectionById(queryable, 21)).resolves.toEqual(
            expect.objectContaining({ applicationMarketSelectionId: 21 })
        )
        await expect(
            listApplicationMarketSelectionsByVendorApplicationId(queryable, 13)
        ).resolves.toHaveLength(1)
        await expect(
            updateApplicationMarketSelectionById(queryable, 21, {
                selectionStatus: 'approved',
                assignedBoothQuantity: 1,
                assignedMarketBoothOfferingId: 11,
                boothFeeTotalCents: 12000,
                decisionNotes: 'Approved for one booth',
                decidedAt: 800,
                decidedByUserId: 4,
                updatedAt: 800,
                updatedByUserId: 4
            })
        ).resolves.toEqual(
            expect.objectContaining({ selectionStatus: 'approved', boothFeeTotalCents: 12000 })
        )
        await expect(
            deleteApplicationMarketSelectionsByVendorApplicationId(queryable, 13)
        ).resolves.toBeUndefined()
    })

    test('creates, lists, and clears booth preferences', async () => {
        let deleted = false
        const queryable = createQueryable(async (sql) => {
            if (sql.includes('INSERT INTO market_ops_application_market_booth_preferences')) {
                return [{ affectedRows: 1 }, undefined]
            }

            if (sql.includes('DELETE FROM market_ops_application_market_booth_preferences')) {
                deleted = true
                return [{ affectedRows: 2 }, undefined]
            }

            if (sql.includes('FROM market_ops_application_market_booth_preferences')) {
                return deleted
                    ? [[], undefined]
                    : [
                          [
                              {
                                  application_market_selection_id: 21,
                                  preference_rank: 1,
                                  market_booth_offering_id: 11,
                                  created_at: 900,
                                  created_by_user_id: 9
                              },
                              {
                                  application_market_selection_id: 21,
                                  preference_rank: 2,
                                  market_booth_offering_id: 12,
                                  created_at: 901,
                                  created_by_user_id: 9
                              }
                          ],
                          undefined
                      ]
            }

            return [[], undefined]
        })

        await expect(
            insertApplicationMarketBoothPreference(queryable, {
                applicationMarketSelectionId: 21,
                preferenceRank: 1,
                marketBoothOfferingId: 11,
                createdAt: 900,
                createdByUserId: 9
            })
        ).resolves.toEqual({
            applicationMarketSelectionId: 21,
            preferenceRank: 1,
            marketBoothOfferingId: 11,
            createdAt: 900,
            createdByUserId: 9
        })
        await expect(
            listApplicationMarketBoothPreferencesBySelectionId(queryable, 21)
        ).resolves.toEqual([
            {
                applicationMarketSelectionId: 21,
                preferenceRank: 1,
                marketBoothOfferingId: 11,
                createdAt: 900,
                createdByUserId: 9
            },
            {
                applicationMarketSelectionId: 21,
                preferenceRank: 2,
                marketBoothOfferingId: 12,
                createdAt: 901,
                createdByUserId: 9
            }
        ])
        await expect(
            deleteApplicationMarketBoothPreferencesBySelectionId(queryable, 21)
        ).resolves.toBeUndefined()
    })
})

import { jest } from '@jest/globals'

import createMarketOpsApplicationService from '../services/application-service.js'

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

describe('createMarketOpsApplicationService', () => {
    test('rejects a missing database seam', () => {
        expect(() => createMarketOpsApplicationService(null)).toThrow(
            expect.objectContaining({
                code: 'INVALID_MARKET_OPS_DATABASE'
            })
        )
    })

    test('creates one draft application with fee snapshot and nested selections', async () => {
        const database = createDatabase()
        const vendorBusiness = {
            vendorBusinessId: 11,
            slug: 'coffee-beans',
            businessName: 'Coffee Beans',
            approvalStatus: 'approved'
        }
        const marketGroup = {
            marketGroupId: 5,
            slug: 'summer-2026',
            groupName: 'Summer 2026',
            feeMode: 'per_market',
            feeAmountCents: 2500
        }
        const market = {
            marketId: 8,
            marketGroupId: 5,
            locationId: 2,
            slug: 'may-1',
            marketName: 'May 1',
            applicationsOpen: 1,
            applicationsOpenAt: null,
            applicationsCloseAt: null
        }
        const boothOffering = {
            marketBoothOfferingId: 21,
            marketId: 8,
            boothTypeId: 3,
            boothNumber: 6,
            priceCents: 12000,
            isActive: 1,
            sortOrder: 0
        }
        const createdApplication = {
            vendorApplicationId: 31,
            vendorBusinessId: 11,
            marketGroupId: 5,
            applicationKey: '01KRCF2N9DW9N3Q7F53QBM0A1A',
            status: 'draft',
            feeModeSnapshot: 'per_market',
            feeTotalCents: 2500,
            submittedAt: null,
            submittedByUserId: null,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1000,
            updatedByUserId: 7
        }
        const createdSelection = {
            applicationMarketSelectionId: 41,
            vendorApplicationId: 31,
            marketId: 8,
            selectionStatus: 'requested',
            requestedBoothQuantity: 2,
            assignedBoothQuantity: null,
            assignedMarketBoothOfferingId: null,
            boothFeeTotalCents: 0,
            willingToVolunteer: 1,
            decisionNotes: null,
            decidedAt: null,
            decidedByUserId: null,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1000,
            updatedByUserId: 7
        }
        const dependencies = {
            getVendorBusinessById: jest.fn(async () => vendorBusiness),
            getMarketGroupById: jest.fn(async () => marketGroup),
            listMarketsByMarketGroupId: jest.fn(async () => [market]),
            getMarketById: jest.fn(async () => market),
            listMarketBoothOfferingsByMarketId: jest.fn(async () => [boothOffering]),
            getMarketBoothOfferingById: jest.fn(async () => boothOffering),
            insertVendorMarketApplication: jest.fn(async (_queryable, input) => ({
                ...createdApplication,
                feeModeSnapshot: input.feeModeSnapshot,
                feeTotalCents: input.feeTotalCents
            })),
            getVendorMarketApplicationById: jest.fn(async () => createdApplication),
            listVendorMarketApplicationsByVendorBusinessId: jest.fn(),
            updateVendorMarketApplicationById: jest.fn(),
            insertApplicationMarketSelection: jest.fn(async () => createdSelection),
            listApplicationMarketSelectionsByVendorApplicationId: jest.fn(async () => [
                createdSelection
            ]),
            deleteApplicationMarketSelectionsByVendorApplicationId: jest.fn(async () => undefined),
            insertApplicationMarketBoothPreference: jest.fn(async (_queryable, input) => input),
            listApplicationMarketBoothPreferencesBySelectionId: jest.fn(async () => [
                {
                    applicationMarketSelectionId: 41,
                    preferenceRank: 1,
                    marketBoothOfferingId: 21,
                    createdAt: 1000,
                    createdByUserId: null
                }
            ])
        }
        const service = createMarketOpsApplicationService(database, dependencies)

        await expect(
            service.createVendorMarketApplicationDraft({
                application: {
                    vendorBusinessId: 11,
                    marketGroupId: 5,
                    applicationKey: '01KRCF2N9DW9N3Q7F53QBM0A1A',
                    createdByUserId: 7
                },
                selections: [
                    {
                        marketId: 8,
                        requestedBoothQuantity: 2,
                        willingToVolunteer: 1,
                        boothPreferences: [{ marketBoothOfferingId: 21 }]
                    }
                ]
            })
        ).resolves.toEqual({
            application: createdApplication,
            vendorBusiness,
            marketGroup,
            selections: [
                expect.objectContaining({
                    applicationMarketSelectionId: 41,
                    market,
                    boothPreferences: [
                        expect.objectContaining({
                            marketBoothOffering: boothOffering
                        })
                    ]
                })
            ]
        })

        expect(dependencies.insertVendorMarketApplication).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                feeModeSnapshot: 'per_market',
                feeTotalCents: 2500,
                status: 'draft'
            })
        )
        expect(dependencies.insertApplicationMarketBoothPreference).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                applicationMarketSelectionId: 41,
                preferenceRank: 1,
                marketBoothOfferingId: 21
            })
        )
    })

    test('rejects submission when the draft has no selected markets', async () => {
        const database = createDatabase()
        const dependencies = {
            getVendorBusinessById: jest.fn(async () => ({
                vendorBusinessId: 11,
                approvalStatus: 'approved'
            })),
            getMarketGroupById: jest.fn(async () => ({
                marketGroupId: 5,
                feeMode: 'none',
                feeAmountCents: 0
            })),
            listMarketsByMarketGroupId: jest.fn(),
            getMarketById: jest.fn(),
            listMarketBoothOfferingsByMarketId: jest.fn(),
            getMarketBoothOfferingById: jest.fn(),
            insertVendorMarketApplication: jest.fn(),
            getVendorMarketApplicationById: jest.fn(async () => ({
                vendorApplicationId: 31,
                vendorBusinessId: 11,
                marketGroupId: 5,
                applicationKey: '01KRCF2N9DW9N3Q7F53QBM0A1A',
                status: 'draft',
                feeModeSnapshot: 'none',
                feeTotalCents: 0,
                submittedAt: null,
                submittedByUserId: null,
                createdAt: 1000,
                createdByUserId: 7,
                updatedAt: 1000,
                updatedByUserId: 7
            })),
            listVendorMarketApplicationsByVendorBusinessId: jest.fn(),
            updateVendorMarketApplicationById: jest.fn(),
            insertApplicationMarketSelection: jest.fn(),
            listApplicationMarketSelectionsByVendorApplicationId: jest.fn(async () => []),
            deleteApplicationMarketSelectionsByVendorApplicationId: jest.fn(),
            insertApplicationMarketBoothPreference: jest.fn(),
            listApplicationMarketBoothPreferencesBySelectionId: jest.fn()
        }
        const service = createMarketOpsApplicationService(database, dependencies)

        await expect(service.submitVendorMarketApplication(31)).rejects.toThrow(
            expect.objectContaining({
                code: 'VENDOR_MARKET_APPLICATION_HAS_NO_SELECTIONS'
            })
        )
    })

    test('rejects withdrawal once any selection has been reviewed', async () => {
        const database = createDatabase()
        const dependencies = {
            getVendorBusinessById: jest.fn(),
            getMarketGroupById: jest.fn(),
            listMarketsByMarketGroupId: jest.fn(),
            getMarketById: jest.fn(),
            listMarketBoothOfferingsByMarketId: jest.fn(),
            getMarketBoothOfferingById: jest.fn(),
            insertVendorMarketApplication: jest.fn(),
            getVendorMarketApplicationById: jest.fn(async () => ({
                vendorApplicationId: 31,
                vendorBusinessId: 11,
                marketGroupId: 5,
                applicationKey: '01KRCF2N9DW9N3Q7F53QBM0A1A',
                status: 'submitted',
                feeModeSnapshot: 'none',
                feeTotalCents: 0,
                submittedAt: 1000,
                submittedByUserId: 7,
                createdAt: 1000,
                createdByUserId: 7,
                updatedAt: 1000,
                updatedByUserId: 7
            })),
            listVendorMarketApplicationsByVendorBusinessId: jest.fn(),
            updateVendorMarketApplicationById: jest.fn(),
            insertApplicationMarketSelection: jest.fn(),
            listApplicationMarketSelectionsByVendorApplicationId: jest.fn(async () => [
                {
                    applicationMarketSelectionId: 41,
                    vendorApplicationId: 31,
                    marketId: 8,
                    selectionStatus: 'approved'
                }
            ]),
            deleteApplicationMarketSelectionsByVendorApplicationId: jest.fn(),
            insertApplicationMarketBoothPreference: jest.fn(),
            listApplicationMarketBoothPreferencesBySelectionId: jest.fn()
        }
        const service = createMarketOpsApplicationService(database, dependencies)

        await expect(service.withdrawVendorMarketApplication(31)).rejects.toThrow(
            expect.objectContaining({
                code: 'VENDOR_MARKET_APPLICATION_REVIEW_ALREADY_STARTED'
            })
        )
        expect(dependencies.updateVendorMarketApplicationById).not.toHaveBeenCalled()
    })

    test('resubmits a withdrawn application with its existing fee snapshot', async () => {
        const database = createDatabase()
        const dependencies = {
            getVendorBusinessById: jest.fn(async () => ({
                vendorBusinessId: 11,
                approvalStatus: 'approved'
            })),
            getMarketGroupById: jest.fn(async () => ({
                marketGroupId: 5,
                feeMode: 'per_group',
                feeAmountCents: 2500
            })),
            listMarketsByMarketGroupId: jest.fn(),
            getMarketById: jest.fn(),
            listMarketBoothOfferingsByMarketId: jest.fn(),
            getMarketBoothOfferingById: jest.fn(),
            insertVendorMarketApplication: jest.fn(),
            getVendorMarketApplicationById: jest.fn(async () => ({
                vendorApplicationId: 31,
                vendorBusinessId: 11,
                marketGroupId: 5,
                applicationKey: '01KRCF2N9DW9N3Q7F53QBM0A1A',
                status: 'withdrawn',
                feeModeSnapshot: 'per_group',
                feeTotalCents: 2500,
                submittedAt: 1000,
                submittedByUserId: 7,
                createdAt: 1000,
                createdByUserId: 7,
                updatedAt: 1000,
                updatedByUserId: 7
            })),
            listVendorMarketApplicationsByVendorBusinessId: jest.fn(),
            updateVendorMarketApplicationById: jest.fn(),
            insertApplicationMarketSelection: jest.fn(),
            listApplicationMarketSelectionsByVendorApplicationId: jest.fn(async () => [
                {
                    applicationMarketSelectionId: 41,
                    vendorApplicationId: 31,
                    marketId: 8,
                    selectionStatus: 'withdrawn',
                    requestedBoothQuantity: 1,
                    willingToVolunteer: 0
                }
            ]),
            deleteApplicationMarketSelectionsByVendorApplicationId: jest.fn(),
            insertApplicationMarketBoothPreference: jest.fn(),
            listApplicationMarketBoothPreferencesBySelectionId: jest.fn(async () => [])
        }
        const service = createMarketOpsApplicationService(database, dependencies)

        await service.resubmitVendorMarketApplication(31, {
            submittedAt: 2000,
            submittedByUserId: 12,
            updatedByUserId: 12
        })

        expect(dependencies.updateVendorMarketApplicationById).toHaveBeenCalledWith(
            expect.any(Object),
            31,
            expect.objectContaining({
                vendorBusinessId: 11,
                marketGroupId: 5,
                applicationKey: '01KRCF2N9DW9N3Q7F53QBM0A1A',
                status: 'submitted',
                feeModeSnapshot: 'per_group',
                feeTotalCents: 2500,
                submittedAt: 2000,
                submittedByUserId: 12,
                updatedByUserId: 12
            })
        )
    })
})

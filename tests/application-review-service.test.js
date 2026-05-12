import { jest } from '@jest/globals'

import createMarketOpsApplicationReviewService from '../services/application-review-service.js'

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

describe('createMarketOpsApplicationReviewService', () => {
    test('rejects a missing database seam', () => {
        expect(() => createMarketOpsApplicationReviewService(null)).toThrow(
            expect.objectContaining({
                code: 'INVALID_MARKET_OPS_DATABASE'
            })
        )
    })

    test('rejects approval when the assigned offering belongs to a different market', async () => {
        const database = createDatabase()
        const selection = {
            applicationMarketSelectionId: 41,
            vendorApplicationId: 31,
            marketId: 8,
            selectionStatus: 'requested',
            requestedBoothQuantity: 1,
            assignedBoothQuantity: null,
            assignedMarketBoothOfferingId: null,
            boothFeeTotalCents: 0,
            willingToVolunteer: null,
            decisionNotes: null,
            decidedAt: null,
            decidedByUserId: null,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1000,
            updatedByUserId: 7
        }
        const service = createMarketOpsApplicationReviewService(database, {
            getVendorBusinessById: jest.fn(),
            getMarketGroupById: jest.fn(),
            getMarketById: jest.fn(async () => ({ marketId: 8 })),
            getMarketBoothOfferingById: jest.fn(async () => ({
                marketBoothOfferingId: 22,
                marketId: 9
            })),
            getVendorMarketApplicationById: jest.fn(),
            getApplicationMarketSelectionById: jest.fn(async () => selection),
            listApplicationMarketSelectionsByVendorApplicationId: jest.fn(),
            listApplicationMarketBoothPreferencesBySelectionId: jest.fn(),
            updateApplicationMarketSelectionById: jest.fn()
        })

        await expect(
            service.approveApplicationMarketSelection(41, {
                assignedMarketBoothOfferingId: 22,
                assignedBoothQuantity: 1,
                boothFeeTotalCents: 12000
            })
        ).rejects.toThrow(
            expect.objectContaining({
                code: 'MARKET_BOOTH_OFFERING_NOT_IN_MARKET'
            })
        )
    })

    test('approves one application market selection and returns review detail', async () => {
        const database = createDatabase()
        const application = {
            vendorApplicationId: 31,
            vendorBusinessId: 11,
            marketGroupId: 5,
            applicationKey: '01KRCF2N9DW9N3Q7F53QBM0A1A',
            status: 'submitted',
            feeModeSnapshot: 'per_market',
            feeTotalCents: 2500,
            submittedAt: 2000,
            submittedByUserId: 7,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1000,
            updatedByUserId: 7
        }
        const vendorBusiness = {
            vendorBusinessId: 11,
            slug: 'coffee-beans',
            businessName: 'Coffee Beans'
        }
        const marketGroup = {
            marketGroupId: 5,
            slug: 'summer-2026',
            groupName: 'Summer 2026'
        }
        const market = {
            marketId: 8,
            marketGroupId: 5,
            locationId: 2,
            slug: 'may-1',
            marketName: 'May 1'
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
        const selection = {
            applicationMarketSelectionId: 41,
            vendorApplicationId: 31,
            marketId: 8,
            selectionStatus: 'requested',
            requestedBoothQuantity: 1,
            assignedBoothQuantity: null,
            assignedMarketBoothOfferingId: null,
            boothFeeTotalCents: 0,
            willingToVolunteer: null,
            decisionNotes: null,
            decidedAt: null,
            decidedByUserId: null,
            createdAt: 1000,
            createdByUserId: 7,
            updatedAt: 1000,
            updatedByUserId: 7
        }
        const updatedSelection = {
            ...selection,
            selectionStatus: 'approved',
            assignedBoothQuantity: 1,
            assignedMarketBoothOfferingId: 21,
            boothFeeTotalCents: 12000,
            decisionNotes: 'approved',
            decidedAt: 3000,
            decidedByUserId: 1,
            updatedAt: 3000,
            updatedByUserId: 1
        }
        const dependencies = {
            getVendorBusinessById: jest.fn(async () => vendorBusiness),
            getMarketGroupById: jest.fn(async () => marketGroup),
            getMarketById: jest.fn(async () => market),
            getMarketBoothOfferingById: jest.fn(async () => boothOffering),
            getVendorMarketApplicationById: jest.fn(async () => application),
            getApplicationMarketSelectionById: jest
                .fn()
                .mockResolvedValueOnce(selection)
                .mockResolvedValueOnce(selection),
            listApplicationMarketSelectionsByVendorApplicationId: jest.fn(async () => [
                updatedSelection
            ]),
            listApplicationMarketBoothPreferencesBySelectionId: jest.fn(async () => []),
            updateApplicationMarketSelectionById: jest.fn(async () => updatedSelection)
        }
        const service = createMarketOpsApplicationReviewService(database, dependencies)

        await expect(
            service.approveApplicationMarketSelection(41, {
                assignedMarketBoothOfferingId: 21,
                assignedBoothQuantity: 1,
                boothFeeTotalCents: 12000,
                decisionNotes: 'approved',
                decidedAt: 3000,
                decidedByUserId: 1,
                updatedByUserId: 1
            })
        ).resolves.toEqual({
            application,
            vendorBusiness,
            marketGroup,
            selections: [
                expect.objectContaining({
                    applicationMarketSelectionId: 41,
                    selectionStatus: 'approved',
                    assignedMarketBoothOffering: boothOffering,
                    market
                })
            ]
        })

        expect(dependencies.updateApplicationMarketSelectionById).toHaveBeenCalledWith(
            expect.any(Object),
            41,
            expect.objectContaining({
                selectionStatus: 'approved',
                assignedMarketBoothOfferingId: 21,
                boothFeeTotalCents: 12000
            })
        )
    })
})

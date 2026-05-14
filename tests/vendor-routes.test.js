/* eslint-disable jsdoc/require-jsdoc, prefer-destructuring */

import { jest } from '@jest/globals'

import {
    createMarketOpsMarketsRouter,
    createMarketOpsNewVendorsRouter,
    createMarketOpsVendorsRouter
} from '../vendor-routes.js'
import { createMarketOpsReviewRouter } from '../market-ops-review-routes.js'

function createRouterRecorder() {
    const records = {
        use: [],
        get: [],
        post: []
    }
    const router = {
        records,
        use(...handlers) {
            records.use.push({ handlers })
            return router
        },
        get(path, ...handlers) {
            records.get.push({ path, handlers })
            return router
        },
        post(path, ...handlers) {
            records.post.push({ path, handlers })
            return router
        }
    }

    return router
}

function createSdk(router, renderPage = jest.fn(), database = null) {
    return {
        web: {
            createRouter: () => router,
            renderPage,
            guards: {
                requireAuth: jest.fn((_req, _res, next) => next?.()),
                requirePermissions: jest.fn(() => (_req, _res, next) => next?.())
            }
        },
        services: {
            database: database ?? {
                query: jest.fn(async () => [[]]),
                withTransaction: jest.fn()
            }
        }
    }
}

describe('createMarketOpsNewVendorsRouter', () => {
    test('registers public get and auth-protected post routes', () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)

        createMarketOpsNewVendorsRouter(sdk, {
            vendorBusinessService: {
                listVendorBusinessesByOwnerUserId: jest.fn(async () => [])
            }
        })

        expect(router.records.get.map((route) => route.path)).toEqual(['/'])
        expect(router.records.post.map((route) => route.path)).toEqual(['/'])
    })
})

describe('createMarketOpsMarketsRouter', () => {
    test('registers a public index route', () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)

        createMarketOpsMarketsRouter(sdk, {
            marketSetupService: {
                listMarketGroups: jest.fn(async () => []),
                listLocations: jest.fn(async () => []),
                listMarketsByMarketGroupId: jest.fn(async () => [])
            }
        })

        expect(router.records.get.map((route) => route.path)).toEqual([
            '/',
            '/:marketGroupSlug/:marketSlug'
        ])
    })

    test('directory renders only public groups with public markets', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            listMarketGroups: jest.fn(async () => [
                {
                    marketGroupId: 6,
                    slug: 'holiday-makers-market',
                    groupName: 'Holiday Makers Market',
                    summary: 'Indoor holiday shopping events.',
                    feeMode: 'per_group',
                    feeAmountCents: 2500,
                    isPublic: 1
                },
                {
                    marketGroupId: 7,
                    groupName: 'Private Test Group',
                    summary: 'Private only.',
                    feeMode: 'none',
                    feeAmountCents: 0,
                    isPublic: 0
                }
            ]),
            listLocations: jest.fn(async () => [
                {
                    locationId: 14,
                    locationName: 'Crossroads Neighborhood Church Lobby'
                }
            ]),
            listMarketsByMarketGroupId: jest.fn(async (marketGroupId) => {
                if (marketGroupId === 6) {
                    return [
                        {
                            marketId: 12,
                            slug: 'november-2026-holiday-market',
                            marketName: 'November 2026 Holiday Market',
                            summary: 'Indoor early holiday shopping event.',
                            startsAt: Date.parse('2026-11-07T10:00:00-08:00'),
                            endsAt: Date.parse('2026-11-07T16:00:00-08:00'),
                            locationId: 14,
                            applicationsOpen: 1,
                            applicationsOpenAt: Date.parse('2026-08-01T09:00:00-07:00'),
                            applicationsCloseAt: Date.parse('2026-10-01T17:00:00-07:00'),
                            isPublic: 1
                        },
                        {
                            marketId: 13,
                            slug: 'hidden-market',
                            marketName: 'Hidden Market',
                            summary: 'Should not render publicly.',
                            startsAt: Date.parse('2026-11-08T10:00:00-08:00'),
                            endsAt: Date.parse('2026-11-08T16:00:00-08:00'),
                            locationId: 14,
                            applicationsOpen: 1,
                            applicationsOpenAt: Date.parse('2026-08-01T09:00:00-07:00'),
                            applicationsCloseAt: Date.parse('2026-10-01T17:00:00-07:00'),
                            isPublic: 0
                        }
                    ]
                }

                return []
            })
        }

        createMarketOpsMarketsRouter(sdk, { marketSetupService })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = { query: {} }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/markets/directory',
                locals: expect.objectContaining({
                    marketOpsMarketsDirectoryPageData: expect.objectContaining({
                        marketGroupCards: [
                            expect.objectContaining({
                                groupName: 'Holiday Makers Market'
                            })
                        ]
                    })
                })
            })
        )

        const marketGroupCards =
            renderPage.mock.calls[0][2].locals.marketOpsMarketsDirectoryPageData.marketGroupCards
        expect(marketGroupCards).toHaveLength(1)
        expect(marketGroupCards[0].markets).toHaveLength(1)
        expect(marketGroupCards[0].markets[0].marketName).toBe('November 2026 Holiday Market')
        expect(marketGroupCards[0].markets[0].href).toBe(
            '/markets/holiday-makers-market/november-2026-holiday-market'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('public market detail renders only for public market slugs', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            listMarketGroups: jest.fn(async () => [
                {
                    marketGroupId: 6,
                    slug: 'holiday-makers-market',
                    groupName: 'Holiday Makers Market',
                    summary: 'Indoor holiday shopping events.',
                    isPublic: 1
                }
            ]),
            listLocations: jest.fn(async () => [
                {
                    locationId: 14,
                    locationName: 'Crossroads Neighborhood Church Lobby'
                }
            ]),
            listMarketsByMarketGroupId: jest.fn(async () => [
                {
                    marketId: 12,
                    slug: 'november-2026-holiday-market',
                    marketName: 'November 2026 Holiday Market',
                    summary: 'Indoor early holiday shopping event.',
                    description: 'Indoor early holiday shopping event.',
                    startsAt: Date.parse('2026-11-07T10:00:00-08:00'),
                    endsAt: Date.parse('2026-11-07T16:00:00-08:00'),
                    locationId: 14,
                    applicationsOpen: 1,
                    applicationsOpenAt: Date.parse('2026-08-01T09:00:00-07:00'),
                    applicationsCloseAt: Date.parse('2026-10-01T17:00:00-07:00'),
                    isPublic: 1
                }
            ])
        }

        createMarketOpsMarketsRouter(sdk, { marketSetupService })

        const route = router.records.get.find(
            (entry) => entry.path === '/:marketGroupSlug/:marketSlug'
        )
        const req = {
            params: {
                marketGroupSlug: 'holiday-makers-market',
                marketSlug: 'november-2026-holiday-market'
            },
            query: {}
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/markets/market'
            })
        )
        expect(renderPage.mock.calls[0][2].locals.marketOpsMarketDetailPageData.marketCard).toEqual(
            expect.objectContaining({
                marketName: 'November 2026 Holiday Market',
                locationName: 'Crossroads Neighborhood Church Lobby',
                marketGroupSlug: 'holiday-makers-market',
                marketSlug: 'november-2026-holiday-market'
            })
        )
        expect(next).not.toHaveBeenCalled()
    })
})

describe('createMarketOpsVendorsRouter', () => {
    test('registers public, manage, and application routes', () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService: {
                listVendorBusinessDetails: jest.fn(async () => [])
            },
            applicationService: {
                listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => [])
            },
            marketSetupService: {
                listMarketGroups: jest.fn(async () => [])
            }
        })

        expect(router.records.get.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                '/',
                '/:vendorSlug',
                '/:vendorSlug/manage',
                '/:vendorSlug/manage/applications',
                '/:vendorSlug/manage/applications/:vendorApplicationId'
            ])
        )
        expect(router.records.post.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                '/:vendorSlug/manage',
                '/:vendorSlug/manage/resubmit',
                '/:vendorSlug/manage/applications',
                '/:vendorSlug/manage/applications/:vendorApplicationId',
                '/:vendorSlug/manage/applications/:vendorApplicationId/submit',
                '/:vendorSlug/manage/applications/:vendorApplicationId/withdraw',
                '/:vendorSlug/manage/applications/:vendorApplicationId/resubmit'
            ])
        )
    })

    test('directory renders approved vendors only with filter metadata and alphabetical order', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'alpha-candles',
                        businessName: 'Alpha Candles',
                        approvalStatus: 'approved',
                        summary: 'Hand-poured goods'
                    },
                    productCategoryAssignments: [
                        {
                            vendorBusinessId: 3,
                            vendorProductCategoryId: 2,
                            sortOrder: 0,
                            category: {
                                vendorProductCategoryId: 2,
                                label: 'Candles'
                            }
                        }
                    ],
                    owners: []
                },
                {
                    vendorBusiness: {
                        vendorBusinessId: 1,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved',
                        summary: 'Approved summary'
                    },
                    productCategoryAssignments: [
                        {
                            vendorBusinessId: 1,
                            vendorProductCategoryId: 8,
                            sortOrder: 0,
                            category: {
                                vendorProductCategoryId: 8,
                                label: 'Coffee Beans'
                            }
                        },
                        {
                            vendorBusinessId: 1,
                            vendorProductCategoryId: 3,
                            sortOrder: 1,
                            category: {
                                vendorProductCategoryId: 3,
                                label: 'Stickers'
                            }
                        }
                    ],
                    owners: []
                },
                {
                    vendorBusiness: {
                        vendorBusinessId: 2,
                        slug: 'pending-shop',
                        businessName: 'Pending Shop',
                        approvalStatus: 'pending',
                        summary: 'Pending summary'
                    },
                    productCategoryAssignments: [],
                    owners: []
                }
            ])
        }

        createMarketOpsVendorsRouter(sdk, { vendorBusinessService })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = { query: {} }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/vendors/directory'
            })
        )
        const pageData = renderPage.mock.calls[0][2].locals.marketOpsVendorDirectoryPageData
        const vendorCards = pageData.vendorCards
        const categoryOptions = pageData.categoryOptions
        expect(vendorCards).toHaveLength(2)
        expect(vendorCards.map((vendorCard) => vendorCard.businessName)).toEqual([
            'Alpha Candles',
            'Approved Shop'
        ])
        expect(vendorCards[1].primaryCategoryLabel).toBe('Coffee Beans')
        expect(vendorCards[1].categoryLabels).toEqual(['Coffee Beans', 'Stickers'])
        expect(vendorCards[1].categoryIds).toEqual(['8', '3'])
        expect(vendorCards[1].searchBusinessName).toBe('approved shop')
        expect(vendorCards[1].searchSummary).toBe('approved summary')
        expect(categoryOptions).toEqual([
            {
                vendorProductCategoryId: '2',
                label: 'Candles'
            },
            {
                vendorProductCategoryId: '8',
                label: 'Coffee Beans'
            },
            {
                vendorProductCategoryId: '3',
                label: 'Stickers'
            }
        ])
        expect(next).not.toHaveBeenCalled()
    })

    test('new vendor creation preserves selected category order', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)
        const vendorBusinessService = {
            createVendorBusiness: jest.fn(async () => ({
                vendorBusiness: {
                    slug: 'approved-shop'
                }
            }))
        }

        createMarketOpsNewVendorsRouter(sdk, { vendorBusinessService })

        const route = router.records.post.find((entry) => entry.path === '/')
        const req = {
            body: {
                slug: 'approved-shop',
                businessName: 'Approved Shop',
                productCategoryIds: ['8', '3', '5']
            },
            user: { user_id: 12, permissions: [] }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(vendorBusinessService.createVendorBusiness).toHaveBeenCalledWith(
            expect.objectContaining({
                productCategories: [
                    { vendorProductCategoryId: 8 },
                    { vendorProductCategoryId: 3 },
                    { vendorProductCategoryId: 5 }
                ]
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('approved public profile exposes manage CTA only to owners or admins', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const approvedDetail = {
            vendorBusiness: {
                vendorBusinessId: 3,
                slug: 'approved-shop',
                businessName: 'Approved Shop',
                approvalStatus: 'approved'
            },
            productCategoryAssignments: [],
            owners: [{ userId: 12 }]
        }
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [approvedDetail])
        }
        const applicationService = {
            listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => [
                { vendorApplicationId: 7 },
                { vendorApplicationId: 8 }
            ]),
            getVendorMarketApplicationDetailById: jest.fn(async (vendorApplicationId) => {
                if (vendorApplicationId === 7) {
                    return {
                        application: {
                            vendorApplicationId: 7,
                            vendorBusinessId: 3,
                            status: 'submitted'
                        },
                        marketGroup: {
                            marketGroupId: 6,
                            groupName: 'Holiday Makers Market'
                        },
                        selections: [
                            {
                                applicationMarketSelectionId: 88,
                                selectionStatus: 'approved',
                                market: {
                                    marketId: 12,
                                    marketName: 'November 2026 Holiday Market',
                                    startsAt: Date.parse('2026-11-07T10:00:00-08:00'),
                                    endsAt: Date.parse('2026-11-07T16:00:00-08:00'),
                                    locationId: 14,
                                    isPublic: 1
                                }
                            },
                            {
                                applicationMarketSelectionId: 89,
                                selectionStatus: 'waitlisted',
                                market: {
                                    marketId: 13,
                                    marketName: 'December 2026 Holiday Market',
                                    startsAt: Date.parse('2026-12-05T10:00:00-08:00'),
                                    endsAt: Date.parse('2026-12-05T16:00:00-08:00'),
                                    locationId: 14,
                                    isPublic: 1
                                }
                            }
                        ]
                    }
                }

                return {
                    application: {
                        vendorApplicationId: 8,
                        vendorBusinessId: 3,
                        status: 'withdrawn'
                    },
                    marketGroup: {
                        marketGroupId: 6,
                        groupName: 'Holiday Makers Market'
                    },
                    selections: [
                        {
                            applicationMarketSelectionId: 90,
                            selectionStatus: 'approved',
                            market: {
                                marketId: 14,
                                marketName: 'Hidden Approved Market',
                                startsAt: Date.parse('2026-12-20T10:00:00-08:00'),
                                endsAt: Date.parse('2026-12-20T16:00:00-08:00'),
                                locationId: 14,
                                isPublic: 1
                            }
                        }
                    ]
                }
            })
        }
        const marketSetupService = {
            listLocations: jest.fn(async () => [
                {
                    locationId: 14,
                    locationName: 'Crossroads Neighborhood Church Lobby'
                }
            ])
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService,
            marketSetupService
        })

        const route = router.records.get.find((entry) => entry.path === '/:vendorSlug')
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(
            {
                params: { vendorSlug: 'approved-shop' },
                user: { user_id: 12, permissions: [] }
            },
            res,
            next
        )

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsVendorProfilePageData
                .canManageVendorBusiness
        ).toBe(true)
        expect(
            renderPage.mock.calls[0][2].locals.marketOpsVendorProfilePageData.upcomingMarkets
        ).toEqual([
            expect.objectContaining({
                marketName: 'November 2026 Holiday Market',
                locationName: 'Crossroads Neighborhood Church Lobby'
            })
        ])

        renderPage.mockClear()

        await route.handlers.at(-1)(
            {
                params: { vendorSlug: 'approved-shop' },
                user: { user_id: 99, permissions: [] }
            },
            res,
            next
        )

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsVendorProfilePageData
                .canManageVendorBusiness
        ).toBe(false)

        renderPage.mockClear()

        await route.handlers.at(-1)(
            {
                params: { vendorSlug: 'approved-shop' },
                user: { user_id: 77, permissions: ['admin.access'] }
            },
            res,
            next
        )

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsVendorProfilePageData
                .canManageVendorBusiness
        ).toBe(true)
        expect(next).not.toHaveBeenCalled()
    })

    test('starting an application draft generates an application key', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved'
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ])
        }
        const applicationService = {
            createVendorMarketApplicationDraft: jest.fn(async () => ({
                application: {
                    vendorApplicationId: 7
                }
            }))
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService
        })

        const route = router.records.post.find(
            (entry) => entry.path === '/:vendorSlug/manage/applications'
        )
        const req = {
            params: { vendorSlug: 'approved-shop' },
            body: { marketGroupId: '5' },
            user: { user_id: 12, permissions: [] }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(applicationService.createVendorMarketApplicationDraft).toHaveBeenCalledWith(
            expect.objectContaining({
                application: expect.objectContaining({
                    applicationKey: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
                    marketGroupId: 5,
                    vendorBusinessId: 3
                }),
                selections: []
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('application editor blocks submit when a selected market is outside its application window', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const database = {
            query: jest.fn(async () => [[]]),
            withTransaction: jest.fn()
        }
        const sdk = createSdk(router, renderPage, database)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved'
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ])
        }
        const applicationService = {
            getVendorMarketApplicationDetailById: jest.fn(async () => ({
                application: {
                    vendorApplicationId: 7,
                    vendorBusinessId: 3,
                    marketGroupId: 6,
                    status: 'draft',
                    feeTotalCents: 2500,
                    applicationKey: '01APPKEYTESTVALUE0000000001'
                },
                marketGroup: {
                    marketGroupId: 6,
                    groupName: 'Holiday Makers Market'
                },
                vendorBusiness: {
                    slug: 'approved-shop'
                },
                selections: [
                    {
                        applicationMarketSelectionId: 88,
                        marketId: 12,
                        requestedBoothQuantity: 1,
                        willingToVolunteer: 0,
                        boothPreferences: []
                    }
                ]
            }))
        }
        const futureOpenAt = Date.now() + 7 * 24 * 60 * 60 * 1000
        const marketSetupService = {
            listMarketsByMarketGroupId: jest.fn(async () => [
                {
                    marketId: 12,
                    marketName: 'November 2026 Holiday Market',
                    summary: 'Indoor early holiday shopping event.',
                    applicationsOpen: 1,
                    applicationsOpenAt: futureOpenAt,
                    applicationsCloseAt: futureOpenAt + 7 * 24 * 60 * 60 * 1000
                }
            ]),
            listMarketBoothOfferingsByMarketId: jest.fn(async () => [])
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService,
            marketSetupService
        })

        const route = router.records.get.find(
            (entry) => entry.path === '/:vendorSlug/manage/applications/:vendorApplicationId'
        )
        const req = {
            params: {
                vendorSlug: 'approved-shop',
                vendorApplicationId: '7'
            },
            query: {},
            user: { user_id: 12, permissions: [] }
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        const editor = renderPage.mock.calls[0][2].locals.marketOpsVendorApplicationEditor

        expect(editor.canSubmitApplication).toBe(false)
        expect(editor.submitBlockedMessage).toBe(
            'One or more selected markets are not accepting applications at this time.'
        )
        expect(editor.applicationMarkets[0].applicationWindow.badgeLabel).toBe('Opens Later')
        expect(editor.applicationMarkets[0].applicationWindow.message).toContain(
            'Applications are open between'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('application editor hides withdraw when review has already started', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const database = {
            query: jest.fn(async () => [[]]),
            withTransaction: jest.fn()
        }
        const sdk = createSdk(router, renderPage, database)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved'
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ])
        }
        const applicationService = {
            getVendorMarketApplicationDetailById: jest.fn(async () => ({
                application: {
                    vendorApplicationId: 7,
                    vendorBusinessId: 3,
                    marketGroupId: 6,
                    status: 'submitted',
                    feeTotalCents: 2500,
                    applicationKey: '01APPKEYTESTVALUE0000000001'
                },
                marketGroup: {
                    marketGroupId: 6,
                    groupName: 'Holiday Makers Market'
                },
                vendorBusiness: {
                    slug: 'approved-shop'
                },
                selections: [
                    {
                        applicationMarketSelectionId: 88,
                        marketId: 12,
                        selectionStatus: 'approved',
                        requestedBoothQuantity: 1,
                        willingToVolunteer: 0,
                        boothPreferences: []
                    }
                ]
            }))
        }
        const marketSetupService = {
            listMarketsByMarketGroupId: jest.fn(async () => [
                {
                    marketId: 12,
                    marketName: 'November 2026 Holiday Market',
                    summary: 'Indoor early holiday shopping event.',
                    applicationsOpen: 1,
                    applicationsOpenAt: null,
                    applicationsCloseAt: null
                }
            ]),
            listMarketBoothOfferingsByMarketId: jest.fn(async () => [])
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService,
            marketSetupService
        })

        const route = router.records.get.find(
            (entry) => entry.path === '/:vendorSlug/manage/applications/:vendorApplicationId'
        )
        const req = {
            params: {
                vendorSlug: 'approved-shop',
                vendorApplicationId: '7'
            },
            query: {},
            user: { user_id: 12, permissions: [] }
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        const editor = renderPage.mock.calls[0][2].locals.marketOpsVendorApplicationEditor

        expect(editor.canWithdrawApplication).toBe(false)
        expect(next).not.toHaveBeenCalled()
    })

    test('application editor exposes resubmit controls for withdrawn applications', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const database = {
            query: jest.fn(async () => [[]]),
            withTransaction: jest.fn()
        }
        const sdk = createSdk(router, renderPage, database)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved'
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ])
        }
        const applicationService = {
            getVendorMarketApplicationDetailById: jest.fn(async () => ({
                application: {
                    vendorApplicationId: 7,
                    vendorBusinessId: 3,
                    marketGroupId: 6,
                    status: 'withdrawn',
                    feeTotalCents: 2500,
                    applicationKey: '01APPKEYTESTVALUE0000000001'
                },
                marketGroup: {
                    marketGroupId: 6,
                    groupName: 'Holiday Makers Market'
                },
                vendorBusiness: {
                    slug: 'approved-shop'
                },
                selections: [
                    {
                        applicationMarketSelectionId: 88,
                        marketId: 12,
                        selectionStatus: 'withdrawn',
                        requestedBoothQuantity: 1,
                        willingToVolunteer: 0,
                        boothPreferences: []
                    }
                ]
            }))
        }
        const marketSetupService = {
            listMarketsByMarketGroupId: jest.fn(async () => [
                {
                    marketId: 12,
                    marketName: 'November 2026 Holiday Market',
                    summary: 'Indoor early holiday shopping event.',
                    applicationsOpen: 1,
                    applicationsOpenAt: null,
                    applicationsCloseAt: null
                }
            ]),
            listMarketBoothOfferingsByMarketId: jest.fn(async () => [])
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService,
            marketSetupService
        })

        const route = router.records.get.find(
            (entry) => entry.path === '/:vendorSlug/manage/applications/:vendorApplicationId'
        )
        const req = {
            params: {
                vendorSlug: 'approved-shop',
                vendorApplicationId: '7'
            },
            query: {},
            user: { user_id: 12, permissions: [] }
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        const editor = renderPage.mock.calls[0][2].locals.marketOpsVendorApplicationEditor

        expect(editor.canResubmitApplication).toBe(true)
        expect(editor.resubmitAction).toBe('/vendors/approved-shop/manage/applications/7/resubmit')
        expect(next).not.toHaveBeenCalled()
    })

    test('manage save preserves reordered category ids', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)
        const vendorDetail = {
            vendorBusiness: {
                vendorBusinessId: 3,
                slug: 'approved-shop',
                businessName: 'Approved Shop',
                approvalStatus: 'approved'
            },
            owners: [{ userId: 12 }],
            productCategoryAssignments: [
                {
                    vendorBusinessId: 3,
                    vendorProductCategoryId: 2,
                    sortOrder: 0,
                    category: {
                        vendorProductCategoryId: 2,
                        label: 'Art Prints',
                        isActive: 1
                    }
                }
            ]
        }
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [vendorDetail]),
            updateVendorBusiness: jest.fn(async () => vendorDetail)
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService: {
                listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => [])
            }
        })

        const route = router.records.post.find((entry) => entry.path === '/:vendorSlug/manage')
        const req = {
            params: { vendorSlug: 'approved-shop' },
            body: {
                slug: 'approved-shop',
                businessName: 'Approved Shop',
                productCategoryIds: ['8', '3', '2']
            },
            user: { user_id: 12, permissions: [] }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(vendorBusinessService.updateVendorBusiness).toHaveBeenCalledWith(
            3,
            expect.objectContaining({
                productCategories: [
                    { vendorProductCategoryId: 8 },
                    { vendorProductCategoryId: 3 },
                    { vendorProductCategoryId: 2 }
                ]
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('submit route creates the pending payment-record handoff when a fee is due', async () => {
        const router = createRouterRecorder()
        const database = {
            query: jest
                .fn()
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 9 }])
                .mockResolvedValueOnce([
                    [
                        {
                            payment_record_id: 9,
                            provider_code: 'cash',
                            method_code: 'cash',
                            status_code: 'pending',
                            amount_minor: 2500,
                            currency_code: 'USD',
                            created_at: 100
                        }
                    ]
                ]),
            withTransaction: jest.fn()
        }
        const sdk = createSdk(router, jest.fn(), database)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved',
                        email: 'owner@example.com'
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ])
        }
        const applicationService = {
            submitVendorMarketApplication: jest.fn(async () => ({
                application: {
                    vendorApplicationId: 7,
                    vendorBusinessId: 3,
                    applicationKey: '01APPKEYTESTVALUE0000000001',
                    feeTotalCents: 2500
                },
                vendorBusiness: {
                    email: 'owner@example.com'
                }
            }))
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService
        })

        const route = router.records.post.find(
            (entry) => entry.path === '/:vendorSlug/manage/applications/:vendorApplicationId/submit'
        )
        const req = {
            params: {
                vendorSlug: 'approved-shop',
                vendorApplicationId: '7'
            },
            user: {
                user_id: 12,
                permissions: []
            }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(database.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO ws_plugin_payments_payment_records'),
            expect.arrayContaining([
                'ws_plugin_market_ops',
                'vendor_application_fee',
                '01APPKEYTESTVALUE0000000001'
            ])
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/vendors/approved-shop/manage/applications/7?notice=application-submitted'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('resubmit route restores a withdrawn application to submitted status', async () => {
        const router = createRouterRecorder()
        const database = {
            query: jest
                .fn()
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 9 }])
                .mockResolvedValueOnce([
                    [
                        {
                            payment_record_id: 9,
                            provider_code: 'cash',
                            method_code: 'cash',
                            status_code: 'pending',
                            amount_minor: 2500,
                            currency_code: 'USD',
                            created_at: 100
                        }
                    ]
                ]),
            withTransaction: jest.fn()
        }
        const sdk = createSdk(router, jest.fn(), database)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved',
                        email: 'owner@example.com'
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ])
        }
        const applicationService = {
            resubmitVendorMarketApplication: jest.fn(async () => ({
                application: {
                    vendorApplicationId: 7,
                    vendorBusinessId: 3,
                    applicationKey: '01APPKEYTESTVALUE0000000001',
                    feeTotalCents: 2500
                },
                vendorBusiness: {
                    email: 'owner@example.com'
                }
            }))
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService
        })

        const route = router.records.post.find(
            (entry) =>
                entry.path === '/:vendorSlug/manage/applications/:vendorApplicationId/resubmit'
        )
        const req = {
            params: {
                vendorSlug: 'approved-shop',
                vendorApplicationId: '7'
            },
            user: {
                user_id: 12,
                permissions: []
            }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(applicationService.resubmitVendorMarketApplication).toHaveBeenCalledWith(7, {
            submittedByUserId: 12,
            updatedByUserId: 12
        })
        expect(database.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO ws_plugin_payments_payment_records'),
            expect.arrayContaining([
                'ws_plugin_market_ops',
                'vendor_application_fee',
                '01APPKEYTESTVALUE0000000001'
            ])
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/vendors/approved-shop/manage/applications/7?notice=application-resubmitted'
        )
        expect(next).not.toHaveBeenCalled()
    })
})

describe('createMarketOpsReviewRouter', () => {
    test('registers vendor and application review routes', () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)

        createMarketOpsReviewRouter(sdk, {
            vendorBusinessService: {
                listVendorBusinessDetails: jest.fn(async () => [])
            }
        })

        expect(router.records.get.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                '/vendors',
                '/vendors/:vendorBusinessId',
                '/applications',
                '/applications/:vendorApplicationId'
            ])
        )
        expect(router.records.post.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                '/vendors/:vendorBusinessId/notes',
                '/vendors/:vendorBusinessId/approve',
                '/vendors/:vendorBusinessId/reject',
                '/applications/:vendorApplicationId/selections/:selectionId/approve',
                '/applications/:vendorApplicationId/selections/:selectionId/waitlist',
                '/applications/:vendorApplicationId/selections/:selectionId/reject',
                '/applications/:vendorApplicationId/selections/:selectionId/withdraw'
            ])
        )
    })

    test('vendor review page exposes manage capability for admins and owners', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const vendorDetail = {
            vendorBusiness: {
                vendorBusinessId: 1,
                slug: 'approved-shop',
                businessName: 'Approved Shop',
                approvalStatus: 'approved'
            },
            owners: [{ userId: 12 }],
            productCategoryAssignments: []
        }
        const vendorBusinessService = {
            getVendorBusinessDetailById: jest.fn(async () => vendorDetail)
        }

        createMarketOpsReviewRouter(sdk, { vendorBusinessService })

        const route = router.records.get.find(
            (entry) => entry.path === '/vendors/:vendorBusinessId'
        )
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(
            {
                params: { vendorBusinessId: '1' },
                query: {},
                user: { user_id: 88, permissions: ['admin.access'] }
            },
            res,
            next
        )

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsVendorReviewPageData.canManageVendorBusiness
        ).toBe(true)

        renderPage.mockClear()

        await route.handlers.at(-1)(
            {
                params: { vendorBusinessId: '1' },
                query: {},
                user: { user_id: 12, permissions: [] }
            },
            res,
            next
        )

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsVendorReviewPageData.canManageVendorBusiness
        ).toBe(true)
        expect(next).not.toHaveBeenCalled()
    })
})

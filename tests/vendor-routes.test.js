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

function createSdk(router, renderPage = jest.fn(), database = null, settingsOverrides = {}) {
    const defaultSettings = {
        'ws_plugin_market_ops.public_vendors_enabled': 'true',
        'ws_plugin_market_ops.public_markets_enabled': 'true',
        'ws_plugin_market_ops.auto_approve_vendor_businesses': 'false'
    }

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
            },
            settings: {
                get: jest.fn((key) =>
                    Object.prototype.hasOwnProperty.call(settingsOverrides, key)
                        ? settingsOverrides[key]
                        : (defaultSettings[key] ?? '')
                )
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

    test('directory returns not-found when public markets are disabled', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage, null, {
            'ws_plugin_market_ops.public_markets_enabled': 'false'
        })

        createMarketOpsMarketsRouter(sdk, {
            marketSetupService: {
                listMarketGroups: jest.fn(async () => []),
                listLocations: jest.fn(async () => []),
                listMarketsByMarketGroupId: jest.fn(async () => [])
            }
        })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = { query: {} }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/not-found'
            })
        )
        expect(next).not.toHaveBeenCalled()
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
        expect(
            renderPage.mock.calls[0][2].locals.marketOpsMarketsDirectoryPageData
                .publicVendorsEnabled
        ).toBe(true)
        expect(next).not.toHaveBeenCalled()
    })

    test('directory page data hides vendor-directory link when public vendors are disabled', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage, null, {
            'ws_plugin_market_ops.public_vendors_enabled': 'false'
        })
        const marketSetupService = {
            listMarketGroups: jest.fn(async () => []),
            listLocations: jest.fn(async () => []),
            listMarketsByMarketGroupId: jest.fn(async () => [])
        }

        createMarketOpsMarketsRouter(sdk, { marketSetupService })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = { query: {} }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsMarketsDirectoryPageData
                .publicVendorsEnabled
        ).toBe(false)
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
                '/:vendorSlug/manage/archive',
                '/:vendorSlug/manage/restore',
                '/:vendorSlug/manage/applications',
                '/:vendorSlug/manage/applications/:vendorApplicationId',
                '/:vendorSlug/manage/applications/:vendorApplicationId/submit',
                '/:vendorSlug/manage/applications/:vendorApplicationId/withdraw',
                '/:vendorSlug/manage/applications/:vendorApplicationId/resubmit'
            ])
        )
    })

    test('vendor business resubmit auto-approves when the setting is enabled', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn(), null, {
            'ws_plugin_market_ops.auto_approve_vendor_businesses': 'true'
        })
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 5,
                        slug: 'cedar-pine-workshop',
                        businessName: 'Cedar Pine Workshop',
                        approvalStatus: 'rejected',
                        archivedAt: null
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ]),
            approveVendorBusiness: jest.fn(async () => ({})),
            resubmitVendorBusinessForApproval: jest.fn(async () => ({}))
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService: {
                listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => [])
            },
            marketSetupService: {
                listLocations: jest.fn(async () => [])
            }
        })

        const route = router.records.post.find(
            (entry) => entry.path === '/:vendorSlug/manage/resubmit'
        )
        const req = {
            params: { vendorSlug: 'cedar-pine-workshop' },
            user: { user_id: 12, permissions: [] }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(vendorBusinessService.approveVendorBusiness).toHaveBeenCalledWith(
            5,
            expect.objectContaining({
                approvalNotes: null,
                approvedByUserId: null,
                updatedByUserId: 12
            })
        )
        expect(vendorBusinessService.resubmitVendorBusinessForApproval).not.toHaveBeenCalled()
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/vendors/cedar-pine-workshop/manage?notice=vendor-business-resubmitted'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('public market detail returns not-found when public markets are disabled', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage, null, {
            'ws_plugin_market_ops.public_markets_enabled': 'false'
        })

        createMarketOpsMarketsRouter(sdk, {
            marketSetupService: {
                listMarketGroups: jest.fn(async () => []),
                listLocations: jest.fn(async () => []),
                listMarketsByMarketGroupId: jest.fn(async () => [])
            }
        })

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
                page: 'pages/market-ops/not-found'
            })
        )
        expect(next).not.toHaveBeenCalled()
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
                legalName: 'Scott Lassiter',
                phone: '7139069917',
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

    test('new vendor creation auto-suffixes duplicate generated slugs', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 1,
                        slug: 'wayfind-entertainment-llc',
                        businessName: 'Wayfind Entertainment LLC',
                        approvalStatus: 'approved'
                    }
                }
            ]),
            createVendorBusiness: jest.fn(async (input) => ({
                vendorBusiness: {
                    slug: input.vendorBusiness.slug
                }
            }))
        }

        createMarketOpsNewVendorsRouter(sdk, { vendorBusinessService })

        const route = router.records.post.find((entry) => entry.path === '/')
        const req = {
            body: {
                slug: '',
                businessName: 'Wayfind Entertainment LLC',
                legalName: 'Scott Lassiter',
                phone: '7139069917'
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
                vendorBusiness: expect.objectContaining({
                    slug: 'wayfind-entertainment-llc-2'
                })
            })
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/vendors/wayfind-entertainment-llc-2/manage?notice=vendor-business-created'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('new vendor creation auto-approves when the setting is enabled', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn(), null, {
            'ws_plugin_market_ops.auto_approve_vendor_businesses': 'true'
        })
        const vendorBusinessService = {
            createVendorBusiness: jest.fn(async (input) => ({
                vendorBusiness: {
                    slug: input.vendorBusiness.slug
                }
            }))
        }

        createMarketOpsNewVendorsRouter(sdk, { vendorBusinessService })

        const route = router.records.post.find((entry) => entry.path === '/')
        const req = {
            body: {
                businessName: 'Approved Shop',
                legalName: 'Scott Lassiter',
                phone: '7139069917'
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
                vendorBusiness: expect.objectContaining({
                    approvalStatus: 'approved',
                    approvedAt: expect.any(Number),
                    approvedByUserId: null
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('approved public profile exposes manage CTA only to owners or users with vendor-manage access', async () => {
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
                user: { user_id: 77, permissions: ['ws_plugin_market_ops.vendor.manage'] }
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

    test('public vendor directory returns not-found when public vendors are disabled', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage, null, {
            'ws_plugin_market_ops.public_vendors_enabled': 'false'
        })

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService: {
                listVendorBusinessDetails: jest.fn(async () => [])
            }
        })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = { query: {} }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/not-found'
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('public vendor profile returns not-found when public vendors are disabled', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage, null, {
            'ws_plugin_market_ops.public_vendors_enabled': 'false'
        })
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved',
                        archivedAt: null
                    },
                    productCategoryAssignments: [],
                    owners: []
                }
            ])
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService: {
                listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => []),
                getVendorMarketApplicationDetailById: jest.fn()
            },
            marketSetupService: {
                listLocations: jest.fn(async () => [])
            }
        })

        const route = router.records.get.find((entry) => entry.path === '/:vendorSlug')
        const req = {
            params: { vendorSlug: 'approved-shop' },
            query: {}
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/not-found'
            })
        )
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

    test('public directory and profile exclude archived vendor businesses', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'archived-approved-shop',
                        businessName: 'Archived Approved Shop',
                        approvalStatus: 'approved',
                        archivedAt: 2000,
                        summary: 'Should be hidden'
                    },
                    productCategoryAssignments: [],
                    owners: [{ userId: 12 }]
                }
            ])
        }

        createMarketOpsVendorsRouter(sdk, { vendorBusinessService })

        const directoryRoute = router.records.get.find((entry) => entry.path === '/')
        const profileRoute = router.records.get.find((entry) => entry.path === '/:vendorSlug')
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await directoryRoute.handlers.at(-1)({ query: {} }, res, next)

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsVendorDirectoryPageData.vendorCards
        ).toEqual([])

        renderPage.mockClear()

        await profileRoute.handlers.at(-1)(
            {
                params: { vendorSlug: 'archived-approved-shop' },
                query: {}
            },
            res,
            next
        )

        expect(renderPage).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            expect.objectContaining({
                page: 'pages/market-ops/not-found'
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('vendor manage page allows non-owner users with vendor-manage permission', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const database = {
            query: jest.fn(async () => [[]]),
            withTransaction: jest.fn()
        }
        const sdk = createSdk(router, renderPage, database)
        const vendorDetail = {
            vendorBusiness: {
                vendorBusinessId: 3,
                slug: 'approved-shop',
                businessName: 'Approved Shop',
                approvalStatus: 'approved',
                archivedAt: null
            },
            owners: [{ userId: 12 }],
            productCategoryAssignments: []
        }
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [vendorDetail])
        }
        const applicationService = {
            listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => [])
        }

        createMarketOpsVendorsRouter(sdk, { vendorBusinessService, applicationService })

        const route = router.records.get.find((entry) => entry.path === '/:vendorSlug/manage')
        const req = {
            params: { vendorSlug: 'approved-shop' },
            query: {},
            user: { user_id: 77, permissions: ['ws_plugin_market_ops.vendor.manage'] }
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/vendors/manage'
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('new-vendors keeps archived owned businesses visible', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const vendorBusinessService = {
            listVendorBusinessesByOwnerUserId: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 3,
                        slug: 'archived-shop',
                        businessName: 'Archived Shop',
                        approvalStatus: 'approved',
                        archivedAt: 2000
                    },
                    owners: [{ userId: 12 }],
                    productCategoryAssignments: []
                }
            ])
        }

        createMarketOpsNewVendorsRouter(sdk, { vendorBusinessService })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = { query: {}, user: { user_id: 12, permissions: [] } }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsNewVendorsPageData.ownedBusinesses
        ).toEqual([
            expect.objectContaining({
                vendorBusiness: expect.objectContaining({
                    slug: 'archived-shop',
                    archivedAt: 2000
                })
            })
        ])
        expect(next).not.toHaveBeenCalled()
    })

    test('new-vendors page data hides the public vendors link when public vendors are disabled', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage, null, {
            'ws_plugin_market_ops.public_vendors_enabled': 'false'
        })
        const vendorBusinessService = {
            listVendorBusinessesByOwnerUserId: jest.fn(async () => [])
        }

        createMarketOpsNewVendorsRouter(sdk, { vendorBusinessService })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = { query: {}, user: { user_id: 12, permissions: [] } }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(
            renderPage.mock.calls[0][2].locals.marketOpsNewVendorsPageData.publicVendorsEnabled
        ).toBe(false)
        expect(next).not.toHaveBeenCalled()
    })

    test('new-vendors pre-fills owner name from the authenticated account display name', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const vendorBusinessService = {
            listVendorBusinessesByOwnerUserId: jest.fn(async () => [])
        }

        createMarketOpsNewVendorsRouter(sdk, { vendorBusinessService })

        const route = router.records.get.find((entry) => entry.path === '/')
        const req = {
            query: {},
            user: { user_id: 12, permissions: [], display_name: 'Keldy Owner' }
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage.mock.calls[0][2].locals.marketOpsNewVendorsPageData.formValues).toEqual(
            expect.objectContaining({
                legalName: 'Keldy Owner'
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
                legalName: 'Scott Lassiter',
                phone: '7139069917',
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

    test('manage save renders a friendly message for duplicate vendor slugs', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
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
            updateVendorBusiness: jest.fn(async () => {
                const err = new Error(
                    "Duplicate entry 'wayfind-entertainment-llc' for key 'market_ops_vendor_businesses.uk_market_ops_vendor_businesses_slug'"
                )
                err.code = 'ER_DUP_ENTRY'
                err.sqlMessage =
                    "Duplicate entry 'wayfind-entertainment-llc' for key 'market_ops_vendor_businesses.uk_market_ops_vendor_businesses_slug'"
                throw err
            })
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
                slug: 'wayfind-entertainment-llc',
                businessName: 'Approved Shop',
                legalName: 'Scott Lassiter',
                phone: '7139069917'
            },
            user: { user_id: 12, permissions: [] }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                locals: expect.objectContaining({
                    marketOpsVendorManagePageData: expect.objectContaining({
                        flash: expect.objectContaining({
                            type: 'danger',
                            message:
                                'That business link is already being used. Please choose a different slug.'
                        })
                    })
                })
            })
        )
        expect(res.redirect).not.toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
    })

    test('manage archive route archives the business and redirects with a success notice', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)
        const vendorDetail = {
            vendorBusiness: {
                vendorBusinessId: 3,
                slug: 'approved-shop',
                businessName: 'Approved Shop',
                approvalStatus: 'approved',
                archivedAt: null
            },
            owners: [{ userId: 12 }],
            productCategoryAssignments: []
        }
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [vendorDetail]),
            archiveVendorBusiness: jest.fn(async () => vendorDetail)
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService: {
                listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => [])
            }
        })

        const route = router.records.post.find(
            (entry) => entry.path === '/:vendorSlug/manage/archive'
        )
        const req = {
            params: { vendorSlug: 'approved-shop' },
            body: { archiveConfirmationName: 'Approved Shop' },
            user: { user_id: 12, permissions: [] }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(vendorBusinessService.archiveVendorBusiness).toHaveBeenCalledWith(3, {
            archivedByUserId: 12,
            updatedByUserId: 12
        })
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/vendors/approved-shop/manage?notice=vendor-business-archived'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('manage restore route restores the business and redirects with a success notice', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)
        const vendorDetail = {
            vendorBusiness: {
                vendorBusinessId: 3,
                slug: 'archived-shop',
                businessName: 'Archived Shop',
                approvalStatus: 'approved',
                archivedAt: 2000
            },
            owners: [{ userId: 12 }],
            productCategoryAssignments: []
        }
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [vendorDetail]),
            restoreVendorBusiness: jest.fn(async () => vendorDetail)
        }

        createMarketOpsVendorsRouter(sdk, {
            vendorBusinessService,
            applicationService: {
                listVendorMarketApplicationsByVendorBusinessId: jest.fn(async () => [])
            }
        })

        const route = router.records.post.find(
            (entry) => entry.path === '/:vendorSlug/manage/restore'
        )
        const req = {
            params: { vendorSlug: 'archived-shop' },
            body: {},
            user: { user_id: 12, permissions: [] }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(vendorBusinessService.restoreVendorBusiness).toHaveBeenCalledWith(3, {
            updatedByUserId: 12
        })
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/vendors/archived-shop/manage?notice=vendor-business-restored'
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

    test('vendor review page exposes manage capability for market-ops-manage users and owners', async () => {
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
                user: { user_id: 88, permissions: ['ws_plugin_market_ops.manage'] }
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

    test('review router requires Market Ops read and manage permissions', () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)

        createMarketOpsReviewRouter(sdk, {
            vendorBusinessService: {
                listVendorBusinessDetails: jest.fn(async () => [])
            }
        })

        expect(sdk.web.guards.requirePermissions).toHaveBeenCalledWith([
            'ws_plugin_market_ops.read',
            'ws_plugin_market_ops.manage'
        ])
    })

    test('vendor review list includes archived businesses in page data and exposes archived as a filter status', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 1,
                        slug: 'visible-shop',
                        businessName: 'Visible Shop',
                        approvalStatus: 'approved',
                        archivedAt: null,
                        approvalNotes: null
                    },
                    owners: [],
                    productCategoryAssignments: []
                },
                {
                    vendorBusiness: {
                        vendorBusinessId: 2,
                        slug: 'archived-shop',
                        businessName: 'Archived Shop',
                        approvalStatus: 'approved',
                        archivedAt: 2000,
                        approvalNotes: null
                    },
                    owners: [],
                    productCategoryAssignments: []
                }
            ])
        }

        createMarketOpsReviewRouter(sdk, { vendorBusinessService })

        const route = router.records.get.find((entry) => entry.path === '/vendors')
        const req = {
            query: {},
            user: { user_id: 12, permissions: ['ws_plugin_market_ops.manage'] }
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage.mock.calls[0][2].locals.marketOpsVendorsPageData).toEqual(
            expect.objectContaining({
                statusOptions: [
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'archived', label: 'Archived' }
                ],
                vendorCards: expect.arrayContaining([
                    expect.objectContaining({
                        businessName: 'Visible Shop',
                        searchBusinessName: 'visible shop',
                        approvalStatus: 'approved',
                        isArchived: false
                    }),
                    expect.objectContaining({
                        businessName: 'Archived Shop',
                        searchBusinessName: 'archived shop',
                        approvalStatus: 'approved',
                        isArchived: true
                    })
                ])
            })
        )
        expect(vendorBusinessService.listVendorBusinessDetails).toHaveBeenCalledWith({
            includeArchived: true
        })
        expect(next).not.toHaveBeenCalled()
    })
})

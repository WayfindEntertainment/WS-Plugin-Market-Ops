/* eslint-disable jsdoc/require-jsdoc, prefer-destructuring */

import { jest } from '@jest/globals'

import { createMarketOpsNewVendorsRouter, createMarketOpsVendorsRouter } from '../vendor-routes.js'
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
                '/:vendorSlug/manage/applications/:vendorApplicationId/withdraw'
            ])
        )
    })

    test('directory renders approved vendors only', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const vendorBusinessService = {
            listVendorBusinessDetails: jest.fn(async () => [
                {
                    vendorBusiness: {
                        vendorBusinessId: 1,
                        slug: 'approved-shop',
                        businessName: 'Approved Shop',
                        approvalStatus: 'approved',
                        summary: 'Approved summary'
                    },
                    productCategoryAssignments: [],
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
                page: 'pages/vendors/directory',
                locals: expect.objectContaining({
                    marketOpsVendorDirectoryPageData: expect.objectContaining({
                        vendorCards: [
                            expect.objectContaining({
                                businessName: 'Approved Shop'
                            })
                        ]
                    })
                })
            })
        )
        const vendorCards =
            renderPage.mock.calls[0][2].locals.marketOpsVendorDirectoryPageData.vendorCards
        expect(vendorCards).toHaveLength(1)
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

        createMarketOpsVendorsRouter(sdk, { vendorBusinessService })

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
                            provider_code: 'stripe',
                            method_code: 'checkout',
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

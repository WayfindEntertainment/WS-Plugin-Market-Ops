/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */

import { jest } from '@jest/globals'

import {
    buildBoothTypeInputFromFormValues,
    buildBoothTypeFormValues,
    buildLocationInputFromFormValues,
    buildLocationFormValues,
    buildMarketBoothOfferingInputFromFormValues,
    buildMarketBoothOfferingFormValues,
    buildMarketGroupInputFromFormValues,
    buildMarketGroupFormValues,
    buildMarketInputFromFormValues,
    buildMarketFormValues,
    buildVendorProductCategoryFormValues,
    buildVendorProductCategoryInputFromFormValues,
    buildVendorProductCategoryOrderInput,
    createMarketOpsPublicRouter,
    formatDatetimeLocalValue,
    resolveNotice
} from '../routes.js'

/**
 *
 */
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

/**
 *
 * @param router
 * @param renderPage
 */
function createSdk(router, renderPage = jest.fn()) {
    let isFirstRouter = true

    return {
        web: {
            createRouter: () => {
                if (isFirstRouter) {
                    isFirstRouter = false
                    return router
                }

                return createRouterRecorder()
            },
            renderPage,
            guards: {
                requireAuth: jest.fn((_req, _res, next) => next?.()),
                requirePermissions: jest.fn(() => (_req, _res, next) => next?.())
            }
        },
        services: {
            database: {
                query: jest.fn(),
                withTransaction: jest.fn()
            }
        }
    }
}

describe('Market Ops route helpers', () => {
    test('buildLocationFormValues and buildLocationInputFromFormValues normalize editor fields', () => {
        const formValues = buildLocationFormValues({
            slug: ' crossroads-inside ',
            locationName: ' Crossroads Inside ',
            addressLine1: ' 123 Main ',
            publicNotes: ' Indoor only '
        })

        expect(formValues).toEqual({
            slug: 'crossroads-inside',
            locationName: 'Crossroads Inside',
            addressLine1: '123 Main',
            addressLine2: '',
            city: '',
            stateCode: '',
            postalCode: '',
            publicNotes: 'Indoor only',
            isActive: '1'
        })

        expect(buildLocationInputFromFormValues(formValues, 9)).toEqual({
            slug: 'crossroads-inside',
            locationName: 'Crossroads Inside',
            addressLine1: '123 Main',
            addressLine2: null,
            city: null,
            stateCode: null,
            postalCode: null,
            publicNotes: 'Indoor only',
            isActive: 1,
            createdByUserId: 9,
            updatedByUserId: 9
        })
    })

    test('buildLocationFormValues and buildLocationInputFromFormValues preserve inactive state', () => {
        const formValues = buildLocationFormValues({
            slug: 'crossroads-outside',
            locationName: 'Crossroads Outside',
            isActive: '0'
        })

        expect(formValues.isActive).toBe('0')
        expect(buildLocationInputFromFormValues(formValues, 12).isActive).toBe(0)
    })

    test('buildLocationFormValues treats a missing checkbox as inactive during post parsing', () => {
        const formValues = buildLocationFormValues(
            {
                slug: 'crossroads-outside',
                locationName: 'Crossroads Outside'
            },
            { isActiveFallback: '0' }
        )

        expect(formValues.isActive).toBe('0')
    })

    test('buildLocationInputFromFormValues normalizes state codes to uppercase', () => {
        const input = buildLocationInputFromFormValues(
            buildLocationFormValues({
                slug: 'crossroads-inside',
                locationName: 'Crossroads Inside',
                stateCode: 'wa'
            }),
            9
        )

        expect(input.stateCode).toBe('WA')
    })

    test('buildLocationInputFromFormValues rejects invalid state codes before hitting MySQL', () => {
        expect(() =>
            buildLocationInputFromFormValues(
                buildLocationFormValues({
                    slug: 'crossroads-inside',
                    locationName: 'Crossroads Inside',
                    stateCode: 'Washington'
                }),
                9
            )
        ).toThrow('State must be a 2-letter code such as WA')
    })

    test('buildLocationInputFromFormValues rejects overlong schema-backed strings', () => {
        expect(() =>
            buildLocationInputFromFormValues(
                buildLocationFormValues({
                    slug: 'x'.repeat(129),
                    locationName: 'Crossroads Inside'
                }),
                9
            )
        ).toThrow('Slug must be 128 characters or fewer')

        expect(() =>
            buildLocationInputFromFormValues(
                buildLocationFormValues({
                    slug: 'crossroads-inside',
                    locationName: 'Crossroads Inside',
                    postalCode: 'x'.repeat(33)
                }),
                9
            )
        ).toThrow('Postal code must be 32 characters or fewer')
    })

    test('buildMarketGroupInputFromFormValues parses fee settings and public flag', () => {
        const formValues = buildMarketGroupFormValues({
            slug: 'summer-2026',
            groupName: 'Summer 2026',
            feeMode: 'per_market',
            feeAmountDollars: '25.00',
            isPublic: '1'
        })

        expect(formValues.feeAmountDollars).toBe('25.00')
        expect(buildMarketGroupInputFromFormValues(formValues, 4)).toEqual({
            slug: 'summer-2026',
            groupName: 'Summer 2026',
            summary: null,
            description: null,
            feeMode: 'per_market',
            feeAmountCents: 2500,
            isPublic: 1,
            createdByUserId: 4,
            updatedByUserId: 4
        })
    })

    test('buildMarketGroupFormValues formats stored cents back into dollars', () => {
        const formValues = buildMarketGroupFormValues({
            feeMode: 'per_group',
            feeAmountCents: 3750
        })

        expect(formValues.feeAmountDollars).toBe('37.50')
    })

    test('buildMarketGroupInputFromFormValues rejects invalid dollar input', () => {
        expect(() =>
            buildMarketGroupInputFromFormValues(
                buildMarketGroupFormValues({
                    slug: 'summer-2026',
                    groupName: 'Summer 2026',
                    feeMode: 'per_group',
                    feeAmountDollars: '25.999'
                }),
                4
            )
        ).toThrow('Application fee must be a valid dollar amount')
    })

    test('buildMarketInputFromFormValues parses date/time and application-window fields', () => {
        const formValues = buildMarketFormValues({
            locationId: '2',
            slug: 'may-1',
            marketName: 'May 1',
            startsAtInput: '2026-05-01T08:00',
            endsAtInput: '2026-05-01T16:00',
            applicationsOpen: '1',
            applicationsOpenAtInput: '2026-04-01T08:00',
            applicationsCloseAtInput: '2026-04-29T16:00',
            feeAmountCents: '0',
            isPublic: '1'
        })
        const input = buildMarketInputFromFormValues(7, formValues, 11)

        expect(input.marketGroupId).toBe(7)
        expect(input.locationId).toBe(2)
        expect(input.slug).toBe('may-1')
        expect(input.marketName).toBe('May 1')
        expect(input.applicationsOpen).toBe(1)
        expect(input.feeAmountCents).toBe(0)
        expect(input.isPublic).toBe(1)
        expect(typeof input.startsAt).toBe('number')
        expect(typeof input.endsAt).toBe('number')
        expect(typeof input.applicationsOpenAt).toBe('number')
        expect(typeof input.applicationsCloseAt).toBe('number')
    })

    test('buildMarketBoothOfferingInputFromFormValues parses booth offering numbers', () => {
        const formValues = buildMarketBoothOfferingFormValues({
            boothTypeId: '3',
            boothNumber: '18',
            priceCents: '12000',
            isActive: '1',
            sortOrder: '2'
        })

        expect(buildMarketBoothOfferingInputFromFormValues(8, formValues, 4)).toEqual({
            marketId: 8,
            boothTypeId: 3,
            boothNumber: 18,
            priceCents: 12000,
            isActive: 1,
            sortOrder: 2,
            createdByUserId: 4,
            updatedByUserId: 4
        })
    })

    test('buildBoothTypeFormValues treats a missing checkbox as inactive during post parsing', () => {
        const formValues = buildBoothTypeFormValues(
            {
                slug: 'parking-space',
                label: 'Parking Space',
                sortOrder: '0'
            },
            { isActiveFallback: '0' }
        )

        expect(formValues.isActive).toBe('0')
    })

    test('buildBoothTypeInputFromFormValues rejects overlong schema-backed strings', () => {
        expect(() =>
            buildBoothTypeInputFromFormValues(
                buildBoothTypeFormValues({
                    slug: 'x'.repeat(129),
                    label: 'Parking Space',
                    sortOrder: '0'
                }),
                4
            )
        ).toThrow('Slug must be 128 characters or fewer')

        expect(() =>
            buildBoothTypeInputFromFormValues(
                buildBoothTypeFormValues({
                    slug: 'parking-space',
                    label: 'x'.repeat(256),
                    sortOrder: '0'
                }),
                4
            )
        ).toThrow('Label must be 255 characters or fewer')
    })

    test('buildVendorProductCategoryFormValues treats a missing checkbox as inactive during post parsing', () => {
        const formValues = buildVendorProductCategoryFormValues(
            {
                slug: 'baked-goods',
                label: 'Baked Goods'
            },
            { isActiveFallback: '0' }
        )

        expect(formValues.isActive).toBe('0')
    })

    test('buildVendorProductCategoryInputFromFormValues rejects overlong schema-backed strings', () => {
        expect(() =>
            buildVendorProductCategoryInputFromFormValues(
                buildVendorProductCategoryFormValues({
                    slug: 'x'.repeat(129),
                    label: 'Baked Goods'
                }),
                4
            )
        ).toThrow('Slug must be 128 characters or fewer')

        expect(() =>
            buildVendorProductCategoryInputFromFormValues(
                buildVendorProductCategoryFormValues({
                    slug: 'baked-goods',
                    label: 'x'.repeat(256)
                }),
                4
            )
        ).toThrow('Label must be 255 characters or fewer')
    })

    test('buildVendorProductCategoryOrderInput normalizes repeated ordered ids', () => {
        expect(buildVendorProductCategoryOrderInput(['4', '9', '12'])).toEqual([4, 9, 12])
    })

    test('resolveNotice returns mapped success flashes', () => {
        expect(resolveNotice({ notice: 'market-created' })).toEqual({
            type: 'success',
            message: 'Market created.'
        })
        expect(resolveNotice({ notice: 'unknown-code' })).toBeNull()
    })

    test('formatDatetimeLocalValue returns a datetime-local string for valid epochs', () => {
        const epochMs = Date.parse('2026-05-01T08:00:00')

        expect(formatDatetimeLocalValue(epochMs)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        expect(formatDatetimeLocalValue(null)).toBe('')
    })
})

describe('createMarketOpsPublicRouter', () => {
    test('registers auth gate plus core GET and POST routes', () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router)

        createMarketOpsPublicRouter(sdk, {
            marketSetupService: {
                listLocations: jest.fn(),
                listMarketGroups: jest.fn(),
                listMarketsByMarketGroupId: jest.fn(),
                listBoothTypes: jest.fn()
            }
        })

        expect(router.records.use).toHaveLength(2)
        expect(router.records.use[1].handlers[0]).toEqual(
            expect.objectContaining({
                records: expect.objectContaining({
                    get: expect.arrayContaining([
                        expect.objectContaining({ path: '/vendors' }),
                        expect.objectContaining({ path: '/applications' })
                    ])
                })
            })
        )
        expect(router.records.get.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                '/',
                '/setup',
                '/product-categories/create',
                '/product-categories/:vendorProductCategoryId',
                '/booth-types/create',
                '/booth-types/:boothTypeId',
                '/locations',
                '/locations/create',
                '/market-groups',
                '/market-groups/create',
                '/reports'
            ])
        )
        expect(router.records.post.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                '/product-categories/create',
                '/product-categories/:vendorProductCategoryId',
                '/product-categories/reorder',
                '/booth-types/create',
                '/booth-types/:boothTypeId',
                '/locations/create',
                '/market-groups/create'
            ])
        )
    })

    test('renders the dashboard with aggregated setup data', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            listLocations: jest.fn(async () => [{ locationId: 2, locationName: 'Crossroads' }]),
            listMarketGroups: jest.fn(async () => [
                { marketGroupId: 4, groupName: 'Summer 2026', feeMode: 'none', feeAmountCents: 0 }
            ]),
            listMarketsByMarketGroupId: jest.fn(async () => [{ marketId: 8 }]),
            listBoothTypes: jest.fn(async () => [{ boothTypeId: 3, label: "8'x8'" }])
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const dashboardRoute = router.records.get.find((route) => route.path === '/')
        const req = {
            query: {},
            user: { user_id: 1 }
        }
        const res = {
            status: jest.fn().mockReturnThis()
        }
        const next = jest.fn()

        await dashboardRoute.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/dashboard',
                surface: 'public',
                locals: expect.objectContaining({
                    marketOpsDashboardPageData: expect.objectContaining({
                        counts: {
                            locationCount: 1,
                            marketGroupCount: 1,
                            marketCount: 1,
                            boothTypeCount: 1
                        }
                    })
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('renders market groups with human-friendly fee presentation data', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            listMarketGroups: jest.fn(async () => [
                {
                    marketGroupId: 4,
                    groupName: 'Summer 2026',
                    slug: 'summer-2026',
                    summary: 'Peak season markets',
                    description: null,
                    feeMode: 'per_group',
                    feeAmountCents: 2500,
                    isPublic: 1
                }
            ]),
            listMarketsByMarketGroupId: jest.fn(async () => [{ marketId: 8 }, { marketId: 9 }])
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.get.find((entry) => entry.path === '/market-groups')
        const req = {
            query: {},
            user: { user_id: 1 }
        }
        const res = {
            status: jest.fn().mockReturnThis()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/market-groups',
                locals: expect.objectContaining({
                    marketOpsMarketGroupsPageData: {
                        marketGroupCards: [
                            expect.objectContaining({
                                marketCount: 2,
                                visibilityLabel: 'Public',
                                feePresentation: {
                                    modeLabel: 'One fee per market group',
                                    feeSummary: '$25.00 once for the full group'
                                }
                            })
                        ]
                    }
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('renders market group detail with schedule-style market presentation data', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            getMarketGroupDetailById: jest.fn(async () => ({
                marketGroup: {
                    marketGroupId: 4,
                    groupName: 'Summer 2026'
                },
                markets: [
                    {
                        marketId: 8,
                        locationId: 2,
                        marketName: 'Opening Market',
                        startsAt: Date.parse('2026-05-01T08:00:00'),
                        endsAt: Date.parse('2026-05-01T16:00:00'),
                        applicationsOpen: 1,
                        isPublic: 1
                    }
                ]
            })),
            listLocations: jest.fn(async () => [
                { locationId: 2, locationName: 'Crossroads Inside' }
            ])
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.get.find((entry) => entry.path === '/market-groups/:groupId')
        const req = {
            params: { groupId: '4' },
            query: {},
            user: { user_id: 1 }
        }
        const res = {
            status: jest.fn().mockReturnThis()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/market-group-editor',
                locals: expect.objectContaining({
                    marketOpsMarketGroupEditor: expect.objectContaining({
                        marketScheduleItems: [
                            expect.objectContaining({
                                marketId: 8,
                                marketName: 'Opening Market',
                                locationName: 'Crossroads Inside',
                                visibilityLabel: 'Public',
                                applicationsLabel: 'Applications Open',
                                dayLabel: expect.any(String),
                                timeRangeLabel: expect.any(String)
                            })
                        ]
                    })
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('renders the setup page with locations and booth types', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            listLocations: jest.fn(async () => [{ locationId: 2, locationName: 'Crossroads' }]),
            listBoothTypes: jest.fn(async () => [{ boothTypeId: 3, label: "8'x8'" }]),
            listVendorProductCategories: jest.fn(async () => [
                { vendorProductCategoryId: 4, label: 'Baked Goods' }
            ])
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const setupRoute = router.records.get.find((route) => route.path === '/setup')
        const req = {
            query: { section: 'product_categories' },
            user: { user_id: 1 }
        }
        const res = {
            status: jest.fn().mockReturnThis()
        }
        const next = jest.fn()

        await setupRoute.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/setup',
                surface: 'public',
                locals: expect.objectContaining({
                    marketOpsSetupActiveSection: 'product_categories',
                    marketOpsSetupPageData: {
                        locations: [{ locationId: 2, locationName: 'Crossroads' }],
                        boothTypes: [{ boothTypeId: 3, label: "8'x8'" }],
                        productCategories: [{ vendorProductCategoryId: 4, label: 'Baked Goods' }]
                    }
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('creates a product category and redirects to its detail page', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            listVendorProductCategories: jest.fn(async () => [{ vendorProductCategoryId: 4 }]),
            createVendorProductCategory: jest.fn(async () => ({ vendorProductCategoryId: 9 }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find(
            (entry) => entry.path === '/product-categories/create'
        )
        const req = {
            body: {
                slug: 'baked-goods',
                label: 'Baked Goods',
                isActive: '1'
            },
            user: { user_id: 7 }
        }
        const res = { redirect: jest.fn() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.createVendorProductCategory).toHaveBeenCalledWith(
            expect.objectContaining({
                slug: 'baked-goods',
                label: 'Baked Goods',
                sortOrder: 1,
                createdByUserId: 7,
                updatedByUserId: 7
            })
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/market-ops/setup?notice=product-category-created&section=product_categories'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('renders the product category editor with the stored active state in form values', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            getVendorProductCategoryById: jest.fn(async () => ({
                vendorProductCategoryId: 9,
                slug: 'baked-goods',
                label: 'Baked Goods',
                description: 'Fresh bread and pastries',
                isActive: 0,
                sortOrder: 3
            }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.get.find(
            (entry) => entry.path === '/product-categories/:vendorProductCategoryId'
        )
        const req = {
            params: { vendorProductCategoryId: '9' },
            query: {},
            user: { user_id: 1 }
        }
        const res = { status: jest.fn().mockReturnThis() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/product-category-editor',
                locals: expect.objectContaining({
                    marketOpsVendorProductCategoryEditor: expect.objectContaining({
                        formValues: expect.objectContaining({
                            isActive: '0'
                        })
                    })
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('reorders product categories and redirects back to the setup tab', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            reorderVendorProductCategories: jest.fn(async () => [])
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find(
            (entry) => entry.path === '/product-categories/reorder'
        )
        const req = {
            body: {
                orderedVendorProductCategoryIds: ['9', '4', '12']
            },
            user: { user_id: 7 }
        }
        const res = { redirect: jest.fn() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.reorderVendorProductCategories).toHaveBeenCalledWith(
            [9, 4, 12],
            7
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/market-ops/setup?notice=product-category-order-updated&section=product_categories'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('updates a product category and redirects back to the setup tab', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            getVendorProductCategoryById: jest.fn(async () => ({
                vendorProductCategoryId: 9,
                slug: 'baked-goods',
                label: 'Baked Goods',
                description: 'Fresh bread and pastries',
                isActive: 1,
                sortOrder: 3,
                createdByUserId: 4
            })),
            updateVendorProductCategoryById: jest.fn(async () => ({
                vendorProductCategoryId: 9
            }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find(
            (entry) => entry.path === '/product-categories/:vendorProductCategoryId'
        )
        const req = {
            params: { vendorProductCategoryId: '9' },
            body: {
                slug: 'baked-goods',
                label: 'Baked Goods',
                description: 'Fresh bread and pastries'
            },
            user: { user_id: 7 }
        }
        const res = { redirect: jest.fn() }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.updateVendorProductCategoryById).toHaveBeenCalledWith(
            9,
            expect.objectContaining({
                slug: 'baked-goods',
                label: 'Baked Goods',
                updatedByUserId: 7
            })
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/market-ops/setup?notice=product-category-updated&section=product_categories'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('redirects the legacy locations route to setup with the locations section active', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())

        createMarketOpsPublicRouter(sdk, {
            marketSetupService: {
                listLocations: jest.fn(),
                listMarketGroups: jest.fn(),
                listMarketsByMarketGroupId: jest.fn(),
                listBoothTypes: jest.fn()
            }
        })

        const locationsRoute = router.records.get.find((route) => route.path === '/locations')
        const req = {
            query: {
                notice: 'location-created'
            },
            user: { user_id: 1 }
        }
        const res = {
            redirect: jest.fn()
        }
        const next = jest.fn()

        await locationsRoute.handlers.at(-1)(req, res, next)

        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/market-ops/setup?notice=location-created&section=locations'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('creates a location and redirects to its detail page', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            createLocation: jest.fn(async () => ({ locationId: 12 }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find((entry) => entry.path === '/locations/create')
        const req = {
            body: {
                slug: 'crossroads-inside',
                locationName: 'Crossroads Inside'
            },
            user: { user_id: 7 }
        }
        const res = {
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.createLocation).toHaveBeenCalledWith(
            expect.objectContaining({
                slug: 'crossroads-inside',
                locationName: 'Crossroads Inside',
                createdByUserId: 7,
                updatedByUserId: 7
            })
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/market-ops/locations/12?notice=location-created'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('creates a location as inactive when the active checkbox is unchecked', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            createLocation: jest.fn(async () => ({ locationId: 12 }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find((entry) => entry.path === '/locations/create')
        const req = {
            body: {
                slug: 'crossroads-inside',
                locationName: 'Crossroads Inside'
            },
            user: { user_id: 7 }
        }
        const res = {
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.createLocation).toHaveBeenCalledWith(
            expect.objectContaining({
                isActive: 0
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('renders the location editor with the stored active state in form values', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            getLocationById: jest.fn(async () => ({
                locationId: 12,
                slug: 'crossroads-inside',
                locationName: 'Crossroads Inside',
                addressLine1: null,
                addressLine2: null,
                city: null,
                stateCode: null,
                postalCode: null,
                publicNotes: null,
                isActive: 0
            }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.get.find((entry) => entry.path === '/locations/:locationId')
        const req = {
            params: { locationId: '12' },
            query: {},
            user: { user_id: 1 }
        }
        const res = {
            status: jest.fn().mockReturnThis()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/location-editor',
                locals: expect.objectContaining({
                    marketOpsLocationEditor: expect.objectContaining({
                        formValues: expect.objectContaining({
                            isActive: '0'
                        })
                    })
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('renders the booth type editor with the stored active state in form values', async () => {
        const router = createRouterRecorder()
        const renderPage = jest.fn()
        const sdk = createSdk(router, renderPage)
        const marketSetupService = {
            getBoothTypeById: jest.fn(async () => ({
                boothTypeId: 9,
                slug: '8x8',
                label: "8'x8'",
                description: 'Square booth',
                isActive: 0,
                sortOrder: 3
            }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.get.find((entry) => entry.path === '/booth-types/:boothTypeId')
        const req = {
            params: { boothTypeId: '9' },
            query: {},
            user: { user_id: 1 }
        }
        const res = {
            status: jest.fn().mockReturnThis()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(renderPage).toHaveBeenCalledWith(
            req,
            res,
            expect.objectContaining({
                page: 'pages/market-ops/booth-type-editor',
                locals: expect.objectContaining({
                    marketOpsBoothTypeEditor: expect.objectContaining({
                        formValues: expect.objectContaining({
                            isActive: '0'
                        })
                    })
                })
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('creates a booth type and redirects to its detail page', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            createBoothType: jest.fn(async () => ({ boothTypeId: 9 }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find((entry) => entry.path === '/booth-types/create')
        const req = {
            body: {
                slug: '8x8',
                label: "8'x8'",
                sortOrder: '0',
                isActive: '1'
            },
            user: { user_id: 7 }
        }
        const res = {
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.createBoothType).toHaveBeenCalledWith(
            expect.objectContaining({
                slug: '8x8',
                label: "8'x8'",
                createdByUserId: 7,
                updatedByUserId: 7
            })
        )
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            '/market-ops/booth-types/9?notice=booth-type-created'
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('creates a booth type as inactive when the active checkbox is unchecked', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            createBoothType: jest.fn(async () => ({ boothTypeId: 9 }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find((entry) => entry.path === '/booth-types/create')
        const req = {
            body: {
                slug: 'parking-space',
                label: 'Parking Space',
                sortOrder: '0'
            },
            user: { user_id: 7 }
        }
        const res = {
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.createBoothType).toHaveBeenCalledWith(
            expect.objectContaining({
                isActive: 0
            })
        )
        expect(next).not.toHaveBeenCalled()
    })

    test('updates a booth type as inactive when the active checkbox is unchecked', async () => {
        const router = createRouterRecorder()
        const sdk = createSdk(router, jest.fn())
        const marketSetupService = {
            getBoothTypeById: jest.fn(async () => ({
                boothTypeId: 9,
                slug: '8x8',
                label: "8'x8'",
                description: 'Square booth',
                isActive: 1,
                sortOrder: 3
            })),
            updateBoothTypeById: jest.fn(async () => ({
                boothTypeId: 9
            }))
        }

        createMarketOpsPublicRouter(sdk, { marketSetupService })

        const route = router.records.post.find(
            (entry) => entry.path === '/booth-types/:boothTypeId'
        )
        const req = {
            params: { boothTypeId: '9' },
            body: {
                slug: '8x8',
                label: "8'x8'",
                description: 'Square booth',
                sortOrder: '3'
            },
            user: { user_id: 7 }
        }
        const res = {
            redirect: jest.fn()
        }
        const next = jest.fn()

        await route.handlers.at(-1)(req, res, next)

        expect(marketSetupService.updateBoothTypeById).toHaveBeenCalledWith(
            9,
            expect.objectContaining({
                isActive: 0
            })
        )
        expect(next).not.toHaveBeenCalled()
    })
})

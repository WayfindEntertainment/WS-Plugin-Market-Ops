/* eslint-disable jsdoc/require-jsdoc, no-nested-ternary, prefer-destructuring */

import createMarketOpsApplicationReviewService from './services/application-review-service.js'
import createMarketOpsMarketSetupService from './services/market-setup-service.js'
import createMarketOpsVendorBusinessService from './services/vendor-business-service.js'

const MARKET_OPS_PERMISSION_CODES = ['ws_plugin_market_ops.read', 'admin.access']

const VENDOR_APPROVAL_STATUS_ORDER = {
    pending: 0,
    approved: 1,
    rejected: 2
}

const APPLICATION_STATUS_ORDER = {
    submitted: 0,
    draft: 1,
    withdrawn: 2
}

const ADMIN_NOTICE_MESSAGES = {
    'vendor-approved': { type: 'success', message: 'Vendor approved.' },
    'vendor-notes-updated': { type: 'success', message: 'Vendor notes updated.' },
    'vendor-rejected': { type: 'success', message: 'Vendor rejected.' },
    'selection-approved': { type: 'success', message: 'Market selection approved.' },
    'selection-waitlisted': { type: 'success', message: 'Market selection waitlisted.' },
    'selection-rejected': { type: 'success', message: 'Market selection rejected.' },
    'selection-withdrawn': { type: 'success', message: 'Market selection withdrawn.' }
}

const USD_CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
})

function createRouteError(code, message, statusCode = 400) {
    const err = new Error(message)
    err.name = 'MarketOpsReviewRouteError'
    err.code = code
    err.statusCode = statusCode
    return err
}

function assertSdk(sdk) {
    if (
        !sdk ||
        typeof sdk !== 'object' ||
        typeof sdk?.web?.createRouter !== 'function' ||
        typeof sdk?.web?.renderPage !== 'function' ||
        typeof sdk?.web?.guards?.requireAuth !== 'function' ||
        typeof sdk?.web?.guards?.requirePermissions !== 'function' ||
        !sdk?.services?.database
    ) {
        throw createRouteError(
            'INVALID_MARKET_OPS_PLUGIN_SDK',
            'Market Ops review routes require the plugin SDK web and database seams',
            500
        )
    }

    return sdk
}

function normalizeTrimmedString(value, fallback = '') {
    if (typeof value === 'string') {
        return value.trim()
    }

    if (value == null) {
        return fallback
    }

    return String(value).trim()
}

function normalizeOptionalString(value) {
    const normalizedValue = normalizeTrimmedString(value)

    return normalizedValue.length > 0 ? normalizedValue : null
}

function isAdminUser(req) {
    return Array.isArray(req?.user?.permissions) && req.user.permissions.includes('admin.access')
}

function normalizePositiveIntegerField(value, fieldName, errorCode) {
    const normalizedValue = normalizeTrimmedString(value)

    if (!/^\d+$/.test(normalizedValue)) {
        throw createRouteError(errorCode, `${fieldName} must be a positive integer`)
    }

    const parsedValue = Number.parseInt(normalizedValue, 10)

    if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
        throw createRouteError(errorCode, `${fieldName} must be a positive integer`)
    }

    return parsedValue
}

function normalizeDollarAmountField(value, fieldName, errorCode) {
    const normalizedValue = normalizeTrimmedString(value, '0')

    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
        throw createRouteError(errorCode, `${fieldName} must be a valid dollar amount`)
    }

    const parsedValue = Number.parseFloat(normalizedValue)

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw createRouteError(errorCode, `${fieldName} must be a valid dollar amount`)
    }

    return Math.round(parsedValue * 100)
}

function resolveRouteId(value) {
    const normalizedValue = normalizeTrimmedString(value)

    if (!/^\d+$/.test(normalizedValue)) {
        return null
    }

    const parsedValue = Number.parseInt(normalizedValue, 10)

    return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

function formatCurrencyFromCents(cents) {
    const normalizedCents = Number.isFinite(Number(cents)) ? Number(cents) : 0

    return USD_CURRENCY_FORMATTER.format(normalizedCents / 100)
}

function resolveNotice(query = {}) {
    const code = typeof query.notice === 'string' ? query.notice.trim() : ''

    return ADMIN_NOTICE_MESSAGES[code] ?? null
}

async function renderPageForMarketOps(
    req,
    res,
    renderPage,
    { page, title, locals, statusCode = 200 }
) {
    await renderPage(req, res.status(statusCode), {
        surface: 'public',
        page,
        title,
        locals,
        pageViewEvent: {
            context: {
                pluginArea: 'market-ops-review',
                pluginPage: page
            }
        }
    })
}

async function renderNotFound(req, res, renderPage, title, description) {
    await renderPageForMarketOps(req, res, renderPage, {
        page: 'pages/market-ops/not-found',
        title,
        statusCode: 404,
        locals: {
            marketOpsNotFound: {
                title,
                description
            }
        }
    })
}

function isRecoverableReviewError(err) {
    return (
        !!err &&
        typeof err === 'object' &&
        (err.name === 'MarketOpsReviewRouteError' ||
            [
                'VENDOR_BUSINESS_NOT_FOUND',
                'VENDOR_MARKET_APPLICATION_NOT_FOUND',
                'APPLICATION_MARKET_SELECTION_NOT_FOUND',
                'MARKET_BOOTH_OFFERING_NOT_IN_MARKET',
                'ER_DUP_ENTRY'
            ].includes(err.code))
    )
}

function getErrorMessage(err, fallbackMessage) {
    if (typeof err?.message === 'string' && err.message.trim().length > 0) {
        return err.message
    }

    return fallbackMessage
}

async function listUserSummariesByIds(database, userIds) {
    const normalizedUserIds = Array.from(
        new Set(
            (Array.isArray(userIds) ? userIds : [])
                .map((value) => Number(value))
                .filter((value) => Number.isSafeInteger(value) && value > 0)
        )
    )

    if (normalizedUserIds.length === 0) {
        return []
    }

    const placeholders = normalizedUserIds.map(() => '?').join(', ')
    const [rows] = await database.query(
        `
        SELECT
            users.user_id,
            users.email,
            profiles.display_name
        FROM kernel_users AS users
        LEFT JOIN kernel_user_profiles AS profiles
            ON profiles.user_id = users.user_id
        WHERE users.user_id IN (${placeholders})
        ORDER BY COALESCE(profiles.display_name, users.email) ASC, users.user_id ASC
        `,
        normalizedUserIds
    )

    return Array.isArray(rows)
        ? rows.map((row) => ({
              userId: Number(row.user_id),
              email: typeof row.email === 'string' ? row.email : null,
              displayName:
                  typeof row.display_name === 'string' && row.display_name.trim().length > 0
                      ? row.display_name
                      : typeof row.email === 'string'
                        ? row.email
                        : `User #${row.user_id}`
          }))
        : []
}

async function listApplicationRows(database) {
    const [rows] = await database.query(
        `
        SELECT vendor_application_id
        FROM market_ops_vendor_market_applications
        ORDER BY
            CASE status
                WHEN 'submitted' THEN 0
                WHEN 'draft' THEN 1
                WHEN 'withdrawn' THEN 2
                ELSE 99
            END ASC,
            submitted_at DESC,
            created_at DESC,
            vendor_application_id DESC
        `
    )

    return Array.isArray(rows) ? rows.map((row) => Number(row.vendor_application_id)) : []
}

function buildVendorReviewCards(details) {
    return [...details]
        .sort((left, right) => {
            const statusDiff =
                (VENDOR_APPROVAL_STATUS_ORDER[left.vendorBusiness.approvalStatus] ?? 99) -
                (VENDOR_APPROVAL_STATUS_ORDER[right.vendorBusiness.approvalStatus] ?? 99)

            if (statusDiff !== 0) {
                return statusDiff
            }

            return (
                left.vendorBusiness.businessName.localeCompare(right.vendorBusiness.businessName) ||
                left.vendorBusiness.vendorBusinessId - right.vendorBusiness.vendorBusinessId
            )
        })
        .map((detail) => ({
            vendorBusinessId: detail.vendorBusiness.vendorBusinessId,
            businessName: detail.vendorBusiness.businessName,
            slug: detail.vendorBusiness.slug,
            approvalStatus: detail.vendorBusiness.approvalStatus,
            approvalNotes: detail.vendorBusiness.approvalNotes,
            categoryLabels: detail.productCategoryAssignments
                .map((assignment) => assignment.category?.label)
                .filter(Boolean)
        }))
}

function buildApplicationReviewCards(details) {
    return [...details]
        .sort((left, right) => {
            const statusDiff =
                (APPLICATION_STATUS_ORDER[left.application.status] ?? 99) -
                (APPLICATION_STATUS_ORDER[right.application.status] ?? 99)

            if (statusDiff !== 0) {
                return statusDiff
            }

            return right.application.createdAt - left.application.createdAt
        })
        .map((detail) => ({
            vendorApplicationId: detail.application.vendorApplicationId,
            status: detail.application.status,
            vendorBusinessName: detail.vendorBusiness?.businessName ?? 'Vendor Business',
            marketGroupName: detail.marketGroup?.groupName ?? 'Market Group',
            selectionCount: detail.selections.length,
            requestedCount: detail.selections.filter(
                (selection) => selection.selectionStatus === 'requested'
            ).length,
            approvedCount: detail.selections.filter(
                (selection) => selection.selectionStatus === 'approved'
            ).length,
            feeTotalLabel: formatCurrencyFromCents(detail.application.feeTotalCents)
        }))
}

function buildSelectionDecisionFormValues(selection, fallback = {}) {
    return {
        assignedMarketBoothOfferingId: normalizeTrimmedString(
            fallback.assignedMarketBoothOfferingId,
            selection?.assignedMarketBoothOfferingId
                ? String(selection.assignedMarketBoothOfferingId)
                : ''
        ),
        assignedBoothQuantity: normalizeTrimmedString(
            fallback.assignedBoothQuantity,
            selection?.assignedBoothQuantity ? String(selection.assignedBoothQuantity) : '1'
        ),
        boothFeeTotalDollars:
            typeof fallback.boothFeeTotalDollars === 'string'
                ? normalizeTrimmedString(fallback.boothFeeTotalDollars, '0.00') || '0.00'
                : ((selection?.boothFeeTotalCents ?? 0) / 100).toFixed(2),
        decisionNotes: normalizeTrimmedString(
            fallback.decisionNotes,
            selection?.decisionNotes ?? ''
        )
    }
}

function buildDependencies(sdk, overrides = {}) {
    const database = sdk.services.database

    return {
        database,
        vendorBusinessService:
            overrides.vendorBusinessService ?? createMarketOpsVendorBusinessService(database),
        applicationReviewService:
            overrides.applicationReviewService ?? createMarketOpsApplicationReviewService(database),
        marketSetupService:
            overrides.marketSetupService ?? createMarketOpsMarketSetupService(database)
    }
}

export function createMarketOpsReviewRouter(sdk, overrides = {}) {
    const normalizedSdk = assertSdk(sdk)
    const { createRouter, renderPage, guards } = normalizedSdk.web
    const { requireAuth, requirePermissions } = guards
    const { vendorBusinessService, applicationReviewService, marketSetupService, database } =
        buildDependencies(normalizedSdk, overrides)
    const router = createRouter()

    router.use(requireAuth, requirePermissions(MARKET_OPS_PERMISSION_CODES))

    router.get('/vendors', async (req, res, next) => {
        try {
            const vendorDetails = await vendorBusinessService.listVendorBusinessDetails()

            await renderPageForMarketOps(req, res, renderPage, {
                page: 'pages/market-ops/vendors',
                title: 'Market Ops Vendors',
                locals: {
                    marketOpsVendorsPageData: {
                        flash: resolveNotice(req.query),
                        vendorCards: buildVendorReviewCards(vendorDetails)
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/vendors/:vendorBusinessId', async (req, res, next) => {
        const vendorBusinessId = resolveRouteId(req?.params?.vendorBusinessId)

        if (!vendorBusinessId) {
            await renderNotFound(
                req,
                res,
                renderPage,
                'Vendor Not Found',
                'That vendor business could not be found.'
            )
            return
        }

        try {
            const detail = await vendorBusinessService.getVendorBusinessDetailById(vendorBusinessId)
            const ownerProfiles = await listUserSummariesByIds(
                database,
                detail.owners.map((owner) => owner.userId)
            )
            const currentUserId = req?.user?.user_id ?? null
            const canManageVendorBusiness =
                isAdminUser(req) || detail.owners.some((owner) => owner.userId === currentUserId)

            await renderPageForMarketOps(req, res, renderPage, {
                page: 'pages/market-ops/vendor-review',
                title: detail.vendorBusiness.businessName,
                locals: {
                    marketOpsVendorReviewPageData: {
                        flash: resolveNotice(req.query),
                        vendorDetail: detail,
                        ownerProfiles,
                        canManageVendorBusiness,
                        notesAction: `/market-ops/vendors/${vendorBusinessId}/notes`,
                        approveAction: `/market-ops/vendors/${vendorBusinessId}/approve`,
                        rejectAction: `/market-ops/vendors/${vendorBusinessId}/reject`
                    }
                }
            })
        } catch (err) {
            if (err?.code === 'VENDOR_BUSINESS_NOT_FOUND') {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Vendor Not Found',
                    'That vendor business could not be found.'
                )
                return
            }

            next(err)
        }
    })

    router.post('/vendors/:vendorBusinessId/approve', async (req, res, next) => {
        const vendorBusinessId = resolveRouteId(req?.params?.vendorBusinessId)

        if (!vendorBusinessId) {
            await renderNotFound(
                req,
                res,
                renderPage,
                'Vendor Not Found',
                'That vendor business could not be found.'
            )
            return
        }

        try {
            await vendorBusinessService.approveVendorBusiness(vendorBusinessId, {
                approvalNotes: normalizeOptionalString(req?.body?.approvalNotes),
                approvedByUserId: req?.user?.user_id ?? null,
                updatedByUserId: req?.user?.user_id ?? null
            })

            res.redirect(303, `/market-ops/vendors/${vendorBusinessId}?notice=vendor-approved`)
        } catch (err) {
            next(err)
        }
    })

    router.post('/vendors/:vendorBusinessId/notes', async (req, res, next) => {
        const vendorBusinessId = resolveRouteId(req?.params?.vendorBusinessId)

        if (!vendorBusinessId) {
            await renderNotFound(
                req,
                res,
                renderPage,
                'Vendor Not Found',
                'That vendor business could not be found.'
            )
            return
        }

        try {
            await vendorBusinessService.updateVendorBusinessApprovalNotes(vendorBusinessId, {
                approvalNotes: normalizeOptionalString(req?.body?.approvalNotes),
                updatedByUserId: req?.user?.user_id ?? null
            })

            res.redirect(303, `/market-ops/vendors/${vendorBusinessId}?notice=vendor-notes-updated`)
        } catch (err) {
            next(err)
        }
    })

    router.post('/vendors/:vendorBusinessId/reject', async (req, res, next) => {
        const vendorBusinessId = resolveRouteId(req?.params?.vendorBusinessId)

        if (!vendorBusinessId) {
            await renderNotFound(
                req,
                res,
                renderPage,
                'Vendor Not Found',
                'That vendor business could not be found.'
            )
            return
        }

        try {
            await vendorBusinessService.rejectVendorBusiness(vendorBusinessId, {
                approvalNotes: normalizeOptionalString(req?.body?.approvalNotes),
                rejectedByUserId: req?.user?.user_id ?? null,
                updatedByUserId: req?.user?.user_id ?? null
            })

            res.redirect(303, `/market-ops/vendors/${vendorBusinessId}?notice=vendor-rejected`)
        } catch (err) {
            next(err)
        }
    })

    router.get('/applications', async (req, res, next) => {
        try {
            const applicationIds = await listApplicationRows(database)
            const details = await Promise.all(
                applicationIds.map((vendorApplicationId) =>
                    applicationReviewService.getVendorMarketApplicationReviewById(
                        vendorApplicationId
                    )
                )
            )

            await renderPageForMarketOps(req, res, renderPage, {
                page: 'pages/market-ops/applications',
                title: 'Market Ops Applications',
                locals: {
                    marketOpsApplicationsPageData: {
                        flash: resolveNotice(req.query),
                        applicationCards: buildApplicationReviewCards(details)
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/applications/:vendorApplicationId', async (req, res, next) => {
        const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)

        if (!vendorApplicationId) {
            await renderNotFound(
                req,
                res,
                renderPage,
                'Application Not Found',
                'That vendor application could not be found.'
            )
            return
        }

        try {
            const detail =
                await applicationReviewService.getVendorMarketApplicationReviewById(
                    vendorApplicationId
                )
            const boothOfferingLists = await Promise.all(
                detail.selections.map((selection) =>
                    marketSetupService.listMarketBoothOfferingsByMarketId(selection.marketId)
                )
            )

            await renderPageForMarketOps(req, res, renderPage, {
                page: 'pages/market-ops/application-review',
                title: `Application #${vendorApplicationId}`,
                locals: {
                    marketOpsApplicationReviewPageData: {
                        flash: resolveNotice(req.query),
                        applicationDetail: detail,
                        selectionDecisionCards: detail.selections.map((selection, index) => ({
                            selection,
                            boothOfferingOptions: boothOfferingLists[index]
                                .filter((offering) => offering.isActive === 1)
                                .map((offering) => ({
                                    marketBoothOfferingId: offering.marketBoothOfferingId,
                                    boothNumber: offering.boothNumber,
                                    priceLabel: formatCurrencyFromCents(offering.priceCents)
                                })),
                            formValues: buildSelectionDecisionFormValues(selection)
                        }))
                    }
                }
            })
        } catch (err) {
            if (err?.code === 'VENDOR_MARKET_APPLICATION_NOT_FOUND') {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That vendor application could not be found.'
                )
                return
            }

            next(err)
        }
    })

    router.post(
        '/applications/:vendorApplicationId/selections/:selectionId/approve',
        async (req, res, next) => {
            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)
            const selectionId = resolveRouteId(req?.params?.selectionId)

            if (!vendorApplicationId || !selectionId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That vendor application could not be found.'
                )
                return
            }

            try {
                await applicationReviewService.approveApplicationMarketSelection(selectionId, {
                    assignedMarketBoothOfferingId: normalizePositiveIntegerField(
                        req?.body?.assignedMarketBoothOfferingId,
                        'Assigned booth offering',
                        'INVALID_MARKET_BOOTH_OFFERING_ID'
                    ),
                    assignedBoothQuantity: normalizePositiveIntegerField(
                        req?.body?.assignedBoothQuantity,
                        'Assigned booth quantity',
                        'INVALID_ASSIGNED_BOOTH_QUANTITY'
                    ),
                    boothFeeTotalCents: normalizeDollarAmountField(
                        req?.body?.boothFeeTotalDollars,
                        'Booth fee total',
                        'INVALID_BOOTH_FEE_TOTAL_CENTS'
                    ),
                    decisionNotes: normalizeOptionalString(req?.body?.decisionNotes),
                    decidedByUserId: req?.user?.user_id ?? null,
                    updatedByUserId: req?.user?.user_id ?? null
                })

                res.redirect(
                    303,
                    `/market-ops/applications/${vendorApplicationId}?notice=selection-approved`
                )
            } catch (err) {
                if (!isRecoverableReviewError(err)) {
                    next(err)
                    return
                }

                try {
                    const detail =
                        await applicationReviewService.getVendorMarketApplicationReviewById(
                            vendorApplicationId
                        )
                    const boothOfferingLists = await Promise.all(
                        detail.selections.map((selection) =>
                            marketSetupService.listMarketBoothOfferingsByMarketId(
                                selection.marketId
                            )
                        )
                    )

                    await renderPageForMarketOps(req, res, renderPage, {
                        page: 'pages/market-ops/application-review',
                        title: `Application #${vendorApplicationId}`,
                        statusCode: err.statusCode ?? 400,
                        locals: {
                            marketOpsApplicationReviewPageData: {
                                flash: {
                                    type: 'danger',
                                    message: getErrorMessage(
                                        err,
                                        'We could not approve that market selection.'
                                    )
                                },
                                applicationDetail: detail,
                                selectionDecisionCards: detail.selections.map(
                                    (selection, index) => ({
                                        selection,
                                        boothOfferingOptions: boothOfferingLists[index]
                                            .filter((offering) => offering.isActive === 1)
                                            .map((offering) => ({
                                                marketBoothOfferingId:
                                                    offering.marketBoothOfferingId,
                                                boothNumber: offering.boothNumber,
                                                priceLabel: formatCurrencyFromCents(
                                                    offering.priceCents
                                                )
                                            })),
                                        formValues:
                                            selection.applicationMarketSelectionId === selectionId
                                                ? buildSelectionDecisionFormValues(
                                                      selection,
                                                      req.body
                                                  )
                                                : buildSelectionDecisionFormValues(selection)
                                    })
                                )
                            }
                        }
                    })
                } catch (renderErr) {
                    next(renderErr)
                }
            }
        }
    )

    router.post(
        '/applications/:vendorApplicationId/selections/:selectionId/waitlist',
        async (req, res, next) => {
            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)
            const selectionId = resolveRouteId(req?.params?.selectionId)

            if (!vendorApplicationId || !selectionId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That vendor application could not be found.'
                )
                return
            }

            try {
                await applicationReviewService.waitlistApplicationMarketSelection(selectionId, {
                    decisionNotes: normalizeOptionalString(req?.body?.decisionNotes),
                    decidedByUserId: req?.user?.user_id ?? null,
                    updatedByUserId: req?.user?.user_id ?? null
                })

                res.redirect(
                    303,
                    `/market-ops/applications/${vendorApplicationId}?notice=selection-waitlisted`
                )
            } catch (err) {
                next(err)
            }
        }
    )

    router.post(
        '/applications/:vendorApplicationId/selections/:selectionId/reject',
        async (req, res, next) => {
            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)
            const selectionId = resolveRouteId(req?.params?.selectionId)

            if (!vendorApplicationId || !selectionId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That vendor application could not be found.'
                )
                return
            }

            try {
                await applicationReviewService.rejectApplicationMarketSelection(selectionId, {
                    decisionNotes: normalizeOptionalString(req?.body?.decisionNotes),
                    decidedByUserId: req?.user?.user_id ?? null,
                    updatedByUserId: req?.user?.user_id ?? null
                })

                res.redirect(
                    303,
                    `/market-ops/applications/${vendorApplicationId}?notice=selection-rejected`
                )
            } catch (err) {
                next(err)
            }
        }
    )

    router.post(
        '/applications/:vendorApplicationId/selections/:selectionId/withdraw',
        async (req, res, next) => {
            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)
            const selectionId = resolveRouteId(req?.params?.selectionId)

            if (!vendorApplicationId || !selectionId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That vendor application could not be found.'
                )
                return
            }

            try {
                await applicationReviewService.withdrawApplicationMarketSelection(selectionId, {
                    decisionNotes: normalizeOptionalString(req?.body?.decisionNotes),
                    decidedByUserId: req?.user?.user_id ?? null,
                    updatedByUserId: req?.user?.user_id ?? null
                })

                res.redirect(
                    303,
                    `/market-ops/applications/${vendorApplicationId}?notice=selection-withdrawn`
                )
            } catch (err) {
                next(err)
            }
        }
    )

    return router
}

export default createMarketOpsReviewRouter

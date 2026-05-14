/* eslint-disable jsdoc/require-jsdoc, no-nested-ternary, prefer-destructuring */

import createMarketOpsApplicationService from './services/application-service.js'
import createMarketOpsMarketSetupService from './services/market-setup-service.js'
import createMarketOpsVendorBusinessService from './services/vendor-business-service.js'
import { listVendorProductCategories } from './storage/catalog-storage.js'

const VENDOR_APPROVAL_STATUS_ORDER = {
    pending: 0,
    approved: 1,
    rejected: 2
}

const APPLICATION_STATUS_ORDER = {
    draft: 0,
    submitted: 1,
    withdrawn: 2
}

const APPLICATION_FEE_MODE_LABELS = {
    none: 'No application fee',
    per_group: 'One fee per market group',
    per_market: 'Fee per selected market'
}

const VENDOR_NOTICE_MESSAGES = {
    'vendor-business-created': { type: 'success', message: 'Vendor business created.' },
    'vendor-business-resubmitted': {
        type: 'success',
        message: 'Vendor business resubmitted for approval.'
    },
    'vendor-business-updated': { type: 'success', message: 'Vendor business updated.' },
    'application-created': { type: 'success', message: 'Application draft created.' },
    'application-updated': { type: 'success', message: 'Application draft updated.' },
    'application-submitted': { type: 'success', message: 'Application submitted.' },
    'application-withdrawn': { type: 'success', message: 'Application withdrawn.' }
}

const USD_CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
})
const MARKET_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
})
const MARKET_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
})

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function createRouteError(code, message, statusCode = 400) {
    const err = new Error(message)
    err.name = 'MarketOpsVendorRouteError'
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
        !sdk?.services?.database
    ) {
        throw createRouteError(
            'INVALID_MARKET_OPS_PLUGIN_SDK',
            'Market Ops vendor routes require the plugin SDK web and database seams',
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

function slugifyVendorBusinessName(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function encodeUlidBase32(value, length) {
    let remainingValue = Math.max(0, Number(value) || 0)
    let encodedValue = ''

    for (let index = 0; index < length; index += 1) {
        encodedValue = ULID_ALPHABET[remainingValue % 32] + encodedValue
        remainingValue = Math.floor(remainingValue / 32)
    }

    return encodedValue
}

function createApplicationKey() {
    const timestampPart = encodeUlidBase32(Date.now(), 10)
    let randomPart = ''

    for (let index = 0; index < 16; index += 1) {
        randomPart += ULID_ALPHABET[Math.floor(Math.random() * ULID_ALPHABET.length)]
    }

    return `${timestampPart}${randomPart}`
}

function normalizeCheckboxValue(value, fallback = '0') {
    if (value === true || value === 1 || value === '1' || value === 'on') {
        return '1'
    }

    if (value === false || value === 0 || value === '0') {
        return '0'
    }

    return fallback
}

function isCheckedValue(value) {
    return normalizeCheckboxValue(value, '0') === '1'
}

function normalizeRequiredBoundedStringField(value, fieldName, maxLength, errorCode) {
    const normalizedValue = normalizeTrimmedString(value)

    if (!normalizedValue) {
        throw createRouteError(errorCode, `${fieldName} is required`)
    }

    if (normalizedValue.length > maxLength) {
        throw createRouteError(errorCode, `${fieldName} must be ${maxLength} characters or fewer`)
    }

    return normalizedValue
}

function normalizeOptionalBoundedStringField(value, fieldName, maxLength, errorCode) {
    const normalizedValue = normalizeOptionalString(value)

    if (normalizedValue == null) {
        return null
    }

    if (normalizedValue.length > maxLength) {
        throw createRouteError(errorCode, `${fieldName} must be ${maxLength} characters or fewer`)
    }

    return normalizedValue
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

function formatMarketDateTime(timestamp) {
    return `${MARKET_DATE_FORMATTER.format(timestamp)} at ${MARKET_TIME_FORMATTER.format(timestamp)}`
}

function resolveNotice(query = {}) {
    const code = typeof query.notice === 'string' ? query.notice.trim() : ''

    return VENDOR_NOTICE_MESSAGES[code] ?? null
}

function isRecoverableVendorRouteError(err) {
    return (
        !!err &&
        typeof err === 'object' &&
        (err.name === 'MarketOpsVendorRouteError' ||
            [
                'VENDOR_BUSINESS_NOT_FOUND',
                'VENDOR_BUSINESS_NOT_APPROVED',
                'MARKET_GROUP_NOT_FOUND',
                'VENDOR_MARKET_APPLICATION_NOT_FOUND',
                'MARKET_NOT_IN_GROUP',
                'MARKET_APPLICATIONS_CLOSED',
                'DUPLICATE_APPLICATION_MARKET_SELECTION_MARKET_IDS',
                'DUPLICATE_APPLICATION_MARKET_BOOTH_OFFERING_IDS',
                'DUPLICATE_APPLICATION_MARKET_BOOTH_PREFERENCE_RANKS',
                'MARKET_BOOTH_OFFERING_NOT_IN_SELECTED_MARKET',
                'EMPTY_VENDOR_MARKET_APPLICATION_SELECTIONS',
                'VENDOR_MARKET_APPLICATION_ALREADY_SUBMITTED',
                'VENDOR_MARKET_APPLICATION_ALREADY_WITHDRAWN',
                'VENDOR_BUSINESS_NOT_REJECTED',
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

function isAdminUser(req) {
    return Array.isArray(req?.user?.permissions) && req.user.permissions.includes('admin.access')
}

async function renderPluginPage(req, res, renderPage, { page, title, locals, statusCode = 200 }) {
    await renderPage(req, res.status(statusCode), {
        surface: 'public',
        page,
        title,
        locals,
        pageViewEvent: {
            context: {
                pluginArea: 'market-ops-vendors',
                pluginPage: page
            }
        }
    })
}

async function renderNotFound(req, res, renderPage, title, description) {
    await renderPluginPage(req, res, renderPage, {
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

async function renderForbidden(req, res, renderPage) {
    await renderPage(req, res.status(403), {
        surface: 'public',
        page: 'pages/403',
        title: 'Forbidden',
        locals: {
            bodyClass: 'ws-error-page'
        }
    })
}

function buildVendorBusinessFormValues(source = {}) {
    return {
        slug: normalizeTrimmedString(source.slug),
        businessName: normalizeTrimmedString(source.businessName),
        legalName: normalizeTrimmedString(source.legalName),
        summary: normalizeTrimmedString(source.summary),
        description: normalizeTrimmedString(source.description),
        email: normalizeTrimmedString(source.email),
        phone: normalizeTrimmedString(source.phone),
        websiteUrl: normalizeTrimmedString(source.websiteUrl),
        productCategoryIds: Array.isArray(source.productCategoryIds)
            ? source.productCategoryIds
                  .map((value) => normalizeTrimmedString(value))
                  .filter(Boolean)
            : typeof source.productCategoryIds === 'string' &&
                source.productCategoryIds.trim().length > 0
              ? [source.productCategoryIds.trim()]
              : []
    }
}

function buildVendorBusinessInputFromFormValues(formValues, actorUserId, existingRecord = null) {
    const businessName = normalizeRequiredBoundedStringField(
        formValues.businessName,
        'Business name',
        255,
        'INVALID_VENDOR_BUSINESS_NAME'
    )
    const derivedSlug =
        existingRecord == null && normalizeTrimmedString(formValues.slug).length === 0
            ? slugifyVendorBusinessName(businessName)
            : formValues.slug

    return {
        slug: normalizeRequiredBoundedStringField(
            derivedSlug,
            'Slug',
            128,
            'INVALID_VENDOR_BUSINESS_SLUG'
        ),
        businessName,
        legalName: normalizeOptionalBoundedStringField(
            formValues.legalName,
            'Legal name',
            255,
            'INVALID_VENDOR_BUSINESS_LEGAL_NAME'
        ),
        summary: normalizeOptionalString(formValues.summary),
        description: normalizeOptionalString(formValues.description),
        email: normalizeOptionalBoundedStringField(
            formValues.email,
            'Email',
            255,
            'INVALID_VENDOR_BUSINESS_EMAIL'
        ),
        phone: normalizeOptionalBoundedStringField(
            formValues.phone,
            'Phone',
            64,
            'INVALID_VENDOR_BUSINESS_PHONE'
        ),
        websiteUrl: normalizeOptionalBoundedStringField(
            formValues.websiteUrl,
            'Website URL',
            255,
            'INVALID_VENDOR_BUSINESS_WEBSITE_URL'
        ),
        createdByUserId: existingRecord?.createdByUserId ?? actorUserId,
        updatedByUserId: actorUserId
    }
}

function buildProductCategoryAssignments(formValues) {
    const selectedIds = Array.isArray(formValues.productCategoryIds)
        ? Array.from(
              new Set(
                  formValues.productCategoryIds
                      .map((value) => normalizeTrimmedString(value))
                      .filter(Boolean)
              )
          )
        : []

    return selectedIds.map((value) => ({
        vendorProductCategoryId: normalizePositiveIntegerField(
            value,
            'Product category',
            'INVALID_VENDOR_PRODUCT_CATEGORY_ID'
        )
    }))
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

async function listActiveVendorProductCategoryOptions(database) {
    const categories = await listVendorProductCategories(database)

    return categories.filter((category) => category.isActive === 1)
}

async function findVendorBusinessDetailBySlug(vendorBusinessService, slug) {
    const normalizedSlug = normalizeTrimmedString(slug).toLowerCase()
    const details = await vendorBusinessService.listVendorBusinessDetails()

    return (
        details.find((detail) => detail?.vendorBusiness?.slug?.toLowerCase() === normalizedSlug) ??
        null
    )
}

function sortVendorBusinessDetailsForDirectory(details) {
    return [...details].sort((left, right) => {
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
}

function buildVendorDirectoryCards(details) {
    return details.map((detail) => ({
        vendorBusinessId: detail.vendorBusiness.vendorBusinessId,
        slug: detail.vendorBusiness.slug,
        businessName: detail.vendorBusiness.businessName,
        summary:
            detail.vendorBusiness.summary ||
            detail.vendorBusiness.description ||
            'Vendor profile coming soon.',
        primaryCategoryLabel: detail.productCategoryAssignments[0]?.category?.label ?? null,
        categoryLabels: detail.productCategoryAssignments
            .map((assignment) => assignment.category?.label)
            .filter(Boolean)
    }))
}

function buildVendorCreateCategoryOptions(categories, formValues) {
    const selectedIds = new Set(
        Array.isArray(formValues?.productCategoryIds)
            ? formValues.productCategoryIds.map((value) => normalizeTrimmedString(value))
            : []
    )

    return categories
        .filter((category) => category.isActive === 1)
        .map((category) => ({
            ...category,
            isSelected: selectedIds.has(String(category.vendorProductCategoryId))
        }))
}

function buildVendorManageCategoryState(categories, detail, formValues) {
    const selectedIds = Array.isArray(formValues?.productCategoryIds)
        ? Array.from(
              new Set(formValues.productCategoryIds.map((value) => normalizeTrimmedString(value)))
          ).filter(Boolean)
        : detail.productCategoryAssignments.map((assignment) =>
              String(assignment.vendorProductCategoryId)
          )
    const selectedIdSet = new Set(selectedIds)
    const categoriesById = new Map(
        (Array.isArray(categories) ? categories : []).map((category) => [
            String(category.vendorProductCategoryId),
            category
        ])
    )
    const selectedCategories = selectedIds
        .map((categoryId, index) => {
            const matchingCategory =
                categoriesById.get(categoryId) ??
                detail.productCategoryAssignments.find(
                    (assignment) => String(assignment.vendorProductCategoryId) === categoryId
                )?.category

            if (!matchingCategory) {
                return null
            }

            return {
                ...matchingCategory,
                isPrimary: index === 0
            }
        })
        .filter(Boolean)
    const availableCategories = (Array.isArray(categories) ? categories : []).filter(
        (category) =>
            category.isActive === 1 && !selectedIdSet.has(String(category.vendorProductCategoryId))
    )

    return {
        selectedCategories,
        availableCategories
    }
}

function buildVendorApplicationSummary(detail, paymentRecord) {
    return {
        vendorApplicationId: detail.application.vendorApplicationId,
        marketGroupId: detail.marketGroup?.marketGroupId ?? detail.application.marketGroupId,
        marketGroupName: detail.marketGroup?.groupName ?? 'Market Group',
        marketGroupSlug: detail.marketGroup?.slug ?? null,
        status: detail.application.status,
        feeModeLabel:
            APPLICATION_FEE_MODE_LABELS[detail.application.feeModeSnapshot] ?? 'Application fee',
        feeTotalLabel: formatCurrencyFromCents(detail.application.feeTotalCents),
        submittedAt: detail.application.submittedAt,
        selectionCount: detail.selections.length,
        approvedCount: detail.selections.filter(
            (selection) => selection.selectionStatus === 'approved'
        ).length,
        requestedCount: detail.selections.filter(
            (selection) => selection.selectionStatus === 'requested'
        ).length,
        paymentRecord: paymentRecord
            ? {
                  paymentRecordId: paymentRecord.paymentRecordId,
                  statusCode: paymentRecord.statusCode,
                  amountLabel: formatCurrencyFromCents(paymentRecord.amountMinor)
              }
            : null
    }
}

function buildMarketOpportunityCards(marketGroups, marketsByGroupId, applicationDetailsByGroupId) {
    return marketGroups.map((marketGroup) => {
        const detail = applicationDetailsByGroupId.get(marketGroup.marketGroupId) ?? null
        const markets = marketsByGroupId.get(marketGroup.marketGroupId) ?? []

        return {
            marketGroupId: marketGroup.marketGroupId,
            groupName: marketGroup.groupName,
            slug: marketGroup.slug,
            summary: marketGroup.summary || marketGroup.description || 'Market opportunity',
            feeModeLabel: APPLICATION_FEE_MODE_LABELS[marketGroup.feeMode] ?? 'Application fee',
            feeTotalLabel: formatCurrencyFromCents(marketGroup.feeAmountCents),
            marketCount: markets.length,
            application:
                detail == null
                    ? null
                    : {
                          vendorApplicationId: detail.application.vendorApplicationId,
                          status: detail.application.status,
                          selectionCount: detail.selections.length
                      }
        }
    })
}

function buildUpcomingAppliedMarketCards(applicationDetails, now = Date.now()) {
    return (Array.isArray(applicationDetails) ? applicationDetails : [])
        .flatMap((detail) =>
            (Array.isArray(detail?.selections) ? detail.selections : [])
                .filter((selection) => {
                    const startsAt = Number(selection?.market?.startsAt)

                    return (
                        selection?.market &&
                        Number.isFinite(startsAt) &&
                        startsAt >= now &&
                        detail?.application?.status !== 'withdrawn'
                    )
                })
                .map((selection) => {
                    const startsAt = Number(selection.market.startsAt)

                    return {
                        applicationMarketSelectionId: selection.applicationMarketSelectionId,
                        marketName: selection.market.marketName || 'Market',
                        startsAt,
                        dateLabel: MARKET_DATE_FORMATTER.format(startsAt),
                        timeLabel: MARKET_TIME_FORMATTER.format(startsAt),
                        marketGroupName: detail?.marketGroup?.groupName || 'Market Group',
                        selectionStatus: selection.selectionStatus || 'requested',
                        applicationStatus: detail?.application?.status || 'draft',
                        applicationHref: `/vendors/${detail?.vendorBusiness?.slug || ''}/manage/applications/${detail?.application?.vendorApplicationId}`
                    }
                })
        )
        .sort((left, right) => {
            if (left.startsAt !== right.startsAt) {
                return left.startsAt - right.startsAt
            }

            return (
                left.marketName.localeCompare(right.marketName) ||
                left.applicationMarketSelectionId - right.applicationMarketSelectionId
            )
        })
}

async function loadVendorManageSidebarData(database, applicationService, vendorDetail) {
    const [ownerProfiles, bareApplications] = await Promise.all([
        listUserSummariesByIds(
            database,
            vendorDetail.owners.map((owner) => owner.userId)
        ),
        applicationService.listVendorMarketApplicationsByVendorBusinessId(
            vendorDetail.vendorBusiness.vendorBusinessId
        )
    ])
    const applicationDetails = await Promise.all(
        bareApplications.map((application) =>
            applicationService.getVendorMarketApplicationDetailById(application.vendorApplicationId)
        )
    )

    return {
        ownerProfiles,
        upcomingAppliedMarkets: buildUpcomingAppliedMarketCards(applicationDetails),
        applicationsHref: `/vendors/${vendorDetail.vendorBusiness.slug}/manage/applications`
    }
}

function buildApplicationSelectionsFromBody(body, markets) {
    const selections = []
    const formState = {
        selectedMarketIds: [],
        requestedBoothQuantities: {},
        willingToVolunteer: {},
        boothPreferenceIdsByMarketId: {}
    }

    for (const market of markets) {
        const marketId = market.marketId
        const selected = isCheckedValue(body?.[`selectedMarket_${marketId}`])
        const quantityValue =
            normalizeTrimmedString(body?.[`requestedBoothQuantity_${marketId}`], '1') || '1'
        const volunteer = isCheckedValue(body?.[`willingToVolunteer_${marketId}`]) ? '1' : '0'
        const preferenceIds = [1, 2, 3]
            .map((rank) => normalizeTrimmedString(body?.[`preference${rank}_${marketId}`]))
            .filter(Boolean)

        formState.requestedBoothQuantities[String(marketId)] = quantityValue
        formState.willingToVolunteer[String(marketId)] = volunteer
        formState.boothPreferenceIdsByMarketId[String(marketId)] = preferenceIds

        if (selected) {
            formState.selectedMarketIds.push(String(marketId))

            const requestedBoothQuantity = normalizePositiveIntegerField(
                quantityValue,
                `Requested booth quantity for ${market.marketName}`,
                'INVALID_APPLICATION_REQUESTED_BOOTH_QUANTITY'
            )

            const uniquePreferenceIds = Array.from(new Set(preferenceIds))
            const boothPreferences = uniquePreferenceIds.map((value, index) => ({
                marketBoothOfferingId: normalizePositiveIntegerField(
                    value,
                    'Booth preference',
                    'INVALID_MARKET_BOOTH_OFFERING_ID'
                ),
                preferenceRank: index + 1
            }))

            selections.push({
                marketId,
                requestedBoothQuantity,
                willingToVolunteer: volunteer === '1' ? 1 : 0,
                boothPreferences
            })
        }
    }

    return { selections, formState }
}

function buildApplicationFormStateFromDetail(detail) {
    const selectedMarketIds = []
    const requestedBoothQuantities = {}
    const willingToVolunteer = {}
    const boothPreferenceIdsByMarketId = {}

    for (const selection of detail.selections) {
        const marketId = String(selection.marketId)

        selectedMarketIds.push(marketId)
        requestedBoothQuantities[marketId] = String(selection.requestedBoothQuantity)
        willingToVolunteer[marketId] = selection.willingToVolunteer === 1 ? '1' : '0'
        boothPreferenceIdsByMarketId[marketId] = selection.boothPreferences
            .slice()
            .sort((left, right) => left.preferenceRank - right.preferenceRank)
            .map((preference) => String(preference.marketBoothOfferingId))
    }

    return {
        selectedMarketIds,
        requestedBoothQuantities,
        willingToVolunteer,
        boothPreferenceIdsByMarketId
    }
}

function isMarketAcceptingApplications(market, now = Date.now()) {
    if (market?.applicationsOpen !== 1) {
        return false
    }

    if (typeof market?.applicationsOpenAt === 'number' && now < market.applicationsOpenAt) {
        return false
    }

    if (typeof market?.applicationsCloseAt === 'number' && now > market.applicationsCloseAt) {
        return false
    }

    return true
}

function buildMarketApplicationWindow(market, now = Date.now()) {
    if (market?.applicationsOpen !== 1) {
        return {
            isOpen: false,
            badgeClass: 'text-bg-secondary',
            badgeLabel: 'Closed',
            message: 'Applications are not open at this time.'
        }
    }

    if (typeof market?.applicationsOpenAt === 'number' && now < market.applicationsOpenAt) {
        const openLabel = formatMarketDateTime(market.applicationsOpenAt)
        const closeLabel =
            typeof market?.applicationsCloseAt === 'number'
                ? formatMarketDateTime(market.applicationsCloseAt)
                : null

        return {
            isOpen: false,
            badgeClass: 'text-bg-secondary',
            badgeLabel: 'Opens Later',
            message: closeLabel
                ? `Applications are open between ${openLabel} and ${closeLabel}.`
                : `Applications open at ${openLabel}.`
        }
    }

    if (typeof market?.applicationsCloseAt === 'number' && now > market.applicationsCloseAt) {
        return {
            isOpen: false,
            badgeClass: 'text-bg-secondary',
            badgeLabel: 'Closed',
            message: 'Applications are not open at this time.'
        }
    }

    if (typeof market?.applicationsCloseAt === 'number') {
        return {
            isOpen: true,
            badgeClass: 'text-bg-success',
            badgeLabel: 'Open',
            message: `Applications close at ${formatMarketDateTime(market.applicationsCloseAt)}.`
        }
    }

    return {
        isOpen: true,
        badgeClass: 'text-bg-success',
        badgeLabel: 'Open',
        message: 'Applications are open now.'
    }
}

function buildApplicationEditorMarkets(
    markets,
    boothOfferingsByMarketId,
    formState,
    now = Date.now()
) {
    const selectedIds = new Set(formState.selectedMarketIds ?? [])

    return markets.map((market) => {
        const marketId = String(market.marketId)
        const selectedPreferenceIds = formState.boothPreferenceIdsByMarketId?.[marketId] ?? []
        const boothOfferings = boothOfferingsByMarketId.get(market.marketId) ?? []
        const applicationWindow = buildMarketApplicationWindow(market, now)

        return {
            market,
            isSelected: selectedIds.has(marketId),
            isAcceptingApplications: isMarketAcceptingApplications(market, now),
            applicationWindow,
            requestedBoothQuantity: formState.requestedBoothQuantities?.[marketId] ?? '1',
            willingToVolunteer: (formState.willingToVolunteer?.[marketId] ?? '0') === '1',
            boothOfferings,
            preferenceChoices: [0, 1, 2].map((index) => ({
                rank: index + 1,
                selectedOfferingId: selectedPreferenceIds[index] ?? ''
            }))
        }
    })
}

function buildApplicationEditorViewModel(applicationMarkets, isEditable) {
    const selectedApplicationMarkets = applicationMarkets.filter(
        (marketCard) => marketCard.isSelected
    )
    const hasSelectedMarkets = selectedApplicationMarkets.length > 0
    const hasUnavailableSelectedMarkets = selectedApplicationMarkets.some(
        (marketCard) => !marketCard.isAcceptingApplications
    )

    return {
        applicationMarkets,
        canSubmitApplication: Boolean(
            isEditable && hasSelectedMarkets && !hasUnavailableSelectedMarkets
        ),
        submitBlockedMessage: !isEditable
            ? null
            : !hasSelectedMarkets
              ? 'Select at least one market before submitting.'
              : hasUnavailableSelectedMarkets
                ? 'One or more selected markets are not accepting applications at this time.'
                : null
    }
}

async function getApplicationFeePaymentRecord(database, applicationKey) {
    try {
        const [rows] = await database.query(
            `
            SELECT
                payment_record_id,
                provider_code,
                method_code,
                status_code,
                amount_minor,
                currency_code,
                created_at
            FROM ws_plugin_payments_payment_records
            WHERE host_plugin_id = 'ws_plugin_market_ops'
              AND host_reference_type = 'vendor_application_fee'
              AND host_reference_id = ?
            ORDER BY created_at DESC, payment_record_id DESC
            LIMIT 1
            `,
            [applicationKey]
        )
        const row = Array.isArray(rows) && rows[0] ? rows[0] : null

        if (!row) {
            return null
        }

        return {
            paymentRecordId: Number(row.payment_record_id),
            providerCode: String(row.provider_code),
            methodCode: String(row.method_code),
            statusCode: String(row.status_code),
            amountMinor: Number(row.amount_minor),
            currencyCode: String(row.currency_code),
            createdAt: Number(row.created_at)
        }
    } catch (err) {
        if (err?.code === 'ER_NO_SUCH_TABLE') {
            return null
        }

        throw err
    }
}

async function listApplicationFeePaymentRecordsByKeys(database, applicationKeys) {
    const normalizedKeys = Array.from(
        new Set(
            (Array.isArray(applicationKeys) ? applicationKeys : [])
                .map((value) => normalizeTrimmedString(value))
                .filter(Boolean)
        )
    )

    if (normalizedKeys.length === 0) {
        return new Map()
    }

    try {
        const placeholders = normalizedKeys.map(() => '?').join(', ')
        const [rows] = await database.query(
            `
            SELECT
                payment_record_id,
                host_reference_id,
                provider_code,
                method_code,
                status_code,
                amount_minor,
                currency_code,
                created_at
            FROM ws_plugin_payments_payment_records
            WHERE host_plugin_id = 'ws_plugin_market_ops'
              AND host_reference_type = 'vendor_application_fee'
              AND host_reference_id IN (${placeholders})
            ORDER BY created_at DESC, payment_record_id DESC
            `,
            normalizedKeys
        )

        const recordsByKey = new Map()

        if (Array.isArray(rows)) {
            for (const row of rows) {
                const key = String(row.host_reference_id)

                if (!recordsByKey.has(key)) {
                    recordsByKey.set(key, {
                        paymentRecordId: Number(row.payment_record_id),
                        providerCode: String(row.provider_code),
                        methodCode: String(row.method_code),
                        statusCode: String(row.status_code),
                        amountMinor: Number(row.amount_minor),
                        currencyCode: String(row.currency_code),
                        createdAt: Number(row.created_at)
                    })
                }
            }
        }

        return recordsByKey
    } catch (err) {
        if (err?.code === 'ER_NO_SUCH_TABLE') {
            return new Map()
        }

        throw err
    }
}

async function ensureApplicationFeePaymentRecord(database, applicationDetail, actorUserId) {
    if ((applicationDetail?.application?.feeTotalCents ?? 0) <= 0) {
        return null
    }

    const existingRecord = await getApplicationFeePaymentRecord(
        database,
        applicationDetail.application.applicationKey
    )

    if (existingRecord) {
        return existingRecord
    }

    try {
        const createdAt = Date.now()
        const providerReferenceId = `market-ops-app-fee:${applicationDetail.application.applicationKey}`

        const [result] = await database.query(
            `
            INSERT INTO ws_plugin_payments_payment_records (
                host_plugin_id,
                host_reference_type,
                host_reference_id,
                provider_code,
                method_code,
                status_code,
                amount_minor,
                currency_code,
                provider_reference_id,
                payer_email,
                recorded_by_user_id,
                note,
                paid_at,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                'ws_plugin_market_ops',
                'vendor_application_fee',
                applicationDetail.application.applicationKey,
                'cash',
                'cash',
                'pending',
                applicationDetail.application.feeTotalCents,
                'USD',
                providerReferenceId,
                applicationDetail.vendorBusiness?.email ?? null,
                actorUserId ?? null,
                `Application fee for vendor application ${applicationDetail.application.applicationKey}`,
                null,
                createdAt,
                createdAt
            ]
        )

        const paymentRecordId = Number(result?.insertId)

        if (!Number.isSafeInteger(paymentRecordId) || paymentRecordId <= 0) {
            return getApplicationFeePaymentRecord(
                database,
                applicationDetail.application.applicationKey
            )
        }
    } catch (err) {
        if (err?.code !== 'ER_DUP_ENTRY') {
            throw err
        }
    }

    return getApplicationFeePaymentRecord(database, applicationDetail.application.applicationKey)
}

async function requireVendorBusinessOwnerOrAdmin(
    req,
    res,
    next,
    renderPage,
    vendorBusinessService,
    slug
) {
    try {
        const detail = await findVendorBusinessDetailBySlug(vendorBusinessService, slug)

        if (!detail) {
            await renderNotFound(
                req,
                res,
                renderPage,
                'Vendor Not Found',
                'That vendor business could not be found.'
            )
            return null
        }

        if (isAdminUser(req)) {
            return detail
        }

        const currentUserId = req?.user?.user_id
        const isOwner = detail.owners.some((owner) => owner.userId === currentUserId)

        if (!isOwner) {
            await renderForbidden(req, res, renderPage)
            return null
        }

        return detail
    } catch (err) {
        next(err)
        return null
    }
}

function buildDependencies(sdk, overrides = {}) {
    const database = sdk.services.database

    return {
        database,
        vendorBusinessService:
            overrides.vendorBusinessService ?? createMarketOpsVendorBusinessService(database),
        applicationService:
            overrides.applicationService ?? createMarketOpsApplicationService(database),
        marketSetupService:
            overrides.marketSetupService ?? createMarketOpsMarketSetupService(database)
    }
}

export function createMarketOpsNewVendorsRouter(sdk, overrides = {}) {
    const normalizedSdk = assertSdk(sdk)
    const { createRouter, renderPage, guards } = normalizedSdk.web
    const { requireAuth } = guards
    const { vendorBusinessService, database } = buildDependencies(normalizedSdk, overrides)
    const router = createRouter()

    router.get('/', async (req, res, next) => {
        try {
            const [categoryOptions, ownedBusinesses] = await Promise.all([
                listActiveVendorProductCategoryOptions(database),
                typeof req?.user?.user_id === 'number'
                    ? vendorBusinessService.listVendorBusinessesByOwnerUserId(req.user.user_id)
                    : Promise.resolve([])
            ])

            await renderPluginPage(req, res, renderPage, {
                page: 'pages/vendors/new-vendors',
                title: 'New Vendors',
                locals: {
                    marketOpsNewVendorsPageData: {
                        flash: resolveNotice(req.query),
                        isAuthenticated: Boolean(req.user),
                        formAction: '/new-vendors',
                        formValues: buildVendorBusinessFormValues(),
                        categoryOptions: buildVendorCreateCategoryOptions(
                            categoryOptions,
                            buildVendorBusinessFormValues()
                        ),
                        ownedBusinesses,
                        helpers: {
                            isCheckedValue
                        }
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.post('/', requireAuth, async (req, res, next) => {
        const formValues = buildVendorBusinessFormValues(req.body)

        try {
            const createdDetail = await vendorBusinessService.createVendorBusiness({
                vendorBusiness: buildVendorBusinessInputFromFormValues(
                    formValues,
                    req?.user?.user_id ?? null
                ),
                ownerUserId: req?.user?.user_id ?? null,
                productCategories: buildProductCategoryAssignments(formValues)
            })

            res.redirect(
                303,
                `/vendors/${createdDetail.vendorBusiness.slug}/manage?notice=vendor-business-created`
            )
        } catch (err) {
            if (!isRecoverableVendorRouteError(err)) {
                next(err)
                return
            }

            try {
                const categoryOptions = await listActiveVendorProductCategoryOptions(database)

                await renderPluginPage(req, res, renderPage, {
                    page: 'pages/vendors/new-vendors',
                    title: 'New Vendors',
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsNewVendorsPageData: {
                            flash: {
                                type: 'danger',
                                message: getErrorMessage(
                                    err,
                                    'We could not create that vendor business.'
                                )
                            },
                            isAuthenticated: Boolean(req.user),
                            formAction: '/new-vendors',
                            formValues,
                            categoryOptions: buildVendorCreateCategoryOptions(
                                categoryOptions,
                                formValues
                            ),
                            ownedBusinesses:
                                await vendorBusinessService.listVendorBusinessesByOwnerUserId(
                                    req.user.user_id
                                ),
                            helpers: {
                                isCheckedValue
                            }
                        }
                    }
                })
            } catch (renderErr) {
                next(renderErr)
            }
        }
    })

    return router
}

export function createMarketOpsVendorsRouter(sdk, overrides = {}) {
    const normalizedSdk = assertSdk(sdk)
    const { createRouter, renderPage, guards } = normalizedSdk.web
    const { requireAuth } = guards
    const { vendorBusinessService, applicationService, marketSetupService, database } =
        buildDependencies(normalizedSdk, overrides)
    const router = createRouter()

    router.get('/', async (req, res, next) => {
        try {
            const approvedDetails = sortVendorBusinessDetailsForDirectory(
                (await vendorBusinessService.listVendorBusinessDetails()).filter(
                    (detail) => detail.vendorBusiness.approvalStatus === 'approved'
                )
            )

            await renderPluginPage(req, res, renderPage, {
                page: 'pages/vendors/directory',
                title: 'Vendors',
                locals: {
                    marketOpsVendorDirectoryPageData: {
                        flash: resolveNotice(req.query),
                        vendorCards: buildVendorDirectoryCards(approvedDetails)
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/:vendorSlug/manage', requireAuth, async (req, res, next) => {
        const detail = await requireVendorBusinessOwnerOrAdmin(
            req,
            res,
            next,
            renderPage,
            vendorBusinessService,
            req?.params?.vendorSlug
        )

        if (!detail) {
            return
        }

        try {
            const [allCategories, sidebarData] = await Promise.all([
                listVendorProductCategories(database),
                loadVendorManageSidebarData(database, applicationService, detail)
            ])

            await renderPluginPage(req, res, renderPage, {
                page: 'pages/vendors/manage',
                title: detail.vendorBusiness.businessName,
                locals: {
                    marketOpsVendorManagePageData: {
                        flash: resolveNotice(req.query),
                        vendorDetail: detail,
                        ownerProfiles: sidebarData.ownerProfiles,
                        upcomingAppliedMarkets: sidebarData.upcomingAppliedMarkets,
                        applicationsHref: sidebarData.applicationsHref,
                        formAction: `/vendors/${detail.vendorBusiness.slug}/manage`,
                        formValues: buildVendorBusinessFormValues({
                            ...detail.vendorBusiness,
                            productCategoryIds: detail.productCategoryAssignments.map(
                                (assignment) => String(assignment.vendorProductCategoryId)
                            )
                        }),
                        categorySelection: buildVendorManageCategoryState(allCategories, detail)
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.post('/:vendorSlug/manage', requireAuth, async (req, res, next) => {
        const detail = await requireVendorBusinessOwnerOrAdmin(
            req,
            res,
            next,
            renderPage,
            vendorBusinessService,
            req?.params?.vendorSlug
        )

        if (!detail) {
            return
        }

        const formValues = buildVendorBusinessFormValues(req.body)

        try {
            await vendorBusinessService.updateVendorBusiness(
                detail.vendorBusiness.vendorBusinessId,
                {
                    vendorBusiness: buildVendorBusinessInputFromFormValues(
                        formValues,
                        req?.user?.user_id ?? null,
                        detail.vendorBusiness
                    ),
                    productCategories: buildProductCategoryAssignments(formValues)
                }
            )

            res.redirect(
                303,
                `/vendors/${formValues.slug || detail.vendorBusiness.slug}/manage?notice=vendor-business-updated`
            )
        } catch (err) {
            if (!isRecoverableVendorRouteError(err)) {
                next(err)
                return
            }

            try {
                const [allCategories, sidebarData] = await Promise.all([
                    listVendorProductCategories(database),
                    loadVendorManageSidebarData(database, applicationService, detail)
                ])

                await renderPluginPage(req, res, renderPage, {
                    page: 'pages/vendors/manage',
                    title: detail.vendorBusiness.businessName,
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsVendorManagePageData: {
                            flash: {
                                type: 'danger',
                                message: getErrorMessage(
                                    err,
                                    'We could not update that vendor business.'
                                )
                            },
                            vendorDetail: detail,
                            ownerProfiles: sidebarData.ownerProfiles,
                            upcomingAppliedMarkets: sidebarData.upcomingAppliedMarkets,
                            applicationsHref: sidebarData.applicationsHref,
                            formAction: `/vendors/${detail.vendorBusiness.slug}/manage`,
                            formValues,
                            categorySelection: buildVendorManageCategoryState(
                                allCategories,
                                detail,
                                formValues
                            )
                        }
                    }
                })
            } catch (renderErr) {
                next(renderErr)
            }
        }
    })

    router.post('/:vendorSlug/manage/resubmit', requireAuth, async (req, res, next) => {
        const detail = await requireVendorBusinessOwnerOrAdmin(
            req,
            res,
            next,
            renderPage,
            vendorBusinessService,
            req?.params?.vendorSlug
        )

        if (!detail) {
            return
        }

        try {
            await vendorBusinessService.resubmitVendorBusinessForApproval(
                detail.vendorBusiness.vendorBusinessId,
                {
                    updatedByUserId: req?.user?.user_id ?? null
                }
            )

            res.redirect(
                303,
                `/vendors/${detail.vendorBusiness.slug}/manage?notice=vendor-business-resubmitted`
            )
        } catch (err) {
            if (!isRecoverableVendorRouteError(err)) {
                next(err)
                return
            }

            try {
                const [allCategories, sidebarData] = await Promise.all([
                    listVendorProductCategories(database),
                    loadVendorManageSidebarData(database, applicationService, detail)
                ])

                await renderPluginPage(req, res, renderPage, {
                    page: 'pages/vendors/manage',
                    title: detail.vendorBusiness.businessName,
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsVendorManagePageData: {
                            flash: {
                                type: 'danger',
                                message: getErrorMessage(
                                    err,
                                    'We could not resubmit that vendor business.'
                                )
                            },
                            vendorDetail: detail,
                            ownerProfiles: sidebarData.ownerProfiles,
                            upcomingAppliedMarkets: sidebarData.upcomingAppliedMarkets,
                            applicationsHref: sidebarData.applicationsHref,
                            formAction: `/vendors/${detail.vendorBusiness.slug}/manage`,
                            formValues: buildVendorBusinessFormValues({
                                ...detail.vendorBusiness,
                                productCategoryIds: detail.productCategoryAssignments.map(
                                    (assignment) => String(assignment.vendorProductCategoryId)
                                )
                            }),
                            categorySelection: buildVendorManageCategoryState(allCategories, detail)
                        }
                    }
                })
            } catch (renderErr) {
                next(renderErr)
            }
        }
    })

    router.get('/:vendorSlug/manage/applications', requireAuth, async (req, res, next) => {
        const detail = await requireVendorBusinessOwnerOrAdmin(
            req,
            res,
            next,
            renderPage,
            vendorBusinessService,
            req?.params?.vendorSlug
        )

        if (!detail) {
            return
        }

        try {
            const [marketGroups, bareApplications] = await Promise.all([
                marketSetupService.listMarketGroups(),
                applicationService.listVendorMarketApplicationsByVendorBusinessId(
                    detail.vendorBusiness.vendorBusinessId
                )
            ])
            const publicMarketGroups = marketGroups.filter(
                (marketGroup) => marketGroup.isPublic === 1
            )
            const marketLists = await Promise.all(
                publicMarketGroups.map((marketGroup) =>
                    marketSetupService.listMarketsByMarketGroupId(marketGroup.marketGroupId)
                )
            )
            const applicationDetails = await Promise.all(
                bareApplications.map((application) =>
                    applicationService.getVendorMarketApplicationDetailById(
                        application.vendorApplicationId
                    )
                )
            )
            const paymentRecordsByKey = await listApplicationFeePaymentRecordsByKeys(
                database,
                applicationDetails.map(
                    (applicationDetail) => applicationDetail.application.applicationKey
                )
            )
            const applicationDetailsByGroupId = new Map(
                applicationDetails.map((applicationDetail) => [
                    applicationDetail.application.marketGroupId,
                    applicationDetail
                ])
            )
            const applicationSummaries = applicationDetails
                .map((applicationDetail) =>
                    buildVendorApplicationSummary(
                        applicationDetail,
                        paymentRecordsByKey.get(applicationDetail.application.applicationKey) ??
                            null
                    )
                )
                .sort((left, right) => {
                    const statusDiff =
                        (APPLICATION_STATUS_ORDER[left.status] ?? 99) -
                        (APPLICATION_STATUS_ORDER[right.status] ?? 99)

                    if (statusDiff !== 0) {
                        return statusDiff
                    }

                    return left.marketGroupName.localeCompare(right.marketGroupName)
                })

            await renderPluginPage(req, res, renderPage, {
                page: 'pages/vendors/manage-applications',
                title: `${detail.vendorBusiness.businessName} Applications`,
                locals: {
                    marketOpsVendorApplicationsPageData: {
                        flash: resolveNotice(req.query),
                        vendorDetail: detail,
                        isApplicationCreationAvailable:
                            detail.vendorBusiness.approvalStatus === 'approved',
                        opportunityCards: buildMarketOpportunityCards(
                            publicMarketGroups,
                            new Map(
                                publicMarketGroups.map((marketGroup, index) => [
                                    marketGroup.marketGroupId,
                                    marketLists[index]
                                ])
                            ),
                            applicationDetailsByGroupId
                        ),
                        applicationSummaries
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.post('/:vendorSlug/manage/applications', requireAuth, async (req, res, next) => {
        const detail = await requireVendorBusinessOwnerOrAdmin(
            req,
            res,
            next,
            renderPage,
            vendorBusinessService,
            req?.params?.vendorSlug
        )

        if (!detail) {
            return
        }

        try {
            const marketGroupId = normalizePositiveIntegerField(
                req?.body?.marketGroupId,
                'Market group',
                'INVALID_MARKET_GROUP_ID'
            )
            const createdDetail = await applicationService.createVendorMarketApplicationDraft({
                application: {
                    applicationKey: createApplicationKey(),
                    vendorBusinessId: detail.vendorBusiness.vendorBusinessId,
                    marketGroupId,
                    createdByUserId: req?.user?.user_id ?? null,
                    updatedByUserId: req?.user?.user_id ?? null
                },
                selections: []
            })

            res.redirect(
                303,
                `/vendors/${detail.vendorBusiness.slug}/manage/applications/${createdDetail.application.vendorApplicationId}?notice=application-created`
            )
        } catch (err) {
            next(err)
        }
    })

    router.get(
        '/:vendorSlug/manage/applications/:vendorApplicationId',
        requireAuth,
        async (req, res, next) => {
            const detail = await requireVendorBusinessOwnerOrAdmin(
                req,
                res,
                next,
                renderPage,
                vendorBusinessService,
                req?.params?.vendorSlug
            )

            if (!detail) {
                return
            }

            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)

            if (!vendorApplicationId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That application could not be found.'
                )
                return
            }

            try {
                const applicationDetail =
                    await applicationService.getVendorMarketApplicationDetailById(
                        vendorApplicationId
                    )

                if (
                    applicationDetail.application.vendorBusinessId !==
                    detail.vendorBusiness.vendorBusinessId
                ) {
                    await renderNotFound(
                        req,
                        res,
                        renderPage,
                        'Application Not Found',
                        'That application does not belong to this vendor business.'
                    )
                    return
                }

                const [marketGroupMarkets, boothOfferingLists, paymentRecord] = await Promise.all([
                    marketSetupService.listMarketsByMarketGroupId(
                        applicationDetail.application.marketGroupId
                    ),
                    Promise.resolve().then(async () => {
                        const markets = await marketSetupService.listMarketsByMarketGroupId(
                            applicationDetail.application.marketGroupId
                        )

                        return Promise.all(
                            markets.map((market) =>
                                marketSetupService.listMarketBoothOfferingsByMarketId(
                                    market.marketId
                                )
                            )
                        )
                    }),
                    getApplicationFeePaymentRecord(
                        database,
                        applicationDetail.application.applicationKey
                    )
                ])
                const boothOfferingsByMarketId = new Map(
                    marketGroupMarkets.map((market, index) => [
                        market.marketId,
                        boothOfferingLists[index].filter((offering) => offering.isActive === 1)
                    ])
                )

                const editorViewModel = buildApplicationEditorViewModel(
                    buildApplicationEditorMarkets(
                        marketGroupMarkets,
                        boothOfferingsByMarketId,
                        buildApplicationFormStateFromDetail(applicationDetail)
                    ),
                    applicationDetail.application.status === 'draft'
                )

                await renderPluginPage(req, res, renderPage, {
                    page: 'pages/vendors/application-editor',
                    title: applicationDetail.marketGroup?.groupName ?? 'Vendor Application',
                    locals: {
                        marketOpsVendorApplicationEditor: {
                            flash: resolveNotice(req.query),
                            vendorDetail: detail,
                            applicationDetail,
                            feeTotalLabel: formatCurrencyFromCents(
                                applicationDetail.application.feeTotalCents
                            ),
                            paymentRecord,
                            formAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}`,
                            submitAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}/submit`,
                            withdrawAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}/withdraw`,
                            applicationMarkets: editorViewModel.applicationMarkets,
                            isEditable: applicationDetail.application.status === 'draft',
                            canSubmitApplication: editorViewModel.canSubmitApplication,
                            submitBlockedMessage: editorViewModel.submitBlockedMessage
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
                        'That application could not be found.'
                    )
                    return
                }

                next(err)
            }
        }
    )

    router.post(
        '/:vendorSlug/manage/applications/:vendorApplicationId',
        requireAuth,
        async (req, res, next) => {
            const detail = await requireVendorBusinessOwnerOrAdmin(
                req,
                res,
                next,
                renderPage,
                vendorBusinessService,
                req?.params?.vendorSlug
            )

            if (!detail) {
                return
            }

            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)

            if (!vendorApplicationId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That application could not be found.'
                )
                return
            }

            let applicationDetail
            let marketGroupMarkets

            try {
                applicationDetail =
                    await applicationService.getVendorMarketApplicationDetailById(
                        vendorApplicationId
                    )

                if (
                    applicationDetail.application.vendorBusinessId !==
                    detail.vendorBusiness.vendorBusinessId
                ) {
                    await renderNotFound(
                        req,
                        res,
                        renderPage,
                        'Application Not Found',
                        'That application does not belong to this vendor business.'
                    )
                    return
                }

                marketGroupMarkets = await marketSetupService.listMarketsByMarketGroupId(
                    applicationDetail.application.marketGroupId
                )
                const { selections } = buildApplicationSelectionsFromBody(
                    req.body,
                    marketGroupMarkets
                )

                await applicationService.updateVendorMarketApplicationDraft(vendorApplicationId, {
                    application: {
                        updatedByUserId: req?.user?.user_id ?? null
                    },
                    selections
                })

                res.redirect(
                    303,
                    `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}?notice=application-updated`
                )
            } catch (err) {
                if (!isRecoverableVendorRouteError(err)) {
                    next(err)
                    return
                }

                try {
                    applicationDetail ??=
                        await applicationService.getVendorMarketApplicationDetailById(
                            vendorApplicationId
                        )
                    marketGroupMarkets ??= await marketSetupService.listMarketsByMarketGroupId(
                        applicationDetail.application.marketGroupId
                    )
                    const boothOfferingLists = await Promise.all(
                        marketGroupMarkets.map((market) =>
                            marketSetupService.listMarketBoothOfferingsByMarketId(market.marketId)
                        )
                    )
                    const boothOfferingsByMarketId = new Map(
                        marketGroupMarkets.map((market, index) => [
                            market.marketId,
                            boothOfferingLists[index].filter((offering) => offering.isActive === 1)
                        ])
                    )
                    const { formState } = buildApplicationSelectionsFromBody(
                        req.body,
                        marketGroupMarkets
                    )

                    const editorViewModel = buildApplicationEditorViewModel(
                        buildApplicationEditorMarkets(
                            marketGroupMarkets,
                            boothOfferingsByMarketId,
                            formState
                        ),
                        applicationDetail.application.status === 'draft'
                    )

                    await renderPluginPage(req, res, renderPage, {
                        page: 'pages/vendors/application-editor',
                        title: applicationDetail.marketGroup?.groupName ?? 'Vendor Application',
                        statusCode: err.statusCode ?? 400,
                        locals: {
                            marketOpsVendorApplicationEditor: {
                                flash: {
                                    type: 'danger',
                                    message: getErrorMessage(
                                        err,
                                        'We could not update that application draft.'
                                    )
                                },
                                vendorDetail: detail,
                                applicationDetail,
                                feeTotalLabel: formatCurrencyFromCents(
                                    applicationDetail.application.feeTotalCents
                                ),
                                paymentRecord: await getApplicationFeePaymentRecord(
                                    database,
                                    applicationDetail.application.applicationKey
                                ),
                                formAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}`,
                                submitAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}/submit`,
                                withdrawAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}/withdraw`,
                                applicationMarkets: editorViewModel.applicationMarkets,
                                isEditable: applicationDetail.application.status === 'draft',
                                canSubmitApplication: editorViewModel.canSubmitApplication,
                                submitBlockedMessage: editorViewModel.submitBlockedMessage
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
        '/:vendorSlug/manage/applications/:vendorApplicationId/submit',
        requireAuth,
        async (req, res, next) => {
            const detail = await requireVendorBusinessOwnerOrAdmin(
                req,
                res,
                next,
                renderPage,
                vendorBusinessService,
                req?.params?.vendorSlug
            )

            if (!detail) {
                return
            }

            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)

            if (!vendorApplicationId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That application could not be found.'
                )
                return
            }

            try {
                const submittedDetail = await applicationService.submitVendorMarketApplication(
                    vendorApplicationId,
                    {
                        submittedByUserId: req?.user?.user_id ?? null,
                        updatedByUserId: req?.user?.user_id ?? null
                    }
                )

                if (
                    submittedDetail.application.vendorBusinessId !==
                    detail.vendorBusiness.vendorBusinessId
                ) {
                    await renderNotFound(
                        req,
                        res,
                        renderPage,
                        'Application Not Found',
                        'That application does not belong to this vendor business.'
                    )
                    return
                }

                await ensureApplicationFeePaymentRecord(
                    database,
                    submittedDetail,
                    req?.user?.user_id ?? null
                )

                res.redirect(
                    303,
                    `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}?notice=application-submitted`
                )
            } catch (err) {
                if (!isRecoverableVendorRouteError(err)) {
                    next(err)
                    return
                }

                try {
                    const applicationDetail =
                        await applicationService.getVendorMarketApplicationDetailById(
                            vendorApplicationId
                        )
                    const marketGroupMarkets = await marketSetupService.listMarketsByMarketGroupId(
                        applicationDetail.application.marketGroupId
                    )
                    const boothOfferingLists = await Promise.all(
                        marketGroupMarkets.map((market) =>
                            marketSetupService.listMarketBoothOfferingsByMarketId(market.marketId)
                        )
                    )
                    const boothOfferingsByMarketId = new Map(
                        marketGroupMarkets.map((market, index) => [
                            market.marketId,
                            boothOfferingLists[index].filter((offering) => offering.isActive === 1)
                        ])
                    )

                    const editorViewModel = buildApplicationEditorViewModel(
                        buildApplicationEditorMarkets(
                            marketGroupMarkets,
                            boothOfferingsByMarketId,
                            buildApplicationFormStateFromDetail(applicationDetail)
                        ),
                        applicationDetail.application.status === 'draft'
                    )

                    await renderPluginPage(req, res, renderPage, {
                        page: 'pages/vendors/application-editor',
                        title: applicationDetail.marketGroup?.groupName ?? 'Vendor Application',
                        statusCode: err.statusCode ?? 400,
                        locals: {
                            marketOpsVendorApplicationEditor: {
                                flash: {
                                    type: 'danger',
                                    message:
                                        err?.code === 'MARKET_APPLICATIONS_CLOSED'
                                            ? 'Market is not accepting applications at this time.'
                                            : getErrorMessage(
                                                  err,
                                                  'We could not submit that application.'
                                              )
                                },
                                vendorDetail: detail,
                                applicationDetail,
                                feeTotalLabel: formatCurrencyFromCents(
                                    applicationDetail.application.feeTotalCents
                                ),
                                paymentRecord: await getApplicationFeePaymentRecord(
                                    database,
                                    applicationDetail.application.applicationKey
                                ),
                                formAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}`,
                                submitAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}/submit`,
                                withdrawAction: `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}/withdraw`,
                                applicationMarkets: editorViewModel.applicationMarkets,
                                isEditable: applicationDetail.application.status === 'draft',
                                canSubmitApplication: editorViewModel.canSubmitApplication,
                                submitBlockedMessage: editorViewModel.submitBlockedMessage
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
        '/:vendorSlug/manage/applications/:vendorApplicationId/withdraw',
        requireAuth,
        async (req, res, next) => {
            const detail = await requireVendorBusinessOwnerOrAdmin(
                req,
                res,
                next,
                renderPage,
                vendorBusinessService,
                req?.params?.vendorSlug
            )

            if (!detail) {
                return
            }

            const vendorApplicationId = resolveRouteId(req?.params?.vendorApplicationId)

            if (!vendorApplicationId) {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Application Not Found',
                    'That application could not be found.'
                )
                return
            }

            try {
                const withdrawnDetail = await applicationService.withdrawVendorMarketApplication(
                    vendorApplicationId,
                    {
                        updatedByUserId: req?.user?.user_id ?? null
                    }
                )

                if (
                    withdrawnDetail.application.vendorBusinessId !==
                    detail.vendorBusiness.vendorBusinessId
                ) {
                    await renderNotFound(
                        req,
                        res,
                        renderPage,
                        'Application Not Found',
                        'That application does not belong to this vendor business.'
                    )
                    return
                }

                res.redirect(
                    303,
                    `/vendors/${detail.vendorBusiness.slug}/manage/applications/${vendorApplicationId}?notice=application-withdrawn`
                )
            } catch (err) {
                next(err)
            }
        }
    )

    router.get('/:vendorSlug', async (req, res, next) => {
        try {
            const detail = await findVendorBusinessDetailBySlug(
                vendorBusinessService,
                req?.params?.vendorSlug
            )

            if (!detail || detail.vendorBusiness.approvalStatus !== 'approved') {
                await renderNotFound(
                    req,
                    res,
                    renderPage,
                    'Vendor Not Found',
                    'That vendor profile is unavailable.'
                )
                return
            }

            const currentUserId = req?.user?.user_id ?? null
            const canManageVendorBusiness =
                isAdminUser(req) || detail.owners.some((owner) => owner.userId === currentUserId)

            await renderPluginPage(req, res, renderPage, {
                page: 'pages/vendors/profile',
                title: detail.vendorBusiness.businessName,
                locals: {
                    marketOpsVendorProfilePageData: {
                        vendorDetail: detail,
                        canManageVendorBusiness
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    return router
}

export default createMarketOpsVendorsRouter

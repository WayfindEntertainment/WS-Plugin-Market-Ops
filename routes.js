/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */

import createMarketOpsMarketSetupService from './services/market-setup-service.js'

const MARKET_OPS_PERMISSION_CODES = ['ws_plugin_market_ops.read']

export const MARKET_GROUP_FEE_MODE_OPTIONS = [
    { value: 'none', label: 'No application fee' },
    { value: 'per_group', label: 'One fee per market group' },
    { value: 'per_market', label: 'Fee per selected market' }
]

const NOTICE_MESSAGES = {
    'booth-type-created': { type: 'success', message: 'Booth type created.' },
    'booth-type-updated': { type: 'success', message: 'Booth type updated.' },
    'booth-offering-created': { type: 'success', message: 'Booth offering created.' },
    'booth-offering-updated': { type: 'success', message: 'Booth offering updated.' },
    'location-created': { type: 'success', message: 'Location created.' },
    'location-updated': { type: 'success', message: 'Location updated.' },
    'market-created': { type: 'success', message: 'Market created.' },
    'market-group-created': { type: 'success', message: 'Market group created.' },
    'market-group-updated': { type: 'success', message: 'Market group updated.' },
    'market-updated': { type: 'success', message: 'Market updated.' }
}

const MARKET_OPS_SETUP_SECTIONS = new Set(['locations', 'booth_types'])

/**
 *
 * @param code
 * @param message
 * @param statusCode
 */
function createRouteError(code, message, statusCode = 400) {
    const err = new Error(message)
    err.name = 'MarketOpsRouteError'
    err.code = code
    err.statusCode = statusCode
    return err
}

/**
 *
 * @param sdk
 */
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
            'Market Ops routes require the plugin SDK web and database seams',
            500
        )
    }

    return sdk
}

/**
 *
 * @param value
 * @param fallback
 */
function normalizeTrimmedString(value, fallback = '') {
    if (typeof value === 'string') {
        return value.trim()
    }

    if (value == null) {
        return fallback
    }

    return String(value).trim()
}

/**
 *
 * @param value
 * @param fallback
 */
function normalizeCheckboxValue(value, fallback = '0') {
    if (value === true || value === 1 || value === '1' || value === 'on') {
        return '1'
    }

    if (value === false || value === 0 || value === '0') {
        return '0'
    }

    return fallback
}

/**
 *
 * @param value
 */
function isCheckedValue(value) {
    return normalizeCheckboxValue(value, '0') === '1'
}

/**
 *
 * @param value
 * @param fieldName
 * @param errorCode
 */
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

/**
 *
 * @param value
 * @param fieldName
 * @param errorCode
 */
function normalizeNonNegativeIntegerField(value, fieldName, errorCode) {
    const normalizedValue = normalizeTrimmedString(value)

    if (!/^\d+$/.test(normalizedValue)) {
        throw createRouteError(errorCode, `${fieldName} must be a non-negative integer`)
    }

    const parsedValue = Number.parseInt(normalizedValue, 10)

    if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
        throw createRouteError(errorCode, `${fieldName} must be a non-negative integer`)
    }

    return parsedValue
}

/**
 *
 * @param value
 */
function normalizeOptionalStringField(value) {
    const normalizedValue = normalizeTrimmedString(value)

    return normalizedValue.length > 0 ? normalizedValue : null
}

/**
 *
 * @param value
 * @param fieldName
 * @param maxLength
 * @param errorCode
 */
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

/**
 *
 * @param value
 * @param fieldName
 * @param maxLength
 * @param errorCode
 */
function normalizeOptionalBoundedStringField(value, fieldName, maxLength, errorCode) {
    const normalizedValue = normalizeOptionalStringField(value)

    if (normalizedValue == null) {
        return null
    }

    if (normalizedValue.length > maxLength) {
        throw createRouteError(errorCode, `${fieldName} must be ${maxLength} characters or fewer`)
    }

    return normalizedValue
}

/**
 *
 * @param value
 */
function normalizeOptionalStateCodeField(value) {
    const normalizedValue = normalizeOptionalStringField(value)

    if (normalizedValue == null) {
        return null
    }

    const upperCasedValue = normalizedValue.toUpperCase()

    if (upperCasedValue.length !== 2) {
        throw createRouteError(
            'INVALID_LOCATION_STATE_CODE',
            'State must be a 2-letter code such as WA'
        )
    }

    if (!/^[A-Z]{2}$/.test(upperCasedValue)) {
        throw createRouteError(
            'INVALID_LOCATION_STATE_CODE',
            'State must be a 2-letter code such as WA'
        )
    }

    return upperCasedValue
}

/**
 *
 * @param value
 * @param fieldName
 * @param errorCode
 * @param root0
 * @param root0.allowNull
 */
function normalizeEpochFromDateTimeLocal(value, fieldName, errorCode, { allowNull = false } = {}) {
    const normalizedValue = normalizeTrimmedString(value)

    if (!normalizedValue) {
        if (allowNull) {
            return null
        }

        throw createRouteError(errorCode, `${fieldName} must be a valid date/time`)
    }

    const parsedValue = Date.parse(normalizedValue)

    if (!Number.isFinite(parsedValue)) {
        throw createRouteError(errorCode, `${fieldName} must be a valid date/time`)
    }

    return parsedValue
}

/**
 *
 * @param epochMs
 */
export function formatDatetimeLocalValue(epochMs) {
    if (typeof epochMs !== 'number' || !Number.isFinite(epochMs) || epochMs <= 0) {
        return ''
    }

    const value = new Date(epochMs)
    const pad = (part) => String(part).padStart(2, '0')

    return [value.getFullYear(), pad(value.getMonth() + 1), pad(value.getDate())]
        .join('-')
        .concat(`T${pad(value.getHours())}:${pad(value.getMinutes())}`)
}

const USD_CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
})
const MARKET_SCHEDULE_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
})
const MARKET_SCHEDULE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
})

/**
 *
 * @param cents
 */
function formatCurrencyFromCents(cents) {
    const normalizedCents = Number.isFinite(Number(cents)) ? Number(cents) : 0

    return USD_CURRENCY_FORMATTER.format(normalizedCents / 100)
}

/**
 *
 * @param cents
 */
function formatDollarInputFromCents(cents) {
    const normalizedCents = Number.isFinite(Number(cents)) ? Number(cents) : 0

    return (normalizedCents / 100).toFixed(2)
}

/**
 *
 * @param value
 * @param fieldName
 * @param errorCode
 */
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

/**
 *
 * @param source
 * @param root0
 * @param root0.isActiveFallback
 */
export function buildLocationFormValues(source = {}, { isActiveFallback = '1' } = {}) {
    return {
        slug: normalizeTrimmedString(source.slug),
        locationName: normalizeTrimmedString(source.locationName),
        addressLine1: normalizeTrimmedString(source.addressLine1),
        addressLine2: normalizeTrimmedString(source.addressLine2),
        city: normalizeTrimmedString(source.city),
        stateCode: normalizeTrimmedString(source.stateCode),
        postalCode: normalizeTrimmedString(source.postalCode),
        publicNotes: normalizeTrimmedString(source.publicNotes),
        isActive: normalizeCheckboxValue(source.isActive, isActiveFallback)
    }
}

/**
 *
 * @param source
 * @param root0
 * @param root0.isPublicFallback
 */
export function buildMarketGroupFormValues(source = {}, { isPublicFallback = '1' } = {}) {
    return {
        slug: normalizeTrimmedString(source.slug),
        groupName: normalizeTrimmedString(source.groupName),
        summary: normalizeTrimmedString(source.summary),
        description: normalizeTrimmedString(source.description),
        feeMode: normalizeTrimmedString(source.feeMode, 'none') || 'none',
        feeAmountDollars:
            typeof source.feeAmountDollars === 'string'
                ? normalizeTrimmedString(source.feeAmountDollars, '0.00') || '0.00'
                : formatDollarInputFromCents(source.feeAmountCents),
        isPublic: normalizeCheckboxValue(source.isPublic, isPublicFallback)
    }
}

/**
 *
 * @param source
 * @param root0
 * @param root0.isActiveFallback
 */
export function buildBoothTypeFormValues(source = {}, { isActiveFallback = '1' } = {}) {
    return {
        slug: normalizeTrimmedString(source.slug),
        label: normalizeTrimmedString(source.label),
        description: normalizeTrimmedString(source.description),
        isActive: normalizeCheckboxValue(source.isActive, isActiveFallback),
        sortOrder: normalizeTrimmedString(source.sortOrder, '0') || '0'
    }
}

/**
 *
 * @param source
 * @param root0
 * @param root0.applicationsOpenFallback
 * @param root0.isPublicFallback
 */
export function buildMarketFormValues(
    source = {},
    { applicationsOpenFallback = '0', isPublicFallback = '1' } = {}
) {
    return {
        locationId: normalizeTrimmedString(source.locationId),
        slug: normalizeTrimmedString(source.slug),
        marketName: normalizeTrimmedString(source.marketName),
        summary: normalizeTrimmedString(source.summary),
        description: normalizeTrimmedString(source.description),
        startsAtInput:
            typeof source.startsAtInput === 'string'
                ? source.startsAtInput
                : formatDatetimeLocalValue(source.startsAt),
        endsAtInput:
            typeof source.endsAtInput === 'string'
                ? source.endsAtInput
                : formatDatetimeLocalValue(source.endsAt),
        applicationsOpen: normalizeCheckboxValue(source.applicationsOpen, applicationsOpenFallback),
        applicationsOpenAtInput:
            typeof source.applicationsOpenAtInput === 'string'
                ? source.applicationsOpenAtInput
                : formatDatetimeLocalValue(source.applicationsOpenAt),
        applicationsCloseAtInput:
            typeof source.applicationsCloseAtInput === 'string'
                ? source.applicationsCloseAtInput
                : formatDatetimeLocalValue(source.applicationsCloseAt),
        feeAmountCents: normalizeTrimmedString(source.feeAmountCents, '0') || '0',
        isPublic: normalizeCheckboxValue(source.isPublic, isPublicFallback)
    }
}

/**
 *
 * @param source
 * @param root0
 * @param root0.isActiveFallback
 */
export function buildMarketBoothOfferingFormValues(source = {}, { isActiveFallback = '1' } = {}) {
    return {
        boothTypeId: normalizeTrimmedString(source.boothTypeId),
        boothNumber: normalizeTrimmedString(source.boothNumber),
        priceCents: normalizeTrimmedString(source.priceCents, '0') || '0',
        isActive: normalizeCheckboxValue(source.isActive, isActiveFallback),
        sortOrder: normalizeTrimmedString(source.sortOrder, '0') || '0'
    }
}

/**
 *
 * @param formValues
 * @param actorUserId
 * @param existingRecord
 */
export function buildLocationInputFromFormValues(formValues, actorUserId, existingRecord = null) {
    return {
        slug: normalizeRequiredBoundedStringField(
            formValues.slug,
            'Slug',
            128,
            'INVALID_LOCATION_SLUG'
        ),
        locationName: normalizeRequiredBoundedStringField(
            formValues.locationName,
            'Location name',
            255,
            'INVALID_LOCATION_NAME'
        ),
        addressLine1: normalizeOptionalBoundedStringField(
            formValues.addressLine1,
            'Address line 1',
            255,
            'INVALID_LOCATION_ADDRESS_LINE_1'
        ),
        addressLine2: normalizeOptionalBoundedStringField(
            formValues.addressLine2,
            'Address line 2',
            255,
            'INVALID_LOCATION_ADDRESS_LINE_2'
        ),
        city: normalizeOptionalBoundedStringField(
            formValues.city,
            'City',
            128,
            'INVALID_LOCATION_CITY'
        ),
        stateCode: normalizeOptionalStateCodeField(formValues.stateCode),
        postalCode: normalizeOptionalBoundedStringField(
            formValues.postalCode,
            'Postal code',
            32,
            'INVALID_LOCATION_POSTAL_CODE'
        ),
        publicNotes: normalizeOptionalStringField(formValues.publicNotes),
        isActive: isCheckedValue(formValues.isActive) ? 1 : 0,
        createdByUserId: existingRecord?.createdByUserId ?? actorUserId,
        updatedByUserId: actorUserId
    }
}

/**
 *
 * @param formValues
 * @param actorUserId
 * @param existingRecord
 */
export function buildMarketGroupInputFromFormValues(
    formValues,
    actorUserId,
    existingRecord = null
) {
    return {
        slug: normalizeRequiredBoundedStringField(
            formValues.slug,
            'Slug',
            128,
            'INVALID_MARKET_GROUP_SLUG'
        ),
        groupName: normalizeRequiredBoundedStringField(
            formValues.groupName,
            'Group name',
            255,
            'INVALID_MARKET_GROUP_NAME'
        ),
        summary: normalizeOptionalStringField(formValues.summary),
        description: normalizeOptionalStringField(formValues.description),
        feeMode: normalizeTrimmedString(formValues.feeMode, 'none') || 'none',
        feeAmountCents: normalizeDollarAmountField(
            formValues.feeAmountDollars,
            'Application fee',
            'INVALID_MARKET_GROUP_FEE_AMOUNT_CENTS'
        ),
        isPublic: isCheckedValue(formValues.isPublic) ? 1 : 0,
        createdByUserId: existingRecord?.createdByUserId ?? actorUserId,
        updatedByUserId: actorUserId
    }
}

/**
 *
 * @param formValues
 * @param actorUserId
 * @param existingRecord
 */
export function buildBoothTypeInputFromFormValues(formValues, actorUserId, existingRecord = null) {
    return {
        slug: normalizeRequiredBoundedStringField(
            formValues.slug,
            'Slug',
            128,
            'INVALID_BOOTH_TYPE_SLUG'
        ),
        label: normalizeRequiredBoundedStringField(
            formValues.label,
            'Label',
            255,
            'INVALID_BOOTH_TYPE_LABEL'
        ),
        description: normalizeOptionalStringField(formValues.description),
        isActive: isCheckedValue(formValues.isActive) ? 1 : 0,
        sortOrder: normalizeNonNegativeIntegerField(
            formValues.sortOrder,
            'Sort order',
            'INVALID_BOOTH_TYPE_SORT_ORDER'
        ),
        createdByUserId: existingRecord?.createdByUserId ?? actorUserId,
        updatedByUserId: actorUserId
    }
}

/**
 *
 * @param marketGroupId
 * @param formValues
 * @param actorUserId
 * @param existingRecord
 */
export function buildMarketInputFromFormValues(
    marketGroupId,
    formValues,
    actorUserId,
    existingRecord = null
) {
    return {
        marketGroupId,
        locationId: normalizePositiveIntegerField(
            formValues.locationId,
            'Location',
            'INVALID_LOCATION_ID'
        ),
        slug: normalizeTrimmedString(formValues.slug),
        marketName: normalizeTrimmedString(formValues.marketName),
        summary: normalizeOptionalStringField(formValues.summary),
        description: normalizeOptionalStringField(formValues.description),
        startsAt: normalizeEpochFromDateTimeLocal(
            formValues.startsAtInput,
            'Start date/time',
            'INVALID_MARKET_STARTS_AT'
        ),
        endsAt: normalizeEpochFromDateTimeLocal(
            formValues.endsAtInput,
            'End date/time',
            'INVALID_MARKET_ENDS_AT'
        ),
        applicationsOpen: isCheckedValue(formValues.applicationsOpen) ? 1 : 0,
        applicationsOpenAt: normalizeEpochFromDateTimeLocal(
            formValues.applicationsOpenAtInput,
            'Applications open at',
            'INVALID_MARKET_APPLICATIONS_OPEN_AT',
            { allowNull: true }
        ),
        applicationsCloseAt: normalizeEpochFromDateTimeLocal(
            formValues.applicationsCloseAtInput,
            'Applications close at',
            'INVALID_MARKET_APPLICATIONS_CLOSE_AT',
            { allowNull: true }
        ),
        feeAmountCents: normalizeNonNegativeIntegerField(
            formValues.feeAmountCents,
            'Application fee override',
            'INVALID_MARKET_FEE_AMOUNT_CENTS'
        ),
        isPublic: isCheckedValue(formValues.isPublic) ? 1 : 0,
        createdByUserId: existingRecord?.createdByUserId ?? actorUserId,
        updatedByUserId: actorUserId
    }
}

/**
 *
 * @param marketId
 * @param formValues
 * @param actorUserId
 * @param existingRecord
 */
export function buildMarketBoothOfferingInputFromFormValues(
    marketId,
    formValues,
    actorUserId,
    existingRecord = null
) {
    return {
        marketId,
        boothTypeId: normalizePositiveIntegerField(
            formValues.boothTypeId,
            'Booth type',
            'INVALID_BOOTH_TYPE_ID'
        ),
        boothNumber: normalizePositiveIntegerField(
            formValues.boothNumber,
            'Booth number',
            'INVALID_MARKET_BOOTH_OFFERING_BOOTH_NUMBER'
        ),
        priceCents: normalizeNonNegativeIntegerField(
            formValues.priceCents,
            'Booth price',
            'INVALID_MARKET_BOOTH_OFFERING_PRICE_CENTS'
        ),
        isActive: isCheckedValue(formValues.isActive) ? 1 : 0,
        sortOrder: normalizeNonNegativeIntegerField(
            formValues.sortOrder,
            'Sort order',
            'INVALID_MARKET_BOOTH_OFFERING_SORT_ORDER'
        ),
        createdByUserId: existingRecord?.createdByUserId ?? actorUserId,
        updatedByUserId: actorUserId
    }
}

/**
 *
 * @param query
 */
export function resolveNotice(query = {}) {
    const code = typeof query.notice === 'string' ? query.notice.trim() : ''

    return NOTICE_MESSAGES[code] ?? null
}

/**
 *
 * @param err
 */
export function isRecoverableMarketOpsError(err) {
    if (!err || typeof err !== 'object') {
        return false
    }

    return (
        typeof err.code === 'string' &&
        (err.name === 'MarketOpsRouteError' ||
            err.name === 'MarketOpsServiceError' ||
            err.code === 'ER_DUP_ENTRY' ||
            err.code.startsWith('INVALID_') ||
            err.code.endsWith('_NOT_FOUND') ||
            err.code.startsWith('IMMUTABLE_') ||
            err.code.startsWith('DUPLICATE_') ||
            err.code.startsWith('MARKET_') ||
            err.code.startsWith('LOCATION_') ||
            err.code.startsWith('BOOTH_') ||
            err.code.startsWith('VENDOR_') ||
            err.code.startsWith('APPLICATION_'))
    )
}

/**
 *
 * @param err
 * @param fallbackMessage
 */
export function getMarketOpsErrorMessage(err, fallbackMessage) {
    if (err?.code === 'ER_DUP_ENTRY') {
        return 'That value conflicts with an existing record. Check unique fields like slugs or booth numbers.'
    }

    if (typeof err?.message === 'string' && err.message.trim().length > 0) {
        return err.message.trim()
    }

    return fallbackMessage
}

/**
 *
 * @param value
 */
function resolveRouteId(value) {
    const normalizedValue = normalizeTrimmedString(value)

    if (!/^\d+$/.test(normalizedValue)) {
        return null
    }

    const parsedValue = Number.parseInt(normalizedValue, 10)

    return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

/**
 *
 * @param req
 * @param res
 * @param renderPage
 * @param root0
 * @param root0.page
 * @param root0.title
 * @param root0.locals
 * @param root0.statusCode
 */
async function renderMarketOpsPage(
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
                pluginArea: 'market-ops',
                pluginPage: page
            }
        }
    })
}

/**
 *
 * @param req
 * @param res
 * @param renderPage
 * @param title
 * @param description
 */
async function renderMarketOpsNotFound(req, res, renderPage, title, description) {
    return renderMarketOpsPage(req, res, renderPage, {
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

/**
 *
 * @param marketSetupService
 */
async function buildDashboardPageData(marketSetupService) {
    const [locations, marketGroups, boothTypes] = await Promise.all([
        marketSetupService.listLocations(),
        marketSetupService.listMarketGroups(),
        marketSetupService.listBoothTypes()
    ])
    const marketGroupsWithCounts = await Promise.all(
        marketGroups.map(async (marketGroup) => ({
            ...marketGroup,
            marketCount: (
                await marketSetupService.listMarketsByMarketGroupId(marketGroup.marketGroupId)
            ).length
        }))
    )
    const marketCount = marketGroupsWithCounts.reduce(
        (total, marketGroup) => total + marketGroup.marketCount,
        0
    )

    return {
        counts: {
            locationCount: locations.length,
            marketGroupCount: marketGroups.length,
            marketCount,
            boothTypeCount: boothTypes.length
        },
        locations: locations.slice(0, 5),
        marketGroups: marketGroupsWithCounts.slice(0, 5),
        boothTypes
    }
}

/**
 *
 * @param marketSetupService
 */
async function buildSetupPageData(marketSetupService) {
    const [locations, boothTypes] = await Promise.all([
        marketSetupService.listLocations(),
        marketSetupService.listBoothTypes()
    ])

    return {
        locations,
        boothTypes
    }
}

/**
 *
 * @param query
 */
function resolveSetupSection(query = {}) {
    const section = typeof query.section === 'string' ? query.section.trim() : ''

    return MARKET_OPS_SETUP_SECTIONS.has(section) ? section : 'locations'
}

/**
 *
 * @param feeMode
 */
function resolveMarketGroupFeeModeLabel(feeMode) {
    return (
        MARKET_GROUP_FEE_MODE_OPTIONS.find((option) => option.value === feeMode)?.label ??
        'Fee configuration'
    )
}

/**
 *
 * @param marketGroup
 */
function buildMarketGroupFeePresentation(marketGroup) {
    const formattedAmount = formatCurrencyFromCents(marketGroup?.feeAmountCents ?? 0)

    if (marketGroup?.feeMode === 'per_group') {
        return {
            modeLabel: resolveMarketGroupFeeModeLabel(marketGroup.feeMode),
            feeSummary: `${formattedAmount} once for the full group`
        }
    }

    if (marketGroup?.feeMode === 'per_market') {
        return {
            modeLabel: resolveMarketGroupFeeModeLabel(marketGroup.feeMode),
            feeSummary: `${formattedAmount} per selected market`
        }
    }

    return {
        modeLabel: resolveMarketGroupFeeModeLabel(marketGroup?.feeMode),
        feeSummary: 'No application fee'
    }
}

/**
 *
 * @param {number} epochMs
 */
function formatMarketScheduleDayLabel(epochMs) {
    if (typeof epochMs !== 'number' || !Number.isFinite(epochMs) || epochMs <= 0) {
        return 'Date unavailable'
    }

    return MARKET_SCHEDULE_DAY_FORMATTER.format(new Date(epochMs))
}

/**
 *
 * @param {number} startsAt
 * @param {number} endsAt
 */
function formatMarketScheduleTimeRangeLabel(startsAt, endsAt) {
    if (
        typeof startsAt !== 'number' ||
        !Number.isFinite(startsAt) ||
        startsAt <= 0 ||
        typeof endsAt !== 'number' ||
        !Number.isFinite(endsAt) ||
        endsAt <= 0
    ) {
        return 'Time unavailable'
    }

    const startDate = new Date(startsAt)
    const endDate = new Date(endsAt)
    const isSameDay =
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getDate() === endDate.getDate()

    if (isSameDay) {
        return `${MARKET_SCHEDULE_TIME_FORMATTER.format(startDate)} - ${MARKET_SCHEDULE_TIME_FORMATTER.format(endDate)}`
    }

    return `${MARKET_SCHEDULE_DAY_FORMATTER.format(startDate)} ${MARKET_SCHEDULE_TIME_FORMATTER.format(startDate)} - ${MARKET_SCHEDULE_DAY_FORMATTER.format(endDate)} ${MARKET_SCHEDULE_TIME_FORMATTER.format(endDate)}`
}

/**
 *
 * @param {Array<{ locationId: number, locationName: string }>} locations
 */
function createLocationNameMap(locations) {
    const locationNameMap = new Map()

    for (const location of locations) {
        if (location?.locationId) {
            locationNameMap.set(location.locationId, location.locationName)
        }
    }

    return locationNameMap
}

/**
 *
 * @param {Array<{
 *   marketId: number,
 *   locationId: number,
 *   marketName: string,
 *   startsAt: number,
 *   endsAt: number,
 *   applicationsOpen: number,
 *   isPublic: number
 * }>} markets
 * @param {Array<{ locationId: number, locationName: string }>} locations
 */
function buildMarketScheduleItems(markets, locations) {
    const locationNameMap = createLocationNameMap(locations)

    return markets.map((market) => ({
        marketId: market.marketId,
        marketName: market.marketName,
        startsAt: market.startsAt,
        endsAt: market.endsAt,
        dayLabel: formatMarketScheduleDayLabel(market.startsAt),
        timeRangeLabel: formatMarketScheduleTimeRangeLabel(market.startsAt, market.endsAt),
        locationName: locationNameMap.get(market.locationId) ?? 'Location unavailable',
        visibilityLabel: market.isPublic === 1 ? 'Public' : 'Private',
        applicationsLabel:
            market.applicationsOpen === 1 ? 'Applications Open' : 'Applications Closed'
    }))
}

/**
 * Create the public Market Operations router.
 *
 * This route slice establishes the first real Market Ops information
 * architecture:
 * - overview dashboard
 * - markets
 * - setup
 * - vendors placeholder
 * - applications placeholder
 * - reports placeholder
 *
 * All of these pages live on the public rendering surface and enforce their
 * own auth + plugin permission gate. That keeps the plugin outside `/admin`
 * while still making the setup workflow available only to authorized users.
 *
 * @param {import('../../Studio2/src/kernel/plugins/plugin-sdk.d.ts').PluginSdk} sdk - Plugin SDK.
 * @param {{
 *   marketSetupService?: ReturnType<typeof createMarketOpsMarketSetupService>
 * }} [overrides] - Optional test-only overrides.
 * @returns {ReturnType<import('../../Studio2/src/kernel/plugins/plugin-sdk.d.ts').PluginSdk['web']['createRouter']>} Configured router.
 */
export function createMarketOpsPublicRouter(sdk, overrides = {}) {
    const normalizedSdk = assertSdk(sdk)
    const { createRouter, renderPage, guards } = normalizedSdk.web
    const { requireAuth, requirePermissions } = guards
    const marketSetupService =
        overrides.marketSetupService ??
        createMarketOpsMarketSetupService(normalizedSdk.services.database)
    const router = createRouter()

    router.use(requireAuth, requirePermissions(MARKET_OPS_PERMISSION_CODES))

    router.get('/', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/dashboard',
                title: 'Market Ops',
                locals: {
                    marketOpsDashboardPageData: await buildDashboardPageData(marketSetupService),
                    marketOpsFlash: resolveNotice(req.query)
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/setup', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/setup',
                title: 'Market Ops Setup',
                locals: {
                    marketOpsSetupPageData: await buildSetupPageData(marketSetupService),
                    marketOpsSetupActiveSection: resolveSetupSection(req.query),
                    marketOpsFlash: resolveNotice(req.query)
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/vendors', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/vendors',
                title: 'Market Ops Vendors',
                locals: {
                    marketOpsVendorsPageData: {
                        flash: resolveNotice(req.query)
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/applications', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/applications',
                title: 'Market Ops Applications',
                locals: {
                    marketOpsApplicationsPageData: {
                        flash: resolveNotice(req.query)
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/booth-types/create', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/booth-type-editor',
                title: 'Create Booth Type',
                locals: {
                    marketOpsBoothTypeEditor: {
                        mode: 'create',
                        boothType: null,
                        formAction: '/market-ops/booth-types/create',
                        formValues: buildBoothTypeFormValues(),
                        flash: resolveNotice(req.query),
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

    router.post('/booth-types/create', async (req, res, next) => {
        const formValues = buildBoothTypeFormValues(req.body, { isActiveFallback: '0' })

        try {
            const createdBoothType = await marketSetupService.createBoothType(
                buildBoothTypeInputFromFormValues(formValues, req?.user?.user_id ?? null)
            )

            res.redirect(
                303,
                `/market-ops/booth-types/${createdBoothType.boothTypeId}?notice=booth-type-created`
            )
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/booth-type-editor',
                    title: 'Create Booth Type',
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsBoothTypeEditor: {
                            mode: 'create',
                            boothType: null,
                            formAction: '/market-ops/booth-types/create',
                            formValues,
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not create that booth type.'
                                )
                            },
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

    router.get('/booth-types/:boothTypeId', async (req, res, next) => {
        const boothTypeId = resolveRouteId(req?.params?.boothTypeId)

        if (!boothTypeId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Booth Type Not Found',
                'That booth type could not be found.'
            )
            return
        }

        try {
            const boothType = await marketSetupService.getBoothTypeById(boothTypeId)

            if (!boothType) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Booth Type Not Found',
                    'That booth type could not be found.'
                )
                return
            }

            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/booth-type-editor',
                title: boothType.label,
                locals: {
                    marketOpsBoothTypeEditor: {
                        mode: 'edit',
                        boothType,
                        formAction: `/market-ops/booth-types/${boothTypeId}`,
                        formValues: buildBoothTypeFormValues(boothType),
                        flash: resolveNotice(req.query),
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

    router.post('/booth-types/:boothTypeId', async (req, res, next) => {
        const boothTypeId = resolveRouteId(req?.params?.boothTypeId)

        if (!boothTypeId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Booth Type Not Found',
                'That booth type could not be found.'
            )
            return
        }

        try {
            const boothType = await marketSetupService.getBoothTypeById(boothTypeId)

            if (!boothType) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Booth Type Not Found',
                    'That booth type could not be found.'
                )
                return
            }

            const formValues = buildBoothTypeFormValues(req.body, { isActiveFallback: '0' })

            await marketSetupService.updateBoothTypeById(
                boothTypeId,
                buildBoothTypeInputFromFormValues(formValues, req?.user?.user_id ?? null, boothType)
            )

            res.redirect(303, `/market-ops/booth-types/${boothTypeId}?notice=booth-type-updated`)
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                const boothType = await marketSetupService.getBoothTypeById(boothTypeId)

                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/booth-type-editor',
                    title: boothType?.label || 'Edit Booth Type',
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsBoothTypeEditor: {
                            mode: 'edit',
                            boothType,
                            formAction: `/market-ops/booth-types/${boothTypeId}`,
                            formValues: buildBoothTypeFormValues(req.body, {
                                isActiveFallback: '0'
                            }),
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not update that booth type.'
                                )
                            },
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

    router.get('/locations', async (req, res, next) => {
        try {
            const params = new URLSearchParams()

            Object.entries(req?.query ?? {}).forEach(([key, value]) => {
                if (typeof value === 'string' && value.trim()) {
                    params.set(key, value)
                }
            })
            params.set('section', 'locations')

            res.redirect(303, `/market-ops/setup?${params.toString()}`)
        } catch (err) {
            next(err)
        }
    })

    router.get('/locations/create', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/location-editor',
                title: 'Create Location',
                locals: {
                    marketOpsLocationEditor: {
                        mode: 'create',
                        location: null,
                        formAction: '/market-ops/locations/create',
                        formValues: buildLocationFormValues(),
                        flash: resolveNotice(req.query),
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

    router.post('/locations/create', async (req, res, next) => {
        const formValues = buildLocationFormValues(req.body, { isActiveFallback: '0' })

        try {
            const createdLocation = await marketSetupService.createLocation(
                buildLocationInputFromFormValues(formValues, req?.user?.user_id ?? null)
            )

            res.redirect(
                303,
                `/market-ops/locations/${createdLocation.locationId}?notice=location-created`
            )
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/location-editor',
                    title: 'Create Location',
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsLocationEditor: {
                            mode: 'create',
                            location: null,
                            formAction: '/market-ops/locations/create',
                            formValues,
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not create that location.'
                                )
                            },
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

    router.get('/locations/:locationId', async (req, res, next) => {
        const locationId = resolveRouteId(req?.params?.locationId)

        if (!locationId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Location Not Found',
                'That location could not be found.'
            )
            return
        }

        try {
            const location = await marketSetupService.getLocationById(locationId)

            if (!location) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Location Not Found',
                    'That location could not be found.'
                )
                return
            }

            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/location-editor',
                title: location.locationName,
                locals: {
                    marketOpsLocationEditor: {
                        mode: 'edit',
                        location,
                        formAction: `/market-ops/locations/${location.locationId}`,
                        formValues: buildLocationFormValues(location),
                        flash: resolveNotice(req.query),
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

    router.post('/locations/:locationId', async (req, res, next) => {
        const locationId = resolveRouteId(req?.params?.locationId)

        if (!locationId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Location Not Found',
                'That location could not be found.'
            )
            return
        }

        const formValues = buildLocationFormValues(req.body, { isActiveFallback: '0' })

        try {
            const existingLocation = await marketSetupService.getLocationById(locationId)

            if (!existingLocation) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Location Not Found',
                    'That location could not be found.'
                )
                return
            }

            await marketSetupService.updateLocationById(
                locationId,
                buildLocationInputFromFormValues(
                    formValues,
                    req?.user?.user_id ?? null,
                    existingLocation
                )
            )

            res.redirect(303, `/market-ops/locations/${locationId}?notice=location-updated`)
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                const location = await marketSetupService.getLocationById(locationId)

                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/location-editor',
                    title: location?.locationName || 'Edit Location',
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsLocationEditor: {
                            mode: 'edit',
                            location,
                            formAction: `/market-ops/locations/${locationId}`,
                            formValues,
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not update that location.'
                                )
                            },
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

    router.get('/market-groups', async (req, res, next) => {
        try {
            const marketGroups = await marketSetupService.listMarketGroups()
            const marketGroupCards = await Promise.all(
                marketGroups.map(async (marketGroup) => {
                    const marketCount = (
                        await marketSetupService.listMarketsByMarketGroupId(
                            marketGroup.marketGroupId
                        )
                    ).length

                    return {
                        marketGroup,
                        marketCount,
                        feePresentation: buildMarketGroupFeePresentation(marketGroup),
                        visibilityLabel: marketGroup.isPublic === 1 ? 'Public' : 'Private'
                    }
                })
            )

            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/market-groups',
                title: 'Market Groups',
                locals: {
                    marketOpsMarketGroupsPageData: {
                        marketGroupCards
                    },
                    marketOpsFlash: resolveNotice(req.query)
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.get('/market-groups/create', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/market-group-editor',
                title: 'Create Market Group',
                locals: {
                    marketOpsMarketGroupEditor: {
                        mode: 'create',
                        marketGroup: null,
                        markets: [],
                        formAction: '/market-ops/market-groups/create',
                        formValues: buildMarketGroupFormValues(),
                        flash: resolveNotice(req.query),
                        feeModeOptions: MARKET_GROUP_FEE_MODE_OPTIONS
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    router.post('/market-groups/create', async (req, res, next) => {
        const formValues = buildMarketGroupFormValues(req.body, { isPublicFallback: '0' })

        try {
            const createdMarketGroup = await marketSetupService.createMarketGroup(
                buildMarketGroupInputFromFormValues(formValues, req?.user?.user_id ?? null)
            )

            res.redirect(
                303,
                `/market-ops/market-groups/${createdMarketGroup.marketGroupId}?notice=market-group-created`
            )
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/market-group-editor',
                    title: 'Create Market Group',
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsMarketGroupEditor: {
                            mode: 'create',
                            marketGroup: null,
                            markets: [],
                            formAction: '/market-ops/market-groups/create',
                            formValues,
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not create that market group.'
                                )
                            },
                            feeModeOptions: MARKET_GROUP_FEE_MODE_OPTIONS
                        }
                    }
                })
            } catch (renderErr) {
                next(renderErr)
            }
        }
    })

    router.get('/market-groups/:groupId', async (req, res, next) => {
        const groupId = resolveRouteId(req?.params?.groupId)

        if (!groupId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Market Group Not Found',
                'That market group could not be found.'
            )
            return
        }

        try {
            const [marketGroupDetail, locations] = await Promise.all([
                marketSetupService.getMarketGroupDetailById(groupId),
                marketSetupService.listLocations()
            ])

            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/market-group-editor',
                title: marketGroupDetail.marketGroup.groupName,
                locals: {
                    marketOpsMarketGroupEditor: {
                        mode: 'edit',
                        marketGroup: marketGroupDetail.marketGroup,
                        markets: marketGroupDetail.markets,
                        marketScheduleItems: buildMarketScheduleItems(
                            marketGroupDetail.markets,
                            locations
                        ),
                        formAction: `/market-ops/market-groups/${groupId}`,
                        formValues: buildMarketGroupFormValues(marketGroupDetail.marketGroup),
                        flash: resolveNotice(req.query),
                        feeModeOptions: MARKET_GROUP_FEE_MODE_OPTIONS
                    }
                }
            })
        } catch (err) {
            if (isRecoverableMarketOpsError(err) && err.code === 'MARKET_GROUP_NOT_FOUND') {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Market Group Not Found',
                    'That market group could not be found.'
                )
                return
            }

            next(err)
        }
    })

    router.post('/market-groups/:groupId', async (req, res, next) => {
        const groupId = resolveRouteId(req?.params?.groupId)

        if (!groupId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Market Group Not Found',
                'That market group could not be found.'
            )
            return
        }

        const formValues = buildMarketGroupFormValues(req.body, { isPublicFallback: '0' })

        try {
            const existingMarketGroup = await marketSetupService.getMarketGroupById(groupId)

            if (!existingMarketGroup) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Market Group Not Found',
                    'That market group could not be found.'
                )
                return
            }

            await marketSetupService.updateMarketGroupById(
                groupId,
                buildMarketGroupInputFromFormValues(
                    formValues,
                    req?.user?.user_id ?? null,
                    existingMarketGroup
                )
            )

            res.redirect(303, `/market-ops/market-groups/${groupId}?notice=market-group-updated`)
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                const [marketGroupDetail, locations] = await Promise.all([
                    marketSetupService.getMarketGroupDetailById(groupId),
                    marketSetupService.listLocations()
                ])

                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/market-group-editor',
                    title: marketGroupDetail.marketGroup.groupName,
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsMarketGroupEditor: {
                            mode: 'edit',
                            marketGroup: marketGroupDetail.marketGroup,
                            markets: marketGroupDetail.markets,
                            marketScheduleItems: buildMarketScheduleItems(
                                marketGroupDetail.markets,
                                locations
                            ),
                            formAction: `/market-ops/market-groups/${groupId}`,
                            formValues,
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not update that market group.'
                                )
                            },
                            feeModeOptions: MARKET_GROUP_FEE_MODE_OPTIONS
                        }
                    }
                })
            } catch (renderErr) {
                next(renderErr)
            }
        }
    })

    router.get('/market-groups/:groupId/markets/create', async (req, res, next) => {
        const groupId = resolveRouteId(req?.params?.groupId)

        if (!groupId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Market Group Not Found',
                'That market group could not be found.'
            )
            return
        }

        try {
            const [marketGroup, locations] = await Promise.all([
                marketSetupService.getMarketGroupById(groupId),
                marketSetupService.listLocations()
            ])

            if (!marketGroup) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Market Group Not Found',
                    'That market group could not be found.'
                )
                return
            }

            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/market-editor',
                title: 'Create Market',
                locals: {
                    marketOpsMarketEditor: {
                        mode: 'create',
                        market: null,
                        marketGroup,
                        location: null,
                        locations,
                        boothOfferings: [],
                        boothTypes: await marketSetupService.listBoothTypes(),
                        marketFormAction: `/market-ops/market-groups/${groupId}/markets/create`,
                        offeringCreateAction: null,
                        formValues: buildMarketFormValues(),
                        offeringFormValues: buildMarketBoothOfferingFormValues(),
                        flash: resolveNotice(req.query),
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

    router.post('/market-groups/:groupId/markets/create', async (req, res, next) => {
        const groupId = resolveRouteId(req?.params?.groupId)

        if (!groupId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Market Group Not Found',
                'That market group could not be found.'
            )
            return
        }

        const formValues = buildMarketFormValues(req.body, {
            applicationsOpenFallback: '0',
            isPublicFallback: '0'
        })

        try {
            const createdMarketDetail = await marketSetupService.createMarket(
                buildMarketInputFromFormValues(groupId, formValues, req?.user?.user_id ?? null)
            )

            res.redirect(
                303,
                `/market-ops/market-groups/${groupId}/markets/${createdMarketDetail.market.marketId}?notice=market-created`
            )
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                const [marketGroup, locations, boothTypes] = await Promise.all([
                    marketSetupService.getMarketGroupById(groupId),
                    marketSetupService.listLocations(),
                    marketSetupService.listBoothTypes()
                ])

                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/market-editor',
                    title: 'Create Market',
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsMarketEditor: {
                            mode: 'create',
                            market: null,
                            marketGroup,
                            location: null,
                            locations,
                            boothOfferings: [],
                            boothTypes,
                            marketFormAction: `/market-ops/market-groups/${groupId}/markets/create`,
                            offeringCreateAction: null,
                            formValues,
                            offeringFormValues: buildMarketBoothOfferingFormValues(),
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not create that market.'
                                )
                            },
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

    router.get('/market-groups/:groupId/markets/:marketId', async (req, res, next) => {
        const groupId = resolveRouteId(req?.params?.groupId)
        const marketId = resolveRouteId(req?.params?.marketId)

        if (!groupId || !marketId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Market Not Found',
                'That market could not be found.'
            )
            return
        }

        try {
            const [marketDetail, locations, boothTypes] = await Promise.all([
                marketSetupService.getMarketDetailById(marketId),
                marketSetupService.listLocations(),
                marketSetupService.listBoothTypes()
            ])

            if (marketDetail.market.marketGroupId !== groupId) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Market Not Found',
                    'That market does not belong to the requested market group.'
                )
                return
            }

            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/market-editor',
                title: marketDetail.market.marketName,
                locals: {
                    marketOpsMarketEditor: {
                        mode: 'edit',
                        market: marketDetail.market,
                        marketGroup: marketDetail.marketGroup,
                        location: marketDetail.location,
                        locations,
                        boothOfferings: marketDetail.boothOfferings,
                        boothTypes,
                        marketFormAction: `/market-ops/market-groups/${groupId}/markets/${marketId}`,
                        offeringCreateAction: `/market-ops/market-groups/${groupId}/markets/${marketId}/booth-offerings`,
                        formValues: buildMarketFormValues(marketDetail.market),
                        offeringFormValues: buildMarketBoothOfferingFormValues(),
                        flash: resolveNotice(req.query),
                        helpers: {
                            isCheckedValue
                        }
                    }
                }
            })
        } catch (err) {
            if (isRecoverableMarketOpsError(err) && err.code === 'MARKET_NOT_FOUND') {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Market Not Found',
                    'That market could not be found.'
                )
                return
            }

            next(err)
        }
    })

    router.post('/market-groups/:groupId/markets/:marketId', async (req, res, next) => {
        const groupId = resolveRouteId(req?.params?.groupId)
        const marketId = resolveRouteId(req?.params?.marketId)

        if (!groupId || !marketId) {
            await renderMarketOpsNotFound(
                req,
                res,
                renderPage,
                'Market Not Found',
                'That market could not be found.'
            )
            return
        }

        const formValues = buildMarketFormValues(req.body, {
            applicationsOpenFallback: '0',
            isPublicFallback: '0'
        })

        try {
            const currentMarketDetail = await marketSetupService.getMarketDetailById(marketId)

            if (currentMarketDetail.market.marketGroupId !== groupId) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Market Not Found',
                    'That market does not belong to the requested market group.'
                )
                return
            }

            await marketSetupService.updateMarketById(
                marketId,
                buildMarketInputFromFormValues(
                    groupId,
                    formValues,
                    req?.user?.user_id ?? null,
                    currentMarketDetail.market
                )
            )

            res.redirect(
                303,
                `/market-ops/market-groups/${groupId}/markets/${marketId}?notice=market-updated`
            )
        } catch (err) {
            if (!isRecoverableMarketOpsError(err)) {
                next(err)
                return
            }

            try {
                const [marketDetail, locations, boothTypes] = await Promise.all([
                    marketSetupService.getMarketDetailById(marketId),
                    marketSetupService.listLocations(),
                    marketSetupService.listBoothTypes()
                ])

                await renderMarketOpsPage(req, res, renderPage, {
                    page: 'pages/market-ops/market-editor',
                    title: marketDetail.market.marketName,
                    statusCode: err.statusCode ?? 400,
                    locals: {
                        marketOpsMarketEditor: {
                            mode: 'edit',
                            market: marketDetail.market,
                            marketGroup: marketDetail.marketGroup,
                            location: marketDetail.location,
                            locations,
                            boothOfferings: marketDetail.boothOfferings,
                            boothTypes,
                            marketFormAction: `/market-ops/market-groups/${groupId}/markets/${marketId}`,
                            offeringCreateAction: `/market-ops/market-groups/${groupId}/markets/${marketId}/booth-offerings`,
                            formValues,
                            offeringFormValues: buildMarketBoothOfferingFormValues(),
                            flash: {
                                type: 'danger',
                                message: getMarketOpsErrorMessage(
                                    err,
                                    'We could not update that market.'
                                )
                            },
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

    router.post(
        '/market-groups/:groupId/markets/:marketId/booth-offerings',
        async (req, res, next) => {
            const groupId = resolveRouteId(req?.params?.groupId)
            const marketId = resolveRouteId(req?.params?.marketId)

            if (!groupId || !marketId) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Market Not Found',
                    'That market could not be found.'
                )
                return
            }

            const offeringFormValues = buildMarketBoothOfferingFormValues(req.body, {
                isActiveFallback: '0'
            })

            try {
                const currentMarketDetail = await marketSetupService.getMarketDetailById(marketId)

                if (currentMarketDetail.market.marketGroupId !== groupId) {
                    await renderMarketOpsNotFound(
                        req,
                        res,
                        renderPage,
                        'Market Not Found',
                        'That market does not belong to the requested market group.'
                    )
                    return
                }

                await marketSetupService.createMarketBoothOffering(
                    buildMarketBoothOfferingInputFromFormValues(
                        marketId,
                        offeringFormValues,
                        req?.user?.user_id ?? null
                    )
                )

                res.redirect(
                    303,
                    `/market-ops/market-groups/${groupId}/markets/${marketId}?notice=booth-offering-created`
                )
            } catch (err) {
                if (!isRecoverableMarketOpsError(err)) {
                    next(err)
                    return
                }

                try {
                    const [marketDetail, locations, boothTypes] = await Promise.all([
                        marketSetupService.getMarketDetailById(marketId),
                        marketSetupService.listLocations(),
                        marketSetupService.listBoothTypes()
                    ])

                    await renderMarketOpsPage(req, res, renderPage, {
                        page: 'pages/market-ops/market-editor',
                        title: marketDetail.market.marketName,
                        statusCode: err.statusCode ?? 400,
                        locals: {
                            marketOpsMarketEditor: {
                                mode: 'edit',
                                market: marketDetail.market,
                                marketGroup: marketDetail.marketGroup,
                                location: marketDetail.location,
                                locations,
                                boothOfferings: marketDetail.boothOfferings,
                                boothTypes,
                                marketFormAction: `/market-ops/market-groups/${groupId}/markets/${marketId}`,
                                offeringCreateAction: `/market-ops/market-groups/${groupId}/markets/${marketId}/booth-offerings`,
                                formValues: buildMarketFormValues(marketDetail.market),
                                offeringFormValues,
                                flash: {
                                    type: 'danger',
                                    message: getMarketOpsErrorMessage(
                                        err,
                                        'We could not create that booth offering.'
                                    )
                                },
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
        }
    )

    router.post(
        '/market-groups/:groupId/markets/:marketId/booth-offerings/:offeringId',
        async (req, res, next) => {
            const groupId = resolveRouteId(req?.params?.groupId)
            const marketId = resolveRouteId(req?.params?.marketId)
            const offeringId = resolveRouteId(req?.params?.offeringId)

            if (!groupId || !marketId || !offeringId) {
                await renderMarketOpsNotFound(
                    req,
                    res,
                    renderPage,
                    'Booth Offering Not Found',
                    'That booth offering could not be found.'
                )
                return
            }

            try {
                const [marketDetail, currentOffering] = await Promise.all([
                    marketSetupService.getMarketDetailById(marketId),
                    marketSetupService.getMarketBoothOfferingById(offeringId)
                ])

                if (
                    marketDetail.market.marketGroupId !== groupId ||
                    !currentOffering ||
                    currentOffering.marketId !== marketId
                ) {
                    await renderMarketOpsNotFound(
                        req,
                        res,
                        renderPage,
                        'Booth Offering Not Found',
                        'That booth offering could not be found for this market.'
                    )
                    return
                }

                const offeringFormValues = buildMarketBoothOfferingFormValues(req.body, {
                    isActiveFallback: '0'
                })

                await marketSetupService.updateMarketBoothOfferingById(
                    offeringId,
                    buildMarketBoothOfferingInputFromFormValues(
                        marketId,
                        offeringFormValues,
                        req?.user?.user_id ?? null,
                        currentOffering
                    )
                )

                res.redirect(
                    303,
                    `/market-ops/market-groups/${groupId}/markets/${marketId}?notice=booth-offering-updated`
                )
            } catch (err) {
                next(err)
            }
        }
    )

    router.get('/reports', async (req, res, next) => {
        try {
            await renderMarketOpsPage(req, res, renderPage, {
                page: 'pages/market-ops/reports',
                title: 'Market Ops Reports',
                locals: {
                    marketOpsReportsPageData: {
                        flash: resolveNotice(req.query)
                    }
                }
            })
        } catch (err) {
            next(err)
        }
    })

    return router
}

export default createMarketOpsPublicRouter

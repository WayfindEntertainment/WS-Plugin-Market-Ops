export const MARKET_OPS_PUBLIC_VENDORS_ENABLED_SETTING_KEY =
    'ws_plugin_market_ops.public_vendors_enabled'
export const MARKET_OPS_PUBLIC_MARKETS_ENABLED_SETTING_KEY =
    'ws_plugin_market_ops.public_markets_enabled'
export const MARKET_OPS_AUTO_APPROVE_VENDOR_BUSINESSES_SETTING_KEY =
    'ws_plugin_market_ops.auto_approve_vendor_businesses'

/**
 * Read one settings value as a normalized lowercase string.
 *
 * @param {{ get?: ((key: string) => unknown) }|null|undefined} settings - Active settings service.
 * @param {string} key - Setting key.
 * @returns {string} Normalized string value or an empty string.
 */
function normalizeSettingsValue(settings, key) {
    if (!settings || typeof settings.get !== 'function') {
        return ''
    }

    const value = settings.get(key)

    return typeof value === 'string'
        ? value.trim().toLowerCase()
        : String(value ?? '')
              .trim()
              .toLowerCase()
}

/**
 * Read one Studio setting as a boolean with a fallback.
 *
 * @param {{ get?: ((key: string) => unknown) }|null|undefined} settings - Active settings service.
 * @param {string} key - Setting key.
 * @param {boolean} [defaultValue=false] - Fallback when unset or invalid.
 * @returns {boolean} Parsed boolean value.
 */
export function getBooleanSetting(settings, key, defaultValue = false) {
    const normalizedValue = normalizeSettingsValue(settings, key)

    if (!normalizedValue) {
        return defaultValue
    }

    if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
        return true
    }

    if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
        return false
    }

    return defaultValue
}

/**
 * Determine whether public vendor pages are enabled.
 *
 * @param {{ get?: ((key: string) => unknown) }|null|undefined} settings - Active settings service.
 * @returns {boolean} `true` when public vendor routes should render.
 */
export function isMarketOpsPublicVendorsEnabled(settings) {
    return getBooleanSetting(settings, MARKET_OPS_PUBLIC_VENDORS_ENABLED_SETTING_KEY, false)
}

/**
 * Determine whether public market pages are enabled.
 *
 * @param {{ get?: ((key: string) => unknown) }|null|undefined} settings - Active settings service.
 * @returns {boolean} `true` when public market routes should render.
 */
export function isMarketOpsPublicMarketsEnabled(settings) {
    return getBooleanSetting(settings, MARKET_OPS_PUBLIC_MARKETS_ENABLED_SETTING_KEY, false)
}

/**
 * Determine whether vendor businesses should auto-approve on create/resubmit.
 *
 * @param {{ get?: ((key: string) => unknown) }|null|undefined} settings - Active settings service.
 * @returns {boolean} `true` when vendor businesses should skip pending review.
 */
export function isMarketOpsAutoApproveVendorBusinessesEnabled(settings) {
    return getBooleanSetting(settings, MARKET_OPS_AUTO_APPROVE_VENDOR_BUSINESSES_SETTING_KEY, false)
}

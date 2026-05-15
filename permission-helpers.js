export const MARKET_OPS_READ_PERMISSION = 'ws_plugin_market_ops.read'
export const MARKET_OPS_MANAGE_PERMISSION = 'ws_plugin_market_ops.manage'
export const MARKET_OPS_VENDOR_MANAGE_PERMISSION = 'ws_plugin_market_ops.vendor.manage'

export const MARKET_OPS_REVIEW_PERMISSION_CODES = [
    MARKET_OPS_READ_PERMISSION,
    MARKET_OPS_MANAGE_PERMISSION
]

/**
 * Read the current request permission list safely.
 *
 * @param {unknown} req - Express-like request object.
 * @returns {string[]} Permission codes.
 */
function listPermissions(req) {
    return Array.isArray(req?.user?.permissions) ? req.user.permissions : []
}

/**
 * Check whether the request user can manage Market Ops admin surfaces.
 *
 * @param {unknown} req - Express-like request object.
 * @returns {boolean} `true` when the user has Market Ops manage access.
 */
export function hasMarketOpsManagePermission(req) {
    return listPermissions(req).includes(MARKET_OPS_MANAGE_PERMISSION)
}

/**
 * Check whether the request user can manage any vendor business.
 *
 * @param {unknown} req - Express-like request object.
 * @returns {boolean} `true` when the user has vendor-business manage access.
 */
export function hasVendorManagePermission(req) {
    return listPermissions(req).includes(MARKET_OPS_VENDOR_MANAGE_PERMISSION)
}

/**
 * Determine whether the request user can manage one specific vendor business.
 *
 * @param {unknown} req - Express-like request object.
 * @param {{ owners?: Array<{ userId?: number|null }> }|null|undefined} detail - Vendor business detail.
 * @returns {boolean} `true` when the user can manage the vendor business.
 */
export function canManageVendorBusiness(req, detail) {
    const currentUserId = req?.user?.user_id ?? null

    return (
        hasMarketOpsManagePermission(req) ||
        hasVendorManagePermission(req) ||
        (Array.isArray(detail?.owners) &&
            detail.owners.some((owner) => owner?.userId === currentUserId))
    )
}

/**
 * Create a simple URL slug from a vendor business name.
 *
 * @param {unknown} value - Source value from the business-name field.
 * @returns {string} Normalized slug candidate.
 */
function slugifyVendorBusinessName(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Wire the manage-form blur behavior that fills the slug when it is blank.
 *
 * @returns {void}
 */
function initializeVendorManageSlugAutofill() {
    const businessNameInput = document.getElementById('manage-vendor-business-name')
    const slugInput = document.getElementById('manage-vendor-slug')

    if (!businessNameInput || !slugInput) {
        return
    }

    businessNameInput.addEventListener('blur', () => {
        if (slugInput.value.trim().length > 0) {
            return
        }

        slugInput.value = slugifyVendorBusinessName(businessNameInput.value)
    })
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVendorManageSlugAutofill)
} else {
    initializeVendorManageSlugAutofill()
}

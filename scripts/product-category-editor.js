/**
 * Create a simple URL slug from a product category label.
 *
 * @param {unknown} value - Source value from the label field.
 * @returns {string} Normalized slug candidate.
 */
function slugifyProductCategoryLabel(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Wire the product-category editor blur behavior that fills the slug when it is blank.
 *
 * @returns {void}
 */
function initializeProductCategorySlugAutofill() {
    const labelInput = document.getElementById('product-category-label')
    const slugInput = document.getElementById('product-category-slug')

    if (!labelInput || !slugInput) {
        return
    }

    labelInput.addEventListener('blur', () => {
        if (slugInput.value.trim().length > 0) {
            return
        }

        slugInput.value = slugifyProductCategoryLabel(labelInput.value)
    })
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProductCategorySlugAutofill)
} else {
    initializeProductCategorySlugAutofill()
}

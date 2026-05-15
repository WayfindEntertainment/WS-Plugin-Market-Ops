/**
 * Create a simple URL slug from a market group name.
 *
 * @param {unknown} value - Source value from the name field.
 * @returns {string} Normalized slug candidate.
 */
function slugifyMarketGroupName(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Wire the market-group editor blur behavior that fills the slug when it is blank.
 *
 * @returns {void}
 */
function initializeMarketGroupSlugAutofill() {
    const nameInput = document.getElementById('market-group-name')
    const slugInput = document.getElementById('market-group-slug')

    if (!nameInput || !slugInput) {
        return
    }

    nameInput.addEventListener('blur', () => {
        if (slugInput.value.trim().length > 0) {
            return
        }

        slugInput.value = slugifyMarketGroupName(nameInput.value)
    })
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMarketGroupSlugAutofill)
} else {
    initializeMarketGroupSlugAutofill()
}

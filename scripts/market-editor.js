/**
 * Create a simple URL slug from a market name.
 *
 * @param {unknown} value - Source value from the market name field.
 * @returns {string} Normalized slug candidate.
 */
function slugifyMarketName(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Wire the market editor blur behavior that fills the slug when it is blank.
 *
 * @returns {void}
 */
function initializeMarketSlugAutofill() {
    const nameInput = document.getElementById('market-name')
    const slugInput = document.getElementById('market-slug')

    if (!nameInput || !slugInput) {
        return
    }

    nameInput.addEventListener('blur', () => {
        if (slugInput.value.trim().length > 0) {
            return
        }

        slugInput.value = slugifyMarketName(nameInput.value)
    })
}

/**
 * Keep paired datetime-local inputs in sync when only one side has been filled.
 *
 * @param {string} primaryInputId - First input id.
 * @param {string} secondaryInputId - Second input id.
 * @returns {void}
 */
function initializeMirroredDateTimePair(primaryInputId, secondaryInputId) {
    const primaryInput = document.getElementById(primaryInputId)
    const secondaryInput = document.getElementById(secondaryInputId)

    if (!primaryInput || !secondaryInput) {
        return
    }

    primaryInput.addEventListener('change', () => {
        if (primaryInput.value && !secondaryInput.value) {
            secondaryInput.value = primaryInput.value
        }
    })

    secondaryInput.addEventListener('change', () => {
        if (secondaryInput.value && !primaryInput.value) {
            primaryInput.value = secondaryInput.value
        }
    })
}

/**
 * Wire the market editor convenience behaviors.
 *
 * @returns {void}
 */
function initializeMarketEditor() {
    initializeMarketSlugAutofill()
    initializeMirroredDateTimePair('market-starts-at', 'market-ends-at')
    initializeMirroredDateTimePair('market-applications-open-at', 'market-applications-close-at')
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMarketEditor)
} else {
    initializeMarketEditor()
}

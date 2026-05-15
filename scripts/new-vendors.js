/* eslint-disable jsdoc/require-jsdoc */

function initNewVendorCategoryModal() {
    const categoryInputs = Array.from(document.querySelectorAll('[data-new-vendors-category]'))
    const categorySummary = document.querySelector('[data-new-vendors-category-summary]')
    const categoryBadges = document.querySelector('[data-new-vendors-category-badges]')
    const clearButton = document.querySelector('[data-new-vendors-category-clear]')

    if (categoryInputs.length === 0 || !categorySummary) {
        return
    }

    function updateSummary() {
        const selectedInputs = categoryInputs.filter((input) => input.checked)
        const selectedLabels = selectedInputs.map(
            (input) => input.dataset.newVendorsCategoryLabel || input.value
        )

        if (selectedLabels.length === 0) {
            if (categoryBadges) {
                categoryBadges.hidden = true
                categoryBadges.replaceChildren()
            }

            categorySummary.hidden = false
            categorySummary.textContent = 'No categories selected yet.'
            return
        }

        if (categoryBadges) {
            const badgeNodes = selectedLabels.map((label) => {
                const badge = document.createElement('span')
                badge.className = 'badge text-bg-light border'
                badge.textContent = label
                return badge
            })

            categoryBadges.replaceChildren(...badgeNodes)
            categoryBadges.hidden = false
        }

        categorySummary.hidden = true
    }

    function clearSelections() {
        for (const categoryInput of categoryInputs) {
            categoryInput.checked = false
        }

        updateSummary()
    }

    for (const categoryInput of categoryInputs) {
        categoryInput.addEventListener('change', updateSummary)
    }

    if (clearButton) {
        clearButton.addEventListener('click', clearSelections)
    }

    updateSummary()
}

function initNewVendorFormValidation() {
    const form = document.querySelector('[data-new-vendors-form]')

    if (!form) {
        return
    }

    form.addEventListener('submit', (event) => {
        if (form.checkValidity()) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        form.classList.add('was-validated')
        form.querySelector(':invalid')?.focus()
    })
}

function initNewVendorUnsavedChangesGuard() {
    window.initializeMarketOpsUnsavedFormGuard?.({
        formSelector: '[data-new-vendors-form]',
        title: 'Unsaved Changes',
        message:
            'You have unsaved changes to this vendor business. Save them before leaving or discard them.',
        saveLabel: 'Save Business',
        discardLabel: 'Discard Changes'
    })
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initNewVendorCategoryModal()
        initNewVendorFormValidation()
        initNewVendorUnsavedChangesGuard()
    })
} else {
    initNewVendorCategoryModal()
    initNewVendorFormValidation()
    initNewVendorUnsavedChangesGuard()
}

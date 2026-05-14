/* eslint-disable jsdoc/require-jsdoc */

function initNewVendorCategoryModal() {
    const categoryInputs = Array.from(document.querySelectorAll('[data-new-vendors-category]'))
    const categorySummary = document.querySelector('[data-new-vendors-category-summary]')
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
            categorySummary.textContent = 'No categories selected yet.'
            return
        }

        if (selectedLabels.length === 1) {
            categorySummary.textContent = selectedLabels[0]
            return
        }

        if (selectedLabels.length === 2) {
            categorySummary.textContent = selectedLabels.join(' + ')
            return
        }

        categorySummary.textContent = `${selectedLabels.length} categories selected`
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewVendorCategoryModal)
} else {
    initNewVendorCategoryModal()
}

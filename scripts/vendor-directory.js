/* eslint-disable jsdoc/require-jsdoc */

function normalizeSearchValue(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
}

function initVendorDirectoryFilters() {
    const searchInput = document.querySelector('[data-vendor-directory-search]')
    const categoryInputs = Array.from(document.querySelectorAll('[data-vendor-directory-category]'))
    const resultItems = Array.from(document.querySelectorAll('[data-vendor-directory-item]'))
    const resultsCount = document.querySelector('[data-vendor-directory-results-count]')
    const categorySummary = document.querySelector('[data-vendor-directory-category-summary]')
    const emptyState = document.querySelector('[data-vendor-directory-empty-state]')
    const categoryModalElement = document.querySelector('[data-vendor-directory-category-modal]')
    const openCategoryModalButton = document.querySelector(
        '[data-vendor-directory-open-category-modal]'
    )
    const clearButtons = Array.from(
        document.querySelectorAll(
            '[data-vendor-directory-clear], [data-vendor-directory-empty-clear]'
        )
    )

    if (!searchInput || resultItems.length === 0) {
        return
    }

    const HIDDEN_CLASS = 'market-ops-vendor-directory-item-hidden'
    const LEAVING_CLASS = 'market-ops-vendor-directory-item-leaving'
    const ENTERING_CLASS = 'market-ops-vendor-directory-item-entering'
    const ANIMATION_MS = 220
    const categoryLabelMap = new Map(
        categoryInputs.map((input) => [
            String(input.value),
            input.parentElement?.textContent?.trim() || String(input.value)
        ])
    )
    const categoryModal =
        categoryModalElement && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(categoryModalElement)
            : null

    const hideTimers = new WeakMap()

    function getSelectedCategoryIds() {
        return new Set(
            categoryInputs.filter((input) => input.checked).map((input) => String(input.value))
        )
    }

    function updateResultsCount(visibleCount) {
        if (!resultsCount) {
            return
        }

        resultsCount.textContent = `${visibleCount} vendor${visibleCount === 1 ? '' : 's'}`
    }

    function updateCategorySummary() {
        if (!categorySummary) {
            return
        }

        const selectedCategoryIds = [...getSelectedCategoryIds()]

        if (selectedCategoryIds.length === 0) {
            categorySummary.textContent = 'All categories'
            return
        }

        if (selectedCategoryIds.length === 1) {
            categorySummary.textContent =
                categoryLabelMap.get(selectedCategoryIds[0]) || '1 category selected'
            return
        }

        if (selectedCategoryIds.length === 2) {
            const labels = selectedCategoryIds.map(
                (categoryId) => categoryLabelMap.get(categoryId) || categoryId
            )
            categorySummary.textContent = `${labels.join(' + ')} · matching any selected category`
            return
        }

        categorySummary.textContent = `${selectedCategoryIds.length} categories selected · matching any selected category`
    }

    function showEmptyState(shouldShow) {
        if (!emptyState) {
            return
        }

        emptyState.classList.toggle('d-none', !shouldShow)
    }

    function hideItem(item) {
        if (item.classList.contains(HIDDEN_CLASS) || item.classList.contains(LEAVING_CLASS)) {
            return
        }

        const existingTimer = hideTimers.get(item)

        if (existingTimer) {
            window.clearTimeout(existingTimer)
        }

        item.classList.remove(ENTERING_CLASS)
        item.classList.add(LEAVING_CLASS)

        const timerId = window.setTimeout(() => {
            item.classList.add(HIDDEN_CLASS)
            item.classList.remove(LEAVING_CLASS)
            hideTimers.delete(item)
        }, ANIMATION_MS)

        hideTimers.set(item, timerId)
    }

    function showItem(item) {
        const existingTimer = hideTimers.get(item)

        if (existingTimer) {
            window.clearTimeout(existingTimer)
            hideTimers.delete(item)
        }

        if (!item.classList.contains(HIDDEN_CLASS) && !item.classList.contains(LEAVING_CLASS)) {
            return
        }

        item.classList.remove(HIDDEN_CLASS, LEAVING_CLASS)
        item.classList.add(ENTERING_CLASS)

        void item.offsetWidth

        window.requestAnimationFrame(() => {
            item.classList.remove(ENTERING_CLASS)
        })
    }

    function applyFilters() {
        const searchValue = normalizeSearchValue(searchInput.value)
        const selectedCategoryIds = getSelectedCategoryIds()
        let visibleCount = 0

        for (const item of resultItems) {
            const businessName = normalizeSearchValue(item.dataset.businessName)
            const summary = normalizeSearchValue(item.dataset.summary)
            const categoryIds = new Set(
                String(item.dataset.categoryIds || '')
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean)
            )
            const matchesSearch =
                !searchValue || businessName.includes(searchValue) || summary.includes(searchValue)
            const matchesCategories =
                selectedCategoryIds.size === 0 ||
                [...selectedCategoryIds].some((categoryId) => categoryIds.has(categoryId))
            const isVisible = matchesSearch && matchesCategories

            if (isVisible) {
                visibleCount += 1
                showItem(item)
            } else {
                hideItem(item)
            }
        }

        updateResultsCount(visibleCount)
        updateCategorySummary()
        showEmptyState(visibleCount === 0)
    }

    function clearFilters() {
        searchInput.value = ''

        for (const categoryInput of categoryInputs) {
            categoryInput.checked = false
        }

        applyFilters()
    }

    searchInput.addEventListener('input', applyFilters)

    for (const categoryInput of categoryInputs) {
        categoryInput.addEventListener('change', applyFilters)
    }

    for (const clearButton of clearButtons) {
        clearButton.addEventListener('click', clearFilters)
    }

    if (openCategoryModalButton && categoryModal) {
        openCategoryModalButton.addEventListener('click', () => {
            categoryModal.show()
        })
    }

    applyFilters()
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVendorDirectoryFilters)
} else {
    initVendorDirectoryFilters()
}

/* eslint-disable jsdoc/require-jsdoc */

function normalizeSearchValue(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
}

function initMarketOpsVendorFilters() {
    const searchInput = document.querySelector('[data-market-ops-vendor-search]')
    const statusInputs = Array.from(document.querySelectorAll('[data-market-ops-vendor-status]'))
    const resultItems = Array.from(document.querySelectorAll('[data-market-ops-vendor-item]'))
    const resultsCount = document.querySelector('[data-market-ops-vendor-results-count]')
    const statusSummary = document.querySelector('[data-market-ops-vendor-status-summary]')
    const emptyState = document.querySelector('[data-market-ops-vendor-empty-state]')
    const statusModalElement = document.querySelector('[data-market-ops-vendor-status-modal]')
    const openStatusModalButton = document.querySelector(
        '[data-market-ops-vendor-open-status-modal]'
    )
    const clearButtons = Array.from(
        document.querySelectorAll(
            '[data-market-ops-vendor-clear], [data-market-ops-vendor-empty-clear]'
        )
    )

    if (!searchInput || resultItems.length === 0) {
        return
    }

    const HIDDEN_CLASS = 'market-ops-vendor-directory-item-hidden'
    const LEAVING_CLASS = 'market-ops-vendor-directory-item-leaving'
    const ENTERING_CLASS = 'market-ops-vendor-directory-item-entering'
    const ANIMATION_MS = 220
    const statusLabelMap = new Map(
        statusInputs.map((input) => [
            String(input.value),
            input.parentElement?.textContent?.trim() || String(input.value)
        ])
    )
    const statusModal =
        statusModalElement && window.bootstrap?.Modal
            ? window.bootstrap.Modal.getOrCreateInstance(statusModalElement)
            : null

    const hideTimers = new WeakMap()

    function getSelectedStatuses() {
        return new Set(
            statusInputs.filter((input) => input.checked).map((input) => String(input.value))
        )
    }

    function updateResultsCount(visibleCount) {
        if (resultsCount) {
            resultsCount.textContent = `${visibleCount} vendor${visibleCount === 1 ? '' : 's'}`
        }
    }

    function updateStatusSummary() {
        if (!statusSummary) {
            return
        }

        const selectedStatuses = [...getSelectedStatuses()]

        if (selectedStatuses.length === 0) {
            statusSummary.textContent = 'All active statuses'
            return
        }

        if (selectedStatuses.length === 1) {
            statusSummary.textContent =
                statusLabelMap.get(selectedStatuses[0]) || '1 status selected'
            return
        }

        if (selectedStatuses.length === 2) {
            const labels = selectedStatuses.map((status) => statusLabelMap.get(status) || status)
            statusSummary.textContent = `${labels.join(' + ')} - matching any selected status`
            return
        }

        statusSummary.textContent = `${selectedStatuses.length} statuses selected - matching any selected status`
    }

    function showEmptyState(shouldShow) {
        if (emptyState) {
            emptyState.classList.toggle('d-none', !shouldShow)
        }
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
        const selectedStatuses = getSelectedStatuses()
        let visibleCount = 0

        for (const item of resultItems) {
            const businessName = normalizeSearchValue(item.dataset.businessName)
            const status = String(item.dataset.status || '')
                .trim()
                .toLowerCase()
            const matchesSearch = !searchValue || businessName.includes(searchValue)
            const matchesStatus =
                selectedStatuses.size === 0 ? status !== 'archived' : selectedStatuses.has(status)
            const isVisible = matchesSearch && matchesStatus

            if (isVisible) {
                visibleCount += 1
                showItem(item)
            } else {
                hideItem(item)
            }
        }

        updateResultsCount(visibleCount)
        updateStatusSummary()
        showEmptyState(visibleCount === 0)
    }

    function clearFilters() {
        searchInput.value = ''

        for (const statusInput of statusInputs) {
            statusInput.checked = false
        }

        applyFilters()
    }

    searchInput.addEventListener('input', applyFilters)

    for (const statusInput of statusInputs) {
        statusInput.addEventListener('change', applyFilters)
    }

    for (const clearButton of clearButtons) {
        clearButton.addEventListener('click', clearFilters)
    }

    if (openStatusModalButton && statusModal) {
        openStatusModalButton.addEventListener('click', () => {
            statusModal.show()
        })
    }

    applyFilters()
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMarketOpsVendorFilters)
} else {
    initMarketOpsVendorFilters()
}

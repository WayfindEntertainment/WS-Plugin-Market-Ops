/* eslint-disable jsdoc/require-jsdoc */

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

function initializeVendorManageFormValidation() {
    const form = document.querySelector('[data-manage-vendors-form]')

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

function initializeVendorManageUnsavedChangesGuard() {
    window.initializeMarketOpsUnsavedFormGuard?.({
        formSelector: '[data-manage-vendors-form]',
        title: 'Unsaved Changes',
        message:
            'You have unsaved changes to this vendor business. Save them before leaving or discard them.',
        saveLabel: 'Save Business',
        discardLabel: 'Discard Changes'
    })
}

function initializeVendorArchiveConfirmation() {
    const form = document.querySelector('[data-vendor-archive-form]')
    const input = form?.querySelector('[data-vendor-archive-confirmation-input]')
    const submitButton = form?.querySelector('[data-vendor-archive-submit]')

    if (!form || !input || !submitButton) {
        return
    }

    const expectedValue = (
        input.getAttribute('data-vendor-archive-confirmation-expected') || ''
    ).trim()

    function syncArchiveButtonState() {
        submitButton.disabled = input.value.trim() !== expectedValue
    }

    input.addEventListener('input', syncArchiveButtonState)
    form.addEventListener('reset', () => {
        requestAnimationFrame(syncArchiveButtonState)
    })

    syncArchiveButtonState()
}

function initializeVendorManageProductCategories() {
    const form = document.querySelector('[data-vendor-manage-product-category-form]')

    if (!form) {
        return
    }

    const list = form.querySelector('[data-vendor-manage-product-category-list]')
    const availableList = form.querySelector('[data-vendor-manage-product-category-available-list]')
    const inputsContainer = form.querySelector('[data-vendor-manage-product-category-order-inputs]')
    const emptyState = form.querySelector('[data-vendor-manage-product-category-empty]')
    const availableEmptyState = form.querySelector(
        '[data-vendor-manage-product-category-available-empty]'
    )
    const itemTemplate = form.querySelector('[data-vendor-manage-product-category-item-template]')
    const availableTemplate = form.querySelector(
        '[data-vendor-manage-product-category-available-template]'
    )

    if (
        !list ||
        !availableList ||
        !inputsContainer ||
        !emptyState ||
        !availableEmptyState ||
        !itemTemplate ||
        !availableTemplate
    ) {
        return
    }

    let draggedItem = null
    let armedDragItem = null
    let pointerDragState = null

    function getItems() {
        return Array.from(list.querySelectorAll('[data-vendor-manage-product-category-item]'))
    }

    function getCurrentOrder() {
        return getItems()
            .map((item) => item.getAttribute('data-vendor-product-category-id'))
            .filter(Boolean)
    }

    function rebuildHiddenInputs() {
        inputsContainer.replaceChildren()

        getCurrentOrder().forEach((vendorProductCategoryId) => {
            const input = document.createElement('input')
            input.type = 'hidden'
            input.name = 'productCategoryIds'
            input.value = vendorProductCategoryId
            inputsContainer.appendChild(input)
        })
    }

    function syncMoveButtonState() {
        const items = getItems()

        items.forEach((item, index) => {
            const moveUpButton = item.querySelector(
                '[data-vendor-manage-product-category-move="up"]'
            )
            const moveDownButton = item.querySelector(
                '[data-vendor-manage-product-category-move="down"]'
            )

            if (moveUpButton) {
                moveUpButton.disabled = index === 0
            }

            if (moveDownButton) {
                moveDownButton.disabled = index === items.length - 1
            }
        })
    }

    function syncPrimaryBadgeState() {
        getItems().forEach((item, index) => {
            const badge = item.querySelector('[data-vendor-manage-product-category-primary-badge]')

            if (badge) {
                badge.hidden = index !== 0
            }
        })
    }

    function syncEmptyState() {
        emptyState.classList.toggle('d-none', getItems().length > 0)
        availableEmptyState.classList.toggle(
            'd-none',
            availableList.querySelector('[data-vendor-manage-product-category-add]') !== null
        )
    }

    function refreshUiState() {
        rebuildHiddenInputs()
        syncMoveButtonState()
        syncPrimaryBadgeState()
        syncEmptyState()
    }

    function captureItemRects() {
        return new Map(
            getItems().map((item) => [
                item.getAttribute('data-vendor-product-category-id'),
                item.getBoundingClientRect()
            ])
        )
    }

    function animateLayoutChange(beforeRects) {
        getItems().forEach((item) => {
            const itemId = item.getAttribute('data-vendor-product-category-id')
            const previousRect = beforeRects.get(itemId)

            if (!previousRect) {
                return
            }

            const nextRect = item.getBoundingClientRect()
            const deltaX = previousRect.left - nextRect.left
            const deltaY = previousRect.top - nextRect.top

            if (!deltaX && !deltaY) {
                return
            }

            item.classList.add('market-ops-sortable-card-reordering')
            item.animate(
                [
                    {
                        transform: `translate(${deltaX}px, ${deltaY}px)`
                    },
                    {
                        transform: 'translate(0, 0)'
                    }
                ],
                {
                    duration: 240,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
                }
            ).addEventListener('finish', () => {
                item.classList.remove('market-ops-sortable-card-reordering')
            })
        })
    }

    function normalizeCategoryDataFromElement(element) {
        return {
            vendorProductCategoryId: element.getAttribute('data-vendor-product-category-id') || '',
            label: element.getAttribute('data-vendor-product-category-label') || '',
            description: element.getAttribute('data-vendor-product-category-description') || '',
            isActive: element.getAttribute('data-vendor-product-category-is-active') === '1'
        }
    }

    function sortAvailableButtons() {
        const buttons = Array.from(
            availableList.querySelectorAll('[data-vendor-manage-product-category-add]')
        ).sort((left, right) =>
            (left.getAttribute('data-vendor-product-category-label') || '').localeCompare(
                right.getAttribute('data-vendor-product-category-label') || '',
                undefined,
                { sensitivity: 'base' }
            )
        )

        buttons.forEach((button) => availableList.appendChild(button))
    }

    function createAvailableButton(categoryData) {
        const button = availableTemplate.content.firstElementChild.cloneNode(true)
        button.setAttribute('data-vendor-product-category-id', categoryData.vendorProductCategoryId)
        button.setAttribute('data-vendor-product-category-label', categoryData.label)
        button.setAttribute(
            'data-vendor-product-category-description',
            categoryData.description || ''
        )
        button.setAttribute(
            'data-vendor-product-category-is-active',
            categoryData.isActive ? '1' : '0'
        )
        button.textContent = categoryData.label

        return button
    }

    function createSelectedItem(categoryData) {
        const item = itemTemplate.content.firstElementChild.cloneNode(true)
        item.setAttribute('data-vendor-product-category-id', categoryData.vendorProductCategoryId)
        item.setAttribute('data-vendor-product-category-label', categoryData.label)
        item.setAttribute(
            'data-vendor-product-category-description',
            categoryData.description || ''
        )
        item.setAttribute(
            'data-vendor-product-category-is-active',
            categoryData.isActive ? '1' : '0'
        )

        const handle = item.querySelector('[data-vendor-manage-product-category-handle]')
        const label = item.querySelector('[data-vendor-manage-product-category-label]')
        const description = item.querySelector('[data-vendor-manage-product-category-description]')
        const inactiveBadge = item.querySelector(
            '[data-vendor-manage-product-category-inactive-badge]'
        )
        const moveUpButton = item.querySelector('[data-vendor-manage-product-category-move="up"]')
        const moveDownButton = item.querySelector(
            '[data-vendor-manage-product-category-move="down"]'
        )

        if (handle) {
            handle.setAttribute('aria-label', `Drag to reorder ${categoryData.label}`)
        }

        if (label) {
            label.textContent = categoryData.label
        }

        if (description) {
            description.textContent =
                categoryData.description || 'Selected product category for this vendor business.'
        }

        if (inactiveBadge) {
            inactiveBadge.hidden = categoryData.isActive
        }

        if (moveUpButton) {
            moveUpButton.setAttribute('aria-label', `Move ${categoryData.label} up`)
        }

        if (moveDownButton) {
            moveDownButton.setAttribute('aria-label', `Move ${categoryData.label} down`)
        }

        return item
    }

    function moveItem(item, direction) {
        if (!item) {
            return
        }

        const beforeRects = captureItemRects()
        const sibling = direction === 'up' ? item.previousElementSibling : item.nextElementSibling

        if (!sibling) {
            return
        }

        if (direction === 'up') {
            list.insertBefore(item, sibling)
        } else {
            list.insertBefore(sibling, item)
        }

        refreshUiState()
        animateLayoutChange(beforeRects)
    }

    function getDragAfterElement(pointerY, activeItem = draggedItem) {
        const draggableItems = getItems().filter((item) => item !== activeItem)

        let closest = { offset: Number.NEGATIVE_INFINITY, element: null }

        draggableItems.forEach((item) => {
            const rect = item.getBoundingClientRect()
            const offset = pointerY - rect.top - rect.height / 2

            if (offset < 0 && offset > closest.offset) {
                closest = { offset, element: item }
            }
        })

        return closest.element
    }

    list.addEventListener('click', (event) => {
        const moveButton = event.target.closest('[data-vendor-manage-product-category-move]')
        const removeButton = event.target.closest('[data-vendor-manage-product-category-remove]')

        if (moveButton) {
            const item = moveButton.closest('[data-vendor-manage-product-category-item]')
            const direction = moveButton.getAttribute('data-vendor-manage-product-category-move')

            moveItem(item, direction)
            return
        }

        if (!removeButton) {
            return
        }

        const item = removeButton.closest('[data-vendor-manage-product-category-item]')

        if (!item) {
            return
        }

        const categoryData = normalizeCategoryDataFromElement(item)
        item.remove()

        if (categoryData.isActive) {
            availableList.appendChild(createAvailableButton(categoryData))
            sortAvailableButtons()
        }

        refreshUiState()
    })

    availableList.addEventListener('click', (event) => {
        const addButton = event.target.closest('[data-vendor-manage-product-category-add]')

        if (!addButton) {
            return
        }

        const categoryData = normalizeCategoryDataFromElement(addButton)
        list.appendChild(createSelectedItem(categoryData))
        addButton.remove()
        refreshUiState()
    })

    list.addEventListener('pointerdown', (event) => {
        if (
            event.target.closest('[data-vendor-manage-product-category-move]') ||
            event.target.closest('[data-vendor-manage-product-category-remove]')
        ) {
            armedDragItem = null
            pointerDragState = null
            return
        }

        const item = event.target.closest('[data-vendor-manage-product-category-item]')

        if (!item) {
            armedDragItem = null
            pointerDragState = null
            return
        }

        armedDragItem = item

        if (!armedDragItem || event.pointerType === 'mouse') {
            return
        }

        pointerDragState = {
            pointerId: event.pointerId,
            item: armedDragItem,
            startX: event.clientX,
            startY: event.clientY,
            isDragging: false
        }

        item.setPointerCapture?.(event.pointerId)
    })

    list.addEventListener('pointermove', (event) => {
        if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) {
            return
        }

        const moveDistance = Math.hypot(
            event.clientX - pointerDragState.startX,
            event.clientY - pointerDragState.startY
        )

        if (!pointerDragState.isDragging) {
            if (moveDistance < 8) {
                return
            }

            pointerDragState.isDragging = true
            draggedItem = pointerDragState.item
            draggedItem.classList.add('market-ops-sortable-card-dragging')
        }

        event.preventDefault()

        const beforeRects = captureItemRects()
        const afterElement = getDragAfterElement(event.clientY, pointerDragState.item)

        if (!afterElement) {
            if (list.lastElementChild === pointerDragState.item) {
                return
            }

            list.appendChild(pointerDragState.item)
            animateLayoutChange(beforeRects)
            return
        }

        if (
            afterElement === pointerDragState.item ||
            pointerDragState.item.nextElementSibling === afterElement
        ) {
            return
        }

        list.insertBefore(pointerDragState.item, afterElement)
        animateLayoutChange(beforeRects)
    })

    list.addEventListener('pointerup', () => {
        if (pointerDragState?.isDragging && pointerDragState.item) {
            pointerDragState.item.classList.remove('market-ops-sortable-card-dragging')
            draggedItem = null
            refreshUiState()
        }

        pointerDragState = null
        armedDragItem = null
    })

    list.addEventListener('pointercancel', () => {
        if (pointerDragState?.isDragging && pointerDragState.item) {
            pointerDragState.item.classList.remove('market-ops-sortable-card-dragging')
            draggedItem = null
            refreshUiState()
        }

        pointerDragState = null
        armedDragItem = null
    })

    list.addEventListener('dragstart', (event) => {
        const item = event.target.closest('[data-vendor-manage-product-category-item]')

        if (!item || item !== armedDragItem) {
            event.preventDefault()
            return
        }

        draggedItem = item
        item.classList.add('market-ops-sortable-card-dragging')
    })

    list.addEventListener('dragend', (event) => {
        const item = event.target.closest('[data-vendor-manage-product-category-item]')

        if (!item) {
            return
        }

        item.classList.remove('market-ops-sortable-card-dragging')
        draggedItem = null
        armedDragItem = null
        refreshUiState()
    })

    list.addEventListener('dragover', (event) => {
        if (!draggedItem) {
            return
        }

        const beforeRects = captureItemRects()
        event.preventDefault()
        const afterElement = getDragAfterElement(event.clientY)

        if (!afterElement) {
            if (list.lastElementChild === draggedItem) {
                return
            }

            list.appendChild(draggedItem)
            animateLayoutChange(beforeRects)
            return
        }

        if (afterElement === draggedItem || draggedItem.nextElementSibling === afterElement) {
            return
        }

        list.insertBefore(draggedItem, afterElement)
        animateLayoutChange(beforeRects)
    })

    form.addEventListener('submit', rebuildHiddenInputs)

    refreshUiState()
}

function initializeVendorManagePage() {
    initializeVendorManageSlugAutofill()
    initializeVendorManageFormValidation()
    initializeVendorManageUnsavedChangesGuard()
    initializeVendorArchiveConfirmation()
    initializeVendorManageProductCategories()
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVendorManagePage)
} else {
    initializeVendorManagePage()
}

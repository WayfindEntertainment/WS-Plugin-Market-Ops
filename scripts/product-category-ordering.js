/* eslint-disable jsdoc/require-jsdoc */

function initMarketOpsProductCategoryOrdering() {
    const form = document.querySelector('[data-market-ops-product-category-form]')

    if (!form) {
        return
    }

    const list = form.querySelector('[data-market-ops-product-category-list]')
    const saveButton = form.querySelector('[data-market-ops-product-category-save]')
    const inputsContainer = form.querySelector('[data-market-ops-product-category-order-inputs]')

    if (!list || !saveButton || !inputsContainer) {
        return
    }

    let initialOrder = getCurrentOrder()
    let draggedItem = null
    let armedDragItem = null

    function getItems() {
        return Array.from(list.querySelectorAll('[data-market-ops-product-category-item]'))
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
            input.name = 'orderedVendorProductCategoryIds'
            input.value = vendorProductCategoryId
            inputsContainer.appendChild(input)
        })
    }

    function syncMoveButtonState() {
        const items = getItems()

        items.forEach((item, index) => {
            const moveUpButton = item.querySelector('[data-market-ops-product-category-move="up"]')
            const moveDownButton = item.querySelector(
                '[data-market-ops-product-category-move="down"]'
            )

            if (moveUpButton) {
                moveUpButton.disabled = index === 0
            }

            if (moveDownButton) {
                moveDownButton.disabled = index === items.length - 1
            }
        })
    }

    function syncDirtyState() {
        const currentOrder = getCurrentOrder()
        const isDirty =
            currentOrder.length !== initialOrder.length ||
            currentOrder.some((value, index) => value !== initialOrder[index])

        saveButton.disabled = !isDirty
        form.classList.toggle('market-ops-sortable-dirty', isDirty)
    }

    function refreshUiState() {
        rebuildHiddenInputs()
        syncMoveButtonState()
        syncDirtyState()
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

    function getDragAfterElement(pointerY) {
        const draggableItems = getItems().filter((item) => item !== draggedItem)

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
        const moveButton = event.target.closest('[data-market-ops-product-category-move]')

        if (!moveButton) {
            return
        }

        const item = moveButton.closest('[data-market-ops-product-category-item]')
        const direction = moveButton.getAttribute('data-market-ops-product-category-move')

        moveItem(item, direction)
    })

    list.addEventListener('pointerdown', (event) => {
        const handle = event.target.closest('[data-market-ops-product-category-handle]')

        if (!handle) {
            armedDragItem = null
            return
        }

        armedDragItem = handle.closest('[data-market-ops-product-category-item]')
    })

    list.addEventListener('pointerup', () => {
        armedDragItem = null
    })

    list.addEventListener('pointercancel', () => {
        armedDragItem = null
    })

    list.addEventListener('dragstart', (event) => {
        const item = event.target.closest('[data-market-ops-product-category-item]')

        if (!item || item !== armedDragItem) {
            event.preventDefault()
            return
        }

        draggedItem = item
        item.classList.add('market-ops-sortable-card-dragging')
    })

    getItems().forEach((item) => {
        item.addEventListener('dragend', () => {
            item.classList.remove('market-ops-sortable-card-dragging')
            draggedItem = null
            armedDragItem = null
            refreshUiState()
        })
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

    form.addEventListener('submit', () => {
        rebuildHiddenInputs()
        initialOrder = getCurrentOrder()
    })

    refreshUiState()
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMarketOpsProductCategoryOrdering)
} else {
    initMarketOpsProductCategoryOrdering()
}

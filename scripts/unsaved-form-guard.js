/* eslint-disable jsdoc/require-jsdoc */

function serializeMarketOpsFormState(form) {
    return JSON.stringify(Array.from(new FormData(form).entries()))
}

function ensureMarketOpsUnsavedModal(modalId, options) {
    let modalElement = document.getElementById(modalId)

    if (modalElement) {
        return modalElement
    }

    modalElement = document.createElement('div')
    modalElement.className = 'modal fade'
    modalElement.id = modalId
    modalElement.tabIndex = -1
    modalElement.setAttribute('aria-hidden', 'true')

    modalElement.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title fs-5" id="${modalId}-title">${options.title}</h2>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    <p class="mb-0">${options.message}</p>
                </div>
                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn btn-outline-secondary"
                        data-market-ops-unsaved-action="cancel"
                    >
                        Keep Editing
                    </button>
                    <button
                        type="button"
                        class="btn btn-outline-danger"
                        data-market-ops-unsaved-action="discard"
                    >
                        ${options.discardLabel}
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary"
                        data-market-ops-unsaved-action="save"
                    >
                        ${options.saveLabel}
                    </button>
                </div>
            </div>
        </div>
    `

    document.body.appendChild(modalElement)
    return modalElement
}

function initializeMarketOpsUnsavedFormGuard({
    formSelector,
    title = 'Unsaved Changes',
    message = 'You have unsaved changes on this page. Save before leaving or discard those changes.',
    saveLabel = 'Save Changes',
    discardLabel = 'Discard Changes'
} = {}) {
    const form = document.querySelector(formSelector)

    if (!form) {
        return
    }

    const modalId = `${form.id || 'market-ops-form'}-unsaved-modal`
    const modalElement = ensureMarketOpsUnsavedModal(modalId, {
        title,
        message,
        saveLabel,
        discardLabel
    })
    const modal =
        window.bootstrap?.Modal != null
            ? window.bootstrap.Modal.getOrCreateInstance(modalElement)
            : null
    const saveButton = modalElement.querySelector('[data-market-ops-unsaved-action="save"]')
    const discardButton = modalElement.querySelector('[data-market-ops-unsaved-action="discard"]')

    let initialState = serializeMarketOpsFormState(form)
    let pendingHref = null
    let allowUnload = false
    let isSubmitting = false

    function hasUnsavedChanges() {
        return !allowUnload && serializeMarketOpsFormState(form) !== initialState
    }

    function openUnsavedChangesModal(nextHref) {
        pendingHref = nextHref

        if (modal) {
            modal.show()
        }
    }

    function navigateToPendingHref() {
        if (!pendingHref) {
            return
        }

        const nextHref = pendingHref
        pendingHref = null
        allowUnload = true
        window.location.assign(nextHref)
    }

    form.addEventListener(
        'submit',
        () => {
            if (form.checkValidity()) {
                allowUnload = true
                isSubmitting = true
            } else {
                allowUnload = false
                isSubmitting = false
            }
        },
        true
    )

    document.addEventListener(
        'click',
        (event) => {
            const anchor = event.target.closest('a[href]')

            if (!anchor || !hasUnsavedChanges()) {
                return
            }

            if (
                anchor.hasAttribute('download') ||
                anchor.target === '_blank' ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return
            }

            const href = anchor.getAttribute('href') || ''

            if (
                href.startsWith('#') ||
                href.startsWith('javascript:') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:')
            ) {
                return
            }

            event.preventDefault()
            openUnsavedChangesModal(anchor.href)
        },
        true
    )

    window.addEventListener('beforeunload', (event) => {
        if (allowUnload || isSubmitting || !hasUnsavedChanges()) {
            return
        }

        event.preventDefault()
        event.returnValue = ''
    })

    modalElement.addEventListener('hidden.bs.modal', () => {
        pendingHref = null
    })

    saveButton?.addEventListener('click', () => {
        if (modal) {
            modal.hide()
        }

        form.requestSubmit()
    })

    discardButton?.addEventListener('click', () => {
        if (modal) {
            modal.hide()
        }

        navigateToPendingHref()
    })

    form.addEventListener('reset', () => {
        requestAnimationFrame(() => {
            initialState = serializeMarketOpsFormState(form)
        })
    })
}

window.initializeMarketOpsUnsavedFormGuard = initializeMarketOpsUnsavedFormGuard

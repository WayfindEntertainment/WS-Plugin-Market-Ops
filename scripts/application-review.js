/* eslint-disable jsdoc/require-jsdoc */

function formatDollarsFromCents(cents) {
    const normalizedCents = Number.isFinite(Number(cents)) ? Number(cents) : 0
    return (normalizedCents / 100).toFixed(2)
}

function readPositiveQuantity(input) {
    const parsedValue = Number.parseInt(String(input?.value ?? ''), 10)
    return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : 1
}

function syncApprovalPricing(container) {
    const offeringField = container.querySelector('[data-application-review-offering]')
    const quantityField = container.querySelector('[data-application-review-quantity]')
    const feeField = container.querySelector('[data-application-review-fee]')

    if (!offeringField || !quantityField || !feeField) {
        return
    }

    let feeWasManuallyEdited = false

    function calculateFee() {
        const selectedOption =
            offeringField.options[offeringField.selectedIndex] ?? offeringField.options[0] ?? null
        const priceCents = Number.parseInt(String(selectedOption?.dataset?.priceCents ?? '0'), 10)
        const quantity = readPositiveQuantity(quantityField)
        return Number.isSafeInteger(priceCents) && priceCents > 0 ? priceCents * quantity : 0
    }

    function applyCalculatedFee() {
        feeField.value = formatDollarsFromCents(calculateFee())
    }

    offeringField.addEventListener('change', () => {
        feeWasManuallyEdited = false
        applyCalculatedFee()
    })

    quantityField.addEventListener('change', () => {
        feeWasManuallyEdited = false
        applyCalculatedFee()
    })

    quantityField.addEventListener('input', () => {
        if (feeWasManuallyEdited) {
            return
        }

        applyCalculatedFee()
    })

    feeField.addEventListener('input', () => {
        feeWasManuallyEdited = true
    })

    const normalizedInitialFee = String(feeField.value ?? '').trim()

    if (
        normalizedInitialFee.length === 0 ||
        normalizedInitialFee === '0' ||
        normalizedInitialFee === '0.0' ||
        normalizedInitialFee === '0.00'
    ) {
        applyCalculatedFee()
    }
}

document
    .querySelectorAll('[data-application-review-approval-form]')
    .forEach((container) => syncApprovalPricing(container))

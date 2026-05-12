/**
 * Create one deterministic Market Ops service-layer error.
 *
 * @param {string} code - Stable service error code.
 * @param {string} message - Human-readable error message.
 * @returns {Error} Tagged service error.
 */
export function createServiceError(code, message) {
    const err = new Error(message)
    err.name = 'MarketOpsServiceError'
    err.code = code
    return err
}

/**
 * Assert that the provided SDK database seam exposes the contract required by
 * the service layer.
 *
 * @param {unknown} database - Candidate database seam.
 * @returns {{
 *   query: (sql: string, params?: unknown[]) => Promise<unknown>,
 *   withTransaction: <T>(work: (conn: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>) => Promise<T>
 * }} Validated database seam.
 */
export function assertDatabase(database) {
    if (
        !database ||
        typeof database.query !== 'function' ||
        typeof database.withTransaction !== 'function'
    ) {
        throw createServiceError(
            'INVALID_MARKET_OPS_DATABASE',
            'Market Ops services require database.query and database.withTransaction'
        )
    }

    return database
}

/**
 * Assert that one candidate value is a plain object.
 *
 * @param {unknown} value - Candidate object value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {Record<string, unknown>} Validated plain object.
 */
export function assertPlainObject(value, variableName, errorCode) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw createServiceError(errorCode, `${variableName} must be a plain object`)
    }

    return /** @type {Record<string, unknown>} */ (value)
}

/**
 * Assert that one candidate value is an array.
 *
 * @param {unknown} value - Candidate array value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {unknown[]} Validated array.
 */
export function assertArray(value, variableName, errorCode) {
    if (!Array.isArray(value)) {
        throw createServiceError(errorCode, `${variableName} must be an array`)
    }

    return value
}

/**
 * Assert that one candidate string is present and non-empty.
 *
 * @param {unknown} value - Candidate string value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {string} Trimmed string value.
 */
export function assertNonEmptyString(value, variableName, errorCode) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw createServiceError(errorCode, `${variableName} must be a non-empty string`)
    }

    return value.trim()
}

/**
 * Normalize one optional string value.
 *
 * @param {unknown} value - Candidate string value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {string|null} Trimmed string or `null`.
 */
export function normalizeOptionalString(value, variableName, errorCode) {
    if (value == null) {
        return null
    }

    if (typeof value !== 'string') {
        throw createServiceError(errorCode, `${variableName} must be a string when provided`)
    }

    const normalizedValue = value.trim()

    return normalizedValue.length > 0 ? normalizedValue : null
}

/**
 * Assert that one candidate value is a positive safe integer.
 *
 * @param {unknown} value - Candidate integer.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number} Validated positive integer.
 */
export function assertPositiveInteger(value, variableName, errorCode) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw createServiceError(errorCode, `${variableName} must be a positive safe integer`)
    }

    return value
}

/**
 * Assert that one candidate value is a non-negative safe integer.
 *
 * @param {unknown} value - Candidate integer.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number} Validated non-negative integer.
 */
export function assertNonNegativeInteger(value, variableName, errorCode) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw createServiceError(errorCode, `${variableName} must be a non-negative safe integer`)
    }

    return value
}

/**
 * Normalize one optional positive safe integer.
 *
 * @param {unknown} value - Candidate integer.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number|null} Validated positive integer or `null`.
 */
export function normalizeOptionalPositiveInteger(value, variableName, errorCode) {
    if (value == null) {
        return null
    }

    return assertPositiveInteger(value, variableName, errorCode)
}

/**
 * Normalize one boolean-like flag into `0` or `1`.
 *
 * @param {unknown} value - Candidate flag value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {0|1} Normalized flag.
 */
export function normalizeBooleanFlag(value, variableName, errorCode) {
    if (value === 0 || value === false) {
        return 0
    }

    if (value === 1 || value === true) {
        return 1
    }

    throw createServiceError(errorCode, `${variableName} must be a boolean-like 0/1 value`)
}

/**
 * Normalize one nullable boolean-like flag into `0`, `1`, or `null`.
 *
 * @param {unknown} value - Candidate flag value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {0|1|null} Normalized nullable flag.
 */
export function normalizeNullableBooleanFlag(value, variableName, errorCode) {
    if (value == null) {
        return null
    }

    return normalizeBooleanFlag(value, variableName, errorCode)
}

/**
 * Normalize one constrained enum string.
 *
 * @param {unknown} value - Candidate string value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {readonly string[]} allowedValues - Allowed values.
 * @param {string} errorCode - Stable error code.
 * @returns {string} Validated enum value.
 */
export function normalizeEnumString(value, variableName, allowedValues, errorCode) {
    const normalizedValue = assertNonEmptyString(value, variableName, errorCode)

    if (!allowedValues.includes(normalizedValue)) {
        throw createServiceError(
            errorCode,
            `${variableName} must be one of: ${allowedValues.join(', ')}`
        )
    }

    return normalizedValue
}

/**
 * Build one lookup map keyed by a numeric id field.
 *
 * @template T
 * @param {T[]} values - Source values.
 * @param {(value: T) => number} getId - Id accessor.
 * @returns {Map<number, T>} Lookup map.
 */
export function mapById(values, getId) {
    return new Map(values.map((value) => [getId(value), value]))
}

/**
 * Assert that one array of ids does not contain duplicates.
 *
 * @param {number[]} ids - Candidate ids.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {void}
 */
export function assertUniqueIds(ids, variableName, errorCode) {
    const seen = new Set()

    for (const id of ids) {
        if (seen.has(id)) {
            throw createServiceError(errorCode, `${variableName} contains duplicate ids`)
        }

        seen.add(id)
    }
}

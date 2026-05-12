/**
 * Create one deterministic storage-layer error.
 *
 * @param {string} code - Stable error code.
 * @param {string} message - Human-readable error message.
 * @returns {Error} Tagged storage error.
 */
export function createStorageError(code, message) {
    const err = new Error(message)
    err.name = 'MarketOpsStorageError'
    err.code = code
    return err
}

/**
 * Assert that one candidate query seam exposes the minimum contract required
 * by the storage primitives.
 *
 * @param {unknown} queryable - Candidate query seam.
 * @returns {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} Validated query seam.
 */
export function assertQueryable(queryable) {
    if (!queryable || typeof queryable.query !== 'function') {
        throw createStorageError(
            'INVALID_MARKET_OPS_QUERYABLE',
            'Market Ops storage requires queryable.query(sql, params?)'
        )
    }

    return queryable
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
        throw createStorageError(errorCode, `${variableName} must be a plain object`)
    }

    return /** @type {Record<string, unknown>} */ (value)
}

/**
 * Assert that one candidate value is a non-empty string.
 *
 * @param {unknown} value - Candidate string value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {string} Trimmed string value.
 */
export function assertNonEmptyString(value, variableName, errorCode) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw createStorageError(errorCode, `${variableName} must be a non-empty string`)
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
        throw createStorageError(errorCode, `${variableName} must be a string when provided`)
    }

    const normalizedValue = value.trim()

    return normalizedValue.length > 0 ? normalizedValue : null
}

/**
 * Assert that one candidate value is a positive safe integer.
 *
 * @param {unknown} value - Candidate numeric value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number} Validated positive integer.
 */
export function assertPositiveInteger(value, variableName, errorCode) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw createStorageError(errorCode, `${variableName} must be a positive safe integer`)
    }

    return value
}

/**
 * Normalize one optional positive safe integer.
 *
 * @param {unknown} value - Candidate numeric value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number|null} Validated integer or `null`.
 */
export function normalizeOptionalPositiveInteger(value, variableName, errorCode) {
    if (value == null) {
        return null
    }

    return assertPositiveInteger(value, variableName, errorCode)
}

/**
 * Assert that one candidate value is a non-negative safe integer.
 *
 * @param {unknown} value - Candidate numeric value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number} Validated non-negative integer.
 */
export function assertNonNegativeInteger(value, variableName, errorCode) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw createStorageError(errorCode, `${variableName} must be a non-negative safe integer`)
    }

    return value
}

/**
 * Normalize one storage-backed boolean flag into `0` or `1`.
 *
 * @param {unknown} value - Candidate flag value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {0|1} Normalized boolean flag.
 */
export function normalizeBooleanFlag(value, variableName, errorCode) {
    if (value === 0 || value === false) {
        return 0
    }

    if (value === 1 || value === true) {
        return 1
    }

    throw createStorageError(errorCode, `${variableName} must be a boolean-like 0/1 value`)
}

/**
 * Normalize one nullable storage-backed boolean flag into `0`, `1`, or `null`.
 *
 * @param {unknown} value - Candidate flag value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {0|1|null} Normalized nullable boolean flag.
 */
export function normalizeNullableBooleanFlag(value, variableName, errorCode) {
    if (value == null) {
        return null
    }

    return normalizeBooleanFlag(value, variableName, errorCode)
}

/**
 * Normalize one epoch-millisecond timestamp.
 *
 * @param {unknown} value - Candidate timestamp value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number} Validated epoch-millisecond value.
 */
export function normalizeEpochMs(value, variableName, errorCode) {
    return assertNonNegativeInteger(value, variableName, errorCode)
}

/**
 * Normalize one optional epoch-millisecond timestamp.
 *
 * @param {unknown} value - Candidate timestamp value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {string} errorCode - Stable error code.
 * @returns {number|null} Validated epoch-millisecond value or `null`.
 */
export function normalizeOptionalEpochMs(value, variableName, errorCode) {
    if (value == null) {
        return null
    }

    return normalizeEpochMs(value, variableName, errorCode)
}

/**
 * Normalize one constrained enum-backed string value.
 *
 * @param {unknown} value - Candidate enum value.
 * @param {string} variableName - Variable name for deterministic errors.
 * @param {readonly string[]} allowedValues - Allowed values.
 * @param {string} errorCode - Stable error code.
 * @returns {string} Validated enum value.
 */
export function normalizeEnumString(value, variableName, allowedValues, errorCode) {
    const normalizedValue = assertNonEmptyString(value, variableName, errorCode)

    if (!allowedValues.includes(normalizedValue)) {
        throw createStorageError(
            errorCode,
            `${variableName} must be one of: ${allowedValues.join(', ')}`
        )
    }

    return normalizedValue
}

/**
 * Normalize one row bag returned by `mysql2`.
 *
 * @param {unknown} rows - Raw row bag.
 * @returns {Record<string, unknown>[]} Normalized row list.
 */
export function normalizeRows(rows) {
    return Array.isArray(rows) ? /** @type {Record<string, unknown>[]} */ (rows) : []
}

/**
 * Extract the first row from one driver result bag.
 *
 * @param {unknown} rows - Raw row bag.
 * @returns {Record<string, unknown>|null} First row or `null`.
 */
export function firstRow(rows) {
    const normalizedRows = normalizeRows(rows)

    return normalizedRows[0] ?? null
}

/**
 * Assert that one insert result returned a usable auto-increment id.
 *
 * @param {unknown} result - Raw mysql result metadata.
 * @param {string} errorCode - Stable error code.
 * @param {string} entityLabel - Human-readable entity label.
 * @returns {number} Validated inserted id.
 */
export function assertInsertId(result, errorCode, entityLabel) {
    const insertedId = Number(result?.insertId)

    if (!Number.isSafeInteger(insertedId) || insertedId <= 0) {
        throw createStorageError(
            errorCode,
            `${entityLabel} insert did not return a valid insert id`
        )
    }

    return insertedId
}

/**
 * Assert that one update or delete touched at least one row.
 *
 * @param {unknown} result - Raw mysql result metadata.
 * @param {string} errorCode - Stable error code.
 * @param {string} entityLabel - Human-readable entity label.
 * @returns {void}
 */
export function assertAffectedRows(result, errorCode, entityLabel) {
    if (Number(result?.affectedRows) === 0) {
        throw createStorageError(errorCode, `${entityLabel} was not found`)
    }
}

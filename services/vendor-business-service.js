import {
    deleteVendorBusinessProductCategoriesByVendorBusinessId,
    getVendorProductCategoryById,
    insertVendorBusinessProductCategory,
    listVendorBusinessProductCategoriesByVendorBusinessId
} from '../storage/catalog-storage.js'
import {
    deleteVendorBusinessOwner,
    getVendorBusinessById,
    insertVendorBusiness,
    insertVendorBusinessOwner,
    listVendorBusinesses,
    listVendorBusinessOwnersByVendorBusinessId,
    listVendorBusinessOwnershipsByUserId,
    updateVendorBusinessById
} from '../storage/vendor-business-storage.js'
import {
    assertArray,
    assertDatabase,
    assertPositiveInteger,
    assertUniqueIds,
    createServiceError,
    mapById,
    normalizeOptionalPositiveInteger,
    normalizeOptionalString,
    assertPlainObject
} from './service-helpers.js'

/**
 * Normalize one vendor business product-category assignment list.
 *
 * @param {unknown} input - Candidate assignment list.
 * @returns {Array<{ vendorProductCategoryId: number, isPrimary: 0|1 }>} Normalized assignments.
 */
function normalizeProductCategoryAssignments(input) {
    const assignments = assertArray(
        input,
        'productCategories',
        'INVALID_VENDOR_BUSINESS_PRODUCT_CATEGORIES'
    ).map((assignment, index) => {
        const normalizedAssignment = assertPlainObject(
            assignment,
            `productCategories[${index}]`,
            'INVALID_VENDOR_BUSINESS_PRODUCT_CATEGORY_ASSIGNMENT'
        )
        const vendorProductCategoryId = assertPositiveInteger(
            normalizedAssignment.vendorProductCategoryId,
            `productCategories[${index}].vendorProductCategoryId`,
            'INVALID_VENDOR_PRODUCT_CATEGORY_ID'
        )
        const isPrimary =
            normalizedAssignment.isPrimary === true || normalizedAssignment.isPrimary === 1 ? 1 : 0

        return {
            vendorProductCategoryId,
            isPrimary
        }
    })

    assertUniqueIds(
        assignments.map((assignment) => assignment.vendorProductCategoryId),
        'productCategories',
        'DUPLICATE_VENDOR_BUSINESS_PRODUCT_CATEGORY_IDS'
    )

    if (assignments.filter((assignment) => assignment.isPrimary === 1).length > 1) {
        throw createServiceError(
            'MULTIPLE_PRIMARY_VENDOR_BUSINESS_PRODUCT_CATEGORIES',
            'At most one vendor business product category may be marked primary'
        )
    }

    return assignments
}

/**
 * Build one route-friendly vendor business detail object.
 *
 * @param {{
 *   vendorBusiness: Awaited<ReturnType<typeof getVendorBusinessById>>,
 *   owners: Awaited<ReturnType<typeof listVendorBusinessOwnersByVendorBusinessId>>,
 *   productCategoryAssignments: Awaited<ReturnType<typeof listVendorBusinessProductCategoriesByVendorBusinessId>>,
 *   categories: Array<Awaited<ReturnType<typeof getVendorProductCategoryById>>>
 * }} input - Related detail parts.
 * @returns {{
 *   vendorBusiness: NonNullable<Awaited<ReturnType<typeof getVendorBusinessById>>>,
 *   owners: Awaited<ReturnType<typeof listVendorBusinessOwnersByVendorBusinessId>>,
 *   productCategoryAssignments: Array<{
 *     vendorBusinessId: number,
 *     vendorProductCategoryId: number,
 *     isPrimary: number,
 *     category: Awaited<ReturnType<typeof getVendorProductCategoryById>>|null
 *   }>
 * }} Enriched detail object.
 */
function buildVendorBusinessDetail({
    vendorBusiness,
    owners,
    productCategoryAssignments,
    categories
}) {
    const categoriesById = mapById(
        categories.filter(Boolean),
        (category) => category.vendorProductCategoryId
    )

    return {
        vendorBusiness,
        owners,
        productCategoryAssignments: productCategoryAssignments.map((assignment) => ({
            ...assignment,
            category: categoriesById.get(assignment.vendorProductCategoryId) ?? null
        }))
    }
}

const defaultDependencies = {
    insertVendorBusiness,
    getVendorBusinessById,
    listVendorBusinesses,
    updateVendorBusinessById,
    insertVendorBusinessOwner,
    listVendorBusinessOwnersByVendorBusinessId,
    listVendorBusinessOwnershipsByUserId,
    deleteVendorBusinessOwner,
    getVendorProductCategoryById,
    insertVendorBusinessProductCategory,
    listVendorBusinessProductCategoriesByVendorBusinessId,
    deleteVendorBusinessProductCategoriesByVendorBusinessId
}

/**
 * Create one Market Ops vendor business service.
 *
 * @param {{
 *   query: (sql: string, params?: unknown[]) => Promise<unknown>,
 *   withTransaction: <T>(work: (conn: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>) => Promise<T>
 * }} database - SDK database seam.
 * @param {Partial<typeof defaultDependencies>} [overrides] - Optional test overrides.
 * @returns {{
 *   createVendorBusiness: (input: {
 *     vendorBusiness: unknown,
 *     ownerUserId?: number|null,
 *     productCategories?: unknown[]
 *   }) => Promise<ReturnType<typeof buildVendorBusinessDetail>>,
 *   getVendorBusinessById: (vendorBusinessId: number) => Promise<Awaited<ReturnType<typeof getVendorBusinessById>>>,
 *   getVendorBusinessDetailById: (vendorBusinessId: number) => Promise<ReturnType<typeof buildVendorBusinessDetail>>,
 *   listVendorBusinesses: () => Promise<Awaited<ReturnType<typeof listVendorBusinesses>>>,
 *   listVendorBusinessDetails: () => Promise<Array<ReturnType<typeof buildVendorBusinessDetail>>>,
 *   listVendorBusinessesByOwnerUserId: (userId: number) => Promise<Array<ReturnType<typeof buildVendorBusinessDetail>>>,
 *   updateVendorBusiness: (vendorBusinessId: number, input: {
 *     vendorBusiness?: unknown,
 *     productCategories?: unknown[]
 *   }) => Promise<ReturnType<typeof buildVendorBusinessDetail>>,
 *   addVendorBusinessOwner: (vendorBusinessId: number, userId: number) => Promise<Awaited<ReturnType<typeof listVendorBusinessOwnersByVendorBusinessId>>>,
 *   removeVendorBusinessOwner: (vendorBusinessId: number, userId: number) => Promise<Awaited<ReturnType<typeof listVendorBusinessOwnersByVendorBusinessId>>>,
 *   replaceVendorBusinessProductCategories: (vendorBusinessId: number, productCategories: unknown[]) => Promise<ReturnType<typeof buildVendorBusinessDetail>>,
 *   approveVendorBusiness: (vendorBusinessId: number, input: {
 *     approvalNotes?: unknown,
 *     approvedAt?: number,
 *     approvedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildVendorBusinessDetail>>,
 *   rejectVendorBusiness: (vendorBusinessId: number, input: {
 *     approvalNotes?: unknown,
 *     rejectedAt?: number,
 *     rejectedByUserId?: number|null,
 *     updatedByUserId?: number|null
 *   }) => Promise<ReturnType<typeof buildVendorBusinessDetail>>
 * }} Vendor business service.
 */
export function createMarketOpsVendorBusinessService(database, overrides = {}) {
    const normalizedDatabase = assertDatabase(database)
    const dependencies = {
        ...defaultDependencies,
        ...overrides
    }

    /**
     * Read one vendor business or fail with one deterministic service error.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorBusinessId - Vendor business id.
     * @returns {Promise<NonNullable<Awaited<ReturnType<typeof getVendorBusinessById>>>>} Matching vendor business.
     */
    async function requireVendorBusiness(queryable, vendorBusinessId) {
        const vendorBusiness = await dependencies.getVendorBusinessById(queryable, vendorBusinessId)

        if (!vendorBusiness) {
            throw createServiceError(
                'VENDOR_BUSINESS_NOT_FOUND',
                `Vendor business was not found: ${vendorBusinessId}`
            )
        }

        return vendorBusiness
    }

    /**
     * Load one enriched vendor business detail payload.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorBusinessId - Vendor business id.
     * @returns {Promise<ReturnType<typeof buildVendorBusinessDetail>>} Enriched vendor business detail.
     */
    async function loadVendorBusinessDetail(queryable, vendorBusinessId) {
        const vendorBusiness = await requireVendorBusiness(queryable, vendorBusinessId)
        const owners = await dependencies.listVendorBusinessOwnersByVendorBusinessId(
            queryable,
            vendorBusinessId
        )
        const productCategoryAssignments =
            await dependencies.listVendorBusinessProductCategoriesByVendorBusinessId(
                queryable,
                vendorBusinessId
            )
        const categories = await Promise.all(
            productCategoryAssignments.map((assignment) =>
                dependencies.getVendorProductCategoryById(
                    queryable,
                    assignment.vendorProductCategoryId
                )
            )
        )

        return buildVendorBusinessDetail({
            vendorBusiness,
            owners,
            productCategoryAssignments,
            categories
        })
    }

    /**
     * Assert that all referenced product category ids currently exist.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {Array<{ vendorProductCategoryId: number, isPrimary: 0|1 }>} assignments - Product category assignments.
     * @returns {Promise<void>}
     */
    async function requireCategoryIds(queryable, assignments) {
        await Promise.all(
            assignments.map(async (assignment) => {
                const category = await dependencies.getVendorProductCategoryById(
                    queryable,
                    assignment.vendorProductCategoryId
                )

                if (!category) {
                    throw createServiceError(
                        'VENDOR_PRODUCT_CATEGORY_NOT_FOUND',
                        `Vendor product category was not found: ${assignment.vendorProductCategoryId}`
                    )
                }
            })
        )
    }

    /**
     * Replace all vendor business product category assignments in one pass.
     *
     * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} queryable - Query seam.
     * @param {number} vendorBusinessId - Vendor business id.
     * @param {Array<{ vendorProductCategoryId: number, isPrimary: 0|1 }>} assignments - Product category assignments.
     * @returns {Promise<void>}
     */
    async function writeVendorBusinessProductCategories(queryable, vendorBusinessId, assignments) {
        await dependencies.deleteVendorBusinessProductCategoriesByVendorBusinessId(
            queryable,
            vendorBusinessId
        )

        for (const assignment of assignments) {
            await dependencies.insertVendorBusinessProductCategory(queryable, {
                vendorBusinessId,
                vendorProductCategoryId: assignment.vendorProductCategoryId,
                isPrimary: assignment.isPrimary
            })
        }
    }

    return {
        async createVendorBusiness(input) {
            const normalizedInput = assertPlainObject(
                input,
                'input',
                'INVALID_VENDOR_BUSINESS_CREATE_INPUT'
            )
            const ownerUserId = normalizeOptionalPositiveInteger(
                normalizedInput.ownerUserId,
                'ownerUserId',
                'INVALID_VENDOR_BUSINESS_OWNER_USER_ID'
            )
            const productCategories =
                typeof normalizedInput.productCategories === 'undefined'
                    ? []
                    : normalizeProductCategoryAssignments(normalizedInput.productCategories)

            return normalizedDatabase.withTransaction(async (conn) => {
                await requireCategoryIds(conn, productCategories)

                const createdVendorBusiness = await dependencies.insertVendorBusiness(
                    conn,
                    normalizedInput.vendorBusiness
                )

                if (ownerUserId !== null) {
                    await dependencies.insertVendorBusinessOwner(conn, {
                        vendorBusinessId: createdVendorBusiness.vendorBusinessId,
                        userId: ownerUserId
                    })
                }

                await writeVendorBusinessProductCategories(
                    conn,
                    createdVendorBusiness.vendorBusinessId,
                    productCategories
                )

                return loadVendorBusinessDetail(conn, createdVendorBusiness.vendorBusinessId)
            })
        },

        async getVendorBusinessById(vendorBusinessId) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )

            return dependencies.getVendorBusinessById(
                normalizedDatabase,
                normalizedVendorBusinessId
            )
        },

        async getVendorBusinessDetailById(vendorBusinessId) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )

            return loadVendorBusinessDetail(normalizedDatabase, normalizedVendorBusinessId)
        },

        async listVendorBusinesses() {
            return dependencies.listVendorBusinesses(normalizedDatabase)
        },

        async listVendorBusinessDetails() {
            const vendorBusinesses = await dependencies.listVendorBusinesses(normalizedDatabase)

            return Promise.all(
                vendorBusinesses.map((vendorBusiness) =>
                    loadVendorBusinessDetail(normalizedDatabase, vendorBusiness.vendorBusinessId)
                )
            )
        },

        async listVendorBusinessesByOwnerUserId(userId) {
            const normalizedUserId = assertPositiveInteger(
                userId,
                'userId',
                'INVALID_VENDOR_BUSINESS_OWNER_USER_ID'
            )
            const ownerships = await dependencies.listVendorBusinessOwnershipsByUserId(
                normalizedDatabase,
                normalizedUserId
            )

            return Promise.all(
                ownerships.map((ownership) =>
                    loadVendorBusinessDetail(normalizedDatabase, ownership.vendorBusinessId)
                )
            )
        },

        async updateVendorBusiness(vendorBusinessId, input) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )
            const normalizedInput = assertPlainObject(
                input,
                'input',
                'INVALID_VENDOR_BUSINESS_UPDATE_INPUT'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                await requireVendorBusiness(conn, normalizedVendorBusinessId)

                if (typeof normalizedInput.vendorBusiness !== 'undefined') {
                    await dependencies.updateVendorBusinessById(
                        conn,
                        normalizedVendorBusinessId,
                        normalizedInput.vendorBusiness
                    )
                }

                if (typeof normalizedInput.productCategories !== 'undefined') {
                    const productCategories = normalizeProductCategoryAssignments(
                        normalizedInput.productCategories
                    )
                    await requireCategoryIds(conn, productCategories)
                    await writeVendorBusinessProductCategories(
                        conn,
                        normalizedVendorBusinessId,
                        productCategories
                    )
                }

                return loadVendorBusinessDetail(conn, normalizedVendorBusinessId)
            })
        },

        async addVendorBusinessOwner(vendorBusinessId, userId) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )
            const normalizedUserId = assertPositiveInteger(
                userId,
                'userId',
                'INVALID_VENDOR_BUSINESS_OWNER_USER_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                await requireVendorBusiness(conn, normalizedVendorBusinessId)
                await dependencies.insertVendorBusinessOwner(conn, {
                    vendorBusinessId: normalizedVendorBusinessId,
                    userId: normalizedUserId
                })

                return dependencies.listVendorBusinessOwnersByVendorBusinessId(
                    conn,
                    normalizedVendorBusinessId
                )
            })
        },

        async removeVendorBusinessOwner(vendorBusinessId, userId) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )
            const normalizedUserId = assertPositiveInteger(
                userId,
                'userId',
                'INVALID_VENDOR_BUSINESS_OWNER_USER_ID'
            )

            return normalizedDatabase.withTransaction(async (conn) => {
                await dependencies.deleteVendorBusinessOwner(
                    conn,
                    normalizedVendorBusinessId,
                    normalizedUserId
                )

                return dependencies.listVendorBusinessOwnersByVendorBusinessId(
                    conn,
                    normalizedVendorBusinessId
                )
            })
        },

        async replaceVendorBusinessProductCategories(vendorBusinessId, productCategories) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )
            const normalizedProductCategories =
                normalizeProductCategoryAssignments(productCategories)

            return normalizedDatabase.withTransaction(async (conn) => {
                await requireVendorBusiness(conn, normalizedVendorBusinessId)
                await requireCategoryIds(conn, normalizedProductCategories)
                await writeVendorBusinessProductCategories(
                    conn,
                    normalizedVendorBusinessId,
                    normalizedProductCategories
                )

                return loadVendorBusinessDetail(conn, normalizedVendorBusinessId)
            })
        },

        async approveVendorBusiness(vendorBusinessId, input) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )
            const normalizedInput = assertPlainObject(
                input,
                'input',
                'INVALID_VENDOR_BUSINESS_APPROVAL_INPUT'
            )
            const now = Date.now()

            return normalizedDatabase.withTransaction(async (conn) => {
                const currentRecord = await requireVendorBusiness(conn, normalizedVendorBusinessId)

                await dependencies.updateVendorBusinessById(conn, normalizedVendorBusinessId, {
                    approvalStatus: 'approved',
                    approvalNotes: normalizeOptionalString(
                        normalizedInput.approvalNotes,
                        'approvalNotes',
                        'INVALID_VENDOR_BUSINESS_APPROVAL_NOTES'
                    ),
                    approvedAt:
                        typeof normalizedInput.approvedAt === 'undefined'
                            ? now
                            : normalizedInput.approvedAt,
                    approvedByUserId:
                        typeof normalizedInput.approvedByUserId === 'undefined'
                            ? null
                            : normalizedInput.approvedByUserId,
                    rejectedAt: null,
                    rejectedByUserId: null,
                    updatedAt: now,
                    updatedByUserId:
                        typeof normalizedInput.updatedByUserId === 'undefined'
                            ? currentRecord.updatedByUserId
                            : normalizedInput.updatedByUserId
                })

                return loadVendorBusinessDetail(conn, normalizedVendorBusinessId)
            })
        },

        async rejectVendorBusiness(vendorBusinessId, input) {
            const normalizedVendorBusinessId = assertPositiveInteger(
                vendorBusinessId,
                'vendorBusinessId',
                'INVALID_VENDOR_BUSINESS_ID'
            )
            const normalizedInput = assertPlainObject(
                input,
                'input',
                'INVALID_VENDOR_BUSINESS_REJECTION_INPUT'
            )
            const now = Date.now()

            return normalizedDatabase.withTransaction(async (conn) => {
                const currentRecord = await requireVendorBusiness(conn, normalizedVendorBusinessId)

                await dependencies.updateVendorBusinessById(conn, normalizedVendorBusinessId, {
                    approvalStatus: 'rejected',
                    approvalNotes: normalizeOptionalString(
                        normalizedInput.approvalNotes,
                        'approvalNotes',
                        'INVALID_VENDOR_BUSINESS_APPROVAL_NOTES'
                    ),
                    approvedAt: null,
                    approvedByUserId: null,
                    rejectedAt:
                        typeof normalizedInput.rejectedAt === 'undefined'
                            ? now
                            : normalizedInput.rejectedAt,
                    rejectedByUserId:
                        typeof normalizedInput.rejectedByUserId === 'undefined'
                            ? null
                            : normalizedInput.rejectedByUserId,
                    updatedAt: now,
                    updatedByUserId:
                        typeof normalizedInput.updatedByUserId === 'undefined'
                            ? currentRecord.updatedByUserId
                            : normalizedInput.updatedByUserId
                })

                return loadVendorBusinessDetail(conn, normalizedVendorBusinessId)
            })
        }
    }
}

export default createMarketOpsVendorBusinessService

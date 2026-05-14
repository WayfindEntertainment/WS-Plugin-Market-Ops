/* eslint-disable jsdoc/require-jsdoc */

import bcrypt from 'bcrypt'
import mysql from 'mysql2/promise'

const DEFAULT_PASSWORD = process.env.MARKET_OPS_SEED_PASSWORD ?? 'VendorDemo123!'
const DEFAULT_DB_CONFIG = {
    host: process.env.MARKET_OPS_SEED_DB_HOST ?? process.env.DB_HOST ?? '127.0.0.1',
    port: Number.parseInt(process.env.MARKET_OPS_SEED_DB_PORT ?? process.env.DB_PORT ?? '3308', 10),
    user: process.env.MARKET_OPS_SEED_DB_USER ?? process.env.DB_USER ?? 'studio_dev_user',
    password:
        process.env.MARKET_OPS_SEED_DB_PASSWORD ?? process.env.DB_PASSWORD ?? 'studio_dev_pass',
    database: process.env.MARKET_OPS_SEED_DB_NAME ?? process.env.DB_DATABASE ?? 'studio_dev'
}

const PRODUCT_CATEGORIES = [
    {
        slug: 'woodworking',
        label: 'Woodworking',
        description: 'Wood decor, carved goods, and handmade furniture accents.',
        isActive: 1,
        sortOrder: 0
    },
    {
        slug: 'art-prints',
        label: 'Art Prints',
        description: 'Illustration, stationery, and other paper goods.',
        isActive: 1,
        sortOrder: 1
    },
    {
        slug: 'candles',
        label: 'Candles',
        description: 'Poured candles, wax melts, and home fragrance goods.',
        isActive: 1,
        sortOrder: 2
    },
    {
        slug: 'baked-goods',
        label: 'Baked Goods',
        description: 'Cookies, bars, breads, and other baked treats.',
        isActive: 1,
        sortOrder: 3
    },
    {
        slug: 'coffee-tea',
        label: 'Coffee & Tea',
        description: 'Whole-bean coffee, tea blends, and drink-related products.',
        isActive: 1,
        sortOrder: 4
    },
    {
        slug: 'specialty-foods',
        label: 'Specialty Foods',
        description: 'Shelf-stable foods, sauces, and pantry items.',
        isActive: 1,
        sortOrder: 5
    },
    {
        slug: 'handmade-jewelry',
        label: 'Handmade Jewelry',
        description: 'Necklaces, earrings, bracelets, and wearable accessories.',
        isActive: 1,
        sortOrder: 6
    },
    {
        slug: 'stickers',
        label: 'Stickers',
        description: 'Sticker packs, decals, and small illustrated merch.',
        isActive: 1,
        sortOrder: 7
    }
]

const BOOTH_TYPES = [
    {
        slug: 'standard-table',
        label: 'Standard Table',
        description: 'Single 6-foot table footprint.',
        isActive: 1,
        sortOrder: 0
    },
    {
        slug: 'double-table',
        label: 'Double Table',
        description: 'Two-table footprint for larger displays.',
        isActive: 1,
        sortOrder: 1
    },
    {
        slug: 'wall-space',
        label: 'Wall Space',
        description: 'Indoor wall-adjacent booth for vertical displays.',
        isActive: 1,
        sortOrder: 2
    },
    {
        slug: 'parking-space',
        label: 'Parking Space',
        description: 'Outdoor full vehicle-width selling space.',
        isActive: 1,
        sortOrder: 3
    }
]

const LOCATIONS = [
    {
        slug: 'crossroads-parking-lot',
        locationName: 'Crossroads Neighborhood Church Parking Lot',
        addressLine1: '7555 Old Military Road',
        addressLine2: null,
        city: 'Bremerton',
        stateCode: 'WA',
        postalCode: '98311',
        publicNotes: 'Outdoor lot setup with nearby restrooms.',
        isActive: 1
    },
    {
        slug: 'crossroads-lobby',
        locationName: 'Crossroads Neighborhood Church Lobby',
        addressLine1: '7555 Old Military Road',
        addressLine2: null,
        city: 'Bremerton',
        stateCode: 'WA',
        postalCode: '98311',
        publicNotes: 'Indoor lobby and hallway setup.',
        isActive: 1
    },
    {
        slug: 'waterfront-plaza',
        locationName: 'Bremerton Waterfront Plaza',
        addressLine1: '1 Pacific Avenue',
        addressLine2: null,
        city: 'Bremerton',
        stateCode: 'WA',
        postalCode: '98337',
        publicNotes: 'Open-air plaza with heavy weekend foot traffic.',
        isActive: 1
    },
    {
        slug: 'city-hall-lawn',
        locationName: 'Silverdale Civic Lawn',
        addressLine1: '4500 Silverdale Way NW',
        addressLine2: null,
        city: 'Silverdale',
        stateCode: 'WA',
        postalCode: '98383',
        publicNotes: 'Family-friendly lawn event footprint.',
        isActive: 1
    }
]

const MARKET_GROUPS = [
    {
        slug: 'summer-night-market-series',
        groupName: 'Summer Night Market Series',
        summary: 'Monthly evening markets for summer crowds.',
        description: 'A recurring outdoor series focused on food, art, and community traffic.',
        feeMode: 'per_market',
        feeAmountCents: 1500,
        isPublic: 1
    },
    {
        slug: 'holiday-makers-market',
        groupName: 'Holiday Makers Market',
        summary: 'Indoor holiday shopping events.',
        description:
            'A seasonal pair of curated holiday markets with higher gift-shopping traffic.',
        feeMode: 'per_group',
        feeAmountCents: 2500,
        isPublic: 1
    },
    {
        slug: 'neighborhood-pop-up-series',
        groupName: 'Neighborhood Pop-Up Series',
        summary: 'Smaller community pop-ups across the county.',
        description:
            'Low-friction community pop-ups intended for newer vendors and quick local events.',
        feeMode: 'none',
        feeAmountCents: 0,
        isPublic: 1
    },
    {
        slug: 'curated-indoor-showcase',
        groupName: 'Curated Indoor Showcase',
        summary: 'Private admin-only showcase for invite lists and internal testing.',
        description:
            'A smaller private showcase used for internal workflow verification and special cases.',
        feeMode: 'per_group',
        feeAmountCents: 4000,
        isPublic: 0
    }
]

const MARKETS = [
    {
        groupSlug: 'summer-night-market-series',
        locationSlug: 'crossroads-parking-lot',
        slug: 'june-2026-night-market',
        marketName: 'June 2026 Night Market',
        summary: 'Kickoff market for the summer series.',
        description: 'Outdoor evening market with music and food trucks.',
        startsAt: toEpochMs('2026-06-20T17:00:00-07:00'),
        endsAt: toEpochMs('2026-06-20T21:00:00-07:00'),
        applicationsOpen: 1,
        applicationsOpenAt: toEpochMs('2026-05-01T09:00:00-07:00'),
        applicationsCloseAt: toEpochMs('2026-06-10T23:59:00-07:00'),
        feeAmountCents: 1500,
        isPublic: 1
    },
    {
        groupSlug: 'summer-night-market-series',
        locationSlug: 'waterfront-plaza',
        slug: 'july-2026-night-market',
        marketName: 'July 2026 Night Market',
        summary: 'Peak-season waterfront market.',
        description: 'Outdoor market with vendor row near the water.',
        startsAt: toEpochMs('2026-07-18T17:00:00-07:00'),
        endsAt: toEpochMs('2026-07-18T21:30:00-07:00'),
        applicationsOpen: 1,
        applicationsOpenAt: toEpochMs('2026-05-15T09:00:00-07:00'),
        applicationsCloseAt: toEpochMs('2026-07-08T23:59:00-07:00'),
        feeAmountCents: 1500,
        isPublic: 1
    },
    {
        groupSlug: 'summer-night-market-series',
        locationSlug: 'city-hall-lawn',
        slug: 'august-2026-night-market',
        marketName: 'August 2026 Night Market',
        summary: 'Late-summer community lawn market.',
        description: 'Outdoor market with a mix of food and family vendors.',
        startsAt: toEpochMs('2026-08-15T16:30:00-07:00'),
        endsAt: toEpochMs('2026-08-15T20:30:00-07:00'),
        applicationsOpen: 1,
        applicationsOpenAt: toEpochMs('2026-06-01T09:00:00-07:00'),
        applicationsCloseAt: toEpochMs('2026-08-05T23:59:00-07:00'),
        feeAmountCents: 1500,
        isPublic: 1
    },
    {
        groupSlug: 'holiday-makers-market',
        locationSlug: 'crossroads-lobby',
        slug: 'november-2026-holiday-market',
        marketName: 'November 2026 Holiday Market',
        summary: 'Indoor early holiday shopping event.',
        description: 'First holiday market weekend with indoor booth footprints.',
        startsAt: toEpochMs('2026-11-14T10:00:00-08:00'),
        endsAt: toEpochMs('2026-11-14T16:00:00-08:00'),
        applicationsOpen: 1,
        applicationsOpenAt: toEpochMs('2026-08-20T09:00:00-07:00'),
        applicationsCloseAt: toEpochMs('2026-11-01T23:59:00-08:00'),
        feeAmountCents: 2500,
        isPublic: 1
    },
    {
        groupSlug: 'holiday-makers-market',
        locationSlug: 'crossroads-lobby',
        slug: 'december-2026-holiday-market',
        marketName: 'December 2026 Holiday Market',
        summary: 'Second indoor holiday shopping event.',
        description: 'Gift-focused follow-up holiday market with indoor booth types.',
        startsAt: toEpochMs('2026-12-12T10:00:00-08:00'),
        endsAt: toEpochMs('2026-12-12T16:00:00-08:00'),
        applicationsOpen: 1,
        applicationsOpenAt: toEpochMs('2026-08-20T09:00:00-07:00'),
        applicationsCloseAt: toEpochMs('2026-11-25T23:59:00-08:00'),
        feeAmountCents: 2500,
        isPublic: 1
    },
    {
        groupSlug: 'neighborhood-pop-up-series',
        locationSlug: 'waterfront-plaza',
        slug: 'june-2026-waterfront-pop-up',
        marketName: 'June 2026 Waterfront Pop-Up',
        summary: 'Smaller waterfront pop-up event.',
        description: 'Entry-friendly market with no application fee.',
        startsAt: toEpochMs('2026-06-06T11:00:00-07:00'),
        endsAt: toEpochMs('2026-06-06T15:00:00-07:00'),
        applicationsOpen: 1,
        applicationsOpenAt: toEpochMs('2026-05-01T09:00:00-07:00'),
        applicationsCloseAt: toEpochMs('2026-05-29T23:59:00-07:00'),
        feeAmountCents: 0,
        isPublic: 1
    },
    {
        groupSlug: 'neighborhood-pop-up-series',
        locationSlug: 'city-hall-lawn',
        slug: 'july-2026-civic-pop-up',
        marketName: 'July 2026 Civic Pop-Up',
        summary: 'Family-focused lawn pop-up.',
        description: 'Community lawn event with simple booth footprints.',
        startsAt: toEpochMs('2026-07-11T11:00:00-07:00'),
        endsAt: toEpochMs('2026-07-11T15:00:00-07:00'),
        applicationsOpen: 1,
        applicationsOpenAt: toEpochMs('2026-05-20T09:00:00-07:00'),
        applicationsCloseAt: toEpochMs('2026-07-02T23:59:00-07:00'),
        feeAmountCents: 0,
        isPublic: 1
    },
    {
        groupSlug: 'curated-indoor-showcase',
        locationSlug: 'crossroads-lobby',
        slug: 'september-2026-showcase',
        marketName: 'September 2026 Indoor Showcase',
        summary: 'Private showcase for internal use.',
        description: 'Private admin-facing test market.',
        startsAt: toEpochMs('2026-09-19T12:00:00-07:00'),
        endsAt: toEpochMs('2026-09-19T17:00:00-07:00'),
        applicationsOpen: 0,
        applicationsOpenAt: null,
        applicationsCloseAt: null,
        feeAmountCents: 4000,
        isPublic: 0
    }
]

const MARKET_OFFERINGS = [
    createOffering('june-2026-night-market', 'standard-table', 1, 12500, 1, 0),
    createOffering('june-2026-night-market', 'double-table', 2, 18500, 1, 1),
    createOffering('june-2026-night-market', 'parking-space', 3, 21000, 1, 2),
    createOffering('july-2026-night-market', 'standard-table', 1, 13000, 1, 0),
    createOffering('july-2026-night-market', 'double-table', 2, 19000, 1, 1),
    createOffering('july-2026-night-market', 'parking-space', 3, 22000, 1, 2),
    createOffering('august-2026-night-market', 'standard-table', 1, 13000, 1, 0),
    createOffering('august-2026-night-market', 'double-table', 2, 19500, 1, 1),
    createOffering('august-2026-night-market', 'parking-space', 3, 22500, 1, 2),
    createOffering('november-2026-holiday-market', 'standard-table', 1, 9500, 1, 0),
    createOffering('november-2026-holiday-market', 'double-table', 2, 15000, 1, 1),
    createOffering('november-2026-holiday-market', 'wall-space', 3, 11000, 1, 2),
    createOffering('december-2026-holiday-market', 'standard-table', 1, 10000, 1, 0),
    createOffering('december-2026-holiday-market', 'double-table', 2, 15500, 1, 1),
    createOffering('december-2026-holiday-market', 'wall-space', 3, 11500, 1, 2),
    createOffering('june-2026-waterfront-pop-up', 'standard-table', 1, 8000, 1, 0),
    createOffering('june-2026-waterfront-pop-up', 'parking-space', 2, 12000, 1, 1),
    createOffering('july-2026-civic-pop-up', 'standard-table', 1, 8000, 1, 0),
    createOffering('july-2026-civic-pop-up', 'parking-space', 2, 12000, 1, 1),
    createOffering('september-2026-showcase', 'wall-space', 1, 14000, 1, 0),
    createOffering('september-2026-showcase', 'double-table', 2, 18000, 1, 1)
]

const VENDOR_USERS = [
    {
        email: 'lena@demo.local',
        displayName: 'Lena Hart',
        timezone: 'America/Los_Angeles'
    },
    {
        email: 'marco@demo.local',
        displayName: 'Marco Ruiz',
        timezone: 'America/Los_Angeles'
    },
    {
        email: 'june@demo.local',
        displayName: 'June Park',
        timezone: 'America/Los_Angeles'
    },
    {
        email: 'nina@demo.local',
        displayName: 'Nina Shah',
        timezone: 'America/Los_Angeles'
    },
    {
        email: 'owen@demo.local',
        displayName: 'Owen Bell',
        timezone: 'America/Los_Angeles'
    },
    {
        email: 'maya@demo.local',
        displayName: 'Maya Flores',
        timezone: 'America/Los_Angeles'
    }
]

const VENDOR_BUSINESSES = [
    {
        ownerEmail: 'lena@demo.local',
        slug: 'cedar-pine-workshop',
        businessName: 'Cedar & Pine Workshop',
        legalName: 'Cedar & Pine Workshop LLC',
        summary: 'Handmade wood goods for home and gifting.',
        description:
            'Cedar & Pine Workshop makes carved home goods, keepsake trays, and small-batch wood decor pieces.',
        email: 'hello@cedarpineworkshop.demo',
        phone: '3605550101',
        websiteUrl: 'cedarpineworkshop.demo',
        approvalStatus: 'approved',
        approvalNotes: null,
        categorySlugs: ['woodworking', 'art-prints']
    },
    {
        ownerEmail: 'marco@demo.local',
        slug: 'sweet-current-confections',
        businessName: 'Sweet Current Confections',
        legalName: 'Sweet Current Confections',
        summary: 'Cookies, bars, and seasonal sweets.',
        description:
            'Sweet Current Confections focuses on market-ready baked goods and small giftable treats.',
        email: 'orders@sweetcurrent.demo',
        phone: '3605550102',
        websiteUrl: 'sweetcurrent.demo',
        approvalStatus: 'approved',
        approvalNotes: null,
        categorySlugs: ['baked-goods', 'specialty-foods']
    },
    {
        ownerEmail: 'june@demo.local',
        slug: 'lantern-press-studio',
        businessName: 'Lantern Press Studio',
        legalName: 'Lantern Press Studio',
        summary: 'Illustrated prints, stickers, and paper goods.',
        description:
            'Lantern Press Studio brings art prints, sticker packs, and stationery designed for gift-heavy markets.',
        email: 'studio@lanternpress.demo',
        phone: '3605550103',
        websiteUrl: 'lanternpress.demo',
        approvalStatus: 'approved',
        approvalNotes: null,
        categorySlugs: ['art-prints', 'stickers']
    },
    {
        ownerEmail: 'nina@demo.local',
        slug: 'hearthside-pantry',
        businessName: 'Hearthside Pantry',
        legalName: 'Hearthside Pantry LLC',
        summary: 'Small-batch pantry staples and mixes.',
        description:
            'Hearthside Pantry sells soup mixes, spice blends, and small-batch pantry staples.',
        email: 'hello@hearthsidepantry.demo',
        phone: '3605550104',
        websiteUrl: 'hearthsidepantry.demo',
        approvalStatus: 'pending',
        approvalNotes: 'Needs current cottage-food documentation uploaded before approval.',
        categorySlugs: ['specialty-foods', 'baked-goods', 'coffee-tea']
    },
    {
        ownerEmail: 'owen@demo.local',
        slug: 'north-shore-roasters',
        businessName: 'North Shore Roasters',
        legalName: 'North Shore Roasters',
        summary: 'Small-lot coffee roaster and pantry drinks.',
        description:
            'North Shore Roasters focuses on fresh-roasted coffee, gift packs, and seasonal drink kits.',
        email: 'crew@northshoreroasters.demo',
        phone: '3605550105',
        websiteUrl: 'northshoreroasters.demo',
        approvalStatus: 'rejected',
        approvalNotes:
            'Please update the booth photos and provide clearer labeling details for packaged beverages.',
        categorySlugs: ['coffee-tea', 'specialty-foods']
    },
    {
        ownerEmail: 'maya@demo.local',
        slug: 'golden-thread-jewelry',
        businessName: 'Golden Thread Jewelry',
        legalName: 'Golden Thread Jewelry Co.',
        summary: 'Handmade jewelry and wearable accessories.',
        description:
            'Golden Thread Jewelry creates earrings, layered necklaces, and lightweight accessories for seasonal shoppers.',
        email: 'hello@goldenthread.demo',
        phone: '3605550106',
        websiteUrl: 'goldenthread.demo',
        approvalStatus: 'approved',
        approvalNotes: null,
        categorySlugs: ['handmade-jewelry', 'art-prints']
    }
]

const APPLICATIONS = [
    {
        vendorSlug: 'cedar-pine-workshop',
        groupSlug: 'summer-night-market-series',
        applicationKey: '01MOPSDEMOSUMMERLENA000001',
        status: 'submitted',
        selections: [
            {
                marketSlug: 'june-2026-night-market',
                selectionStatus: 'approved',
                requestedBoothQuantity: 1,
                assignedBoothQuantity: 1,
                assignedOfferingRef: { marketSlug: 'june-2026-night-market', boothNumber: 2 },
                boothFeeTotalCents: 18500,
                willingToVolunteer: 0,
                decisionNotes: 'Approved for the double-table footprint near the main row.',
                boothPreferenceRefs: [
                    { marketSlug: 'june-2026-night-market', boothNumber: 2 },
                    { marketSlug: 'june-2026-night-market', boothNumber: 1 },
                    { marketSlug: 'june-2026-night-market', boothNumber: 3 }
                ]
            },
            {
                marketSlug: 'july-2026-night-market',
                selectionStatus: 'waitlisted',
                requestedBoothQuantity: 1,
                assignedBoothQuantity: null,
                assignedOfferingRef: null,
                boothFeeTotalCents: 0,
                willingToVolunteer: 1,
                decisionNotes: 'Waitlisted pending category balance and outdoor capacity.',
                boothPreferenceRefs: [
                    { marketSlug: 'july-2026-night-market', boothNumber: 1 },
                    { marketSlug: 'july-2026-night-market', boothNumber: 2 },
                    { marketSlug: 'july-2026-night-market', boothNumber: 3 }
                ]
            }
        ]
    },
    {
        vendorSlug: 'sweet-current-confections',
        groupSlug: 'holiday-makers-market',
        applicationKey: '01MOPSDEMOHOLIDAYMARCO0001',
        status: 'draft',
        selections: [
            {
                marketSlug: 'november-2026-holiday-market',
                selectionStatus: 'requested',
                requestedBoothQuantity: 1,
                assignedBoothQuantity: null,
                assignedOfferingRef: null,
                boothFeeTotalCents: 0,
                willingToVolunteer: 0,
                decisionNotes: null,
                boothPreferenceRefs: [
                    { marketSlug: 'november-2026-holiday-market', boothNumber: 1 },
                    { marketSlug: 'november-2026-holiday-market', boothNumber: 3 }
                ]
            },
            {
                marketSlug: 'december-2026-holiday-market',
                selectionStatus: 'requested',
                requestedBoothQuantity: 1,
                assignedBoothQuantity: null,
                assignedOfferingRef: null,
                boothFeeTotalCents: 0,
                willingToVolunteer: 1,
                decisionNotes: null,
                boothPreferenceRefs: [
                    { marketSlug: 'december-2026-holiday-market', boothNumber: 1 },
                    { marketSlug: 'december-2026-holiday-market', boothNumber: 2 }
                ]
            }
        ]
    },
    {
        vendorSlug: 'lantern-press-studio',
        groupSlug: 'neighborhood-pop-up-series',
        applicationKey: '01MOPSDEMOPUPJUNE000000001',
        status: 'submitted',
        selections: [
            {
                marketSlug: 'june-2026-waterfront-pop-up',
                selectionStatus: 'requested',
                requestedBoothQuantity: 1,
                assignedBoothQuantity: null,
                assignedOfferingRef: null,
                boothFeeTotalCents: 0,
                willingToVolunteer: 0,
                decisionNotes: null,
                boothPreferenceRefs: [
                    { marketSlug: 'june-2026-waterfront-pop-up', boothNumber: 1 },
                    { marketSlug: 'june-2026-waterfront-pop-up', boothNumber: 2 }
                ]
            },
            {
                marketSlug: 'july-2026-civic-pop-up',
                selectionStatus: 'rejected',
                requestedBoothQuantity: 1,
                assignedBoothQuantity: null,
                assignedOfferingRef: null,
                boothFeeTotalCents: 0,
                willingToVolunteer: 0,
                decisionNotes: 'Rejected for this date because the category mix is already full.',
                boothPreferenceRefs: [{ marketSlug: 'july-2026-civic-pop-up', boothNumber: 1 }]
            }
        ]
    },
    {
        vendorSlug: 'golden-thread-jewelry',
        groupSlug: 'holiday-makers-market',
        applicationKey: '01MOPSDEMOHOLIDAYMAYA00001',
        status: 'withdrawn',
        selections: [
            {
                marketSlug: 'november-2026-holiday-market',
                selectionStatus: 'withdrawn',
                requestedBoothQuantity: 1,
                assignedBoothQuantity: null,
                assignedOfferingRef: null,
                boothFeeTotalCents: 0,
                willingToVolunteer: 0,
                decisionNotes: 'Vendor withdrew after schedule conflict.',
                boothPreferenceRefs: [
                    { marketSlug: 'november-2026-holiday-market', boothNumber: 2 }
                ]
            }
        ]
    }
]

function createOffering(marketSlug, boothTypeSlug, boothNumber, priceCents, isActive, sortOrder) {
    return {
        marketSlug,
        boothTypeSlug,
        boothNumber,
        priceCents,
        isActive,
        sortOrder
    }
}

function toEpochMs(value) {
    return new Date(value).getTime()
}

function parseMode(argv) {
    const modeArg = argv.find((arg) => arg.startsWith('--mode=')) ?? ''
    const mode = modeArg.slice('--mode='.length).trim().toLowerCase()

    return mode === 'minimal' ? 'minimal' : 'full'
}

function buildDataset(mode) {
    if (mode === 'minimal') {
        return {
            productCategories: PRODUCT_CATEGORIES.slice(0, 5),
            boothTypes: BOOTH_TYPES.slice(0, 3),
            locations: LOCATIONS.slice(0, 3),
            marketGroups: MARKET_GROUPS.slice(0, 3),
            markets: MARKETS.filter((market) =>
                [
                    'june-2026-night-market',
                    'july-2026-night-market',
                    'november-2026-holiday-market',
                    'june-2026-waterfront-pop-up'
                ].includes(market.slug)
            ),
            marketOfferings: MARKET_OFFERINGS.filter((offering) =>
                [
                    'june-2026-night-market',
                    'july-2026-night-market',
                    'november-2026-holiday-market',
                    'june-2026-waterfront-pop-up'
                ].includes(offering.marketSlug)
            ),
            vendorUsers: VENDOR_USERS.slice(0, 4),
            vendorBusinesses: VENDOR_BUSINESSES.slice(0, 4),
            applications: APPLICATIONS.filter((application) =>
                ['cedar-pine-workshop', 'sweet-current-confections'].includes(
                    application.vendorSlug
                )
            )
        }
    }

    return {
        productCategories: PRODUCT_CATEGORIES,
        boothTypes: BOOTH_TYPES,
        locations: LOCATIONS,
        marketGroups: MARKET_GROUPS,
        markets: MARKETS,
        marketOfferings: MARKET_OFFERINGS,
        vendorUsers: VENDOR_USERS,
        vendorBusinesses: VENDOR_BUSINESSES,
        applications: APPLICATIONS
    }
}

function formatPhoneForStorage(phone) {
    return typeof phone === 'string' ? phone.replace(/\D/g, '') : null
}

function normalizeSeedApplicationKey(value) {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''

    if (normalizedValue.length !== 26) {
        throw new Error(
            `Seed application_key must be exactly 26 characters: ${normalizedValue || '(empty)'}`
        )
    }

    return normalizedValue
}

function calculateApplicationFeeTotal(group, selections) {
    if (!group || !Array.isArray(selections)) {
        return 0
    }

    if (group.feeMode === 'per_group') {
        return selections.length > 0 ? group.feeAmountCents : 0
    }

    if (group.feeMode === 'per_market') {
        return group.feeAmountCents * selections.length
    }

    return 0
}

async function fetchSingleId(connection, sql, params, label) {
    const [rows] = await connection.query(sql, params)

    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`Seed lookup failed for ${label}`)
    }

    return Number(Object.values(rows[0])[0])
}

async function resolveActorUserId(connection) {
    const [adminRows] = await connection.query(
        'SELECT user_id FROM kernel_users WHERE email = ? LIMIT 1',
        ['admin@dev.local']
    )

    if (Array.isArray(adminRows) && adminRows.length > 0) {
        return Number(adminRows[0].user_id)
    }

    const [firstRows] = await connection.query(
        'SELECT user_id FROM kernel_users ORDER BY user_id ASC LIMIT 1'
    )

    if (Array.isArray(firstRows) && firstRows.length > 0) {
        return Number(firstRows[0].user_id)
    }

    return null
}

async function upsertKernelUser(connection, user, passwordHash, now) {
    await connection.query(
        `
        INSERT INTO kernel_users (
            email,
            password_hash,
            password_changed_at,
            last_login_at,
            forgot_password_code_hash,
            forgot_password_code_expires_at,
            forgot_password_code_sent_at,
            forgot_password_code_attempt_count,
            forgot_password_code_last_attempt_at,
            failed_login_attempts,
            locked_at,
            locked_by_user_id,
            disabled_at,
            disabled_by_user_id,
            two_factor_required_at,
            two_factor_required_by_user_id,
            password_reset_required_at,
            password_reset_required_by_user_id,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)
        ON DUPLICATE KEY UPDATE
            password_hash = VALUES(password_hash),
            password_changed_at = VALUES(password_changed_at),
            failed_login_attempts = 0,
            locked_at = NULL,
            locked_by_user_id = NULL,
            disabled_at = NULL,
            disabled_by_user_id = NULL,
            two_factor_required_at = NULL,
            two_factor_required_by_user_id = NULL,
            password_reset_required_at = NULL,
            password_reset_required_by_user_id = NULL,
            updated_at = VALUES(updated_at)
        `,
        [user.email.toLowerCase(), passwordHash, now, now, now]
    )

    return fetchSingleId(
        connection,
        'SELECT user_id FROM kernel_users WHERE email = ? LIMIT 1',
        [user.email.toLowerCase()],
        `kernel user ${user.email}`
    )
}

async function upsertKernelUserProfile(connection, userId, profile, now) {
    await connection.query(
        `
        INSERT INTO kernel_user_profiles (
            user_id,
            display_name,
            timezone,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            display_name = VALUES(display_name),
            timezone = VALUES(timezone),
            updated_at = VALUES(updated_at)
        `,
        [userId, profile.displayName, profile.timezone, now, now]
    )
}

async function upsertVendorProductCategory(connection, category, actorUserId, now) {
    await connection.query(
        `
        INSERT INTO market_ops_vendor_product_categories (
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            description = VALUES(description),
            is_active = VALUES(is_active),
            sort_order = VALUES(sort_order),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            category.slug,
            category.label,
            category.description,
            category.isActive,
            category.sortOrder,
            now,
            actorUserId,
            now,
            actorUserId
        ]
    )

    return fetchSingleId(
        connection,
        'SELECT vendor_product_category_id FROM market_ops_vendor_product_categories WHERE slug = ? LIMIT 1',
        [category.slug],
        `product category ${category.slug}`
    )
}

async function upsertBoothType(connection, boothType, actorUserId, now) {
    await connection.query(
        `
        INSERT INTO market_ops_booth_types (
            slug,
            label,
            description,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            description = VALUES(description),
            is_active = VALUES(is_active),
            sort_order = VALUES(sort_order),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            boothType.slug,
            boothType.label,
            boothType.description,
            boothType.isActive,
            boothType.sortOrder,
            now,
            actorUserId,
            now,
            actorUserId
        ]
    )

    return fetchSingleId(
        connection,
        'SELECT booth_type_id FROM market_ops_booth_types WHERE slug = ? LIMIT 1',
        [boothType.slug],
        `booth type ${boothType.slug}`
    )
}

async function upsertLocation(connection, location, actorUserId, now) {
    await connection.query(
        `
        INSERT INTO market_ops_locations (
            slug,
            location_name,
            address_line_1,
            address_line_2,
            city,
            state_code,
            postal_code,
            public_notes,
            is_active,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            location_name = VALUES(location_name),
            address_line_1 = VALUES(address_line_1),
            address_line_2 = VALUES(address_line_2),
            city = VALUES(city),
            state_code = VALUES(state_code),
            postal_code = VALUES(postal_code),
            public_notes = VALUES(public_notes),
            is_active = VALUES(is_active),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            location.slug,
            location.locationName,
            location.addressLine1,
            location.addressLine2,
            location.city,
            location.stateCode,
            location.postalCode,
            location.publicNotes,
            location.isActive,
            now,
            actorUserId,
            now,
            actorUserId
        ]
    )

    return fetchSingleId(
        connection,
        'SELECT location_id FROM market_ops_locations WHERE slug = ? LIMIT 1',
        [location.slug],
        `location ${location.slug}`
    )
}

async function upsertMarketGroup(connection, group, actorUserId, now) {
    await connection.query(
        `
        INSERT INTO market_ops_market_groups (
            slug,
            group_name,
            summary,
            description,
            fee_mode,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            group_name = VALUES(group_name),
            summary = VALUES(summary),
            description = VALUES(description),
            fee_mode = VALUES(fee_mode),
            fee_amount_cents = VALUES(fee_amount_cents),
            is_public = VALUES(is_public),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            group.slug,
            group.groupName,
            group.summary,
            group.description,
            group.feeMode,
            group.feeAmountCents,
            group.isPublic,
            now,
            actorUserId,
            now,
            actorUserId
        ]
    )

    return fetchSingleId(
        connection,
        'SELECT market_group_id FROM market_ops_market_groups WHERE slug = ? LIMIT 1',
        [group.slug],
        `market group ${group.slug}`
    )
}

async function upsertMarket(connection, market, refs, actorUserId, now) {
    await connection.query(
        `
        INSERT INTO market_ops_markets (
            market_group_id,
            location_id,
            slug,
            market_name,
            summary,
            description,
            starts_at,
            ends_at,
            applications_open,
            applications_open_at,
            applications_close_at,
            fee_amount_cents,
            is_public,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            location_id = VALUES(location_id),
            market_name = VALUES(market_name),
            summary = VALUES(summary),
            description = VALUES(description),
            starts_at = VALUES(starts_at),
            ends_at = VALUES(ends_at),
            applications_open = VALUES(applications_open),
            applications_open_at = VALUES(applications_open_at),
            applications_close_at = VALUES(applications_close_at),
            fee_amount_cents = VALUES(fee_amount_cents),
            is_public = VALUES(is_public),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            refs.marketGroupIds.get(market.groupSlug),
            refs.locationIds.get(market.locationSlug),
            market.slug,
            market.marketName,
            market.summary,
            market.description,
            market.startsAt,
            market.endsAt,
            market.applicationsOpen,
            market.applicationsOpenAt,
            market.applicationsCloseAt,
            market.feeAmountCents,
            market.isPublic,
            now,
            actorUserId,
            now,
            actorUserId
        ]
    )

    return fetchSingleId(
        connection,
        `
        SELECT market_id
        FROM market_ops_markets
        WHERE market_group_id = ? AND slug = ?
        LIMIT 1
        `,
        [refs.marketGroupIds.get(market.groupSlug), market.slug],
        `market ${market.slug}`
    )
}

async function upsertMarketOffering(connection, offering, refs, actorUserId, now) {
    await connection.query(
        `
        INSERT INTO market_ops_market_booth_offerings (
            market_id,
            booth_type_id,
            booth_number,
            price_cents,
            is_active,
            sort_order,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            booth_type_id = VALUES(booth_type_id),
            price_cents = VALUES(price_cents),
            is_active = VALUES(is_active),
            sort_order = VALUES(sort_order),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            refs.marketIds.get(offering.marketSlug),
            refs.boothTypeIds.get(offering.boothTypeSlug),
            offering.boothNumber,
            offering.priceCents,
            offering.isActive,
            offering.sortOrder,
            now,
            actorUserId,
            now,
            actorUserId
        ]
    )

    return fetchSingleId(
        connection,
        `
        SELECT market_booth_offering_id
        FROM market_ops_market_booth_offerings
        WHERE market_id = ? AND booth_number = ?
        LIMIT 1
        `,
        [refs.marketIds.get(offering.marketSlug), offering.boothNumber],
        `market booth offering ${offering.marketSlug}#${offering.boothNumber}`
    )
}

function buildVendorStatusFields(vendorBusiness, actorUserId) {
    if (vendorBusiness.approvalStatus === 'approved') {
        return {
            approvalNotes: null,
            approvedAt: toEpochMs('2026-05-12T10:30:00-07:00'),
            approvedByUserId: actorUserId,
            rejectedAt: null,
            rejectedByUserId: null
        }
    }

    if (vendorBusiness.approvalStatus === 'rejected') {
        return {
            approvalNotes: vendorBusiness.approvalNotes,
            approvedAt: null,
            approvedByUserId: null,
            rejectedAt: toEpochMs('2026-05-11T15:45:00-07:00'),
            rejectedByUserId: actorUserId
        }
    }

    return {
        approvalNotes: vendorBusiness.approvalNotes,
        approvedAt: null,
        approvedByUserId: null,
        rejectedAt: null,
        rejectedByUserId: null
    }
}

async function upsertVendorBusiness(connection, vendorBusiness, refs, actorUserId, now) {
    const ownerUserId = refs.userIds.get(vendorBusiness.ownerEmail)
    const statusFields = buildVendorStatusFields(vendorBusiness, actorUserId)

    await connection.query(
        `
        INSERT INTO market_ops_vendor_businesses (
            slug,
            business_name,
            legal_name,
            summary,
            description,
            email,
            phone,
            website_url,
            approval_status,
            approval_notes,
            approved_at,
            approved_by_user_id,
            rejected_at,
            rejected_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            business_name = VALUES(business_name),
            legal_name = VALUES(legal_name),
            summary = VALUES(summary),
            description = VALUES(description),
            email = VALUES(email),
            phone = VALUES(phone),
            website_url = VALUES(website_url),
            approval_status = VALUES(approval_status),
            approval_notes = VALUES(approval_notes),
            approved_at = VALUES(approved_at),
            approved_by_user_id = VALUES(approved_by_user_id),
            rejected_at = VALUES(rejected_at),
            rejected_by_user_id = VALUES(rejected_by_user_id),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            vendorBusiness.slug,
            vendorBusiness.businessName,
            vendorBusiness.legalName,
            vendorBusiness.summary,
            vendorBusiness.description,
            vendorBusiness.email,
            formatPhoneForStorage(vendorBusiness.phone),
            vendorBusiness.websiteUrl,
            vendorBusiness.approvalStatus,
            statusFields.approvalNotes,
            statusFields.approvedAt,
            statusFields.approvedByUserId,
            statusFields.rejectedAt,
            statusFields.rejectedByUserId,
            now,
            ownerUserId,
            now,
            ownerUserId
        ]
    )

    const vendorBusinessId = await fetchSingleId(
        connection,
        'SELECT vendor_business_id FROM market_ops_vendor_businesses WHERE slug = ? LIMIT 1',
        [vendorBusiness.slug],
        `vendor business ${vendorBusiness.slug}`
    )

    await connection.query(
        `
        INSERT IGNORE INTO market_ops_vendor_business_owners (
            vendor_business_id,
            user_id
        ) VALUES (?, ?)
        `,
        [vendorBusinessId, ownerUserId]
    )

    await connection.query(
        'DELETE FROM market_ops_vendor_business_product_categories WHERE vendor_business_id = ?',
        [vendorBusinessId]
    )

    for (const [sortOrder, categorySlug] of vendorBusiness.categorySlugs.entries()) {
        await connection.query(
            `
            INSERT INTO market_ops_vendor_business_product_categories (
                vendor_business_id,
                vendor_product_category_id,
                sort_order
            ) VALUES (?, ?, ?)
            `,
            [vendorBusinessId, refs.categoryIds.get(categorySlug), sortOrder]
        )
    }

    return vendorBusinessId
}

function buildApplicationStatusFields(application, actorUserId, ownerUserId, now) {
    if (application.status === 'submitted' || application.status === 'withdrawn') {
        return {
            submittedAt: now - 86_400_000,
            submittedByUserId: ownerUserId,
            updatedByUserId: actorUserId ?? ownerUserId
        }
    }

    return {
        submittedAt: null,
        submittedByUserId: null,
        updatedByUserId: ownerUserId
    }
}

async function upsertApplication(connection, application, refs, actorUserId, now) {
    const vendorBusinessId = refs.vendorBusinessIds.get(application.vendorSlug)
    const marketGroupId = refs.marketGroupIds.get(application.groupSlug)
    const ownerUserId = refs.vendorOwnerUserIds.get(application.vendorSlug)
    const marketGroup = MARKET_GROUPS.find((group) => group.slug === application.groupSlug)
    const feeTotalCents = calculateApplicationFeeTotal(marketGroup, application.selections)
    const applicationKey = normalizeSeedApplicationKey(application.applicationKey)
    const applicationStatusFields = buildApplicationStatusFields(
        application,
        actorUserId,
        ownerUserId,
        now
    )

    await connection.query(
        `
        INSERT INTO market_ops_vendor_market_applications (
            vendor_business_id,
            market_group_id,
            application_key,
            status,
            fee_mode_snapshot,
            fee_total_cents,
            submitted_at,
            submitted_by_user_id,
            created_at,
            created_by_user_id,
            updated_at,
            updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            application_key = VALUES(application_key),
            status = VALUES(status),
            fee_mode_snapshot = VALUES(fee_mode_snapshot),
            fee_total_cents = VALUES(fee_total_cents),
            submitted_at = VALUES(submitted_at),
            submitted_by_user_id = VALUES(submitted_by_user_id),
            updated_at = VALUES(updated_at),
            updated_by_user_id = VALUES(updated_by_user_id)
        `,
        [
            vendorBusinessId,
            marketGroupId,
            applicationKey,
            application.status,
            marketGroup?.feeMode ?? 'none',
            feeTotalCents,
            applicationStatusFields.submittedAt,
            applicationStatusFields.submittedByUserId,
            now,
            ownerUserId,
            now,
            applicationStatusFields.updatedByUserId
        ]
    )

    const vendorApplicationId = await fetchSingleId(
        connection,
        `
        SELECT vendor_application_id
        FROM market_ops_vendor_market_applications
        WHERE vendor_business_id = ? AND market_group_id = ?
        LIMIT 1
        `,
        [vendorBusinessId, marketGroupId],
        `application ${applicationKey}`
    )

    await connection.query(
        'DELETE FROM market_ops_application_market_selections WHERE vendor_application_id = ?',
        [vendorApplicationId]
    )

    for (const selection of application.selections) {
        const marketId = refs.marketIds.get(selection.marketSlug)
        const assignedOfferingId = selection.assignedOfferingRef
            ? (refs.marketOfferingIds.get(
                  `${selection.assignedOfferingRef.marketSlug}:${selection.assignedOfferingRef.boothNumber}`
              ) ?? null)
            : null
        const decidedAt = selection.selectionStatus === 'requested' ? null : now - 43_200_000
        const decidedByUserId = selection.selectionStatus === 'requested' ? null : actorUserId

        const [selectionResult] = await connection.query(
            `
            INSERT INTO market_ops_application_market_selections (
                vendor_application_id,
                market_id,
                selection_status,
                requested_booth_quantity,
                assigned_booth_quantity,
                assigned_market_booth_offering_id,
                booth_fee_total_cents,
                willing_to_volunteer,
                decision_notes,
                decided_at,
                decided_by_user_id,
                created_at,
                created_by_user_id,
                updated_at,
                updated_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                vendorApplicationId,
                marketId,
                selection.selectionStatus,
                selection.requestedBoothQuantity,
                selection.assignedBoothQuantity,
                assignedOfferingId,
                selection.boothFeeTotalCents,
                selection.willingToVolunteer,
                selection.decisionNotes,
                decidedAt,
                decidedByUserId,
                now,
                ownerUserId,
                now,
                selection.selectionStatus === 'requested'
                    ? ownerUserId
                    : (actorUserId ?? ownerUserId)
            ]
        )

        const applicationMarketSelectionId = Number(selectionResult.insertId)

        for (const [index, boothPreferenceRef] of selection.boothPreferenceRefs.entries()) {
            await connection.query(
                `
                INSERT INTO market_ops_application_market_booth_preferences (
                    application_market_selection_id,
                    preference_rank,
                    market_booth_offering_id,
                    created_at,
                    created_by_user_id
                ) VALUES (?, ?, ?, ?, ?)
                `,
                [
                    applicationMarketSelectionId,
                    index + 1,
                    refs.marketOfferingIds.get(
                        `${boothPreferenceRef.marketSlug}:${boothPreferenceRef.boothNumber}`
                    ),
                    now,
                    ownerUserId
                ]
            )
        }
    }

    return vendorApplicationId
}

async function seedDemoData({ connection, mode }) {
    const dataset = buildDataset(mode)
    const now = Date.now()
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
    const actorUserId = await resolveActorUserId(connection)
    const refs = {
        userIds: new Map(),
        categoryIds: new Map(),
        boothTypeIds: new Map(),
        locationIds: new Map(),
        marketGroupIds: new Map(),
        marketIds: new Map(),
        marketOfferingIds: new Map(),
        vendorBusinessIds: new Map(),
        vendorOwnerUserIds: new Map()
    }

    for (const user of dataset.vendorUsers) {
        const userId = await upsertKernelUser(connection, user, passwordHash, now)
        await upsertKernelUserProfile(connection, userId, user, now)
        refs.userIds.set(user.email, userId)
    }

    for (const category of dataset.productCategories) {
        const categoryId = await upsertVendorProductCategory(connection, category, actorUserId, now)
        refs.categoryIds.set(category.slug, categoryId)
    }

    for (const boothType of dataset.boothTypes) {
        const boothTypeId = await upsertBoothType(connection, boothType, actorUserId, now)
        refs.boothTypeIds.set(boothType.slug, boothTypeId)
    }

    for (const location of dataset.locations) {
        const locationId = await upsertLocation(connection, location, actorUserId, now)
        refs.locationIds.set(location.slug, locationId)
    }

    for (const group of dataset.marketGroups) {
        const marketGroupId = await upsertMarketGroup(connection, group, actorUserId, now)
        refs.marketGroupIds.set(group.slug, marketGroupId)
    }

    for (const market of dataset.markets) {
        const marketId = await upsertMarket(connection, market, refs, actorUserId, now)
        refs.marketIds.set(market.slug, marketId)
    }

    for (const offering of dataset.marketOfferings) {
        const offeringId = await upsertMarketOffering(connection, offering, refs, actorUserId, now)
        refs.marketOfferingIds.set(`${offering.marketSlug}:${offering.boothNumber}`, offeringId)
    }

    for (const vendorBusiness of dataset.vendorBusinesses) {
        const vendorBusinessId = await upsertVendorBusiness(
            connection,
            vendorBusiness,
            refs,
            actorUserId,
            now
        )
        refs.vendorBusinessIds.set(vendorBusiness.slug, vendorBusinessId)
        refs.vendorOwnerUserIds.set(
            vendorBusiness.slug,
            refs.userIds.get(vendorBusiness.ownerEmail) ?? null
        )
    }

    for (const application of dataset.applications) {
        await upsertApplication(connection, application, refs, actorUserId, now)
    }

    return {
        actorUserId,
        dataset,
        password: DEFAULT_PASSWORD
    }
}

function printSummary({ mode, password, actorUserId, dataset }) {
    console.log('')
    console.log(`Market Ops demo seed complete (${mode}).`)
    console.log(`Actor user id for approvals/audit fields: ${actorUserId ?? 'null'}`)
    console.log('')
    console.log(`Seeded vendor login password: ${password}`)
    console.log('Seeded vendor accounts:')

    for (const user of dataset.vendorUsers) {
        console.log(`- ${user.email} (${user.displayName})`)
    }

    console.log('')
    console.log('Seeded vendor businesses:')

    for (const vendorBusiness of dataset.vendorBusinesses) {
        console.log(
            `- ${vendorBusiness.businessName} [${vendorBusiness.approvalStatus}] -> /vendors/${vendorBusiness.slug}`
        )
    }

    console.log('')
    console.log('Seeded market groups:')

    for (const marketGroup of dataset.marketGroups) {
        console.log(`- ${marketGroup.groupName} (${marketGroup.slug})`)
    }

    console.log('')
}

async function main() {
    const mode = parseMode(process.argv.slice(2))
    const pool = mysql.createPool({
        ...DEFAULT_DB_CONFIG,
        waitForConnections: true,
        connectionLimit: 4,
        queueLimit: 0
    })
    const connection = await pool.getConnection()

    try {
        await connection.beginTransaction()
        const result = await seedDemoData({ connection, mode })
        await connection.commit()
        printSummary({ ...result, mode })
    } catch (err) {
        await connection.rollback()
        console.error('')
        console.error('Market Ops demo seed failed.')
        console.error(err)
        process.exitCode = 1
    } finally {
        connection.release()
        await pool.end()
    }
}

await main()

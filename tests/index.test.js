import marketOpsPlugin from '../index.js'

describe('Market Ops plugin declaration', () => {
    test('declares Market Ops as a parent sidebar group with the expected child order', () => {
        expect(marketOpsPlugin.navigation).toEqual([
            expect.objectContaining({
                id: 'public-markets',
                location: 'sidebar',
                label: 'Markets',
                icon: 'calendar-week',
                href: '/markets',
                index: 1,
                parent: null,
                allowChildren: false
            }),
            expect.objectContaining({
                id: 'public-vendors',
                location: 'sidebar',
                label: 'Vendors',
                icon: 'shop-window',
                href: '/vendors',
                index: 2,
                parent: null,
                allowChildren: false
            }),
            expect.objectContaining({
                id: 'market-ops',
                location: 'sidebar',
                label: 'Market Ops',
                icon: 'shop',
                index: 55,
                parent: null,
                allowChildren: true
            }),
            expect.objectContaining({
                id: 'market-ops-overview',
                icon: 'speedometer2',
                href: '/market-ops',
                index: 1,
                parent: 'plugin:ws_plugin_market_ops:market-ops'
            }),
            expect.objectContaining({
                id: 'market-ops-markets',
                icon: 'calendar-week',
                href: '/market-ops/market-groups',
                index: 2,
                parent: 'plugin:ws_plugin_market_ops:market-ops'
            }),
            expect.objectContaining({
                id: 'market-ops-vendors',
                icon: 'shop-window',
                href: '/market-ops/vendors',
                index: 3,
                parent: 'plugin:ws_plugin_market_ops:market-ops'
            }),
            expect.objectContaining({
                id: 'market-ops-applications',
                icon: 'journal-text',
                href: '/market-ops/applications',
                index: 4,
                parent: 'plugin:ws_plugin_market_ops:market-ops'
            }),
            expect.objectContaining({
                id: 'market-ops-setup',
                icon: 'gear',
                href: '/market-ops/setup',
                index: 5,
                parent: 'plugin:ws_plugin_market_ops:market-ops'
            })
        ])
    })

    test('declares only one public /market-ops mount alongside vendor public routes', () => {
        expect(marketOpsPlugin.routes.public).toEqual([
            expect.objectContaining({
                staticMountPath: '/market-ops'
            }),
            expect.objectContaining({
                staticMountPath: '/markets'
            }),
            expect.objectContaining({
                staticMountPath: '/new-vendors'
            }),
            expect.objectContaining({
                staticMountPath: '/vendors'
            })
        ])
    })

    test('declares Market Ops read, manage, and vendor-manage permissions', () => {
        expect(marketOpsPlugin.permissions).toEqual(
            expect.objectContaining({
                ws_plugin_market_ops: expect.objectContaining({
                    permissions: expect.objectContaining({
                        'ws_plugin_market_ops.read': expect.any(String),
                        'ws_plugin_market_ops.manage': expect.any(String),
                        'ws_plugin_market_ops.vendor.manage': expect.any(String)
                    })
                })
            })
        )
    })
})

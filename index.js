import { createMarketOpsPublicRouter } from './routes.js'

const marketOpsPlugin = {
    navigation: [
        {
            id: 'market-ops',
            location: 'sidebar',
            label: 'Market Ops',
            icon: 'shop',
            href: '/market-ops',
            index: 55,
            parent: null,
            allowChildren: false
        }
    ],
    permissions: {
        ws_plugin_market_ops: {
            description: 'Market Operations plugin capabilities.',
            permissions: {
                'ws_plugin_market_ops.read': 'Read the Market Operations plugin surfaces.'
            }
        }
    },
    settings: [
        {
            key: 'ws_plugin_market_ops.enabled',
            defaultValue: 'true',
            label: 'Enable Market Operations Plugin',
            description:
                'Local Market Operations plugin setting used to exercise the plugin contract.',
            control: 'boolean',
            group: 'Market Operations'
        }
    ],
    routes: {
        public: [
            {
                staticMountPath: '/market-ops',
                createRouter: createMarketOpsPublicRouter
            }
        ]
    },
    jobs: null,
    schema: {
        migrations: [
            'migrations/001_create_market_ops_vendor_businesses.sql',
            'migrations/002_create_market_ops_vendor_business_owners.sql',
            'migrations/003_create_market_ops_vendor_product_categories.sql',
            'migrations/004_create_market_ops_vendor_business_product_categories.sql',
            'migrations/005_create_market_ops_locations.sql',
            'migrations/006_create_market_ops_market_groups.sql',
            'migrations/007_create_market_ops_markets.sql',
            'migrations/008_create_market_ops_booth_types.sql',
            'migrations/009_create_market_ops_market_booth_offerings.sql',
            'migrations/010_create_market_ops_vendor_market_applications.sql',
            'migrations/011_create_market_ops_application_market_selections.sql',
            'migrations/012_create_market_ops_application_market_booth_preferences.sql'
        ]
    }
}

export default marketOpsPlugin

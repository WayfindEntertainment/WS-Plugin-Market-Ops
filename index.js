import { createMarketOpsPublicRouter } from "./routes.js";

const marketOpsPlugin = {
  navigation: [
    {
      id: "market-ops",
      location: "sidebar",
      label: "Market Ops",
      icon: "shop",
      href: "/market-ops",
      index: 55,
      parent: null,
      allowChildren: false,
    },
  ],
  permissions: {
    ws_plugin_market_ops: {
      description: "Market Operations plugin capabilities.",
      permissions: {
        "ws_plugin_market_ops.read":
          "Read the Market Operations plugin surfaces.",
      },
    },
  },
  settings: [
    {
      key: "ws_plugin_market_ops.enabled",
      defaultValue: "true",
      label: "Enable Market Operations Plugin",
      description:
        "Local Market Operations plugin setting used to exercise the plugin contract.",
      control: "boolean",
      group: "Market Operations",
    },
  ],
  routes: {
    public: [
      {
        staticMountPath: "/market-ops",
        createRouter: createMarketOpsPublicRouter,
      },
    ],
  },
  jobs: null,
  schema: null,
};

export default marketOpsPlugin;

# ws_plugin_market_ops

Market Operations plugin for Wayfind Studio.

This repository is the external source-of-truth for the `ws_plugin_market_ops`
Studio plugin. It is intended to be loaded through Studio's `Local File`
plugin discovery source during development, and later can evolve into a
standalone package/distribution workflow.

Current scaffold:

- package-level Studio plugin manifest
- sidebar navigation item labeled `Market Ops`
- public route mounted at `/market-ops`
- minimal public route that responds with plain text

## Development

Studio discovers local-file plugins from `PLUGIN_LOCAL_ROOT_PATH`, which
defaults to `/var/studio/local-plugins` inside the container.

In the Studio repo, the typical local workflow is:

1. Mount your external plugin workspace into the dev container through
   `docker/compose.dev.local.yml`.
2. Run `npm run dev:local` from the Studio repo.
3. Open `/admin/plugins/discover` and use the `Local File` tab to install and
   enable this plugin.

## Status

This plugin is intentionally minimal right now. It exists as the starting point
for the Market Operations domain workflow, beginning with vendor applications
and related market administration features.

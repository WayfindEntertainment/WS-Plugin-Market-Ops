# ws_plugin_market_ops Tasks

This document captures the first real delivery plan for `ws_plugin_market_ops` and the Studio host
changes it depends on. It is intentionally opinionated so implementation can proceed without
re-opening core route, auth, grouping, or fee-model decisions.

## Locked Decisions

- `/` becomes a market homepage through a Studio site setting that controls where the root route
  goes. The default remains `/login`, but the market deployment will point it at the market plugin
  homepage.
- Vendor onboarding is vendor-first.
    - `/new-vendors` is public information.
    - Creating a vendor business requires an authenticated account.
    - Vendor business approval is separate from market applications.
- Public market pages are group-first.
    - `/markets`
    - `/markets/:groupSlug`
    - `/markets/:groupSlug/:marketSlug`
- Approved vendors manage applications from vendor-scoped routes.
    - `/vendors/:vendorSlug/manage`
    - `/vendors/:vendorSlug/manage/applications`
- Market Ops admin is group-first.
    - Market-group management becomes the top-level administration model.
- Market-group fee policy has exactly 3 modes in v1.
    - `none`
    - `per_group`
    - `per_market`

## Canonical V1 Routes

### Public Site

- `/`
    - Market landing page.
    - Owned by the plugin through a Studio-configured root-route handoff.
- `/vendors`
    - Approved-vendor directory.
    - Includes a CTA to apply as a new vendor.
- `/new-vendors`
    - Public information page for prospective vendors.
    - Vendor-business creation flow requires authentication.
- `/vendors/:vendorSlug`
    - Public vendor profile page.
- `/vendors/:vendorSlug/manage`
    - Authenticated vendor-business management page.
- `/vendors/:vendorSlug/manage/applications`
    - Authenticated vendor market-application dashboard.
- `/markets`
    - Market-group listing page.
- `/markets/:groupSlug`
    - Market-group landing page.
- `/markets/:groupSlug/:marketSlug`
    - Specific market page inside a group.

### Market Ops Public-Surface Admin

- `/market-ops`
- `/market-ops/market-groups`
- `/market-ops/market-groups/create`
- `/market-ops/market-groups/:groupId`
- `/market-ops/market-groups/:groupId/markets/create`
- `/market-ops/market-groups/:groupId/markets/:marketId`
- `/market-ops/locations`
- `/market-ops/locations/create`
- `/market-ops/locations/:locationId`
- `/market-ops/reports`

## Auth and Permission Rules

- `/market-ops/**`
    - Uses normal auth plus plugin permission middleware.
    - Uses the public rendering surface, not `/admin`.
- Vendor manage routes use normal auth plus a custom ownership-or-admin guard.
- Site admins can manage any vendor business.
- Vendor users can manage only vendor businesses explicitly associated to their account.

## Data Model Defaults

- Vendor businesses are first-class domain objects.
- User-to-vendor-business ownership is modeled through an association.
    - One account can own multiple vendor businesses.
    - The association shape should remain compatible with future multi-owner support.
- Vendor business approval is separate from market applications.
- Market groups own fee mode and public grouping.
- Applications are stored per vendor business and per market group, with selections for one or more
  markets inside that group.

## Task List

### 1. Studio Host Tasks

- [ ] Add a Studio site setting for the root-route target used by `GET /`.
- [ ] Keep `/login` as the default root target for generic Studio installs.
- [ ] Allow the market deployment to point `/` at the plugin homepage.
- [ ] Update the Studio root route so unauthenticated users are no longer hard-forced to `/login`
      when the site setting targets a public route.

### 2. Plugin Foundation and Schema

- [ ] Expand the plugin declaration beyond the hello-world shell.
- [ ] Add plugin permissions for Market Ops backoffice access.
- [ ] Add first schema migrations for:
    - [ ] vendor businesses
    - [ ] vendor-business owners
    - [ ] vendor-business review status
    - [ ] locations
    - [ ] market groups
    - [ ] markets
    - [ ] vendor market applications
    - [ ] application market selections
- [ ] Add service and storage seams for those objects before page work begins.

### 3. Public Site and Vendor Onboarding

- [ ] Build the public homepage content for visitors and prospective vendors.
- [ ] Build `/vendors` as the approved-vendor directory.
- [ ] Build `/new-vendors` as a public information page with clear CTA and auth handoff.
- [ ] Implement authenticated vendor-business creation behind the `/new-vendors` flow.
- [ ] Build public vendor profile pages at `/vendors/:vendorSlug`.
- [ ] Build public market-group and individual-market pages under `/markets`.

### 4. Vendor Self-Service

- [ ] Build `/vendors/:vendorSlug/manage` for business profile editing.
- [ ] Add custom ownership-or-admin authorization middleware for vendor-scoped manage routes.
- [ ] Build `/vendors/:vendorSlug/manage/applications` as the single vendor-facing application
      dashboard.
- [ ] Group application options by market group.
- [ ] Show per-market or per-group application status on that page.
- [ ] Add the apply flow that computes what is owed and hands off to the payments plugin checkout
      path.

### 5. Market Ops Backoffice

- [ ] Build `/market-ops` as the landing page on the public rendering surface.
- [ ] Build market-group dashboards and detail pages as the top-level market administration model.
- [ ] Nest individual market create and detail flows under market groups.
- [ ] Build locations dashboard, create, and detail flows.
- [ ] Build a placeholder `/market-ops/reports` dashboard that reserves the later report namespace.
- [ ] Add vendor-business review workflows so administrators can approve or reject vendor businesses
      before they can apply to markets.

### 6. Payments Integration

- [ ] Treat the market plugin as the host domain for application-fee checkout.
- [ ] Implement fee calculation from market-group fee mode only:
    - [ ] `none`
    - [ ] `per_group`
    - [ ] `per_market`
- [ ] Pass a stable host reference from market applications into the existing payments plugin.
- [ ] Defer Stripe and any custom fee engine work.

## Test and Acceptance Scenarios

- [ ] Unauthenticated users can reach `/`, `/vendors`, `/new-vendors`, `/markets`, and public vendor
      and market pages.
- [ ] `/new-vendors` shows information publicly but requires an authenticated account to create a
      vendor business.
- [ ] A vendor business must be approved before its owner can submit market applications.
- [ ] A single user can manage more than one vendor business.
- [ ] A vendor cannot manage another vendor's business page and receives the normal `403`.
- [ ] A site admin can manage any vendor business page.
- [ ] `/vendors/:vendorSlug/manage/applications` groups options by market group and shows current
      statuses.
- [ ] Fee totals are correct for all 3 fee modes.
- [ ] `/market-ops/**` stays on the public surface while still enforcing auth and plugin
      permissions.
- [ ] Public market routing uses the market-group structure: `/markets`, `/markets/:groupSlug`, and
      `/markets/:groupSlug/:marketSlug`.
- [ ] Market Ops administration uses the market-group structure under
      `/market-ops/market-groups/**`.

## Assumptions and Defaults

- `TASKS.md` includes both plugin work and required Studio host work, because the market homepage
  requirement cannot be solved inside the plugin alone.
- `/new-vendors` remains the public-facing path name in v1.
- Vendor-business ownership remains association-based so future multi-owner support is still
  possible, even though v1 only requires one account owning multiple businesses.

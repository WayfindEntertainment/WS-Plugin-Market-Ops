# ws_plugin_market_ops Roadmap

This roadmap is the tracked implementation schedule for the Market Ops plugin and the required
Studio host work that supports it.

It covers the launch path from **May 5, 2026** through the planned **May 15, 2026** go-live date.

Unlike `AGENTS.md`, this file is meant to evolve with the work and stay committed so changes to the
plan and completion state are visible over time.

---

## Launch Target

- Go-live date: **May 15, 2026**
- Primary launch outcomes:
    - [ ] Public homepage is live at `/`
    - [ ] Vendor business onboarding is live
    - [ ] Approved vendors can manage their business profile
    - [ ] Approved vendors can apply to markets
    - [ ] Market Ops administrators can manage market groups, markets, locations, vendors, and booth
          assignments
    - [ ] Application-fee handoff into the existing payments plugin works
    - [ ] Booth-fee workflow after approval is operational

---

## Working Assumptions

- Work spans both:
    - `ws_plugin_market_ops`
    - the Studio host repo where shared homepage, page, auth, and runtime behavior live
- Stripe is out of scope for launch.
- Reports are placeholder-only at launch.
- The launch fee model supports exactly:
    - `none`
    - `per_group`
    - `per_market`
- Homepage ownership now flows through the Studio Pages system rather than a direct plugin route
  handoff.
- Client review means the current implementation state is shown and same-day corrections are either
  applied or explicitly deferred.

---

## Overall Status Snapshot

- [x] Planning documents and route direction are locked
- [x] Studio host support for a public homepage is in place
- [x] Plugin declaration and initial permission structure are in place
- [~] First-pass schema design is documented
- [ ] Plugin migrations for the first-pass schema are not written yet
- [ ] Service/storage seams are not implemented yet
- [ ] Public market-site pages are not implemented yet
- [ ] Vendor onboarding is not implemented yet
- [ ] Application, booth, and approval workflow is not implemented yet

---

## Daily Schedule

## Tuesday, May 5, 2026

### Delivery Focus

- [x] Lock the implementation plan and route map.
- [x] Finalize the plugin task breakdown in `TASKS.md`.
- [x] Create planning documents (`AGENTS.md`, `ROADMAP.md`) for execution support.
- [x] Confirm the launch-critical scope only:
    - [x] homepage
    - [x] vendor onboarding
    - [x] vendor management
    - [x] market applications
    - [x] Market Ops admin
    - [x] payments handoff

### Internal Exit Criteria

- [x] Implementation order is settled.
- [x] No remaining ambiguity on:
    - [x] market-group-first routing
    - [x] vendor-first onboarding
    - [x] ownership-or-admin authorization
    - [x] fee-mode constraints

### Client Review / Milestone

- [x] No formal client demo required.
- [x] PM review of scope and launch shape only.

---

## Wednesday, May 6, 2026

### Delivery Focus

- [x] Implement Studio host support for the public homepage handoff.
- [x] Add the Studio site setting / homepage mechanism that controls what `GET /` renders.
- [x] Keep `/login` as the default root target when no homepage is configured.
- [x] Expand the Market Ops plugin declaration beyond the stub.
- [x] Add initial plugin permission structure for Market Ops backoffice access.

### Internal Exit Criteria

- [x] Studio can be configured to render a public homepage at `/`.
- [x] Homepage behavior is canonicalized so the selected homepage page renders directly at `/`.
- [x] Plugin declaration is ready to host real route groups and schema migrations.

### Client Review / Milestone

- [x] Async checkpoint on homepage ownership and public route direction.
- [x] Confirm there are no requested changes to the top-level navigation model.

---

## Thursday, May 7, 2026

### Delivery Focus

- [x] Build first-pass schema design for:
    - [x] vendor businesses
    - [x] vendor-business owners
    - [x] vendor product categories
    - [x] locations
    - [x] market groups
    - [x] markets
    - [x] booth types
    - [x] market booth offerings
    - [x] vendor market applications
    - [x] application market selections
    - [x] application market booth preferences
- [ ] Write first-pass plugin migrations for those tables.
- [ ] Add service and storage seams for those objects.
- [x] Define service and workflow boundaries before page implementation continues.

### Internal Exit Criteria

- [x] Core domain objects exist in documented schema form.
- [ ] Core domain objects exist in actual migration form.
- [ ] Storage/service layer is stable enough for page and route work to begin.

### Notes

- Schema design is now documented in `docs/DBDD.md`.
- The schema model has been refined beyond the original draft to account for:
    - per-market application decisions
    - waitlist vs approval vs rejection by selected market
    - booth-type catalog and market-specific booth offerings
    - ranked booth preferences
    - booth quantity requests and assignments
    - volunteer-interest tracking per selected market
    - admin-managed vendor product categories

### Client Review / Milestone

- [ ] Review data model terminology:
    - [ ] vendor business
    - [ ] market group
    - [ ] market
    - [ ] booth type / booth offering
    - [ ] application status
    - [ ] per-market selection status

---

## Friday, May 8, 2026

### Delivery Focus

- [ ] Write the plugin migrations that match `docs/DBDD.md`.
- [ ] Implement first-pass storage/service seams for the schema objects.
- [ ] Begin the public-facing market-site surface:
    - [ ] `/`
    - [ ] `/vendors`
    - [ ] `/markets`
    - [ ] `/markets/:groupSlug`
    - [ ] `/markets/:groupSlug/:marketSlug`
- [ ] Keep UX simple, legible, and launch-safe.

### Internal Exit Criteria

- [ ] Plugin migrations run cleanly.
- [ ] Storage/service layer is stable enough for route work to proceed.
- [ ] Public site skeleton is navigable.
- [ ] Market-group route structure is working.

### Client Review / Milestone

- [ ] Review homepage direction.
- [ ] Review vendor directory shape.
- [ ] Review markets listing and group-page structure.

---

## Saturday, May 9, 2026

### Delivery Focus

- [ ] Build `/new-vendors` public information page.
- [ ] Implement authenticated vendor-business creation behind `/new-vendors`.
- [ ] Ensure login/registration handoff is clear and low-friction.
- [ ] Keep onboarding minimal and obvious.

### Internal Exit Criteria

- [ ] A logged-in user can create a vendor business.
- [ ] The public page clearly explains the process before login is required.

### Client Review / Milestone

- [ ] Review the vendor onboarding flow:
    - [ ] wording
    - [ ] fields
    - [ ] clarity
    - [ ] accessibility for non-technical users

---

## Sunday, May 10, 2026

### Delivery Focus

- [ ] Build Market Ops administrator landing flow at `/market-ops`.
- [ ] Build vendor-business review workflow so administrators can:
    - [ ] review newly created businesses
    - [ ] approve businesses
    - [ ] reject businesses
- [ ] Start locations and market-group admin dashboard scaffolding.

### Internal Exit Criteria

- [ ] Administrators can reach the Market Ops surface with normal auth and plugin permissions.
- [ ] Vendor business approval is operational.

### Client Review / Milestone

- [ ] Review vendor approval workflow and Market Ops direction.
- [ ] Confirm approval terminology and expected post-approval vendor experience.

---

## Monday, May 11, 2026

### Delivery Focus

- [ ] Build public vendor profile pages at `/vendors/:vendorSlug`.
- [ ] Build `/vendors/:vendorSlug/manage`.
- [ ] Implement the custom ownership-or-admin guard for vendor-scoped routes.
- [ ] Allow one account to manage multiple vendor businesses.

### Internal Exit Criteria

- [ ] Approved vendor pages can be publicly viewed.
- [ ] Vendor management is protected correctly.
- [ ] Unauthorized users receive the normal `403`.

### Client Review / Milestone

- [ ] Review:
    - [ ] public vendor page structure
    - [ ] vendor business editing flow
    - [ ] expected business information fields
    - [ ] product-category selection model

---

## Tuesday, May 12, 2026

### Delivery Focus

- [ ] Build `/vendors/:vendorSlug/manage/applications`.
- [ ] Group market applications by market group.
- [ ] Show current status per selected market.
- [ ] Implement booth preference capture and per-market selection workflow.
- [ ] Implement fee calculation for:
    - [ ] `none`
    - [ ] `per_group`
    - [ ] `per_market`
- [ ] Build the handoff into the existing payments plugin for application fees.
- [ ] Define the booth-fee workflow after per-market approval.

### Internal Exit Criteria

- [ ] Approved vendors can begin the market application flow.
- [ ] Fee totals are computed correctly.
- [ ] Payments handoff is wired at the contract level.
- [ ] Per-market booth preferences and booth-quantity requests are persisted.

### Client Review / Milestone

- [ ] Review:
    - [ ] market application flow
    - [ ] grouped application experience
    - [ ] booth preference flow
    - [ ] fee expectations
    - [ ] payments handoff behavior

---

## Wednesday, May 13, 2026

### Delivery Focus

- [ ] Finish Market Ops backoffice pages:
    - [ ] `/market-ops/market-groups`
    - [ ] `/market-ops/market-groups/create`
    - [ ] `/market-ops/market-groups/:groupId`
    - [ ] `/market-ops/market-groups/:groupId/markets/create`
    - [ ] `/market-ops/market-groups/:groupId/markets/:marketId`
    - [ ] `/market-ops/locations`
    - [ ] `/market-ops/locations/create`
    - [ ] `/market-ops/locations/:locationId`
    - [ ] `/market-ops/reports` placeholder
- [ ] Add booth offering and booth assignment administration.
- [ ] Add vendor-business review workflows so administrators can:
    - [ ] approve or reject businesses
    - [ ] approve, reject, or waitlist per-market application selections
    - [ ] assign booth offering and booth quantity by market
- [ ] Start end-to-end polish across launch-critical routes.

### Internal Exit Criteria

- [ ] Core admin configuration routes are present and functional.
- [ ] Booth administration and booth assignment are operational.
- [ ] Reports placeholder exists and does not block launch.

### Client Review / Milestone

- [ ] Walk through the full Market Ops admin surface.
- [ ] Collect same-day corrections for labels, flow order, and missing essentials.

---

## Thursday, May 14, 2026

### Delivery Focus

- [ ] Full launch-readiness pass.
- [ ] Run unit and integration verification in the host/plugin environment.
- [ ] Fix launch-critical defects only.
- [ ] Finalize public copy, route behavior, and permissions.
- [ ] Perform content and workflow freeze for launch unless a blocking bug appears.

### Internal Exit Criteria

- [ ] Launch-critical tests pass.
- [ ] No unresolved blockers remain for:
    - [ ] public pages
    - [ ] onboarding
    - [ ] vendor management
    - [ ] applications
    - [ ] booth assignment and booth-fee workflow
    - [ ] Market Ops admin
    - [ ] payments handoff

### Client Review / Milestone

- [ ] Final pre-launch acceptance review.
- [ ] Explicit signoff on:
    - [ ] public site
    - [ ] vendor flow
    - [ ] admin flow
    - [ ] launch readiness

---

## Friday, May 15, 2026

### Delivery Focus

- [ ] Go live.
- [ ] Apply production configuration and homepage setting.
- [ ] Perform smoke testing on production:
    - [ ] homepage
    - [ ] vendors
    - [ ] new vendor flow
    - [ ] vendor manage routes
    - [ ] markets
    - [ ] Market Ops admin
    - [ ] payments handoff
    - [ ] booth assignment / post-approval billing workflow
- [ ] Triage launch-day defects.

### Internal Exit Criteria

- [ ] Production homepage is live.
- [ ] Public and protected routes respond correctly.
- [ ] Critical launch flows complete successfully.

### Client Review / Milestone

- [ ] Go-live confirmation.
- [ ] Same-day post-launch review for urgent corrections.

---

## Launch Milestones

- [ ] **May 8:** Public site structure reviewed
- [ ] **May 9:** Vendor onboarding reviewed
- [ ] **May 10:** Vendor approval workflow reviewed
- [ ] **May 11:** Vendor page and management reviewed
- [ ] **May 12:** Market applications, booth flow, and fee model reviewed
- [ ] **May 13:** Market Ops backoffice reviewed
- [ ] **May 14:** Final acceptance review
- [ ] **May 15:** Go live

---

## PM Notes

- If schedule pressure rises, do not cut:
    - [ ] vendor-business approval workflow
    - [ ] ownership-or-admin guard behavior
    - [ ] fee calculation correctness
    - [ ] per-market decision workflow
    - [ ] booth assignment correctness
    - [ ] payments handoff
    - [ ] homepage support at `/`
- If something must slip, cut or defer:
    - [ ] reports beyond placeholder
    - [ ] deeper cosmetic polish
    - [ ] advanced vendor customization
    - [ ] non-essential content embellishment
    - [ ] any post-launch taxonomy/reporting enhancements that are not required for operations

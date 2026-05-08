# Market Ops Workflows

This document captures the operational workflows the plugin is expected to support.

It is intentionally more narrative than `docs/DBDD.md` and more implementation-stable than
`ROADMAP.md`. The goal is to preserve the real-world flow in a way that is easy to:

- refer back to during implementation
- turn into tests
- use for UI planning
- walk through with stakeholders
- reload into future chat sessions without re-explaining the domain from scratch

---

## Purpose

This file describes **how the Market Ops workflow should behave**, not just how the database is
shaped.

The first workflow below is the canonical launch-critical application and booth-assignment scenario.
It should be treated as the reference model for:

- schema choices
- route and UI design
- admin tooling
- vendor self-service behavior
- payment timing

---

## Actors

### Market Ops Administrator

The administrator is responsible for:

- creating market groups
- creating markets
- assigning markets to locations
- controlling whether applications are open
- defining available booth offerings per market
- reviewing vendor businesses
- reviewing market applications
- approving, rejecting, or waitlisting vendor participation by selected market
- assigning booth offerings and booth quantities

### Vendor Business Owner

The vendor business owner is responsible for:

- creating and managing a vendor business
- keeping business information current
- selecting product categories
- applying to market groups and selecting specific markets
- choosing booth preferences
- indicating whether they are willing to volunteer
- paying application fees at submission time
- later paying booth fees after approval for specific markets

---

## Workflow 1: Canonical Market Application and Booth Assignment Scenario

This is the baseline scenario the launch implementation should support.

### Setup

1. The administrator creates a market group, for example `Summer 2026`.
2. The administrator creates multiple individual markets inside that group.
3. The markets may span multiple locations.
4. The administrator defines which booth offerings exist for each market.
5. The administrator opens those markets to accept applications.

### Vendor Onboarding

1. A business owner creates a vendor business profile.
2. The administrator reviews that business.
3. Once approved, the business may apply to markets.

### Application Submission

1. A vendor submits one application to a market group.
2. Inside that group application, the vendor selects one or more specific markets.
3. For each selected market, the vendor provides:
    - requested booth quantity
    - ranked booth preferences
    - whether they are willing to volunteer
4. The application fee is due when the group application is submitted.

### Per-Market Review

1. The administrator reviews the selected-market rows inside the application.
2. Each selected market can be handled differently:
    - approved
    - waitlisted
    - rejected
    - withdrawn
3. A single group application may therefore end with mixed results across its selected markets.

### Booth Assignment

1. If a selected market is approved, the administrator assigns:
    - the final booth offering
    - the final booth quantity
2. The final assignment may match the vendor’s first choice or one of their fallback choices.
3. Each assigned booth offering should map to a human-usable booth number within that market.

### Booth Billing

1. Booth fees are **not** due at initial application submission.
2. Booth fees are due **after** the vendor is approved for that particular market selection.
3. The application fee and the booth fee are therefore separate payment moments.

---

## Canonical Example

This is the cleaned-up example that shaped the current schema direction.

### Market Setup

- One market group exists: `Summer 2026`
- Five markets exist inside that group:
    - `May 1`
    - `May 8`
    - `May 15`
    - `May 22`
    - `May 25`
- The first four markets are at location 1
- The last market is at location 2
- Applications are open for those markets

### Booth Types

The common booth types include:

- `8'x8'` for `$120`
- `8'x6'` for `$85`
- `9'x9'` for `$150`

Some markets may also have special offerings such as:

- `Parking Space` for `$135`

These special offerings may exist only for certain markets.

### Vendor Behavior

- Vendor A applies to:
    - `May 1`
    - `May 8`
    - `May 15`
- Vendor B applies to all markets
- Vendor C applies only to `May 15`
- Vendor D applies only to `May 22`, but requests **two** booths

For each selected market, vendors specify:

- their preferred booth size
- acceptable fallback booth options
- whether they are willing to volunteer

### Admin Decisions

- Vendor C is accepted for `May 15` because that is the only market they applied for
- Vendor A is accepted for `May 1` and `May 8`, but not `May 15`
- Vendor B is waitlisted for the first market, but accepted for the others
- For `May 25`, Vendor B must receive their second-choice booth instead of their first choice
- Vendor D is accepted for two of the small booths

### Payment Timing

- Application fees are due when the application is submitted
- Booth fees are due only after approval for a specific selected market

---

## Business Rules Implied by the Canonical Scenario

### Application Scope

- One application belongs to:
    - one vendor business
    - one market group
- That application may select one or more specific markets within the group

### Per-Market Decisioning

- Approval does not happen only at the group level
- Each selected market must carry its own decision state
- A vendor can be:
    - approved for one market
    - waitlisted for another
    - rejected for a third
    - all within the same parent application

### Booth Preferences

- Booth preferences are market-specific
- Vendors may rank first-choice and fallback booth options
- The final assigned booth may differ from the top preference

### Booth Quantity

- Booth quantity is market-specific
- A vendor may request more than one booth for a selected market
- The assigned quantity may differ from the requested quantity if needed

### Volunteer Interest

- Volunteer interest is market-specific
- A vendor may be willing to volunteer for one market but not another

### Payment Separation

- Application fee:
    - tied to the parent application
    - due at submission time
- Booth fee:
    - tied to the approved selected market row
    - due after approval and booth assignment

### Product Categories

- Vendor product types must come from an admin-managed list
- Vendors may select more than one product category
- Product categories support:
    - public communication
    - booth-placement decisions
    - operational planning

---

## Implications for Schema

This workflow implies the following design choices:

- vendor businesses and owners are separate entities
- vendor product categories are admin-managed and many-to-many with businesses
- market groups are separate from individual markets
- markets carry location and application-open state
- booth types are canonical
- market booth offerings are market-specific
- one parent application exists per vendor business per market group
- selected markets inside that application are real workflow rows, not just a bare join table
- booth preferences for each selected market are ranked child rows
- booth assignment and booth fees belong to the selected-market workflow row

---

## Implications for UI

### Vendor UI

The vendor-facing application flow should make it obvious that:

- they are applying to a market group
- they are selecting specific markets inside that group
- each selected market needs:
    - booth quantity
    - booth preference ranking
    - volunteer interest
- submitting the application triggers the application-fee payment step
- booth fees come later if a selected market is approved

### Admin UI

The admin-facing review flow should make it easy to:

- review the parent application as a whole
- review each selected market independently
- approve, reject, or waitlist each selected market
- assign booth offering and booth quantity
- see whether the vendor got first choice or a fallback choice
- understand which booth number the vendor should use at the market

---

## Implications for Tests

The canonical example above should become a reusable integration and acceptance test pattern.

Important test cases to preserve:

- one vendor applies to only some markets in a group
- one vendor applies to all markets in a group
- one selected market is approved while another is rejected
- one selected market is waitlisted while another is approved
- a vendor receives a fallback booth preference rather than the first choice
- a vendor requests more than one booth
- application fees are due at submission time
- booth fees are not due until a selected market is approved

---

## Open Questions

These decisions still need to be finalized during implementation if they become relevant:

- whether a vendor may have more than one historical application row for the same market group
- whether `waitlisted` selections can later transition directly to `approved`
- whether booth-fee payment should be tracked entirely inside this plugin or delegated immediately
  to the payments plugin contract
- whether one selected market can be approved for multiple different booth numbers when quantity is
  greater than one, or whether that requires a deeper future table

---

## How To Use This Document

Use this file when:

- designing migrations
- writing service-layer code
- sketching vendor or admin UI
- explaining the domain model to a stakeholder
- setting up integration tests
- reloading a future chat session with the core workflow context

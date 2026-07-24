# Proposal: Deliver a VPS Observation Dashboard Skeleton

## Outcome

Deliver an independently deployable, read-only dashboard service that lets the maintainer inspect representative multi-agent activity from a phone browser. The child change provides revocable browser authentication, a mobile-first project hierarchy, and mock projection data behind a replaceable source/view-model boundary.

This is a presentation and deployment skeleton only. It does not implement the laptop-to-VPS observation path, any Control Tower integration, or any part of the Telegram control path described by the parent `multi-tower-control-plane` change.

## Intent and Problem

The long-term control plane needs a phone-friendly observation surface, but its real projection contract depends on later integration work. Waiting for that contract would couple basic dashboard delivery, authentication, responsive hierarchy, and visual validation to P4–P6 and to an undefined cross-machine protocol.

This child isolates the independently useful work: prove that a VPS-hosted browser service can securely present the intended redacted information in a clear mobile hierarchy without gaining write authority. Mock data allows the product shape to be reviewed now while preserving an explicit boundary for a future real projection source.

## Scope

### In Scope

- A read-only dashboard service that can be deployed on the VPS.
- Revocable username-and-password authentication for browser access.
- A mobile-first hierarchical list grouped by project.
- Exactly five displayed data fields:
  1. project name
  2. agent name
  3. state
  4. task title
  5. branch name
- Representative mock projection data supplied through a replaceable source/view-model boundary.
- Explicit loading, authentication-failure, and empty-mock states so the skeleton remains understandable outside the happy path.
- A visual direction inspired by the supplied command-center reference: dark navy surfaces, cyan/teal accents, restrained glow, and clear status indicators.
- Responsive simplification of that direction for a phone-sized hierarchical list rather than reproduction of the reference's desktop density or additional modules.

### Out of Scope and Hard Boundaries

- Bots, Telegram transport, control commands, a laptop daemon, a tower registry, stall detection, an escalation queue, or answer application.
- Any edits to `core.mjs`, `mcp.mjs`, Tower runtime files, or `autonomous-continuation-control-tower` artifacts.
- A real laptop-to-VPS projection protocol, payload transport, persistence contract, or P4–P6 binding.
- File paths, line counts, test results, source code, diffs, secrets, or any other data beyond the five displayed fields.
- Dashboard actions, mutations, approvals, or any write capability.
- Multi-tenant or multi-owner behavior.
- Selection of implementation libraries, VPS provider, process supervisor, proxy, certificate mechanism, or other hosting mechanics; those belong in design.
- Copying the visual reference's navigation, command controls, system metrics, timelines, feeds, or desktop panel density.

## Proposed Capabilities

### 1. Authenticated Read-Only Entry

A browser visitor must authenticate with a username and password before seeing dashboard data. Credentials must be revocable or rotatable without changing the dashboard URL. Failed authentication must reveal no mock dashboard content.

### 2. Mobile-First Project Hierarchy

The primary view groups agents beneath their projects and prioritizes scanability on a phone. Each rendered item exposes only the five allowed fields. State must be distinguishable through clear indicators without relying on glow or color alone.

### 3. Replaceable Mock Projection Source

The dashboard obtains mock records through a source boundary and maps them into a stable view contract. Rendering must not depend directly on mock fixtures.

Future integration will replace the mock source without changing the view contract. The real projection payload, transport, persistence, freshness semantics, and P4–P6 bindings remain undefined by this child and must not be inferred from the mock shape.

### 4. Explicit Skeleton States

The deliverable may show:

- a loading state while the selected source resolves;
- an authentication-failure state with no protected data disclosure;
- an empty state when the mock source returns no projects or agents;
- the populated hierarchical state for representative mock data.

These are presentation states, not claims about a future network protocol or runtime lifecycle.

## Dependencies and Deferred Binding

| Area | Decision for this child | Deferred to parent integration |
|---|---|---|
| Parent relationship | `multi-tower-control-plane` remains the long-term integration change. | End-to-end observation and control-plane completion. |
| Data source | Local mock projection behind a replaceable boundary. | Real laptop-to-VPS source, transport, validation, and persistence. |
| View contract | The UI consumes project-grouped records containing only the five allowed display fields. | Mapping from the eventual real projection payload into that contract. |
| P4–P6 | No dependency is implemented or claimed. | Continuation-state semantics and any P4–P6-derived fields or lifecycle bindings. |
| Runtime authority | The service is observation-only and has no Tower authority. | Any control capability requires a separate change and threat-model review. |
| Deployment design | The result must be VPS-deployable. | Libraries and concrete hosting mechanics are selected during design. |

This child is independently implementable because its acceptance criteria stop at authenticated rendering from mocks. It neither waits for nor fabricates the contracts owned by P4–P6.

## Success Criteria

- [ ] The dashboard service can be deployed on a VPS and opened from a phone-sized browser viewport.
- [ ] An unauthenticated visitor cannot view dashboard content.
- [ ] Username-and-password credentials can be revoked or rotated without changing the dashboard URL.
- [ ] The populated view is grouped by project and remains legible and navigable on a mobile viewport.
- [ ] The interface displays exactly project name, agent name, state, task title, and branch name as data fields—no additional operational data.
- [ ] The interface exposes no action, mutation, approval, command, or write path.
- [ ] Mock data enters through a replaceable source/view-model boundary rather than being coupled directly to rendering.
- [ ] Loading, authentication-failure, and empty-mock states are explicit and do not reveal protected content.
- [ ] Visual treatment uses dark navy command-center surfaces, cyan/teal accents, restrained glow, and clear status indicators without reproducing desktop density or extra modules from the reference image.
- [ ] Replacing the mock source can preserve the existing view contract.
- [ ] No real projection payload, transport, persistence contract, or P4–P6 integration is implemented or implied.
- [ ] No excluded Control Tower runtime or `autonomous-continuation-control-tower` artifact is modified.

## Risks

| Risk | Mitigation |
|---|---|
| Mock data accidentally becomes the de facto projection protocol. | Name and isolate the source boundary; treat fixtures as examples only; keep the real payload explicitly undefined. |
| The dashboard expands into a control surface. | Enforce observation-only acceptance criteria and provide no action or write affordance. Any future action requires a separate change. |
| Authentication protects the page but leaks content through failure states or unauthenticated responses. | Require protected rendering and data responses to disclose no dashboard content before successful authentication. |
| The visual reference drives a dense desktop clone that fails on phones. | Use only its palette, surface treatment, restrained glow, and status clarity; make the project hierarchy the sole primary mobile structure. |
| Color or glow becomes the only state signal. | Require readable state labels and indicators that remain understandable without color alone. |
| The five-field redaction boundary drifts. | Treat the field list as exact and verify that no additional operational metadata is displayed. |
| Proposal-level choices prematurely constrain implementation. | Defer libraries and hosting mechanics to design while retaining VPS deployability and credential revocability as outcome constraints. |

## Rollback Plan

The child is additive and has no Control Tower runtime integration.

1. Disable or stop the dashboard service on the VPS.
2. Revoke its browser credentials and remove its public route if one was configured during deployment.
3. Remove the deployed dashboard artifact and mock data.
4. Revert the isolated child implementation.

Rollback requires no Tower data migration, projection replay, protocol downgrade, or P4–P6 recovery because this child stores no real projection and has no write authority. The parent `multi-tower-control-plane` artifacts and runtime remain unchanged.

## Next Phase

Produce a specification that turns the exact five-field boundary, authentication behavior, responsive hierarchy, source/view-model replacement seam, explicit states, and observation-only restrictions into testable scenarios. Concrete technology and hosting choices remain design decisions.

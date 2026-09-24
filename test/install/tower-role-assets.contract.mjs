export const PROFILE_FRONTMATTER_KEYS = ["name", "role", "permanent", "skill", "capabilities"]
export const SKILL_FRONTMATTER_KEYS = ["name", "description", "license", "metadata"]
export const SKILL_SECTIONS = ["Activation Contract", "Hard Rules", "Decision Gates", "Execution Steps", "Output Contract", "References"]
export const ASSET_CONTRACTS = {
  "product/tower/profiles/main.md": {
    kind: "profile",
    frontmatter: {
      name: "main",
      role: "coordinator",
      permanent: true,
      skill: "skills/torre-control/SKILL.md",
      capabilities: { required: [], omitted: ["bash", "edit", "write"] },
    },
    body: ["## Identity", "Coordinates mandatory Tower topology and confirmed work as the sole dispatcher.", "", "## Authority", "Dispatches approved assignments after live topology readback.", "", "## Boundaries", "Does not host Support or worker panes and does not execute implementation work assigned to other roles."].join("\n"),
  },
  "product/tower/profiles/support.md": {
    kind: "profile",
    frontmatter: {
      name: "support",
      role: "support",
      permanent: true,
      skill: "skills/torre-control-soporte/SKILL.md",
      capabilities: { required: [], omitted: ["bash", "edit", "write"] },
    },
    body: ["## Identity", "Provides read-only planning and capacity support to Main.", "", "## Authority", "Advises Main without dispatching or executing assignments.", "", "## Boundaries", "Does not write files, run commands, or dispatch work."].join("\n"),
  },
  "product/tower/profiles/implementer.md": {
    kind: "profile",
    frontmatter: {
      name: "implementer",
      role: "implementer",
      permanent: true,
      skill: null,
      capabilities: { required: ["bash"], omitted: [] },
    },
    body: ["## Identity", "Executes approved scope and returns implementation evidence.", "", "## Authority", "May use approved execution capabilities within the assigned scope.", "", "## Boundaries", "Has no dispatch authority and does not expand approved scope."].join("\n"),
  },
  "product/tower/skills/torre-control/SKILL.md": {
    kind: "skill",
    frontmatter: {
      name: "torre-control",
      description: "Trigger: Control Tower operator route, Tower start, Main dispatch, Herdr coordination. Route approved work through Main and Support.",
      license: "Apache-2.0",
      metadata: { author: "gentleman-programming", version: "1.0" },
    },
    references: ["../../profiles/main.md", "../torre-control-soporte/SKILL.md", "../torre-control-entregas/SKILL.md"],
    // The seat topology moved out of this prose into `hosts/herdr-topology.mjs`, so these markers no
    // longer freeze the sentences that described it. They pin the two things prose still owns: that the
    // skill routes every seating action to the enforcing command, and the rules that have no code yet.
    markers: [
      /Never invoke `herdr` to seat a worker\. Always `torre asiento`/, /`hosts\/herdr-topology\.mjs`/,
      /works with Tower OFF or ON, and fails closed where prose is forgotten/, /A hand-written `herdr pane split` is drift/,
      /`abrir <asiento>` — opens the pane inside `AGENTES` split `right`, verifies tab and both cwd values/,
      /closes what it opened on mismatch, and refuses Main, Support and occupied seats/,
      /`limpiar` — previews disposal; `--confirmar` removes only seats proven clean, merged and free/,
      /Herdr tabs are visibility, never Git isolation\. `MAIN → SUPPORT → AGENTES`/,
      /Permanent pool: `implementer-1`, `implementer-2`, `implementer-3`, plus `support-agent`/,
      /worktree is temporary and must be disposed once its work lands/,
      /A correct brief never overrides intrinsic bindings/, /transport is no fallback and grants no authority/,
      /Never silently `cd`, recycle, reuse, move, close or reconcile a pane or seat/,
      /`--confirmar` is maintainer-authorized/, /Main alone dispatches; Support advises; workers never self-assign/,
      /Engram is evidence, never authority/, /Enforce bindings with Tower OFF or ON, and never activate Tower/,
      /`S9\.5` automates this rule from the/, /Tower is OFF \(`ACTIVE` absent\)/, /Tower is ON and authority matches/,
      /keep implementation outside Main/, /`chanks-3-session-kickoff`/, /pending approval/,
    ],
    fixtureText: "Never invoke `herdr` to seat a worker. Always `torre asiento`: it owns the topology in code (`hosts/herdr-topology.mjs`), works with Tower OFF or ON, and fails closed where prose is forgotten. A hand-written `herdr pane split` is drift. `abrir <asiento>` — opens the pane inside `AGENTES` split `right`, verifies tab and both cwd values by readback, closes what it opened on mismatch, and refuses Main, Support and occupied seats. `limpiar` — previews disposal; `--confirmar` removes only seats proven clean, merged and free. Herdr tabs are visibility, never Git isolation. `MAIN → SUPPORT → AGENTES`. Permanent pool: `implementer-1`, `implementer-2`, `implementer-3`, plus `support-agent`; any other worktree is temporary and must be disposed once its work lands. A correct brief never overrides intrinsic bindings; message transport is no fallback and grants no authority. Never silently `cd`, recycle, reuse, move, close or reconcile a pane or seat, and `--confirmar` is maintainer-authorized. Main alone dispatches; Support advises; workers never self-assign. Engram is evidence, never authority. Enforce bindings with Tower OFF or ON, and never activate Tower. `S9.5` automates this rule from the same module. Tower is OFF (`ACTIVE` absent) or Tower is ON and authority matches; keep implementation outside Main, route through `chanks-3-session-kickoff`, and report pending approval. ",
  },
  "product/tower/skills/torre-control-entregas/SKILL.md": {
    kind: "skill",
    frontmatter: {
      name: "torre-control-entregas",
      description: "Trigger: Tower delivery token, ordered handoff, integration, or closure. Main assigns one bound token and enforces repository policy.",
      license: "Apache-2.0",
      metadata: { author: "gentleman-programming", version: "2.0" },
    },
    references: ["../../../../AGENTS.md", "../../profiles/main.md", "../torre-control/SKILL.md"],
    markers: [
      /Main is the sole delivery-token issuer, queue coordinator, and target-branch mover/,
      /Keep exactly one active token/,
      /Bind it to assignment, worker, worktree, source branch, candidate commit and tree, target branch, and policy revision/,
      /Unknown, missing, or contradictory policy fails closed/,
      /Another candidate owns the token.*Wait; never grant, steal, or duplicate it/,
      /Release the token only after the observed result matches its frozen binding/,
    ],
    fixtureText: "Main is the sole delivery-token issuer, queue coordinator, and target-branch mover. Keep exactly one active token. Bind it to assignment, worker, worktree, source branch, candidate commit and tree, target branch, and policy revision. Unknown, missing, or contradictory policy fails closed. When Another candidate owns the token, Wait; never grant, steal, or duplicate it. Release the token only after the observed result matches its frozen binding. ",
  },
  "product/tower/skills/torre-control-soporte/SKILL.md": {
    kind: "skill",
    frontmatter: {
      name: "torre-control-soporte",
      description: "Trigger: Tower source verification, capacity, conflicts, or brief preparation. Provide host-neutral read-only evidence to Main.",
      license: "Apache-2.0",
      metadata: { author: "gentleman-programming", version: "1.0" },
    },
    references: ["../../profiles/support.md"],
    markers: [/read-only/, /capacity/, /conflicts/, /exact brief/, /never dispatch/i, /Never (?:write|reserve|commit|deliver|mutate)/i],
    fixtureText: "Remain read-only while checking capacity and conflicts. Return an exact brief to Main; never dispatch and Never write, reserve, commit, deliver, or mutate. ",
  },
}
export const VENDOR_LEAKAGE = /(?:\bPi\b|OpenCode|Claude|Intercom|@[^\s/]+\/|\.opencode|\.claude|(?:^|[\s`'"(])(?:~\/|\/(?!\/))|\b(?:home|global) path\b)/im
export const GENERIC_COPY = /(?:Gentle AI|chanks-2-planificador-granular|\b(?:full-)?SDD\b|Strict TDD|branch-pr|chained-pr|work-unit)/i

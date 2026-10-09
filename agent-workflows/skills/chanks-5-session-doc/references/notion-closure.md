# Optional Notion closure projection

Load only on demand when this project's documentation policy uses Notion and permits its use.
This projection supplements confirmed Session closure; it never replaces Radar or plan authority.

## Local prohibition comes first

Read the repository's canonical local policy before resolving any Notion configuration. Control
Tower forbids Notion: never search, consult, create, or update Notion for that project. Its absence
of `.session-doc.json` is intentional. Do not consult the bootstrap map, create a pointer, or
contact Notion to repair that intentional absence. Any project's equivalent prohibition wins too.

## Resolve allowed configuration

1. Load `../assets/session-doc.schema.json` only on demand for an allowed project. The committed
   pointer is the source of truth: validate the repository-root `.session-doc.json` against that
   schema before using it. `notion.enabled: false` disables projection; stop without a Notion call.
   An invalid pointer is a configuration failure, never permission to substitute the bootstrap map.
2. Only if local policy permits Notion and the pointer is missing, load
   `../assets/project-notion-map.json`. Match the exact Git-root basename against its existing
   aliases for Proyecto-Alpha, Proyecto-Beta, or Proyecto-Gamma. This is a bootstrap seed, not live project status.
3. Return the known mapping as a proposed pointer for the responsible parent to confirm before
   creating it. For an unknown project, report the missing mapping and ask for its authoritative
   target; never invent a page ID, infer it from memory, or search Notion to guess.

## Project confirmed closure

With a valid, permitted target and authorization for the documentary update, project only the
confirmed Session identity, outcome/constraint evidence, immutable integrated commit, and actual
pending documentation. Read back the written projection to verify it; preserve failures as pending
documentation without undoing completed delivery. Never load unrelated pages or use a projection
to claim product progress. No new technical checks, reviews, or delivery rules belong here.

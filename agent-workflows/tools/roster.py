#!/usr/bin/env python3
"""Product skill roster of Control Tower.

The personal installer (machine-setup) reads this module from its configured
Control Tower checkout and composes its runtime rosters from it. This file owns
every product skill name and this repository's product source layout; personal
sources (skills-personales, chanks-0-agente-soporte) belong to machine-setup and
never resolve here.
"""

from __future__ import annotations

from pathlib import Path
from types import MappingProxyType


# Shared skill content (the plan-naming convention canon).
SHARED = ("_shared",)

# Chanks planning family — terrain, discovery, requirements, and plan↔SDD bridge.
# chanks-0-agente-soporte stays in this vocabulary (the generated Pi extension
# trusts its installed name) but its source is personal: machine-setup ships it.
CHANKS_SKILLS = (
    "chanks-1-autoridad",
    "chanks-1-brain-dump",
    "chanks-1-descubrimiento",
    "chanks-1-feature",
    "chanks-1-heredado",
    "chanks-1-adopcion",
    "chanks-1-prd",
    "chanks-1-project-kickoff",
    "chanks-1-requirements",
    "chanks-1-rfc",
    "chanks-1-terreno",
    "chanks-0-agente-soporte",
    "chanks-0-mensajes-visibles",
    "chanks-0-explicalo-simple",
    "chanks-0-session-context-loader",
    "chanks-0-skill-composer",
    "chanks-1-cierre-de-decisiones",
    "chanks-2-planificador-granular",
    "chanks-3-paralelo",
    "chanks-4-puente",
    "chanks-5-politica-de-entrega",
    "chanks-5-session-doc",
)

# Pista sources retain their behavior under skills-diferidas/v2/. V1 starts
# Sessions organically; these skills are not installed, and existing runtime
# copies are archived reversibly through RETIRED_SKILLS.
V2_DEFERRED_SKILLS = (
    "chanks-0-jornada",
    "chanks-3-session-kickoff",
    "chanks-3-coordinador-manual",
)

# Automatic-Tower sources live under skills-diferidas/v3/, never installed.
V3_DEFERRED_SKILLS = (
    "chanks-3-despacho-herdr",
    "chanks-4-unattended-implementation",
)

# Installation exclusions, not every source physically deferred from Tower V1.
DEFERRED_SKILLS = V2_DEFERRED_SKILLS + V3_DEFERRED_SKILLS

# Product deferred sources keep their deferred layout under this repository.
DEFERRED_SOURCE_VERSIONS = MappingProxyType({
    **{name: "v2" for name in V2_DEFERRED_SKILLS},
    **{name: "v3" for name in V3_DEFERRED_SKILLS},
})

# Non-Chanks support skills.
SUPPORT_SKILLS = (
    "analisis-por-tramos",
    "skill-orchestrator",
)

# Sources already in the Method whose Tower V1 packaging is a later Session.
# The pending list is empty: a skill enters the roster when its packaging
# Session lands, and until then neither Tower nor this installer ships it.
V1_PENDING_SKILLS = ()

# The reviewed Tower V1 runtime membership, mirrored against
# product/tower/v1/runtime-config.mjs by the installer's fixture test.
TOWER_V1_SKILLS = tuple(sorted(
    tuple(name for name in CHANKS_SKILLS
          if name != "chanks-0-agente-soporte" and name not in V1_PENDING_SKILLS)
    + SUPPORT_SKILLS + ("control-tower",)
))
STOP_MANAGING_SKILLS = tuple(sorted(set(CHANKS_SKILLS + SUPPORT_SKILLS) & set(TOWER_V1_SKILLS)))

# Product active source inventory: what Tower V1 owns on disk, mirroring the
# installer's historical SKILLS tuple (SHARED + CHANKS + SUPPORT) minus the
# personal member. The deferred skills are deliberately absent: their sources
# are kept but never installed.
SKILLS = SHARED + tuple(
    name for name in CHANKS_SKILLS if name != "chanks-0-agente-soporte"
) + SUPPORT_SKILLS

# Every product skill source this repository ships, including the deferred ones
# (kept as source, never installed). The personal installer's retirement scan
# resolves each member through skill_source_root.
PRODUCT_SKILLS = SKILLS + DEFERRED_SKILLS

# The personal skill roster lives in machine-setup; from the product side there
# are no personal sources. Kept as a name so the ownership boundary stays
# assertable from the product tests.
PERSONAL_SKILLS = ()

# Explicit ownership migration. Normal installs retire only these known derived
# copies; unlisted directories remain untouched.
RETIRED_SKILLS = (
    # Left the Tower 2026-10-30: personal global skill `comunicacion-agentes`
    # in machine-setup; the chanks- name does not travel to clients.
    "chanks-0-comunicacion-agentes",
    "chanks-6-politica-de-entrega",
    "chanks-7-session-doc",
    "session-doc",
    "politica-de-entrega",
    "unattended-implementation",
    "session-kickoff",
    "planificador-granular",
    "cierre-de-decisiones",
    "skill-composer",
    "session-context-loader",
    "explicalo-simple",
    "agente-soporte",
    "session-plan",
    "coordinador_multi_agente",
    # The runtime copies were installed hyphenated, so the underscore entry above
    # matched no directory and the retired skill survived every install.
    "coordinador-multi-agente",
    "architecture-audit",
    "project-kickoff",
    "big-files-remediation-loop",
    "torre-control",
    "torre-control-soporte",
    "torre-control-entregas",
) + DEFERRED_SKILLS

# Net removals from ab959f5: immutable canonical bytes from 1b3a53b/f7612de
# (support references) and 929ac91 (session-doc links). No runtime ownership
# manifest exists; new removals must explicitly extend this registry.
RETIRED_SKILL_FILES = MappingProxyType({
    "chanks-0-agente-soporte/assets/assignment-readonly.md": frozenset({
        "1066822ccc072dc21cd5dd67965cbbcf0a03b186d276a70b593d26e4e0c8d72f",
        "9b35256b723d835665783739526a12497bf037c822521c498850a3bf253bc622",
    }),
    "chanks-0-agente-soporte/references/contrato-no-interferencia.md": frozenset({
        "c9f5b2db842d9b4751ab2a86a94cd7c30d7d538f433f4165674a5db88d6edf61",
        "b2c15bc842cc310b06489f3160d4e75a9ca111cf59bab525d1024000de7e981e",
    }),
    "chanks-0-agente-soporte/references/unidad-ejecutable.md": frozenset({
        "2d78b7322467476ce1e8c127f5ce746c62e9adb392d4ec8c8d4bac2cd8baf322",
        "a5362b5289abf87269ffbf879ab55976205cf0485cfa2c4e4132b20e5626a612",
    }),
    "chanks-5-session-doc/references/links.md": frozenset({
        "6d75a865769a7561193f06bb5f2f86f39d65b1911e6337a0a11077c863b6885b",
    }),
})


def skill_source_root(root: Path, skill: str) -> Path:
    """Resolve a product skill's canonical source directory under `root`
    (this repository's agent-workflows directory)."""
    version = DEFERRED_SOURCE_VERSIONS.get(skill)
    if version is not None:
        return Path(root) / "skills-diferidas" / version / skill
    return Path(root) / "skills" / skill


def source_files(root: Path, skills: tuple[str, ...] = SKILLS):
    """Yield (skill, relative path, absolute path) for every product source file."""
    for skill in skills:
        source_root = skill_source_root(root, skill)
        if not source_root.is_dir():
            raise FileNotFoundError(f"missing canonical skill directory: {source_root}")
        for path in sorted(source_root.rglob("*")):
            if path.is_file():
                yield skill, path.relative_to(source_root), path

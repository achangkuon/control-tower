#!/usr/bin/env node
// skill-sync — genera las tablas "Auto-invoke" de CLAUDE.md y los AGENTS.md por área
// leyendo el frontmatter de skills/*/SKILL.md (metadata.scope + metadata.auto_invoke).
//
// PLANTILLA (project-kickoff). Copiar a `scripts/skill-sync.mjs` del proyecto nuevo.
//
// Fuente de verdad: el frontmatter de cada skill. Las tablas son DERIVADAS.
// NUNCA editar las tablas a mano — editá el skill y corré este script.
// Uso:  node scripts/skill-sync.mjs [--dry-run]

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(REPO_ROOT, 'skills');
const DRY_RUN = process.argv.includes('--dry-run');

// scope → archivo AGENTS.md destino. Hoy solo `root`. Si el repo se vuelve monorepo,
// agregá áreas: web: { path: join(REPO_ROOT,'apps','web','AGENTS.md'), label:'web' }, ...
const SCOPE_TARGETS = {
  root: { path: join(REPO_ROOT, 'AGENTS.md'), label: 'root' },
};

const BEGIN = '<!-- BEGIN AUTO-INVOKE (generado por scripts/skill-sync.mjs — no editar a mano) -->';
const END = '<!-- END AUTO-INVOKE -->';

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const nameLine = lines.find((l) => /^name:\s*/.test(l));
  const name = nameLine ? nameLine.replace(/^name:\s*/, '').trim().replace(/^["']|["']$/g, '') : null;
  const metaIdx = lines.findIndex((l) => /^metadata:\s*$/.test(l));
  const metaLines = [];
  if (metaIdx !== -1) {
    for (let i = metaIdx + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) break;
      metaLines.push(lines[i]);
    }
  }
  return { name, scope: parseListField(metaLines, 'scope'), autoInvoke: parseListField(metaLines, 'auto_invoke') };
}

function parseListField(metaLines, field) {
  const re = new RegExp(`^\\s*${field}:\\s*(.*)$`);
  const idx = metaLines.findIndex((l) => re.test(l));
  if (idx === -1) return [];
  const inline = metaLines[idx].match(re)[1].trim();
  if (inline.startsWith('[')) {
    return inline.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  const out = [];
  for (let i = idx + 1; i < metaLines.length; i++) {
    if (/^\s*$/.test(metaLines[i])) continue;
    const item = metaLines[i].match(/^\s*-\s*(.+)$/);
    if (!item) break;
    out.push(item[1].trim().replace(/^["']|["']$/g, ''));
  }
  return out;
}

const skills = [];
if (existsSync(SKILLS_DIR)) {
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!existsSync(file)) continue;
    const parsed = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!parsed || !parsed.name) { console.warn(`  ⚠️  ${entry.name}: frontmatter ilegible, se omite`); continue; }
    if (parsed.scope.length === 0 || parsed.autoInvoke.length === 0) { console.warn(`  ⚠️  ${parsed.name}: sin scope o auto_invoke, se omite`); continue; }
    skills.push(parsed);
  }
}

function buildSection(scope) {
  const rows = [];
  for (const s of skills) {
    if (scope !== '__all__' && !s.scope.includes(scope)) continue;
    for (const action of s.autoInvoke) rows.push({ action, skill: s.name });
  }
  rows.sort((a, b) => a.action.localeCompare(b.action) || a.skill.localeCompare(b.skill));
  return [
    BEGIN, '## Auto-invoke Skills', '',
    'Cuando hagas alguna de estas acciones, cargá PRIMERO el skill correspondiente',
    '(`skills/<nombre>/SKILL.md` — la fuente de verdad):', '',
    '| Acción | Skill |', '|--------|-------|',
    ...rows.map((r) => `| ${r.action.replace(/\|/g, '\\|')} | \`${r.skill}\` |`),
    END,
  ].join('\n');
}

function applyToFile(targetPath, label, section) {
  const exists = existsSync(targetPath);
  let content = exists ? readFileSync(targetPath, 'utf8') : '';
  const eol = content ? (content.includes('\r\n') ? '\r\n' : '\n') : '\n';
  const sectionEol = section.replace(/\n/g, eol);
  let next;
  if (content.includes(BEGIN) && content.includes(END)) {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = content.replace(new RegExp(`${esc(BEGIN)}[\\s\\S]*?${esc(END)}`), () => sectionEol);
  } else if (exists) {
    next = content + (content.endsWith(eol) ? eol : eol + eol) + sectionEol + eol;
  } else {
    next = `# ${label} — Router de Agentes${eol}${eol}> Generado por \`scripts/skill-sync.mjs\`. NO editar a mano.${eol}${eol}` + sectionEol + eol;
  }
  const changed = next !== content;
  if (!DRY_RUN && changed) { mkdirSync(dirname(targetPath), { recursive: true }); writeFileSync(targetPath, next); }
  console.log(`  ${changed ? (DRY_RUN ? '~' : '✓') : '='} ${label}`);
  return changed;
}

console.log(`skill-sync ${DRY_RUN ? '(dry-run) ' : ''}— ${skills.length} skills con metadata\n`);
let anyChange = applyToFile(join(REPO_ROOT, 'CLAUDE.md'), 'CLAUDE.md (índice maestro)', buildSection('__all__'));
for (const [scope, target] of Object.entries(SCOPE_TARGETS)) {
  anyChange = applyToFile(target.path, target.label, buildSection(scope)) || anyChange;
}
console.log(`\n${DRY_RUN ? 'Dry-run completo.' : anyChange ? 'Listo — routers actualizados.' : 'Listo — sin cambios.'}`);

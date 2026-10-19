"""Genuine offline Pi/quiet-tools composition in a disposable agent directory."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
# Explicit overrides are preferred; sibling checkouts are a local development convenience,
# not portable installation paths or a dependency shipped to partners. The checkout may sit
# directly below the Tower container (Main) or one level deeper (Worktrees/<name>). The Pi fork
# lives in the container as pi/v2; gentle-pi and the legacy pi-v2 sit beside the container.
# Each source is resolved independently, falling back to the historical depth.
def local_source(*relatives):
    for ancestor in ROOT.parents[:3]:
        for relative in relatives:
            if (ancestor / relative).is_dir():
                return ancestor / relative
    return ROOT.parents[2] / relatives[-1]


PI_SOURCE = Path(os.environ.get("PERSONAL_PI_SOURCE", str(local_source("pi/v2", "pi-v2"))))
QUIET_SOURCE = Path(os.environ.get("GENTLE_PI_SOURCE", str(local_source("gentle-pi"))))
MATERIALIZE = ROOT / "agent-workflows/personal-pi/materialize.py"
MANIFEST = ROOT / "agent-workflows/personal-pi/manifest.json"
INSTALLER_PATH = ROOT / "agent-workflows/tools/install.py"


def run(command, **options):
    result = subprocess.run(command, capture_output=True, text=True, timeout=240, **options)
    if result.returncode:
        raise AssertionError(f"{command[0]} failed ({result.returncode}):\n{result.stderr[-4000:]}\n{result.stdout[-1000:]}")
    return result


def pinned_missing_packages(pi_tree: Path, modules_dir: Path) -> list[str]:
    """External packages the pinned tree declares but the live dependency tree lacks.

    Workspace members are supplied by the tree itself, so only non-workspace
    dependencies decide whether the pinned source can run against ``modules_dir``.
    """
    root = json.loads((pi_tree / "package.json").read_text())
    workspace_names = set()
    for pattern in root.get("workspaces", []):
        for manifest in pi_tree.glob(f"{pattern}/package.json"):
            name = json.loads(manifest.read_text()).get("name")
            if isinstance(name, str):
                workspace_names.add(name)
    required = set()
    for manifest in [pi_tree / "package.json", *sorted(pi_tree.glob("packages/*/package.json"))]:
        data = json.loads(manifest.read_text())
        for field in ("dependencies", "optionalDependencies"):
            required.update(name for name in data.get(field) or {} if name not in workspace_names)
    return sorted(name for name in required if not (modules_dir / name).exists())


PROBE = r'''
import assert from "node:assert/strict";
import { loadExtensions } from "../src/core/extensions/loader.ts";
import { ExtensionRunner } from "../src/core/extensions/runner.ts";
import { SessionManager } from "../src/core/session-manager.ts";
import { AuthStorage } from "../src/core/auth-storage.ts";
import { createInMemoryModelRegistry } from "./model-runtime-test-utils.ts";
import { ToolExecutionComponent } from "../src/modes/interactive/components/tool-execution.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

const [quiet, controls, skill] = process.argv.slice(2);
const loaded = await loadExtensions([quiet, controls], process.cwd());
assert.equal(loaded.errors.length, 0, JSON.stringify(loaded.errors));
const registry = await createInMemoryModelRegistry(AuthStorage.inMemory());
const runner = new ExtensionRunner(loaded.extensions, loaded.runtime, process.cwd(), SessionManager.inMemory(), registry);
runner.setUIContext(undefined, "tui");
const tools = runner.getAllRegisteredTools();
for (const name of ["read", "bash"]) assert.equal(tools.filter(t => t.definition.name === name).length, 1);
assert.equal(tools.find(t => t.definition.name === "read")?.sourceInfo?.path, quiet);
assert.equal(tools.find(t => t.definition.name === "bash")?.sourceInfo?.path, quiet);
const read = tools.find(t => t.definition.name === "read").definition;
const bash = tools.find(t => t.definition.name === "bash").definition;
initTheme("dark");
const ui = { requestRender() {} };
const options = { getCallAnnotations: (name, args) => runner.getToolCallAnnotations(name, args) };
const call = (name, args, definition) => new ToolExecutionComponent(name, "probe", args, options, definition, ui, process.cwd());
const annotatedRead = stripAnsi(call("read", { path: skill }, read).render(220).join("\n"));
assert.match(annotatedRead, /💪 Chanks · chanks-2-planificador-granular · lectura solicitada/);
assert.match(annotatedRead, /read/);
const normalBash = stripAnsi(call("bash", { command: "radar status" }, bash).render(220).join("\n"));
assert.match(normalBash, /🗼 Torre · radar status · solicitado/);
const narrow = call("bash", { command: "radar status" }, bash).render(16);
assert.equal(narrow.some(row => stripAnsi(row).includes("🗼 Torre")), false);
const lifecycle = call("bash", { command: "gentle-ai review status" }, bash);
const lifecycleBefore = lifecycle.render(120);
assert.equal(lifecycleBefore.some(row => stripAnsi(row).includes("🗼 Torre")), false);
const lifecycleOwner = { ...bash, renderCall: (_args, theme, context) =>
  bash.renderCall({ command: "gentle-ai review status" }, theme, context) };
const ineligibleRows = call("bash", { command: "radar status" }, lifecycleOwner).render(120);
assert.equal(ineligibleRows.some(row => stripAnsi(row).includes("🗼 Torre")), false);
assert.equal(ineligibleRows.length, lifecycleBefore.length);
const custom = { ...read, renderCall: () => ({ render: () => ["custom-owner-row"] }) };
const customRows = call("read", { path: skill }, custom).render(120);
assert.equal(customRows.some(row => stripAnsi(row).includes("💪 Chanks")), false);
assert.equal(customRows.filter(row => row.includes("custom-owner-row")).length, 1);
assert.equal(runner.getToolCallAnnotations("write", { path: skill }).length, 0);
assert.equal(runner.getToolCallAnnotations("edit", { path: skill }).length, 0);
// Exercise genuine event dispatch: read passes, mutation without admission is blocked,
// tool_result consumes the tracked call, and duplicate identities stay blocked.
await runner.emit({ type: "session_start", reason: "startup" });
for (const name of ["write", "edit"]) {
  const result = await runner.emitToolCall({ type: "tool_call", toolCallId: name, toolName: name, input: { path: "target.txt" } });
  assert.equal(result?.block, true, `${name} must remain gated`);
}
const readEvent = { type: "tool_call", toolCallId: "read-1", toolName: "read", input: { path: skill } };
assert.equal((await runner.emitToolCall(readEvent))?.block, undefined);
await runner.emitToolResult({ type: "tool_result", toolCallId: "read-1", toolName: "read", input: readEvent.input,
  content: [{ type: "text", text: "fixture" }], details: undefined, isError: false });
assert.equal((await runner.emitToolCall(readEvent))?.block, true);
console.log(JSON.stringify({ owner: quiet, annotations: [annotatedRead, normalBash], customRows, lifecycleRows: lifecycleBefore.length }));
'''


class GenuineCompositionTests(unittest.TestCase):
    def test_fresh_normal_startup_and_policy(self):
        self.assertTrue(PI_SOURCE.is_dir() and QUIET_SOURCE.is_dir())
        source_quiet = QUIET_SOURCE / "extensions/quiet-tools.ts"
        digest = hashlib.sha256(source_quiet.read_bytes()).hexdigest()
        self.assertEqual(digest, "59f9e211c7ab3bf60563bc66e757c6bce4d91224987456dc92025a63c7d0193b")
        version = json.loads((QUIET_SOURCE / "package.json").read_text())["version"]
        self.assertEqual(version, "2.6.4")
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in
                  (source_quiet, Path.home() / ".pi/agent/settings.json",
                   Path.home() / ".pi/agent/extensions/chanks-controls.ts",
                   Path.home() / ".pi/agent/npm/node_modules/gentle-pi/extensions/quiet-tools.ts",
                   Path.home() / ".npm-global/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js")
                  if p.is_file()}
        with tempfile.TemporaryDirectory(prefix="issue-151-composition-") as temporary:
            temp = Path(temporary)
            pi = temp / "pi"
            run(["python3", str(MATERIALIZE), str(pi), "--source", str(PI_SOURCE)])
            run(["python3", str(MATERIALIZE), str(pi), "--verify"])
            # The pin and the live checkout can diverge irreversibly: the live install stops
            # providing a dependency the pinned source still imports. Skip explicitly instead
            # of failing the suite on a mismatch no checkout can satisfy (issue #153).
            missing = pinned_missing_packages(pi, PI_SOURCE / "node_modules")
            if missing:
                pinned_commit = json.loads(MANIFEST.read_text())["base_commit"]
                self.skipTest(
                    f"pinned Pi {pinned_commit} requires external packages missing from "
                    f"{PI_SOURCE}/node_modules: {', '.join(missing)}; the live dependency tree no "
                    "longer matches the pin, so this composition cannot run without a new pin "
                    "(issue #153)"
                )
            # Reuse dependency bytes, never copy or modify source node_modules. Workspace packages
            # must resolve inside the overlay so annotation code is genuinely the pinned version.
            modules = pi / "node_modules"
            modules.mkdir()
            for entry in (PI_SOURCE / "node_modules").iterdir():
                if entry.name != "@earendil-works":
                    (modules / entry.name).symlink_to(entry.resolve(), target_is_directory=entry.is_dir())
            scope = modules / "@earendil-works"
            scope.mkdir()
            for entry in (PI_SOURCE / "node_modules/@earendil-works").iterdir():
                target = pi / "packages" / entry.name.removeprefix("pi-")
                if entry.name == "chord":
                    target = pi / "packages/chord"
                elif entry.name == "pi-agent-core":
                    target = pi / "packages/agent"
                elif entry.name == "pi-coding-agent":
                    target = pi / "packages/coding-agent"
                elif entry.name.startswith("pi-session-backend-"):
                    target = pi / "packages/session-backends" / entry.name.removeprefix("pi-session-backend-")
                (scope / entry.name).symlink_to(target if target.exists() else entry.resolve(), target_is_directory=True)
            # Bun resolves source exports in this disposable checkout. Node 22 on this
            # host lacks TS support and the reference node_modules has newer OpenAI
            # types, so a full production build would test unrelated dependency drift.
            # These source conditions modify only the temporary materialized copy.
            for package in ("chord", "tui", "telemetry", "ai", "durable", "agent",
                            "protocol", "client", "server", "coding-agent"):
                manifest = pi / "packages" / package / "package.json"
                data = json.loads(manifest.read_text())
                exports = data.get("exports", {})
                if exports:
                    for key, value in exports.items():
                        if isinstance(value, dict) and "import" in value and "source" not in value:
                            exports[key] = {"source": value["import"].replace("./dist/", "./src/").replace(".js", ".ts"), **value}
                    data["exports"] = exports
                else:
                    data["main"] = "./src/index.ts"
                manifest.write_text(json.dumps(data))
            shutil.copytree(PI_SOURCE / "packages/ai/src/providers/data",
                            pi / "packages/ai/src/providers/data")
            home = temp / "home"
            agent = home / ".pi/agent"
            (agent / "extensions").mkdir(parents=True)
            shutil.copytree(QUIET_SOURCE / "lib", agent / "lib")
            (agent / "scripts").mkdir()
            shutil.copyfile(QUIET_SOURCE / "scripts/gentle-ai-installer.mjs",
                            agent / "scripts/gentle-ai-installer.mjs")
            quiet = agent / "extensions/quiet-tools.ts"
            shutil.copyfile(source_quiet, quiet)
            (agent / "node_modules").symlink_to(modules, target_is_directory=True)
            import importlib.util
            spec = importlib.util.spec_from_file_location("issue151_installer", INSTALLER_PATH)
            installer = importlib.util.module_from_spec(spec)
            import sys
            sys.modules[spec.name] = installer
            spec.loader.exec_module(installer)
            installer.install_pi_extension(home, ROOT / "agent-workflows")
            controls = installer.pi_extension_path(home)
            skill = home / ".agents/skills/chanks-2-planificador-granular/SKILL.md"
            skill.parent.mkdir(parents=True)
            skill.write_text("# fixture\n")
            # Startup uses normal extension discovery, never -ne. RPC get_state proves a
            # fresh process reached a live session without contacting a model provider.
            main = temp / "main"
            main.mkdir()
            run(["git", "init", "-q", str(main)])
            run(["git", "config", "user.name", "Test"], cwd=main)
            run(["git", "config", "user.email", "test@example.invalid"], cwd=main)
            (main / "target.txt").write_text("fixture\n")
            (main / "openspec").mkdir()
            (main / "openspec/plan.yaml").write_text("sesiones: []\n")
            run(["git", "add", "target.txt", "openspec/plan.yaml"], cwd=main)
            run(["git", "commit", "-qm", "base"], cwd=main)
            repo = temp / "repo"
            run(["git", "worktree", "add", "-qb", "worker", str(repo)], cwd=main)
            switch = main / ".git/chanks/controls/switch.json"
            switch.parent.mkdir(parents=True)
            switch.write_text('{"on":true}')
            env = {**os.environ, "HOME": str(home), "PI_CODING_AGENT_DIR": str(agent),
                   "XDG_CONFIG_HOME": str(temp / "xdg"), "BUN_RUNTIME_TRANSPILER_CACHE_PATH": "0"}
            cli = pi / "packages/coding-agent/src/bun/cli.ts"
            proc = subprocess.Popen(["bun", "--conditions=source", str(cli), "--mode", "rpc", "--no-session"],
                                    cwd=repo, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, text=True)
            try:
                output, error = proc.communicate('{"id":"start","type":"get_state"}\n', timeout=25)
            except subprocess.TimeoutExpired:
                proc.kill()
                output, error = proc.communicate()
                self.fail(f"normal Pi startup timed out: {error[-2000:]}")
            self.assertEqual(proc.returncode, 0, error[-2000:])
            self.assertTrue(any(record.get("id") == "start" and record.get("success") is True
                                for line in output.splitlines() if (record := json.loads(line))))
            probe = pi / "packages/coding-agent/test/issue151-probe.ts"
            probe.write_text(PROBE)
            result = run(["bun", "--conditions=source", str(probe), str(quiet), str(controls), str(skill)], cwd=repo, env=env)
            self.assertEqual(json.loads(result.stdout.splitlines()[-1])["owner"], str(quiet))
        self.assertEqual({p: hashlib.sha256(p.read_bytes()).hexdigest() for p in before}, before)


class PinnedDependencyGateTests(unittest.TestCase):
    """The compatibility gate is driven only by the pinned manifests and the live install."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.tree = Path(self.temp.name) / "pi"
        self.modules = Path(self.temp.name) / "node_modules"
        self.modules.mkdir(parents=True)

    def manifest(self, relative, data):
        path = self.tree / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data))

    def installed(self, name):
        path = self.modules / name
        path.mkdir(parents=True)
        (path / "package.json").write_text("{}")

    def test_missing_external_dependency_is_reported(self):
        self.manifest("package.json", {"name": "pi-monorepo", "private": True,
                                       "workspaces": ["packages/*"],
                                       "dependencies": {"present": "1.0.0", "absent": "2.0.0"}})
        self.manifest("packages/coding-agent/package.json",
                      {"name": "@earendil-works/pi-coding-agent",
                       "dependencies": {"@earendil-works/pi-ai": "1.0.0"}})
        self.manifest("packages/ai/package.json", {"name": "@earendil-works/pi-ai"})
        self.installed("present")
        self.assertEqual(pinned_missing_packages(self.tree, self.modules), ["absent"])

    def test_compatible_dependency_set_reports_nothing(self):
        self.manifest("package.json", {"name": "pi-monorepo", "private": True,
                                       "workspaces": ["packages/*"],
                                       "dependencies": {"present": "1.0.0"}})
        self.manifest("packages/tui/package.json",
                      {"name": "@earendil-works/pi-tui",
                       "optionalDependencies": {"optional-present": "1.0.0"}})
        self.installed("present")
        self.installed("optional-present")
        self.assertEqual(pinned_missing_packages(self.tree, self.modules), [])

    def test_missing_optional_dependency_is_reported(self):
        self.manifest("package.json", {"name": "pi-monorepo", "private": True,
                                       "workspaces": ["packages/*"]})
        self.manifest("packages/tui/package.json",
                      {"name": "@earendil-works/pi-tui",
                       "optionalDependencies": {"optional-absent": "1.0.0"}})
        self.assertEqual(pinned_missing_packages(self.tree, self.modules), ["optional-absent"])

    def test_missing_scoped_dependency_is_reported(self):
        self.manifest("package.json", {"name": "pi-monorepo", "private": True,
                                       "workspaces": ["packages/*"],
                                       "dependencies": {"@aws-sdk/client-bedrock-runtime": "3.1127.0"}})
        self.assertEqual(pinned_missing_packages(self.tree, self.modules),
                         ["@aws-sdk/client-bedrock-runtime"])

    def test_workspace_packages_are_ignored(self):
        self.manifest("package.json", {"name": "pi-monorepo", "private": True,
                                       "workspaces": ["packages/*",
                                                      "packages/coding-agent/examples/extensions/fixture"],
                                       "dependencies": {"@earendil-works/pi-tui": "1.0.0",
                                                        "@earendil-works/fixture-extension": "1.0.0"}})
        self.manifest("packages/tui/package.json", {"name": "@earendil-works/pi-tui"})
        self.manifest("packages/coding-agent/examples/extensions/fixture/package.json",
                      {"name": "@earendil-works/fixture-extension"})
        self.assertEqual(pinned_missing_packages(self.tree, self.modules), [])


if __name__ == "__main__":
    unittest.main()

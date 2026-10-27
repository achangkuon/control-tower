import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/carril"


class CarrilTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.base = Path(self.tempdir.name)
        self.home = self.base / "home"
        (self.home / ".pi/agent").mkdir(parents=True)
        self.limpio = self.home / ".pi/agent-limpio"
        self.record = self.base / "pi-invocation.txt"
        self.install_log = self.base / "pi-installs.txt"
        self.npm_command_log = self.base / "npm-commands.txt"
        self.fake_pi = self.base / "fake-pi"
        self.fake_pi.write_text(
            "#!/usr/bin/env python3\n"
            "import json, os, pathlib, subprocess, sys\n"
            f"record = pathlib.Path({str(self.record)!r})\n"
            f"install_log = pathlib.Path({str(self.install_log)!r})\n"
            f"npm_command_log = pathlib.Path({str(self.npm_command_log)!r})\n"
            "if sys.argv[1:2] == ['install']:\n"
            "    if os.environ.get('FAKE_PI_FAIL'):\n"
            "        raise SystemExit(1)\n"
            "    lane = pathlib.Path(os.environ['PI_CODING_AGENT_DIR'])\n"
            "    settings = json.loads((lane / 'settings.json').read_text())\n"
            "    npm_command = settings.get('npmCommand')\n"
            "    with install_log.open('a') as log:\n"
            "        log.write(f\"PI_CODING_AGENT_DIR={lane} ARGS={' '.join(sys.argv[1:])}\\n\")\n"
            "    with npm_command_log.open('a') as log:\n"
            "        log.write(json.dumps(npm_command) + '\\n')\n"
            "    spec = sys.argv[2]\n"
            "    package = 'gentle-pi' if 'gentle-pi' in spec else 'gentle-engram'\n"
            "    host_peer = '@earendil-works/pi-tui' if package == 'gentle-pi' else 'typebox'\n"
            "    package_dir = lane / 'npm/node_modules' / package\n"
            "    package_dir.mkdir(parents=True, exist_ok=True)\n"
            "    manifest = {\n"
            "        'name': package, 'pi': {},\n"
            "        'dependencies': {host_peer: '^1.0.0', 'kept-dependency': '^2.0.0'},\n"
            "    }\n"
            "    (package_dir / 'package.json').write_text(json.dumps(manifest))\n"
            "    subprocess.run([npm_command[0], '--repair', str(lane / 'npm')], check=True)\n"
            "    if os.environ.get('FAKE_PI_CLOBBER_MODELS'):\n"
            "        (lane / 'subagents.json').write_text('{\"clobbered\": true}')\n"
            "        gentle = pathlib.Path(os.environ['GENTLE_PI_CONFIG_HOME'])\n"
            "        gentle.mkdir(parents=True, exist_ok=True)\n"
            "        (gentle / 'models.json').write_text('{\"clobbered\": true}')\n"
            "    raise SystemExit(0)\n"
            "lines = [\n"
            "    f\"CARRIL={os.environ.get('CARRIL', '')}\",\n"
            "    f\"PI_CODING_AGENT_DIR={os.environ.get('PI_CODING_AGENT_DIR', '<unset>')}\",\n"
            "    f\"GENTLE_PI_CONFIG_HOME={os.environ.get('GENTLE_PI_CONFIG_HOME', '<unset>')}\",\n"
            "    f\"ARGS={' '.join(sys.argv[1:])}\",\n"
            "]\n"
            "record.write_text('\\n'.join(lines) + '\\n')\n"
        )
        self.fake_pi.chmod(0o755)
        self.machine_setup = self.make_machine_setup()

    def tearDown(self):
        self.tempdir.cleanup()

    def make_machine_setup(self):
        # The personal installer lives in machine-setup (S244); the candidate lane
        # loads it from there and points it at the candidate worktree for the
        # product pieces. The stand-in keeps the same lane contract.
        machine_setup = self.home / "machine-setup"
        tools = machine_setup / "tools"
        tools.mkdir(parents=True)
        (tools / "install.py").write_text(
            "from __future__ import annotations\n"
            "import importlib.util\n"
            "from dataclasses import dataclass\n"
            "from pathlib import Path\n"
            "@dataclass(frozen=True)\n"
            "class Plan:\n"
            "    name: str\n"
            "TORRE = Path('/')\n"
            "SKILLS = ('_shared', 'chanks-a', 'chanks-b')\n"
            "def set_torre_root(path):\n"
            "    global TORRE\n"
            "    TORRE = Path(path)\n"
            "    spec = importlib.util.spec_from_file_location('carril_candidate_roster', TORRE / 'tools/roster.py')\n"
            "    module = importlib.util.module_from_spec(spec)\n"
            "    spec.loader.exec_module(module)\n"
            "def ensure_product_constants():\n"
            "    pass\n"
            "def repo_root():\n"
            "    return Path(__file__).resolve().parents[1]\n"
            "def render_manual_blocks(root):\n"
            "    raise AssertionError('legacy contract must not be used by candidato')\n"
            "def desired_manual_content(path, replacements):\n"
            "    raise AssertionError('legacy contract must not be used by candidato')\n"
            "def render_personal_blocks(root):\n"
            "    return {b'<!-- chanks:doc-guard-rule -->': b'NEW-CHANKS',\n"
            "            b'<!-- chanks:main-freshness -->': b'FRESH'}\n"
            "def desired_personal_content(path, replacements):\n"
            "    content = path.read_bytes()\n"
            "    content = content.replace(b'OLD-CHANKS', b'NEW-CHANKS')\n"
            "    if b'FRESH' not in content:\n"
            "        content += b'\\n\\nFRESH'\n"
            "    return content\n"
            "def desired_pi_extension(root):\n"
            "    return ('// chanks from ' + str(root)).encode()\n"
            "def skill_source_root(root, name):\n"
            "    if name in ('chanks-a', 'chanks-b'):\n"
            "        return TORRE / 'skills' / name\n"
            "    return root / 'skills-personales' / name\n"
        )
        return machine_setup

    def run_carril(self, *args, env_extra=None):
        env = {
            "PATH": os.environ["PATH"],
            "HOME": str(self.home),
            "CARRIL_PI_BIN": str(self.fake_pi),
            "MACHINE_SETUP": str(self.machine_setup),
        }
        env.update(env_extra or {})
        return subprocess.run(
            ["bash", str(SCRIPT), *args],
            env=env,
            capture_output=True,
            text=True,
        )

    def invocation(self):
        return dict(
            line.split("=", 1) for line in self.record.read_text().splitlines()
        )

    def test_no_argument_outside_a_lane_reports_stable(self):
        result = self.run_carril()
        self.assertEqual(result.returncode, 0)
        self.assertIn("estable (sin carril)", result.stdout)
        self.assertFalse(self.record.exists())

    def test_no_argument_inside_a_lane_reports_that_lane(self):
        result = self.run_carril(env_extra={"CARRIL": "limpio"})
        self.assertEqual(result.returncode, 0)
        self.assertIn("limpio", result.stdout)

    def gentle_skills(self):
        return self.limpio / "npm/node_modules/gentle-pi/skills"

    def test_limpio_launches_pi_with_the_isolated_config_dir(self):
        self.gentle_skills().mkdir(parents=True)
        result = self.run_carril("limpio", "--no-session")
        self.assertEqual(result.returncode, 0, result.stderr)
        seen = self.invocation()
        self.assertEqual(seen["CARRIL"], "limpio")
        self.assertEqual(seen["PI_CODING_AGENT_DIR"], str(self.limpio))
        self.assertEqual(seen["GENTLE_PI_CONFIG_HOME"], str(self.limpio / "gentle-config"))
        self.assertEqual(
            seen["ARGS"],
            f"--name 🧪 LIMPIO --no-skills --skill {self.gentle_skills()} --no-session",
        )

    def test_a_caller_supplied_name_wins_over_the_lane_label(self):
        self.gentle_skills().mkdir(parents=True)
        self.run_carril("limpio", "--name", "tarea-1")
        self.assertNotIn("LIMPIO", self.invocation()["ARGS"])
        self.run_carril("estable", "-n", "tarea-1")
        self.assertNotIn("ESTABLE", self.invocation()["ARGS"])

    def test_limpio_refuses_when_gentle_pi_is_not_installed(self):
        self.limpio.mkdir(parents=True)
        result = self.run_carril("limpio")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("carril preparar limpio", result.stderr)
        self.assertFalse(self.record.exists())

    def test_limpio_refuses_when_the_lane_is_not_prepared(self):
        result = self.run_carril("limpio")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no está preparado", result.stderr)
        self.assertFalse(self.record.exists())

    def test_limpio_refuses_a_dir_that_resolves_to_the_stable_one(self):
        result = self.run_carril(
            "limpio",
            env_extra={"CARRIL_LIMPIO_DIR": str(self.home / ".pi/agent")},
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("estable", result.stderr)
        self.assertFalse(self.record.exists())

    def test_estable_launches_pi_without_an_agent_dir_override(self):
        result = self.run_carril(
            "estable",
            env_extra={"PI_CODING_AGENT_DIR": str(self.limpio), "CARRIL": "limpio"},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        seen = self.invocation()
        self.assertEqual(seen["CARRIL"], "estable")
        self.assertEqual(seen["PI_CODING_AGENT_DIR"], "<unset>")
        self.assertEqual(seen["GENTLE_PI_CONFIG_HOME"], "<unset>")
        self.assertEqual(seen["ARGS"], "--name 🏠 ESTABLE")

    def make_worktree(self, name="implementer-1"):
        worktree = self.home / "projects/control-tower/Worktrees" / name
        tools = worktree / "agent-workflows/tools"
        tools.mkdir(parents=True)
        for skill in ("_shared", "chanks-a", "chanks-b"):
            (worktree / "agent-workflows/skills" / skill).mkdir(parents=True)
        # A stand-in for the worktree's product roster (S244): the lane points the
        # machine-setup installer at this worktree for the product pieces.
        (tools / "roster.py").write_text(
            "SKILLS = ('_shared', 'chanks-a', 'chanks-b')\n"
            "CHANKS_SKILLS = ()\n"
            "SUPPORT_SKILLS = ()\n"
            "V2_DEFERRED_SKILLS = ()\n"
            "V3_DEFERRED_SKILLS = ()\n"
            "DEFERRED_SKILLS = ()\n"
            "DEFERRED_SOURCE_VERSIONS = {}\n"
            "V1_PENDING_SKILLS = ()\n"
            "TOWER_V1_SKILLS = ()\n"
            "STOP_MANAGING_SKILLS = ()\n"
            "RETIRED_SKILLS = ()\n"
            "RETIRED_SKILL_FILES = {}\n"
            "PERSONAL_SKILLS = ()\n"
        )
        return worktree

    def seed_candidate_stable(self):
        stable = self.seed_stable()
        for name in ("npm", "bin", "skills", "mcp-oauth", "agents", "chains", "extensions"):
            (stable / name).mkdir(exist_ok=True)
        (stable / "agents/sdd-research.md").write_text("agent")
        (stable / "chains/sdd-full.chain.md").write_text("chain")
        (stable / "extensions/chanks-controls.ts").write_text("// installed chanks")
        (stable / "extensions/herdr-agent-state.ts").write_text("// herdr")
        (stable / "models-store.json").write_text("{}")
        (stable / "trust.json").write_text("{}")
        (stable / "mcp-cache.json").write_text('{"tools": []}')
        return stable

    def candidate_dir(self, name="implementer-1"):
        return self.home / ".pi/agent-candidato" / name

    def test_candidato_requires_a_worktree(self):
        result = self.run_carril("candidato")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("worktree", result.stderr)
        self.assertFalse(self.record.exists())

    def test_candidato_refuses_an_unknown_worktree(self):
        self.seed_candidate_stable()
        result = self.run_carril("candidato", "fantasma")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no existe", result.stderr)
        self.assertFalse(self.record.exists())

    def test_candidato_refuses_a_dir_without_the_product_roster(self):
        self.seed_candidate_stable()
        (self.home / "projects/control-tower/Worktrees/vacio").mkdir(parents=True)
        result = self.run_carril("candidato", "vacio")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("roster.py", result.stderr)
        self.assertFalse(self.candidate_dir("vacio").exists())

    def test_candidato_launches_pi_with_the_worktree_pieces(self):
        stable = self.seed_candidate_stable()
        worktree = self.make_worktree()
        before = self.snapshot(stable)

        result = self.run_carril("candidato", "implementer-1", "--no-session")
        self.assertEqual(result.returncode, 0, result.stderr)

        lane = self.candidate_dir()
        root = worktree / "agent-workflows"
        seen = self.invocation()
        self.assertEqual(seen["CARRIL"], "candidato (implementer-1)")
        self.assertEqual(seen["PI_CODING_AGENT_DIR"], str(lane))
        self.assertEqual(seen["GENTLE_PI_CONFIG_HOME"], "<unset>")
        self.assertEqual(seen["ARGS"], "--name 🔬 CANDIDATO · implementer-1 --no-session")

        # `--skill` paths load after ~/.agents/skills and lose name collisions, so the
        # worktree skills ride as settings entries, which Pi ranks above auto-discovery.
        stable_settings = json.loads((stable / "settings.json").read_text())
        lane_settings = json.loads((lane / "settings.json").read_text())
        self.assertEqual(
            lane_settings.pop("skills"),
            stable_settings.pop("skills")
            + [f"{root}/skills/chanks-a", f"{root}/skills/chanks-b"],
        )
        self.assertEqual(lane_settings, stable_settings)

        # Shared by link: credentials and read-only machinery.
        for name in ("auth.json", "mcp-oauth", "npm", "bin", "skills"):
            self.assertTrue((lane / name).is_symlink(), name)
            self.assertEqual(os.path.realpath(lane / name), str(stable / name))
        # Copied, so a candidate that changes them leaves the stable ones alone.
        for name in ("models-store.json", "trust.json", "subagents.json", "mcp-cache.json",
                     "agents/sdd-research.md", "chains/sdd-full.chain.md"):
            self.assertFalse((lane / name).is_symlink(), name)
            self.assertEqual((lane / name).read_bytes(), (stable / name).read_bytes())
        # Rendered from the worktree under the personal block contract: the stable
        # file has no personal blocks, so the always-added one is appended and no
        # legacy block is demanded or written.
        self.assertEqual((lane / "APPEND_SYSTEM.md").read_text(), "personal rules\n\nFRESH")
        self.assertEqual(
            (lane / "extensions/chanks-controls.ts").read_text(),
            f"// chanks from {root}",
        )
        self.assertFalse((lane / "extensions/chanks-controls.ts").is_symlink())
        herdr = lane / "extensions/herdr-agent-state.ts"
        self.assertEqual(os.path.realpath(herdr), str(stable / "extensions/herdr-agent-state.ts"))

        self.assertEqual(before, self.snapshot(stable))

    def test_candidato_append_follows_the_personal_block_contract(self):
        """S230: an adopted machine whose APPEND_SYSTEM.md carries the personal chanks
        blocks but no legacy session-routing block must build the lane (the legacy
        contract is never demanded nor written)."""
        self.seed_candidate_stable()
        (self.home / ".pi/agent/APPEND_SYSTEM.md").write_text(
            "<!-- chanks:doc-guard-rule -->\nOLD-CHANKS\n<!-- /chanks:doc-guard-rule -->\n"
        )
        self.make_worktree()
        before = (self.home / ".pi/agent/APPEND_SYSTEM.md").read_bytes()

        result = self.run_carril("candidato", "implementer-1", "--no-session")
        self.assertEqual(result.returncode, 0, result.stderr)

        lane = self.candidate_dir()
        rendered = (lane / "APPEND_SYSTEM.md").read_text()
        self.assertIn("NEW-CHANKS", rendered)
        self.assertNotIn("OLD-CHANKS", rendered)
        self.assertIn("FRESH", rendered)
        self.assertNotIn("SESSION-SKILL-ARCHITECTURE", rendered)
        # The stable file is never touched by the lane build.
        self.assertEqual((self.home / ".pi/agent/APPEND_SYSTEM.md").read_bytes(), before)

    def test_candidato_does_not_launch_when_the_worktree_roster_is_broken(self):
        self.seed_candidate_stable()
        worktree = self.make_worktree()
        (worktree / "agent-workflows/tools/roster.py").write_text("raise SystemExit('roto')\n")
        result = self.run_carril("candidato", "implementer-1")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.record.exists())

    def test_candidato_accepts_a_worktree_path(self):
        self.seed_candidate_stable()
        worktree = self.make_worktree("en-ruta")
        result = self.run_carril("candidato", str(worktree))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.invocation()["PI_CODING_AGENT_DIR"], str(self.candidate_dir("en-ruta")))

    def test_candidato_relaunch_refreshes_from_the_worktree_and_keeps_sessions(self):
        stable = self.seed_candidate_stable()
        worktree = self.make_worktree()
        self.assertEqual(self.run_carril("candidato", "implementer-1").returncode, 0)
        sessions = self.candidate_dir() / "sessions"
        sessions.mkdir()
        (sessions / "s.jsonl").write_text("kept")

        (stable / "APPEND_SYSTEM.md").write_text("personal rules v2")
        (worktree / "agent-workflows/skills/chanks-a/new").mkdir()
        result = self.run_carril("candidato", "implementer-1")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(
            (self.candidate_dir() / "APPEND_SYSTEM.md").read_text().startswith("personal rules v2\n\nFRESH")
        )
        self.assertEqual((sessions / "s.jsonl").read_text(), "kept")

    def test_unknown_lane_prints_usage(self):
        result = self.run_carril("turbo")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Uso", result.stderr)

    def seed_stable(self):
        stable = self.home / ".pi/agent"
        (stable / "auth.json").write_text('{"token": "x"}')
        (stable / "APPEND_SYSTEM.md").write_text("personal rules")
        (stable / "settings.json").write_text(json.dumps({
            "defaultProvider": "openai-codex",
            "defaultModel": "gpt-5.6-sol",
            "defaultThinkingLevel": "high",
            "defaultProjectTrust": "always",
            "theme": "Gentle",
            "tuiMode": "fullscreen",
            "hideThinkingBlock": True,
            "followUpMode": "one-at-a-time",
            "steeringMode": "one-at-a-time",
            "npmCommand": ["/x/pi-npm-host-peers", "--", "npm"],
            "packages": [
                "npm:pi-intercom",
                {"source": "npm:gentle-pi@3.7.0", "skills": ["-skills/gentle-ai/SKILL.md"]},
                "npm:gentle-engram@0.1.12",
            ],
            "skills": ["-skills/synced/personal"],
        }))
        (stable / "subagents.json").write_bytes(
            b'{\n  "model_profiles": {"worker": {"model": "stable/pi", "effort": "high"}}\n}\n'
        )
        gentle_config = self.home / ".pi/gentle-ai"
        gentle_config.mkdir(parents=True, exist_ok=True)
        (gentle_config / "models.json").write_bytes(
            b'{\n  "worker": {"model": "stable/gentle", "thinking": "high"}\n}\n'
        )
        (stable / "bin").mkdir(exist_ok=True)
        wrapper = stable / "bin/pi-npm-host-peers"
        wrapper.write_text(
            "#!/usr/bin/env python3\n"
            "import json, pathlib, sys\n"
            "root = pathlib.Path(sys.argv[2])\n"
            "host = {'typebox', '@earendil-works/pi-tui'}\n"
            "for path in (root / 'node_modules').glob('*/package.json'):\n"
            "    manifest = json.loads(path.read_text())\n"
            "    dependencies = manifest.get('dependencies', {})\n"
            "    moved = [name for name in dependencies if name in host]\n"
            "    if not moved:\n"
            "        continue\n"
            "    peers = manifest.setdefault('peerDependencies', {})\n"
            "    for name in moved:\n"
            "        dependencies.pop(name)\n"
            "        peers[name] = '*'\n"
            "    path.write_text(json.dumps(manifest, indent=2) + '\\n')\n"
        )
        wrapper.chmod(0o755)
        return stable

    def snapshot(self, directory):
        return {
            p.relative_to(directory): p.read_bytes()
            for p in sorted(directory.rglob("*")) if p.is_file()
        }

    def test_preparar_builds_a_gentle_only_lane(self):
        stable = self.seed_stable()
        before = self.snapshot(stable)
        result = self.run_carril("preparar", "limpio")
        self.assertEqual(result.returncode, 0, result.stderr)

        auth = self.limpio / "auth.json"
        self.assertTrue(auth.is_symlink())
        self.assertEqual(os.path.realpath(auth), str(stable / "auth.json"))
        self.assertFalse((self.limpio / "APPEND_SYSTEM.md").exists())
        self.assertTrue((self.limpio / "gentle-config").is_dir())

        settings = json.loads((self.limpio / "settings.json").read_text())
        wrapper = self.limpio / "bin/pi-npm-host-peers"
        self.assertEqual(settings, {
            "defaultProvider": "openai-codex",
            "defaultModel": "gpt-5.6-sol",
            "defaultThinkingLevel": "high",
            "defaultProjectTrust": "always",
            "theme": "Gentle",
            "tuiMode": "fullscreen",
            "hideThinkingBlock": True,
            "followUpMode": "one-at-a-time",
            "steeringMode": "one-at-a-time",
            "npmCommand": [str(wrapper), "--", "npm"],
        })

        installs = [
            line.split("ARGS=", 1)[1]
            for line in self.install_log.read_text().splitlines()
        ]
        self.assertEqual(installs, [
            "install npm:gentle-pi@3.7.0",
            "install npm:gentle-engram@0.1.12",
        ])
        self.assertIn(f"PI_CODING_AGENT_DIR={self.limpio}", self.install_log.read_text())
        self.assertEqual(before, self.snapshot(stable))

    def test_preparar_copies_distinct_model_mappings_after_postinstall(self):
        stable = self.seed_stable()
        pi_models = stable / "subagents.json"
        gentle_models = self.home / ".pi/gentle-ai/models.json"

        result = self.run_carril(
            "preparar", "limpio", env_extra={"FAKE_PI_CLOBBER_MODELS": "1"}
        )
        self.assertEqual(result.returncode, 0, result.stderr)

        copied_pi = self.limpio / "subagents.json"
        copied_gentle = self.limpio / "gentle-config/models.json"
        self.assertFalse(copied_pi.is_symlink())
        self.assertFalse(copied_gentle.is_symlink())
        self.assertEqual(copied_pi.read_bytes(), pi_models.read_bytes())
        self.assertEqual(copied_gentle.read_bytes(), gentle_models.read_bytes())
        self.assertIn("effort", json.loads(copied_pi.read_text())["model_profiles"]["worker"])
        self.assertNotIn("thinking", json.loads(copied_pi.read_text())["model_profiles"]["worker"])
        self.assertIn("thinking", json.loads(copied_gentle.read_text())["worker"])
        self.assertNotIn("effort", json.loads(copied_gentle.read_text())["worker"])

    def test_preparar_copies_and_uses_lane_local_executable_wrapper(self):
        stable = self.seed_stable()
        source_wrapper = stable / "bin/pi-npm-host-peers"
        result = self.run_carril("preparar", "limpio")
        self.assertEqual(result.returncode, 0, result.stderr)

        wrapper = self.limpio / "bin/pi-npm-host-peers"
        self.assertFalse(wrapper.is_symlink())
        self.assertEqual(wrapper.read_bytes(), source_wrapper.read_bytes())
        self.assertTrue(os.access(wrapper, os.X_OK))
        expected_command = [str(wrapper), "--", "npm"]
        self.assertEqual(
            [json.loads(line) for line in self.npm_command_log.read_text().splitlines()],
            [expected_command, expected_command],
        )

        expected_peers = {
            "gentle-pi": "@earendil-works/pi-tui",
            "gentle-engram": "typebox",
        }
        for package, peer in expected_peers.items():
            manifest = json.loads(
                (self.limpio / "npm/node_modules" / package / "package.json").read_text()
            )
            self.assertNotIn(peer, manifest["dependencies"])
            self.assertEqual(manifest["peerDependencies"][peer], "*")
            self.assertEqual(manifest["dependencies"], {"kept-dependency": "^2.0.0"})

    def test_preparar_fails_closed_when_required_stable_file_is_missing(self):
        cases = (
            ("pi models", lambda stable: stable / "subagents.json"),
            ("gentle models", lambda stable: self.home / ".pi/gentle-ai/models.json"),
            ("npm wrapper", lambda stable: stable / "bin/pi-npm-host-peers"),
        )
        for label, select in cases:
            with self.subTest(label=label):
                stable = self.seed_stable()
                select(stable).unlink()
                result = self.run_carril("preparar", "limpio")
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.limpio.exists())
                self.assertFalse(self.install_log.exists())

    def test_preparar_fails_closed_when_stable_models_or_wrapper_are_invalid(self):
        cases = (
            ("pi models", lambda stable: (stable / "subagents.json").write_text("not json")),
            (
                "gentle models",
                lambda stable: (self.home / ".pi/gentle-ai/models.json").write_text("[]"),
            ),
            (
                "npm wrapper",
                lambda stable: (stable / "bin/pi-npm-host-peers").chmod(0o644),
            ),
        )
        for label, invalidate in cases:
            with self.subTest(label=label):
                stable = self.seed_stable()
                invalidate(stable)
                result = self.run_carril("preparar", "limpio")
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.limpio.exists())
                self.assertFalse(self.install_log.exists())

    def test_preparar_refuses_an_existing_lane(self):
        self.seed_stable()
        self.limpio.mkdir(parents=True)
        (self.limpio / "keep.txt").write_text("mine")
        result = self.run_carril("preparar", "limpio")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ya existe", result.stderr)
        self.assertEqual((self.limpio / "keep.txt").read_text(), "mine")

    def test_preparar_removes_the_half_built_lane_when_install_fails(self):
        self.seed_stable()
        result = self.run_carril(
            "preparar", "limpio", env_extra={"FAKE_PI_FAIL": "1"}
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.limpio.exists())

    def test_launching_never_writes_into_the_stable_dir(self):
        self.gentle_skills().mkdir(parents=True)
        before = sorted(p.name for p in (self.home / ".pi/agent").iterdir())
        self.run_carril("limpio")
        self.run_carril("estable")
        after = sorted(p.name for p in (self.home / ".pi/agent").iterdir())
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()

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
        self.fake_pi = self.base / "fake-pi"
        self.fake_pi.write_text(
            "#!/usr/bin/env bash\n"
            "if [ \"${1-}\" = install ]; then\n"
            "  [ -n \"${FAKE_PI_FAIL-}\" ] && exit 1\n"
            f"  echo \"PI_CODING_AGENT_DIR=$PI_CODING_AGENT_DIR ARGS=$*\" >> {self.install_log}\n"
            "  exit 0\n"
            "fi\n"
            f"{{ echo \"CARRIL=${{CARRIL-}}\"; "
            f"echo \"PI_CODING_AGENT_DIR=${{PI_CODING_AGENT_DIR-<unset>}}\"; "
            f"echo \"GENTLE_PI_CONFIG_HOME=${{GENTLE_PI_CONFIG_HOME-<unset>}}\"; "
            f"echo \"ARGS=$*\"; }} > {self.record}\n"
        )
        self.fake_pi.chmod(0o755)

    def tearDown(self):
        self.tempdir.cleanup()

    def run_carril(self, *args, env_extra=None):
        env = {
            "PATH": os.environ["PATH"],
            "HOME": str(self.home),
            "CARRIL_PI_BIN": str(self.fake_pi),
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
        # A stand-in for the worktree's installer: the lane must render through the
        # worktree's own functions, never through the installed copies.
        # The real installer declares dataclasses, which only load when the module is
        # registered before it executes; the stand-in keeps that property.
        (tools / "install.py").write_text(
            "from __future__ import annotations\n"
            "from dataclasses import dataclass\n"
            "@dataclass(frozen=True)\n"
            "class Plan:\n"
            "    name: str\n"
            "SKILLS = ('_shared', 'chanks-a', 'chanks-b')\n"
            "def render_manual_blocks(root):\n"
            "    return {b'block': str(root).encode()}\n"
            "def desired_manual_content(path, replacements):\n"
            "    return path.read_bytes() + b'|' + replacements[b'block']\n"
            "def desired_pi_extension(root):\n"
            "    return ('// chanks from ' + str(root)).encode()\n"
        )
        return worktree

    def seed_candidate_stable(self):
        stable = self.seed_stable()
        for name in ("npm", "bin", "skills", "mcp-oauth", "agents", "chains", "extensions"):
            (stable / name).mkdir()
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

    def test_candidato_refuses_a_dir_without_the_installer(self):
        self.seed_candidate_stable()
        (self.home / "projects/control-tower/Worktrees/vacio").mkdir(parents=True)
        result = self.run_carril("candidato", "vacio")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("install.py", result.stderr)
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
        for name in ("models-store.json", "trust.json", "mcp-cache.json",
                     "agents/sdd-research.md", "chains/sdd-full.chain.md"):
            self.assertFalse((lane / name).is_symlink(), name)
            self.assertEqual((lane / name).read_bytes(), (stable / name).read_bytes())
        # Rendered from the worktree.
        self.assertEqual(
            (lane / "APPEND_SYSTEM.md").read_text(),
            f"personal rules|{root}",
        )
        self.assertEqual(
            (lane / "extensions/chanks-controls.ts").read_text(),
            f"// chanks from {root}",
        )
        self.assertFalse((lane / "extensions/chanks-controls.ts").is_symlink())
        herdr = lane / "extensions/herdr-agent-state.ts"
        self.assertEqual(os.path.realpath(herdr), str(stable / "extensions/herdr-agent-state.ts"))

        self.assertEqual(before, self.snapshot(stable))

    def test_candidato_does_not_launch_when_the_worktree_installer_is_broken(self):
        self.seed_candidate_stable()
        worktree = self.make_worktree()
        (worktree / "agent-workflows/tools/install.py").write_text("raise SystemExit('roto')\n")
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
            (self.candidate_dir() / "APPEND_SYSTEM.md").read_text().startswith("personal rules v2|")
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

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

    def test_candidato_is_reserved_until_it_exists(self):
        result = self.run_carril("candidato")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("todavía no existe", result.stderr)
        self.assertFalse(self.record.exists())

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

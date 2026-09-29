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
        self.fake_pi = self.base / "fake-pi"
        self.fake_pi.write_text(
            "#!/usr/bin/env bash\n"
            f"{{ echo \"CARRIL=${{CARRIL-}}\"; "
            f"echo \"PI_CODING_AGENT_DIR=${{PI_CODING_AGENT_DIR-<unset>}}\"; "
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

    def test_limpio_launches_pi_with_the_isolated_config_dir(self):
        self.limpio.mkdir(parents=True)
        result = self.run_carril("limpio", "--no-session")
        self.assertEqual(result.returncode, 0, result.stderr)
        seen = self.invocation()
        self.assertEqual(seen["CARRIL"], "limpio")
        self.assertEqual(seen["PI_CODING_AGENT_DIR"], str(self.limpio))
        self.assertEqual(seen["ARGS"], "--no-session")

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

    def test_candidato_is_reserved_until_it_exists(self):
        result = self.run_carril("candidato")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("todavía no existe", result.stderr)
        self.assertFalse(self.record.exists())

    def test_unknown_lane_prints_usage(self):
        result = self.run_carril("turbo")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Uso", result.stderr)

    def test_launching_never_writes_into_the_stable_dir(self):
        self.limpio.mkdir(parents=True)
        before = sorted(p.name for p in (self.home / ".pi/agent").iterdir())
        self.run_carril("limpio")
        self.run_carril("estable")
        after = sorted(p.name for p in (self.home / ".pi/agent").iterdir())
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()

import json
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/carril-medir"


def session(path, cwd, events):
    """Write a Pi session file: a header line, then one line per event."""
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [{"type": "session", "timestamp": events[0][0], "cwd": str(cwd)}]
    for timestamp, message in events:
        lines.append({"type": "message", "timestamp": timestamp, "message": message})
    path.write_text("\n".join(json.dumps(line) for line in lines) + "\n")


def assistant(input_tokens, output_tokens, cost, tools=(), stop="toolUse"):
    return {
        "role": "assistant",
        "stopReason": stop,
        "content": [{"type": "toolCall", "name": name} for name in tools],
        "usage": {"input": input_tokens, "output": output_tokens, "cacheRead": 0,
                  "cost": {"total": cost}},
    }


def tool_result(error=False):
    return {"role": "toolResult", "isError": error, "content": []}


class CarrilMedirTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.base = Path(self.tempdir.name)
        self.worktree = self.base / "ab-t1-limpio"
        self.worktree.mkdir()
        self.main_dir = self.base / "sessions/limpio"
        self.agents_dir = self.base / "gentle-agents/sessions"

    def tearDown(self):
        self.tempdir.cleanup()

    def measure(self, *args):
        result = subprocess.run(
            ["python3", str(SCRIPT), "--json", *args],
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def seed(self):
        session(self.main_dir / "main.jsonl", self.worktree, [
            ("2026-09-28T10:00:00.000Z", {"role": "user", "content": []}),
            ("2026-09-28T10:00:05.000Z", assistant(15000, 100, 0.06, tools=("read", "bash"))),
            ("2026-09-28T10:00:06.000Z", tool_result()),
            ("2026-09-28T10:00:07.000Z", tool_result(error=True)),
            ("2026-09-28T10:02:00.000Z", assistant(16000, 300, 0.07, stop="stop")),
        ])
        # A subagent the run delegated to: same cwd, counted with the run.
        session(self.agents_dir / "sub.jsonl", self.worktree, [
            ("2026-09-28T10:00:30.000Z", {"role": "user", "content": []}),
            ("2026-09-28T10:01:00.000Z", assistant(5000, 50, 0.02, tools=("read",))),
            ("2026-09-28T10:03:00.000Z", assistant(5200, 60, 0.03, stop="stop")),
        ])
        # Someone else's work in another folder must not leak into the run.
        session(self.agents_dir / "other.jsonl", self.base / "elsewhere", [
            ("2026-09-28T10:00:00.000Z", assistant(99999, 999, 9.99, stop="stop")),
        ])

    def test_a_run_sums_its_main_session_and_its_subagents_only(self):
        self.seed()
        [run] = self.measure(
            f"limpio={self.worktree}", "--search", str(self.main_dir),
            "--search", str(self.agents_dir),
        )
        self.assertEqual(run["label"], "limpio")
        self.assertEqual(run["sessions"], 2)
        self.assertEqual(run["startup_input"], 15000)
        self.assertEqual(run["input"], 15000 + 16000 + 5000 + 5200)
        self.assertEqual(run["output"], 100 + 300 + 50 + 60)
        self.assertAlmostEqual(run["cost"], 0.18)
        self.assertEqual(run["turns"], 4)
        self.assertEqual(run["tool_calls"], 3)
        self.assertEqual(run["tool_errors"], 1)
        self.assertEqual(run["seconds"], 180)
        self.assertEqual(run["final_stop"], "stop")

    def test_a_run_without_sessions_is_reported_not_invented(self):
        [run] = self.measure(f"limpio={self.worktree}", "--search", str(self.main_dir))
        self.assertEqual(run["sessions"], 0)
        self.assertIsNone(run["cost"])

    def test_the_table_puts_lanes_side_by_side(self):
        self.seed()
        result = subprocess.run(
            ["python3", str(SCRIPT), f"limpio={self.worktree}",
             "--search", str(self.main_dir), "--search", str(self.agents_dir)],
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("| limpio |", result.stdout)
        self.assertIn("0.180", result.stdout)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""
Validator cross-check — independently verify the numbers a Validator manifest
claims, so the Judge (an LLM) cannot ratify another LLM's hallucinated metrics.

This is the "non-coder can't review code" safeguard. It does NOT trust the
manifest's claimed values; it re-runs the actual deterministic tools and
compares.

Usage:
    python3 crosscheck.py <manifest.json> [--tier N]

Exit codes:
    0 = all verifiable claims reconcile (or only warnings at tier < 2)
    2 = a claim MISMATCHED reality, or a required check could not be verified
        at tier >= 2 (fail-closed)

Verifies, best-effort, whatever the project supports:
    - tests actually pass (re-runs the suite; doesn't trust "passed")
    - gitleaks finds no secrets in the diff
    - line coverage matches a real coverage report, if one exists
"""

import json
import os
import re
import sys
import shutil
import subprocess


def sh(cmd, timeout=600):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except Exception as e:
        return 1, "", str(e)


def load_manifest(path):
    try:
        return json.load(open(path))
    except Exception as e:
        print(f"crosscheck: cannot read manifest {path}: {e}", file=sys.stderr)
        sys.exit(2)


def detect_test_cmd():
    if os.path.exists("package.json"):
        try:
            pkg = json.load(open("package.json"))
            if "test" in pkg.get("scripts", {}):
                return ["npm", "test", "--silent"]
        except Exception:
            pass
    if os.path.exists("pytest.ini") or os.path.exists("pyproject.toml") or os.path.isdir("tests"):
        if shutil.which("pytest"):
            return ["pytest", "-q"]
    return None


def find_coverage_pct():
    # vitest / jest: coverage/coverage-summary.json
    p = "coverage/coverage-summary.json"
    if os.path.exists(p):
        try:
            d = json.load(open(p))
            return float(d["total"]["lines"]["pct"])
        except Exception:
            return None
    # coverage.py: coverage.json
    if os.path.exists("coverage.json"):
        try:
            d = json.load(open("coverage.json"))
            return float(d["totals"]["percent_covered"])
        except Exception:
            return None
    return None


def main():
    if len(sys.argv) < 2:
        print("usage: crosscheck.py <manifest.json> [--tier N]", file=sys.stderr)
        sys.exit(2)
    manifest_path = sys.argv[1]
    tier = 0
    if "--tier" in sys.argv:
        try:
            tier = int(sys.argv[sys.argv.index("--tier") + 1])
        except Exception:
            tier = 0

    m = load_manifest(manifest_path)
    checks = m.get("checks", {})
    fail_closed = tier >= 2
    problems = []
    unverified = []
    verified = []

    # 1. tests actually pass
    claimed_failed = checks.get("tests", {}).get("failed", None)
    test_cmd = detect_test_cmd()
    if test_cmd:
        rc, out, err = sh(test_cmd)
        if rc != 0:
            problems.append(f"manifest implies tests pass but `{' '.join(test_cmd)}` exited {rc}")
        else:
            verified.append(f"tests actually pass (`{' '.join(test_cmd)}`)")
        if claimed_failed not in (None, 0) and rc == 0:
            problems.append(f"manifest claims {claimed_failed} failed tests but suite is green — inconsistent")
    else:
        unverified.append("no test command detected (package.json scripts.test / pytest)")

    # 2. gitleaks on staged diff
    if shutil.which("gitleaks"):
        rc, out, err = sh(["gitleaks", "detect", "--staged", "--no-banner"])
        claimed = checks.get("secrets_scan", {}).get("findings", None)
        if rc != 0:
            problems.append("gitleaks found secrets in the staged diff (manifest must be FAIL)")
        else:
            verified.append("gitleaks clean on staged diff")
            if claimed not in (None, 0):
                problems.append(f"manifest claims {claimed} secret findings but gitleaks is clean — inconsistent")
    else:
        unverified.append("gitleaks not installed")

    # 3. coverage reconciliation
    claimed_cov = checks.get("coverage", {}).get("line_pct", None)
    real_cov = find_coverage_pct()
    if claimed_cov is not None and real_cov is not None:
        if abs(float(claimed_cov) - real_cov) > 1.0:  # 1pp tolerance
            problems.append(f"coverage MISMATCH: manifest claims {claimed_cov}%, real report says {real_cov:.1f}%")
        else:
            verified.append(f"coverage reconciles (manifest {claimed_cov}% ≈ report {real_cov:.1f}%)")
    elif claimed_cov is not None and real_cov is None:
        unverified.append(f"manifest claims {claimed_cov}% coverage but no coverage report found to verify")

    # Report
    print("=== validator cross-check ===")
    for v in verified:
        print(f"  ✓ {v}")
    for u in unverified:
        print(f"  ? {u}")
    for p in problems:
        print(f"  ✗ {p}")

    if problems:
        print("\nCROSS-CHECK FAILED — manifest does not reconcile with reality.", file=sys.stderr)
        sys.exit(2)
    if unverified and fail_closed:
        print(f"\nCROSS-CHECK FAILED (tier {tier}, fail-closed) — required checks could not be verified.", file=sys.stderr)
        sys.exit(2)
    if unverified:
        print(f"\nCROSS-CHECK PASSED WITH GAPS (tier {tier}) — {len(unverified)} claim(s) unverified.")
        sys.exit(0)
    print("\nCROSS-CHECK PASSED — all verifiable claims reconcile.")
    sys.exit(0)


if __name__ == "__main__":
    main()

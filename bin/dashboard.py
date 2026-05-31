#!/usr/bin/env python3
"""
harness dashboard generator.

Reads a harness-managed project directory and emits a single self-contained
HTML file (all CSS + data inlined; no external dependencies) at
<project>/.harness/dashboard.html.

Designed to be robust against missing files: a freshly-bootstrapped project
has almost nothing, and that's a valid state to render.

Usage:
    python3 dashboard.py /path/to/project
    python3 dashboard.py            # defaults to $PWD
"""

import os
import re
import sys
import html
import subprocess
from datetime import datetime, timezone, timedelta

ISO = "%Y-%m-%dT%H:%M:%SZ"


def run(cmd, cwd):
    try:
        out = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=30
        )
        return out.stdout.strip()
    except Exception:
        return ""


def read(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return ""


def frontmatter(text):
    """Parse a simple --- yaml --- frontmatter block into a dict (string values only)."""
    fm = {}
    m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return fm
    for line in m.group(1).splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip()
    return fm


def project_config(proj):
    cfg = {}
    text = read(os.path.join(proj, "harness.config.yaml"))
    for line in text.splitlines():
        if ":" in line and not line.startswith(" "):
            k, _, v = line.partition(":")
            cfg[k.strip()] = v.strip()
    return cfg


def collect_features(proj):
    """One PRD = one feature. State from frontmatter, else PLANNED."""
    features = []
    prd_dir = os.path.join(proj, "spec", "prd")
    if not os.path.isdir(prd_dir):
        return features
    for fn in sorted(os.listdir(prd_dir)):
        if not fn.endswith(".md"):
            continue
        path = os.path.join(prd_dir, fn)
        fm = frontmatter(read(path))
        name = fm.get("feature_name", fn[:-3])
        state = fm.get("state", "PLANNED")
        # days since last git change to this PRD
        last = run(["git", "log", "-1", "--format=%cI", "--", f"spec/prd/{fn}"], proj)
        days = ""
        if last:
            try:
                dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                days = (datetime.now(timezone.utc) - dt).days
            except Exception:
                days = ""
        features.append(
            {"name": name, "state": state, "days": days, "tier": fm.get("tier", "")}
        )
    return features


def collect_requests(proj):
    open_states = {
        "RECEIVED", "CLARIFYING", "SCOPED", "PAIRED", "IN_FLIGHT",
        "READY_FOR_HUMAN_APPROVAL", "SHIPPED_BEHIND_FLAG", "ROLLING_OUT",
    }
    reqs = []
    rdir = os.path.join(proj, "client", "requests")
    if not os.path.isdir(rdir):
        return reqs
    for fn in sorted(os.listdir(rdir)):
        if not fn.startswith("REQ-") or not fn.endswith(".md"):
            continue
        fm = frontmatter(read(os.path.join(rdir, fn)))
        state = fm.get("state", "")
        if state in open_states:
            reqs.append({"id": fn[:-3], "state": state, "title": fm.get("title", "")})
    return reqs


def collect_errs(proj):
    text = read(os.path.join(proj, "learnings", "failures.md"))
    errs = []
    for m in re.finditer(r"^## (ERR-\d+)(.*)$", text, re.MULTILINE):
        errs.append(m.group(1))
    return errs


def collect_recent_activity(proj):
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    commits = run(["git", "log", f"--since={since}", "--oneline"], proj)
    n_commits = len([l for l in commits.splitlines() if l.strip()])
    return {"commits": n_commits, "since": since}


def collect_needs_eyes(proj):
    items = []
    # pending signed-deploy tokens
    sd = os.path.join(proj, "audit", "signed-deploys")
    if os.path.isdir(sd):
        tokens = [f for f in os.listdir(sd) if f.endswith(".token")]
        if tokens:
            items.append(f"{len(tokens)} signed-deploy token(s) generated — prod deploy may be pending")
    # proposed ADRs / DDRs
    for sub, label in [("arch/adr", "ADR"), ("design/decisions", "DDR")]:
        d = os.path.join(proj, sub)
        if os.path.isdir(d):
            cnt = 0
            for fn in os.listdir(d):
                if fn.endswith(".md") and "status: proposed" in read(os.path.join(d, fn)):
                    cnt += 1
            if cnt:
                items.append(f"{cnt} {label}(s) with status: proposed — awaiting your decision")
    # web-watcher proposals
    wp = os.path.join(proj, "watch", "proposed")
    if os.path.isdir(wp):
        props = sum(len(files) for _, _, files in os.walk(wp))
        if props:
            items.append(f"{props} Web Watcher proposal(s) in watch/proposed/ — review and merge or close")
    return items


def collect_anomalies(proj):
    anomalies = []
    # ERRs without a paired test on disk
    text = read(os.path.join(proj, "learnings", "failures.md"))
    for m in re.finditer(r"^## (ERR-\d+)", text, re.MULTILINE):
        err = m.group(1)
        block = text[m.start():m.start() + 800]
        tm = re.search(r"tests/\S+", block)
        if not tm:
            anomalies.append(f"{err} has no paired test path (R4 risk)")
        elif not os.path.exists(os.path.join(proj, tm.group(0))):
            anomalies.append(f"{err} paired test {tm.group(0)} missing on disk (R4 risk)")
    # stale requests (IN_FLIGHT > 30 days, by file mtime as a proxy)
    rdir = os.path.join(proj, "client", "requests")
    if os.path.isdir(rdir):
        for fn in os.listdir(rdir):
            if not fn.startswith("REQ-"):
                continue
            fm = frontmatter(read(os.path.join(rdir, fn)))
            if fm.get("state") == "IN_FLIGHT":
                last = run(["git", "log", "-1", "--format=%cI", "--", f"client/requests/{fn}"], proj)
                if last:
                    try:
                        dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                        d = (datetime.now(timezone.utc) - dt).days
                        if d > 30:
                            anomalies.append(f"{fn[:-3]} IN_FLIGHT for {d} days with no update")
                    except Exception:
                        pass
    return anomalies


def collect_integrity(proj):
    """Run harness verify if available; capture pass/fail."""
    results = {}
    harness_root = os.environ.get("HARNESS_ROOT", "")
    # phase0 tests if symlinked centrally
    central = os.path.join(proj, ".claude", "hooks-central")
    results["hooks_wired"] = os.path.exists(
        os.path.join(proj, ".claude", "settings.json")
    ) and '"hooks"' in read(os.path.join(proj, ".claude", "settings.json"))
    results["symlinks_ok"] = all(
        os.path.exists(os.path.join(proj, ".claude", s))
        for s in ["agents-central", "skills-central", "templates-central"]
    )
    return results


def badge(state):
    colors = {
        "PLANNED": "#6b7280", "MOCKED-UP": "#8b5cf6", "CODED": "#3b82f6",
        "ON STAGING": "#0ea5e9", "BEHIND FLAG": "#f59e0b",
        "ROLLING OUT": "#10b981", "GENERALLY AVAILABLE": "#22c55e",
    }
    c = colors.get(state, "#6b7280")
    return f'<span class="badge" style="background:{c}">{html.escape(state)}</span>'


def render_html(proj, data):
    now = datetime.now(timezone.utc).strftime(ISO)
    cfg = data["config"]
    proj_name = cfg.get("project", os.path.basename(proj.rstrip("/")))
    tier = cfg.get("tier", "?")

    rows = ""
    if data["features"]:
        for f in data["features"]:
            warn = ""
            if isinstance(f["days"], int) and f["days"] > 14 and f["state"] == "PLANNED":
                warn = ' <span class="warn">⚠ stalled</span>'
            rows += (
                f"<tr><td>{html.escape(f['name'])}</td>"
                f"<td>{badge(f['state'])}</td>"
                f"<td>{f['days']}{warn}</td>"
                f"<td>{html.escape(str(f['tier']))}</td></tr>"
            )
    else:
        rows = '<tr><td colspan="4" class="muted">No PRDs yet — no features in flight.</td></tr>'

    def li(items, empty):
        if not items:
            return f'<li class="muted">{empty}</li>'
        return "".join(f"<li>{html.escape(i)}</li>" for i in items)

    needs = li(data["needs_eyes"], "Nothing needs your eyes right now.")
    anomalies = li(data["anomalies"], "No anomalies detected.")

    integ = data["integrity"]
    integ_rows = (
        f'<li>{"✅" if integ.get("hooks_wired") else "❌"} Claude Code hooks wired in settings.json</li>'
        f'<li>{"✅" if integ.get("symlinks_ok") else "❌"} Central agents/skills/templates symlinks present</li>'
    )

    reqs = data["requests"]
    req_summary = (
        f"{len(reqs)} open"
        if reqs
        else "0 open"
    )

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harness Dashboard — {html.escape(proj_name)}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         margin: 0; background: #0f1115; color: #e6e8eb; }}
  .wrap {{ max-width: 920px; margin: 0 auto; padding: 32px 20px 80px; }}
  h1 {{ font-size: 22px; margin: 0 0 4px; }}
  .sub {{ color: #9aa0a6; font-size: 13px; margin-bottom: 28px; }}
  .card {{ background: #171a21; border: 1px solid #242833; border-radius: 12px;
          padding: 18px 20px; margin-bottom: 18px; }}
  .card h2 {{ font-size: 14px; text-transform: uppercase; letter-spacing: .05em;
             color: #9aa0a6; margin: 0 0 14px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
  th, td {{ text-align: left; padding: 8px 6px; border-bottom: 1px solid #242833; }}
  th {{ color: #9aa0a6; font-weight: 500; font-size: 12px; text-transform: uppercase; }}
  .badge {{ color: #0b0d11; font-size: 11px; font-weight: 700; padding: 2px 8px;
           border-radius: 999px; white-space: nowrap; }}
  ul {{ margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.7; }}
  .muted {{ color: #6b7280; }}
  .warn {{ color: #f59e0b; font-weight: 600; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }}
  .stat {{ font-size: 28px; font-weight: 700; }}
  .stat-label {{ color: #9aa0a6; font-size: 12px; }}
  @media (max-width: 640px) {{ .grid {{ grid-template-columns: 1fr; }} }}
</style></head>
<body><div class="wrap">
  <h1>Harness Dashboard — {html.escape(proj_name)}</h1>
  <div class="sub">Tier T{html.escape(str(tier))} · generated {now} · <span class="muted">not committed (.harness/ is gitignored)</span></div>

  <div class="card">
    <h2>Active features</h2>
    <table><thead><tr><th>Feature</th><th>State</th><th>Days in state</th><th>Tier</th></tr></thead>
    <tbody>{rows}</tbody></table>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Last 7 days</h2>
      <div class="stat">{data['activity']['commits']}</div>
      <div class="stat-label">commits since {data['activity']['since']}</div>
      <div style="margin-top:14px"><span class="stat">{req_summary}</span>
        <div class="stat-label">client requests</div></div>
      <div style="margin-top:14px"><span class="stat">{len(data['errs'])}</span>
        <div class="stat-label">ERR entries (open + resolved)</div></div>
    </div>
    <div class="card">
      <h2>Harness integrity</h2>
      <ul>{integ_rows}</ul>
    </div>
  </div>

  <div class="card">
    <h2>Needs your eyes</h2>
    <ul>{needs}</ul>
  </div>

  <div class="card">
    <h2>Anomalies</h2>
    <ul>{anomalies}</ul>
  </div>

  <div class="sub">Run <code>harness dashboard</code> to refresh · open this file in a browser if it doesn't render in-window.</div>
</div></body></html>"""


def main():
    proj = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    proj = os.path.abspath(proj)

    if not os.path.exists(os.path.join(proj, ".harness-version")):
        print(f"dashboard: {proj} is not a harness-managed project (.harness-version missing).", file=sys.stderr)
        sys.exit(2)

    data = {
        "config": project_config(proj),
        "features": collect_features(proj),
        "requests": collect_requests(proj),
        "errs": collect_errs(proj),
        "activity": collect_recent_activity(proj),
        "needs_eyes": collect_needs_eyes(proj),
        "anomalies": collect_anomalies(proj),
        "integrity": collect_integrity(proj),
    }

    out_dir = os.path.join(proj, ".harness")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "dashboard.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(render_html(proj, data))

    # Ensure .harness/ is gitignored
    gi = os.path.join(proj, ".gitignore")
    existing = read(gi)
    if ".harness/" not in existing:
        with open(gi, "a", encoding="utf-8") as f:
            f.write("\n# Harness local dashboard (not version-controlled)\n.harness/\n")

    print(f"dashboard: wrote {out_path}")
    print(f"dashboard: open it in a browser, or in the Claude Code file viewer if it renders HTML.")


if __name__ == "__main__":
    main()

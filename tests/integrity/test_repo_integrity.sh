#!/usr/bin/env bash
# tests/integrity/test_repo_integrity.sh
# Catches the bugs that the Phase-1–8 review surfaced:
#   1. hooks referenced by tier presets but missing on disk
#   2. templates referenced by agent prompts but missing on disk
#   3. constitution/settings.json missing its 'hooks' block
#   4. constitution/CLAUDE.md and AGENTS.md drifting apart
#   5. hook scripts that aren't executable or have shell syntax errors
#   6. all YAML files parse
#   7. dead symlinks
#
# Run: bash tests/integrity/test_repo_integrity.sh
# Exit 0 = PASS; non-zero = FAIL (first failure causes exit).

set -uo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }
note() { echo "  • $1"; }

echo "=== harness integrity ==="

# 1. hooks referenced by tier presets exist on disk
echo "Check 1: tier-preset hook references resolve"
referenced=$(grep -hE '^\s*- [a-z]+/' tier-presets/*.yaml | sed 's|^\s*- ||' | sort -u)
on_disk=$(find hooks -name '*.sh' | sed 's|hooks/||' | sort -u)
missing=$(comm -23 <(echo "$referenced") <(echo "$on_disk"))
if [ -n "$missing" ]; then
  echo "$missing" | while read m; do note "missing: hooks/$m"; done
  fail "tier presets reference hooks that don't exist on disk"
fi
note "OK ($(echo "$referenced" | wc -l | tr -d ' ') hooks referenced, all present)"

# 2. templates referenced by agent prompts exist on disk
echo "Check 2: agent template references resolve"
ref_t=$(grep -rhE 'templates/[a-z-]+\.(md|yaml|feature)' agents/ 2>/dev/null | grep -oE 'templates/[a-z-]+\.(md|yaml|feature)' | sort -u)
disk_t=$(ls templates/ 2>/dev/null | sed 's|^|templates/|' | sort -u)
missing_t=$(comm -23 <(echo "$ref_t") <(echo "$disk_t"))
if [ -n "$missing_t" ]; then
  echo "$missing_t" | while read m; do note "missing: $m"; done
  fail "agents reference templates that don't exist on disk"
fi
note "OK ($(echo "$ref_t" | wc -l | tr -d ' ') templates referenced, all present)"

# 3. settings.json has both 'permissions' and 'hooks' blocks
echo "Check 3: constitution/settings.json has hooks block"
python3 -c "
import json, sys
d = json.load(open('constitution/settings.json'))
assert 'permissions' in d, 'missing permissions block'
assert 'hooks' in d, 'missing hooks block — Phase 1+ hooks are silently disabled'
assert len(d['hooks']) > 0, 'hooks block is empty'
" || fail "settings.json malformed or missing required blocks"
note "OK"

# 4. CLAUDE.md and AGENTS.md identical
echo "Check 4: constitution/CLAUDE.md and AGENTS.md in sync"
if ! diff -q constitution/CLAUDE.md constitution/AGENTS.md >/dev/null; then
  fail "CLAUDE.md and AGENTS.md have drifted apart"
fi
note "OK"

# 5. all hook scripts executable + valid shell
echo "Check 5: hook scripts are executable and syntactically valid"
errs=0
while IFS= read -r f; do
  if [ ! -x "$f" ]; then note "not executable: $f"; errs=$((errs+1)); fi
  if ! bash -n "$f" 2>/dev/null; then note "syntax error: $f"; errs=$((errs+1)); fi
done < <(find hooks -name '*.sh')
[ "$errs" -gt 0 ] && fail "$errs hook scripts have problems"
note "OK ($(find hooks -name '*.sh' | wc -l | tr -d ' ') scripts checked)"

# 6. all YAML files parse
echo "Check 6: YAML files parse"
yaml_errs=0
while IFS= read -r f; do
  if ! python3 -c "import yaml; yaml.safe_load(open('$f'))" 2>/dev/null; then
    note "YAML invalid: $f"; yaml_errs=$((yaml_errs+1))
  fi
done < <(find . -name '*.yaml' -not -path './.git/*')
[ "$yaml_errs" -gt 0 ] && fail "$yaml_errs YAML files invalid"
note "OK ($(find . -name '*.yaml' -not -path './.git/*' | wc -l | tr -d ' ') YAMLs parsed)"

# 7. dead symlinks
echo "Check 7: no dead symlinks"
dead=$(find . -xtype l -not -path './.git/*' 2>/dev/null)
if [ -n "$dead" ]; then
  echo "$dead" | while read d; do note "dead symlink: $d"; done
  fail "dead symlinks present"
fi
note "OK"

# 8. propagate.sh references valid paths
echo "Check 8: propagate.sh executable and lints"
[ -x propagate.sh ] || fail "propagate.sh not executable"
bash -n propagate.sh || fail "propagate.sh has syntax errors"
note "OK"

# 9. CLI executable and lints
echo "Check 9: bin/harness executable and lints"
[ -x bin/harness ] || fail "bin/harness not executable"
bash -n bin/harness || fail "bin/harness has syntax errors"
note "OK"

# 10. agent files have name+description+model frontmatter
echo "Check 10: agent frontmatter completeness"
missing_fm=0
while IFS= read -r f; do
  for key in name description model; do
    if ! head -10 "$f" | grep -q "^$key:"; then
      note "$f missing frontmatter key: $key"
      missing_fm=$((missing_fm+1))
    fi
  done
done < <(find agents -name '*.md')
[ "$missing_fm" -gt 0 ] && fail "$missing_fm agent frontmatter keys missing"
note "OK ($(find agents -name '*.md' | wc -l | tr -d ' ') agents checked)"

# 11. TEST-FLOW.md and test categories consistent
echo "Check 11: test taxonomy is consistent across constitution, presets, init, doc"
declare -a categories=(unit integration contract e2e property mutation perf security regression a11y i18n migration synthetic compliance)
[ -f docs/TEST-FLOW.md ] || fail "docs/TEST-FLOW.md missing"
[ -f constitution/CLAUDE.md ] || fail "constitution/CLAUDE.md missing"
for cat in "${categories[@]}"; do
  grep -q "tests/${cat}" bin/harness        || fail "bin/harness init missing tests/${cat}"
  grep -q "tests/${cat}" constitution/CLAUDE.md || fail "constitution/CLAUDE.md doesn't list tests/${cat}"
  grep -q "tests/${cat}" docs/TEST-FLOW.md  || fail "docs/TEST-FLOW.md doesn't list tests/${cat}"
done
note "OK (${#categories[@]} test categories consistent)"

echo
echo "PASS — all integrity checks succeeded."
exit 0

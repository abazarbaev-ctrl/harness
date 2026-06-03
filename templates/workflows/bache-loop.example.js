// bache-loop.example.js
//
// ILLUSTRATIVE example of a Dynamic Workflow that codifies the Bache TDD loop
// from skills/tdd-red-green-refactor.md and the engineering harness:
//
//     Test-Writer (fresh) -> Builder -> Validator (fresh) -> Judge -> Promoter
//
// Status: NOT a production workflow. This is a reference template showing the
// SHAPE we'd want when/if PAT-0008 graduates. The actual subagent-spawn API
// is determined by Claude Code's workflow runtime — when you author the real
// workflow via `ultracode`, Claude will use the runtime's actual primitives.
//
// What this preserves vs. the agent-prompt version of the loop:
//   - Step ORDERING is now in code, not prose. The Builder cannot run before
//     Test-Writer reports tests_red. The Judge cannot run before Validator
//     emits a manifest. The Promoter cannot run before Judge ACCEPTs.
//   - The Test-Writer / Validator FRESH CONTEXT boundary is preserved by
//     spawning each as a separate subagent with no inherited transcript.
//   - The four human gates (PRD, architecture, phase plan, prod deploy) STILL
//     bind: this workflow assumes PRD/arch/phase-plan are already human-
//     approved and ENDS at the Promoter's "ready to deploy" surface. Prod
//     deploy is a separate human-gated invocation.
//
// Inputs (via the workflow's `args` global):
//   args.feature        — the feature_name (must match spec/prd/<feature>.md)
//   args.refs_err       — optional ERR-XXXX id; if set, R4 regression-pair
//                         discipline is enforced (Test-Writer's first test
//                         must reference this ERR id).
//
// Output: a final report block summarizing the loop's outcome, plus a state
// transition to ON STAGING (per the seven-state taxonomy, R3) if Promoter
// staging deploy succeeded.

// ----------------------------------------------------------------------------
// Pseudo-API used below — replace with Claude Code's actual workflow runtime
// primitives when you generate the real workflow with `ultracode`. The shape
// here is intentional: each `spawn(...)` is a fresh-context subagent call.
// ----------------------------------------------------------------------------
//   spawn(agentName, { prompt, allowedTools, freshContext, timeout }) -> Promise<result>
//   result.structured_output  — JSON the agent emitted at the end
//   result.tool_calls         — record for the dashboard / audit
//   result.tokens_used        — for budget tracking (PAT-0001 if promoted)

async function main(args) {
  if (!args || !args.feature) {
    throw new Error("bache-loop: args.feature is required");
  }
  const feature = args.feature;
  const refsErr = args.refs_err || null;

  const prdPath = `spec/prd/${feature}.md`;
  const scenariosPath = `spec/scenarios/${feature}.feature`;

  // -------------------------------------------------------------------------
  // 1. Test-Writer: fresh context, spec-only. Produces RED tests.
  // -------------------------------------------------------------------------
  const testWriter = await spawn("test-writer", {
    prompt: [
      `Read ${prdPath} and ${scenariosPath}. Produce RED tests under tests/`,
      `for every acceptance criterion. Do NOT read src/.`,
      refsErr ? `R4: the regression test for ${refsErr} MUST reference '${refsErr}' in its name.` : null,
      `Return structured_output: { test_files, tests_written, tests_failing_as_expected }.`,
    ].filter(Boolean).join("\n"),
    freshContext: true,
    timeout: 600,
  });

  if (testWriter.structured_output.tests_failing_as_expected !==
      testWriter.structured_output.tests_written) {
    return reportFailure("test-writer", "not all tests RED as expected", testWriter);
  }

  // -------------------------------------------------------------------------
  // 2. Builder: full context (tests + src). Makes tests green.
  //    Hard rule from agents/eng/builder.md: never modifies tests/.
  // -------------------------------------------------------------------------
  const builder = await spawn("builder", {
    prompt: [
      `Tests are RED at ${testWriter.structured_output.test_files.join(", ")}.`,
      `Implement under src/ until those tests pass and the FULL suite is green.`,
      `Do NOT modify any file under tests/. Do NOT add TODO/FIXME/HACK comments.`,
      refsErr ? `R4: include 'Refs-ERR:${refsErr}' in your commit message.` : null,
      `Return structured_output: { files_modified, tests_passing, tests_still_red }.`,
    ].filter(Boolean).join("\n"),
    timeout: 1800,
  });

  if (builder.structured_output.tests_still_red > 0) {
    return reportFailure("builder", "tests still RED after 3 attempts cap", builder);
  }

  // -------------------------------------------------------------------------
  // 3. Validator: fresh context. Adversarial. Tier-scoped suite.
  // -------------------------------------------------------------------------
  const validator = await spawn("validator", {
    prompt: [
      `Builder reports green. Attack the artifact. Run the tier-scoped`,
      `validation suite per .claude/tier.yaml. Emit the structured manifest`,
      `to .harness/validator-manifest.json so the cross-check hook + Judge`,
      `can read it. Be honest about any adversarial finding.`,
    ].join("\n"),
    freshContext: true,
    timeout: 1800,
  });

  // -------------------------------------------------------------------------
  // 4. Judge: Haiku-class, reads ONLY the manifest. Ratifies on numbers.
  // -------------------------------------------------------------------------
  const judge = await spawn("judge", {
    prompt: [
      `Read .harness/validator-manifest.json. Apply the tier decision logic`,
      `from agents/eng/judge.md. Return { decision: ACCEPT|REJECT, reason }.`,
      `Do NOT read source code, tests, or other agents' outputs.`,
    ].join("\n"),
    allowedTools: ["Read"],
    freshContext: true,
    timeout: 120,
  });

  if (judge.structured_output.decision !== "ACCEPT") {
    return reportFailure("judge", judge.structured_output.reason, judge);
  }

  // -------------------------------------------------------------------------
  // 5. Promoter: runs to STAGING. Prod deploy is human-gated (Exception #2).
  // -------------------------------------------------------------------------
  const promoter = await spawn("promoter", {
    prompt: [
      `Judge ACCEPTed the manifest. Take the artifact from CODED to ON STAGING.`,
      `Run R4 pairing audit (bash hooks/prepush/r4-err-pairing.sh origin/main).`,
      `Trigger the signed-token CI workflow that deploys to staging.`,
      `Do NOT deploy to production — that is Exception #2 (human-gated).`,
      `Emit an ACTION REQUIRED at the end naming the prod deploy as needing`,
      `the operator's signed token.`,
    ].join("\n"),
    timeout: 600,
  });

  return {
    feature,
    final_state: "ON STAGING",
    refs_err: refsErr,
    test_writer: testWriter.structured_output,
    builder: builder.structured_output,
    validator_manifest: ".harness/validator-manifest.json",
    judge: judge.structured_output,
    promoter: promoter.structured_output,
    next_action: "human approves prod deploy (Exception #2) via 'harness sign-deploy'",
  };
}

function reportFailure(stage, reason, agent) {
  return {
    final_state: "BLOCKED",
    blocked_at: stage,
    reason,
    agent_output: agent.structured_output,
    next_action: `route back to ${stage}; do NOT proceed to subsequent stages`,
  };
}

// Entry point. The runtime invokes main(args) with the workflow's `args`.
return main(args);

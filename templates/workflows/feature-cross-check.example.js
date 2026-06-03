// feature-cross-check.example.js
//
// ILLUSTRATIVE example of a Dynamic Workflow that codifies the
// /deep-research-style claim-cross-check pattern, applied to acceptance
// criteria verification for a single feature.
//
// Status: NOT a production workflow. Reference template only — the actual
// subagent-spawn API is determined by Claude Code's workflow runtime.
//
// Pattern: for each acceptance criterion in a PRD, spawn N independent
// "claim checkers" with DIFFERENT framings (does the code do X? does the
// test prove X? does the behavior happen at runtime?). Cross-check the
// claims against each other. Vote. Report only claims with N-of-M agreement.
//
// This complements bin/crosscheck.py (which verifies DETERMINISTIC tool
// outputs the Validator claimed) by adding an INTERPRETIVE cross-check on
// claims that don't reduce to a number.
//
// Inputs (via args):
//   args.feature  — feature_name; must have spec/prd/<feature>.md
//   args.angles   — optional list of framings; defaults to 3 standard angles
//
// Output: a report listing each AC with the independent verdicts and the
// consensus. ACs without consensus are flagged for human review.

async function main(args) {
  if (!args || !args.feature) {
    throw new Error("feature-cross-check: args.feature is required");
  }
  const feature = args.feature;
  const prdPath = `spec/prd/${feature}.md`;

  // Default angles — diverse framings to break correlated LLM errors.
  const angles = args.angles || [
    {
      name: "static-code-review",
      framing: "Read only the src/ implementation. For each AC, point to the line(s) that implement it. If you can't find an implementation, the AC is FAIL.",
    },
    {
      name: "test-suite-review",
      framing: "Read only tests/. For each AC, point to the test that asserts it. If the test doesn't exist or doesn't actually assert the AC's behavior, the AC is FAIL.",
    },
    {
      name: "runtime-behavior-review",
      framing: "Drive the running app (Browser Operator). For each AC, exercise the user flow and observe whether the behavior matches. FAIL if it doesn't.",
    },
  ];

  // -------------------------------------------------------------------------
  // Step 1: parse the PRD's acceptance criteria into a list.
  // -------------------------------------------------------------------------
  const acExtractor = await spawn("researcher", {
    prompt: [
      `Read ${prdPath}. Extract the acceptance criteria as a JSON array:`,
      `[{ id: "AC1", description: "..." }, ...]`,
      `Use only the section under '## 4. Acceptance criteria' (or the closest`,
      `equivalent). Do NOT interpret or restate — verbatim from the PRD.`,
    ].join("\n"),
    allowedTools: ["Read"],
    freshContext: true,
    timeout: 60,
  });
  const acs = acExtractor.structured_output.acceptance_criteria;

  // -------------------------------------------------------------------------
  // Step 2: fan-out — for each (AC, angle), spawn a checker.
  // 16 concurrent agent cap respected by the runtime; for many ACs the
  // runtime queues automatically.
  // -------------------------------------------------------------------------
  const verdicts = []; // [{ ac_id, angle, verdict, evidence }]

  const checkerPromises = [];
  for (const ac of acs) {
    for (const angle of angles) {
      checkerPromises.push(
        spawn("validator", {
          prompt: [
            `Cross-check angle: ${angle.name}`,
            `Framing: ${angle.framing}`,
            ``,
            `Acceptance criterion to verify:`,
            `  ${ac.id}: ${ac.description}`,
            ``,
            `Return structured_output: { ac_id, angle, verdict: PASS|FAIL|UNCERTAIN, evidence }`,
            `Evidence MUST cite file:line or a runtime observation.`,
          ].join("\n"),
          freshContext: true,
          timeout: 300,
        }).then((r) => {
          verdicts.push(r.structured_output);
        })
      );
    }
  }
  await Promise.all(checkerPromises);

  // -------------------------------------------------------------------------
  // Step 3: vote per AC. Require N-of-M agreement to mark passing.
  // -------------------------------------------------------------------------
  const threshold = Math.ceil((angles.length * 2) / 3); // 2/3 majority
  const report = acs.map((ac) => {
    const acVerdicts = verdicts.filter((v) => v.ac_id === ac.id);
    const passes = acVerdicts.filter((v) => v.verdict === "PASS").length;
    const fails = acVerdicts.filter((v) => v.verdict === "FAIL").length;
    const uncertain = acVerdicts.filter((v) => v.verdict === "UNCERTAIN").length;
    let consensus;
    if (passes >= threshold) consensus = "PASS";
    else if (fails >= threshold) consensus = "FAIL";
    else consensus = "NO_CONSENSUS";
    return {
      ac_id: ac.id,
      description: ac.description,
      per_angle_verdicts: acVerdicts,
      consensus,
      votes: { pass: passes, fail: fails, uncertain },
    };
  });

  const needsHuman = report.filter((r) => r.consensus === "NO_CONSENSUS");

  // -------------------------------------------------------------------------
  // Step 4: surface the results. ACs with no consensus are flagged for
  // human review (Exception #4 — judgment).
  // -------------------------------------------------------------------------
  return {
    feature,
    total_acs: acs.length,
    passed: report.filter((r) => r.consensus === "PASS").length,
    failed: report.filter((r) => r.consensus === "FAIL").length,
    no_consensus: needsHuman.length,
    report,
    next_action: needsHuman.length > 0
      ? `human reviews ${needsHuman.length} AC(s) where the angles disagreed`
      : `automatic — feature_list.json updated to reflect verified passes`,
  };
}

return main(args);

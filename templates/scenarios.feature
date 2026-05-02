# Template: copy to spec/scenarios/{feature-name}.feature
# One Feature per file. Multiple Scenarios per Feature.
# One acceptance criterion = one scenario.

Feature: <human-readable feature name>
  As a <persona id, e.g. P-001 from pm/personas.md>
  I want to <jtbd, mirrored from pm/jtbd.md>
  So that <outcome>

  Background:
    # Shared preconditions for every scenario in this feature.
    Given <precondition that holds for all scenarios>

  # ---- Happy path ----
  Scenario: <one specific example, e.g. "submits annotated feedback while logged in">
    Given <precondition>
    And <precondition>
    When <single observable action>
    Then <observable outcome>
    And <observable outcome>

  # ---- Negative cases (first-class) ----
  Scenario: refuses when <rule violated>
    Given <precondition that violates the rule>
    When <action attempted>
    Then <system refuses> and <reason surfaced to user>

  # ---- Edge cases (per BDD seven-edge-case checklist) ----

  Scenario: handles empty input
    Given <empty input>
    When <action>
    Then <observable handling>

  Scenario: handles maximum input
    Given <maximum boundary value, e.g. 10000-character note>
    When <action>
    Then <observable handling>

  Scenario: handles concurrent action by two users
    Given <user A and user B both targeting same resource>
    When <both act simultaneously>
    Then <one succeeds, one is told why it failed>

  Scenario: refuses when permission is denied
    Given <user with insufficient role>
    When <action attempted>
    Then <403 response> and <message names the missing permission>

  Scenario: degrades gracefully when external dependency fails
    Given <external service is down>
    When <action attempted>
    Then <user receives partial success or specific error> and <retry guidance>

  Scenario: idempotent on repeated submission
    Given <action already submitted once>
    When <same action submitted again>
    Then <same result, no duplicate side-effect>

  # If a checklist item genuinely doesn't apply, comment why:
  # # (max input n/a — the field has no max, validated client-side)

  # ---- State-aware scenarios (R3) ----
  # When relevant, name the feature state explicitly:

  Scenario: behind-flag user does not see the feature
    Given the feature is BEHIND FLAG for everyone
    When the user navigates to <route>
    Then they see <pre-feature behavior>

  Scenario: rolling-out-bucketed user does see the feature
    Given the feature is ROLLING OUT to 5% via user_id hash
    And the user's bucket is in the 5%
    When the user navigates to <route>
    Then they see <new feature behavior>

# Failures Log — ERR-XXXX

Every confirmed bug gets an entry here. R4 is enforced by `hooks/prepush/r4-err-pairing.sh`: a fix is not accepted until a regression test exists for the ERR-id and that test was RED on a prior commit.

## Format

```
## ERR-0001
- Title: <one line>
- First seen: <YYYY-MM-DD>
- Tier: <T0|T1|T2|T3>
- Severity: <low|medium|high|critical>
- Real-user impact: <0 users | N users | %>
- Symptoms: <observable behavior>
- Root cause: <what was actually broken>
- Fix commit: <sha>
- Paired test: tests/regression/<file>.test.ts
- Hook/skill change: <if any>
```

## Open

_(none yet)_

## Resolved

_(none yet)_

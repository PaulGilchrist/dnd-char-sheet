# Bug — CLA-302 Scholar: expertise choice not gated to the six RAW skills

**Verdict: FAIL (gate missing).** Core automation works; selection list is unenforced.

## RAW
2024 Wizard lv2 Scholar: expertise choice restricted to Arcana, History, Investigation, Medicine, Nature, Religion AND must already be proficient.

## Observed (live, 2026-09-04, DivinationWizard lv20, test-campaign)
- Wizard Skills step renders ONE generic "Elevate" expertise toggle per skill (`WizardStepSkills.jsx:291-303`). Gate = proficient + slot count only:
  - `WizardStepSkills.jsx:69-74` proficient check; `:95-110` class/feat slot count check.
  - No Scholar/six-skill list check anywhere; `getExpertiseLimits` (`expertise.js:99`) contributes only a COUNT (classCount=1), never a permitted-skill list. `validation.js:138-179` validates count + proficiency, no per-source skill list for class expertise.
- LIVE proof: ticked Perception (proficient via free pick, NOT one of the six) → Elevate became enabled → click → "Perception (Expert) ✓ Expert", slot counter "expertise in 1 of 1" — Perception consumed the Scholar slot. (Reverted.)
- Slot-count gate DOES work: History Elevate → "All class expertise slots are used".

## Working correctly (verified, keep)
- Disk persist: `expertSkills: ['Arcana']`; sheet `Arcana (Expert) (+15)` = INT +3 + 2×(+6); roll popup +15; log `roll/skill Arcana bonus=15`.
- Controls: History (+9) single PB; Investigation/Nature/Religion (+3) unproficient.
- Note: task predicted +17; actual INT is 17 (16+1 bg) → +15 is the correct math.

## Suggested fix
Add `classExpertiseSkillLists` to `getExpertiseLimits` result (Scholar → the six skills) and gate `handleExpertiseToggle` + `validation.js` on it (mirror `featExpertiseSkillLists` plumbing).

## NEW pitfalls
- Scholar expertise is a Skills-step "Elevate" toggle, NOT a dedicated combobox (task's "Primal Order combobox" pattern does not apply); editable proficiency pool (up to 5) lets non-Scholar skills consume the class expertise slot.
- `change-data` `expertSkills` is nested under `d['<CharName>']` (same as MN-016 nesting).

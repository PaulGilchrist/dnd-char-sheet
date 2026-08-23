# Bug: CLA-058 Combat Inspiration - Defense mode prompt never triggered

## Overview

Bard Combat Inspiration feature's Defense mode is broken. When a creature with Bardic Inspiration from a Bard is hit by an attack, the prompt to use the Inspiration die to boost AC never appears. The Offense mode works correctly, but the Defense mode has no trigger.

## Expected Behavior

1. Bard uses Bardic Inspiration on an ally (Bonus Action)
2. When that ally is hit by an attack roll, they should see a prompt
3. The prompt allows them to use their Reaction to roll the Bardic Inspiration die and add it to their AC against that attack
4. If the boosted AC is higher than the attack roll, the attack misses

## Actual Behavior

1. Bard uses Bardic Inspiration on an ally
2. When the ally is hit by an attack, **no prompt appears**
3. The creature cannot use Bardic Inspiration for defense
4. The `sendBardicInspirationDefensePrompt` function exists in `src/services/combat/prompts/bardicInspirationPromptUtils.js:6` but is **never called** from any production code
5. The `hasBardicInspirationDefense` check function also exists but is never invoked

The Offense mode works correctly — `buildBardicInspirationOffenseStep` in `attackRollRiders.js:109` properly triggers the offense prompt when the creature hits with an attack.

## Steps to Reproduce

1. Open "test-campaign" with a Bard character (e.g., College of Lore Bard)
2. Cast Bardic Inspiration on an ally creature (Bonus Action)
3. Have an enemy attack the ally
4. Observe that no prompt appears offering to use Bardic Inspiration to boost AC
5. Check `src/services/combat/prompts/bardicInspirationPromptUtils.js` — `sendBardicInspirationDefensePrompt` is defined but never called
6. Check combat steps — no step invokes the defense check function

## Likely Location

- **Handler:** `src/services/combat/automation/handlers/classFeatureHandler.js`
- **Router:** `src/services/combat/automation/routers/classFeatureRouter.js`
- **InfoBuilder:** `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js`
- **Prompt utils:** `src/services/combat/prompts/bardicInspirationPromptUtils.js:6` — `sendBardicInspirationDefensePrompt` defined but never called
- **Check function:** `hasBardicInspirationDefense` exists but never invoked in any combat step
- **Compare with working code:** `src/services/combat/automation/steps/attackRollRiders.js:109` — `buildBardicInspirationOffenseStep` correctly triggers offense mode

## Notes

- Offense mode is implemented and working (attackRollRiders.js:109)
- Defense mode prompt utility exists but has no trigger/combat step
- This is a missing integration bug — the code exists but is not wired into the combat pipeline

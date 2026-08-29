# Checkpoint SP-055 Globe of Invulnerability

## Scenario (campaign: test-campaign)

- **GlobeWizard** — NEW, created via Add Character wizard. 2024 rules, Human, Acolyte background, Wizard / Abjurer, level 13, spells: Globe of Invulnerability (6th-level, Concentration). File: `public/campaigns/test-campaign/GlobeWizard.json`.
- **DraconicSorcerer (DraconicSorcerer)** — REUSED from registry. 2024 Sorcerer (Draconic Sorcery) level 5, has Chromatic Orb (1st) / Fireball (3rd) / Fire Bolt. Outside-globe attacker casting Chromatic Orb at GlobeWizard.
- **Aarakocra Aeromancer 1** — PRE-STAGED in initiative tracker (round 1, Init 18, HP 53/66) from prior session. Not central to block check (player-cast spells go through executeSpellCast block checks); leave as ambient combat.

## Verified source facts

- 2024 spells.json: globe-of-invulnerability level 6, classes Sorcerer+Wizard, automation type `globe_of_invulnerability`, auraRange 10, maxBlockedSpellLevel 5.
- Cast flow: spellGates `gateGlobe` → pendingGlobe creature-select popup → `handleGlobeConfirm` → `executeHandler` → handler toggles active buff `Globe of Invulnerability` on caster + writes `globe_barrier` targetEffects (campaign targetEffects) per selected creature + log entries.
- Block flow: `spellCastService/execution/index.js:44` calls `checkGlobeOfInvulnerability` (blockChecks.js:8). Blocks ≤5-level spells whose target has `globe_barrier` and whose caster is NOT globe-protected. Log: `"<spell> (level N) from <caster> blocked — target is protected by Globe of Invulnerability."` + automation popup.
- Badge UI: ConditionEffectBadges.jsx renders `globe_barrier` → "Globe of Invulnerability" effect-buff badge (fa-shield-halved) on tracker creature cards.

## Next steps
1. Open GlobeWizard sheet → cast Globe of Invulnerability → creature popup select GlobeWizard (self) → confirm.
2. Select DraconicSorcerer → cast Chromatic Orb targeting GlobeWizard → expect blocked popup + log, no damage.
3. Click Done after each action; verify badge + log in Initiative/Log views.

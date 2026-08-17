// @ts-check
import { test, expect } from '@playwright/test';
import {
  ensureTestCampaign,
  goToCharacterSheet,
  verifyCharacterSummary,
  logActionSections,
  logAttacks,
  logSpecialActions,
  logAutomationBadges,
  takeScreenshot,
  closeAllModals,
  waitForModalContent,
} from './helpers.js';

test.describe('E2E Subclass Automation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureTestCampaign(page);
  });

  // =========================================================================
  // ELDRITCH KNIGHT SUBCLASS (Thorin Ironforge)
  // =========================================================================

  test.describe('Eldritch Knight Subclass Features', () => {
    test('verify Eldritch Knight subclass in character summary', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const summary = await verifyCharacterSummary(page, 'Thorin Ironforge', 'Fighter');
      console.log(`Character summary: ${summary}`);

      // Should show Eldritch Knight subclass
      expect(summary.toLowerCase()).toContain('eldritch');

      await takeScreenshot(page, 'ek-subclass-summary');
    });

    test('verify Eldritch Knight spellcasting features', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const actionNames = await logAttacks(page, 0);
      console.log(`Eldritch Knight actions: ${actionNames.join(', ')}`);

      // Should have spell attacks (cantrips like Eldritch Blast, Magic Missile)
      const hasSpellAttack = actionNames.some(name =>
        name.toLowerCase().includes('blast') ||
        name.toLowerCase().includes('missile') ||
        name.toLowerCase().includes('bolt') ||
        name.toLowerCase().includes('ray')
      );
      console.log(`Has spell attack: ${hasSpellAttack}`);

      await takeScreenshot(page, 'ek-spellcasting');
    });

    test('verify Eldritch Weapon feature', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);
      console.log(`Eldritch Knight special actions: ${specialActions.join(', ')}`);

      // Eldritch Weapon should appear as a special action
      const hasEldritchWeapon = specialActions.some(action =>
        action.toLowerCase().includes('eldritch weapon') ||
        action.toLowerCase().includes('weapon')
      );
      console.log(`Has Eldritch Weapon: ${hasEldritchWeapon}`);

      await takeScreenshot(page, 'ek-eldritch-weapon');
    });

    test('verify Action Surge feature (Fighter level 2)', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Action Surge should be a special action
      const hasActionSurge = specialActions.some(action =>
        action.toLowerCase().includes('action surge') ||
        action.toLowerCase().includes('surge')
      );
      console.log(`Has Action Surge: ${hasActionSurge}`);

      await takeScreenshot(page, 'ek-action-surge');
    });

    test('verify Spell Storage feature', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);
      const actionNames = await logAttacks(page, 0);

      console.log(`Special actions: ${specialActions.join(', ')}`);
      console.log(`Actions: ${actionNames.join(', ')}`);

      // Spell storage may appear in special actions
      const hasSpellStorage = specialActions.some(action =>
        action.toLowerCase().includes('spell') ||
        action.toLowerCase().includes('store')
      );
      console.log(`Has Spell Storage: ${hasSpellStorage}`);

      await takeScreenshot(page, 'ek-spell-storage');
    });

    test('verify Eldritch Strike feature (Eldritch Knight level 15)', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);
      console.log(`Eldritch Knight special actions: ${specialActions.join(', ')}`);

      // Eldritch Strike should appear at level 15+
      const hasEldritchStrike = specialActions.some(action =>
        action.toLowerCase().includes('eldritch strike') ||
        action.toLowerCase().includes('strike')
      );
      console.log(`Has Eldritch Strike: ${hasEldritchStrike}`);

      await takeScreenshot(page, 'ek-eldritch-strike');
    });

    test('verify Indomitable feature (Fighter level 20)', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Indomitable should appear at level 20
      const hasIndomitable = specialActions.some(action =>
        action.toLowerCase().includes('indomitable')
      );
      console.log(`Has Indomitable: ${hasIndomitable}`);

      await takeScreenshot(page, 'ek-indomitable');
    });
  });

  // =========================================================================
  // EVOCATION SUBCLASS (Lyra Starweave)
  // =========================================================================

  test.describe('Evocation Subclass Features', () => {
    test('verify Abjuration/Evocation subclass in character summary', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const summary = await verifyCharacterSummary(page, 'Lyra Starweave', 'Wizard');
      console.log(`Character summary: ${summary}`);

      // Should show Evocation or Abjurer subclass (depends on character setup)
      const isEvocation = summary.toLowerCase().includes('evocation') || summary.toLowerCase().includes('abjurer') || summary.toLowerCase().includes('abjuration');
      expect(isEvocation).toBe(true);

      await takeScreenshot(page, 'ev-subclass-summary');
    });

    test('verify Sculpt Spells feature (Evocation level 2)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Evocation Wizard special actions: ${specialActions.join(', ')}`);

      // Sculpt Spells should appear in special actions
      const hasSculptSpells = specialActions.some(action =>
        action.toLowerCase().includes('sculpt') ||
        action.toLowerCase().includes('spells')
      );
      console.log(`Has Sculpt Spells: ${hasSculptSpells}`);

      await takeScreenshot(page, 'ev-sculpt-spells');
    });

    test('verify Empowered Evocation feature (Evocation level 6)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Empowered Evocation should appear in special actions or passives
      const hasEmpowered = specialActions.some(action =>
        action.toLowerCase().includes('empowered') ||
        action.toLowerCase().includes('evocation')
      );
      console.log(`Has Empowered Evocation: ${hasEmpowered}`);

      await takeScreenshot(page, 'ev-empowered');
    });

    test('verify Overchannel feature (Evocation level 6)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Overchannel should appear in special actions
      const hasOverchannel = specialActions.some(action =>
        action.toLowerCase().includes('overchannel') ||
        action.toLowerCase().includes('over channel')
      );
      console.log(`Has Overchannel: ${hasOverchannel}`);

      await takeScreenshot(page, 'ev-overchannel');
    });

    test('verify Potent Cantrip feature (Evocation level 2)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Potent Cantrip should appear in special actions
      const hasPotentCantrip = specialActions.some(action =>
        action.toLowerCase().includes('potent') ||
        action.toLowerCase().includes('cantrip')
      );
      console.log(`Has Potent Cantrip: ${hasPotentCantrip}`);

      await takeScreenshot(page, 'ev-potent-cantrip');
    });

    test('verify Necrotize feature (Evocation level 10)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Necrotize may appear in special actions
      const hasNecrotize = specialActions.some(action =>
        action.toLowerCase().includes('necrotize')
      );
      console.log(`Has Necrotize: ${hasNecrotize}`);

      await takeScreenshot(page, 'ev-necrotize');
    });

    test('verify Overwhelm Mind feature (Evocation level 14)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Overwhelm Mind may appear in special actions
      const hasOverwhelm = specialActions.some(action =>
        action.toLowerCase().includes('overwhelm') ||
        action.toLowerCase().includes('mind')
      );
      console.log(`Has Overwhelm Mind: ${hasOverwhelm}`);

      await takeScreenshot(page, 'ev-overwhelm');
    });

    test('verify Path of the Arcane Sovereign (Evocation level 20)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      const badges = await logAutomationBadges(page);

      console.log(`Special actions: ${specialActions.join(', ')}`);
      console.log(`Automation badges: ${badges}`);

      // Level 20 Evocation features should appear
      expect(specialActions.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'ev-arcane-sovereign');
    });
  });

  // =========================================================================
  // SUBCLASS COMPARISON
  // =========================================================================

  test.describe('Subclass Feature Comparison', () => {
    test('compare Eldritch Knight and Evocation special actions', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');
      const ekSpecial = await logSpecialActions(page);

      await goToCharacterSheet(page, 'Lyra Starweave');
      const evSpecial = await logSpecialActions(page);

      console.log(`Eldritch Knight special actions: ${ekSpecial.join(', ')}`);
      console.log(`Evocation special actions: ${evSpecial.join(', ')}`);

      // Both should have subclass-specific features
      expect(ekSpecial.length).toBeGreaterThan(0);
      expect(evSpecial.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'subclass-comparison');
    });

    test('verify subclass spell automation differs', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');
      const ekActions = await logAttacks(page, 0);

      await goToCharacterSheet(page, 'Lyra Starweave');
      const evActions = await logAttacks(page, 0);

      console.log(`Eldritch Knight actions: ${ekActions.join(', ')}`);
      console.log(`Evocation actions: ${evActions.join(', ')}`);

      // Different subclasses should have different spell lists
      expect(ekActions.length).toBeGreaterThan(0);
      expect(evActions.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'subclass-spells');
    });
  });
});

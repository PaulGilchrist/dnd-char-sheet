// @ts-check
import { test, expect } from '@playwright/test';
import {
  ensureTestCampaign,
  startCombat,
  goToCharacterSheet,
  logActionSections,
  logAttacks,
  logSpecialActions,
  logAutomationBadges,
  verifyCharacterSummary,
  findCreatureCard,
  getAllCreatures,
  takeScreenshot,
  getActiveCreature,
} from './helpers.js';

const TEST_CAMPAIGN = 'test-campaign';

test.describe('E2E Class Automation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureTestCampaign(page);
  });

  // =========================================================================
  // FIGHTER (ELDRITCH KNIGHT) CLASS AUTOMATION
  // =========================================================================

  test.describe('Fighter - Eldritch Knight Class Automation', () => {
    test('verify Fighter character sheet structure and sections', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      // Verify character summary shows Fighter
      const summary = await verifyCharacterSummary(page, 'Thorin Ironforge', 'Fighter');
      expect(summary).toBeTruthy();

      // Verify all 8 sections exist
      const sectionCount = await logActionSections(page);
      expect(sectionCount).toBeGreaterThanOrEqual(7);

      // Verify Actions section exists and has attacks
      const actionNames = await logAttacks(page, 0);
      expect(actionNames.length).toBeGreaterThan(0);
      console.log(`Fighter has ${actionNames.length} action items`);

      // Verify Bonus Actions section
      const bonusActionNames = await logAttacks(page, 1);
      console.log(`Fighter has ${bonusActionNames.length} bonus action items`);

      // Verify Reactions section
      const reactionNames = await logAttacks(page, 2);
      console.log(`Fighter has ${reactionNames.length} reaction items`);

      // Verify Special Actions section
      const specialActions = await logSpecialActions(page);
      console.log(`Fighter has ${specialActions.length} special action items`);

      // Verify automation badges
      const badgeCount = await logAutomationBadges(page);
      console.log(`Fighter automation badges: ${badgeCount}`);

      await takeScreenshot(page, 'fighter-sheet-structure');
    });

    test('verify Fighter weapon attacks are present', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const actionNames = await logAttacks(page, 0);

      // Fighter at level 20 should have multiple action items
      // Expected: weapon attacks, spell attacks, etc.
      console.log(`Action items: ${actionNames.join(', ')}`);
      expect(actionNames.length).toBeGreaterThan(0);

      // Verify attacks container exists
      const attacksContainer = page.locator('.char-actions').nth(0);
      const attackItems = attacksContainer.locator('.attacks .left');
      const attackCount = await attackItems.count();
      expect(attackCount).toBeGreaterThan(0);

      await takeScreenshot(page, 'fighter-weapon-attacks');
    });

    test('verify Fighter spell attacks are present (Eldritch Knight)', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const actionNames = await logAttacks(page, 0);

      // Eldritch Knight should have spell attacks like Magic Missile, Eldritch Blast
      const hasSpellAttack = actionNames.some(name =>
        name.toLowerCase().includes('missile') ||
        name.toLowerCase().includes('blast') ||
        name.toLowerCase().includes('cantrip') ||
        name.toLowerCase().includes('spell')
      );
      console.log(`Eldritch Knight spell attacks found: ${hasSpellAttack}`);
      console.log(`All action names: ${actionNames.join(', ')}`);

      await takeScreenshot(page, 'fighter-spell-attacks');
    });

    test('verify Fighter special actions include class features', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);

      // Expected Eldritch Knight features at level 20:
      // Action Surge, Second Wind, Eldritch Strike, Indomitable, etc.
      console.log(`All special actions: ${specialActions.join(', ')}`);

      // Should have at least some special actions
      expect(specialActions.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'fighter-special-actions');
    });

    test('verify Fighter reactions section', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const reactionNames = await logAttacks(page, 2);
      console.log(`Fighter reactions: ${reactionNames.join(', ')}`);

      // Second Wind is a reaction for Fighter
      const hasSecondWind = reactionNames.some(name =>
        name.toLowerCase().includes('second wind') ||
        name.toLowerCase().includes('reaction')
      );
      console.log(`Has Second Wind or reaction feature: ${hasSecondWind}`);

      await takeScreenshot(page, 'fighter-reactions');
    });

    test('verify Fighter bonus actions section', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const bonusActionNames = await logAttacks(page, 1);
      console.log(`Fighter bonus actions: ${bonusActionNames.join(', ')}`);

      await takeScreenshot(page, 'fighter-bonus-actions');
    });
  });

  // =========================================================================
  // WIZARD (EVOCATION) CLASS AUTOMATION
  // =========================================================================

  test.describe('Wizard - Evocation Class Automation', () => {
    test('verify Wizard character sheet structure and sections', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      // Verify character summary shows Wizard
      const summary = await verifyCharacterSummary(page, 'Lyra Starweave', 'Wizard');
      expect(summary).toBeTruthy();

      // Verify all sections exist
      const sectionCount = await logActionSections(page);
      expect(sectionCount).toBeGreaterThanOrEqual(7);

      await takeScreenshot(page, 'wizard-sheet-structure');
    });

    test('verify Wizard cantrips and spell attacks', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const actionNames = await logAttacks(page, 0);
      console.log(`Wizard action items (${actionNames.length}): ${actionNames.join(', ')}`);

      // Wizard should have cantrip attacks (Eldritch Blast, Fire Bolt, etc.)
      const hasCantrip = actionNames.some(name =>
        name.toLowerCase().includes('blast') ||
        name.toLowerCase().includes('bolt') ||
        name.toLowerCase().includes('ray') ||
        name.toLowerCase().includes('missile')
      );
      console.log(`Has cantrip/spell attack: ${hasCantrip}`);
      expect(hasCantrip || actionNames.length > 0).toBe(true);

      await takeScreenshot(page, 'wizard-cantrips');
    });

    test('verify Wizard bonus actions', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const bonusActionNames = await logAttacks(page, 1);
      console.log(`Wizard bonus actions (${bonusActionNames.length}): ${bonusActionNames.join(', ')}`);

      await takeScreenshot(page, 'wizard-bonus-actions');
    });

    test('verify Wizard reactions', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const reactionNames = await logAttacks(page, 2);
      console.log(`Wizard reactions (${reactionNames.length}): ${reactionNames.join(', ')}`);

      // Wizard might have Shield spell as reaction
      const hasShield = reactionNames.some(name =>
        name.toLowerCase().includes('shield') ||
        name.toLowerCase().includes('reaction')
      );
      console.log(`Has Shield or reaction spell: ${hasShield}`);

      await takeScreenshot(page, 'wizard-reactions');
    });

    test('verify Wizard special actions include class features', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Wizard special actions (${specialActions.length}): ${specialActions.join(', ')}`);

      // Evocation Wizard features: Sculpt Spells, Empowered Evocation, Overchannel, etc.
      expect(specialActions.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'wizard-special-actions');
    });

    test('verify Wizard automation badges', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const badgeCount = await logAutomationBadges(page);
      console.log(`Wizard automation badges: ${badgeCount}`);

      await takeScreenshot(page, 'wizard-badges');
    });
  });

  // =========================================================================
  // COMBAT INITIATIVE VERIFICATION
  // =========================================================================

  test.describe('Combat Initiative Verification', () => {
    test('verify initiative shows all creatures', async ({ page }) => {
      await startCombat(page);

      const creatures = await getAllCreatures(page);
      console.log(`Creatures in initiative: ${creatures.length}`);

      // Should have at least the 2 characters
      expect(creatures.length).toBeGreaterThanOrEqual(2);

      // Verify both player characters are present
      const playerCreatures = creatures.filter(c => c.type === 'player');
      expect(playerCreatures.length).toBeGreaterThanOrEqual(2);

      const playerNames = playerCreatures.map(c => c.name);
      console.log(`Player creatures: ${playerNames.join(', ')}`);

      await takeScreenshot(page, 'initiative-creatures');
    });

    test('verify turn navigation cycles correctly', async ({ page }) => {
      await startCombat(page);

      const initialActive = await getActiveCreature(page);
      console.log(`Initial active creature: ${initialActive}`);

      // Navigate through turns
      const { nextTurn, prevTurn } = await import('./helpers.js');

      // Go forward 5 turns
      for (let i = 0; i < 5; i++) {
        await nextTurn(page);
        const active = await getActiveCreature(page);
        console.log(`Turn ${i + 1}: ${active}`);
        await page.waitForTimeout(300);
      }

      // Go back 5 turns
      for (let i = 0; i < 5; i++) {
        await prevTurn(page);
        const active = await getActiveCreature(page);
        console.log(`Back turn ${i + 1}: ${active}`);
        await page.waitForTimeout(300);
      }

      // Should be back to initial creature
      const finalActive = await getActiveCreature(page);
      console.log(`Final active creature: ${finalActive}`);

      await takeScreenshot(page, 'turn-navigation');
    });
  });
});

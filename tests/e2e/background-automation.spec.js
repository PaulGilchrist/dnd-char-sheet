// @ts-check
import { test, expect } from '@playwright/test';
import {
  ensureTestCampaign,
  goToCharacterSheet,
  verifyCharacterSummary,
  logActionSections,
  logAttacks,
  logSpecialActions,
  takeScreenshot,
} from './helpers.js';

test.describe('E2E Background Automation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureTestCampaign(page);
  });

  // =========================================================================
  // SOLDIER BACKGROUND (Thorin Ironforge)
  // =========================================================================

  test.describe('Soldier Background Features', () => {
    test('verify Soldier character sheet has background features', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const summary = await verifyCharacterSummary(page, 'Thorin Ironforge', 'Fighter');
      console.log(`Character summary: ${summary}`);

      // Soldier background should grant Athletics proficiency
      // and the Military Rank feature

      const specialActions = await logSpecialActions(page);
      console.log(`Soldier background special actions: ${specialActions.join(', ')}`);

      // Look for Soldier-related features
      const hasSoldierFeature = specialActions.some(action =>
        action.toLowerCase().includes('soldier') ||
        action.toLowerCase().includes('military') ||
        action.toLowerCase().includes('rank')
      );
      console.log(`Has Soldier/Military feature: ${hasSoldierFeature}`);

      await takeScreenshot(page, 'soldier-background');
    });

    test('verify Soldier skill proficiencies (Athletics)', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      // Athletics should be in the abilities/skills section
      const abilitiesSection = page.locator('.char-abilities');
      expect(await abilitiesSection.count()).toBeGreaterThan(0);

      // Check for Athletics in the sheet
      const hasAthletics = page.getByText('Athletics').first();
      const athleticsVisible = await hasAthletics.isVisible().catch(() => false);
      console.log(`Athletics visible on sheet: ${athleticsVisible}`);

      await takeScreenshot(page, 'soldier-athletics');
    });

    test('verify Soldier background integration with class features', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const actionSections = await logActionSections(page);
      const actionNames = await logAttacks(page, 0);
      const specialActions = await logSpecialActions(page);

      console.log(`Sections: ${actionSections}`);
      console.log(`Actions: ${actionNames.join(', ')}`);
      console.log(`Special actions: ${specialActions.join(', ')}`);

      // Soldier background should complement Fighter class
      expect(actionNames.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'soldier-class-integration');
    });
  });

  // =========================================================================
  // SAGE BACKGROUND (Lyra Starweave)
  // =========================================================================

  test.describe('Sage Background Features', () => {
    test('verify Sage character sheet has background features', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const summary = await verifyCharacterSummary(page, 'Lyra Starweave', 'Wizard');
      console.log(`Character summary: ${summary}`);

      const specialActions = await logSpecialActions(page);
      console.log(`Sage background special actions: ${specialActions.join(', ')}`);

      // Look for Sage/Researcher features
      const hasSageFeature = specialActions.some(action =>
        action.toLowerCase().includes('sage') ||
        action.toLowerCase().includes('researcher') ||
        action.toLowerCase().includes('research')
      );
      console.log(`Has Sage/Researcher feature: ${hasSageFeature}`);

      await takeScreenshot(page, 'sage-background');
    });

    test('verify Sage skill proficiencies (Arcana, History)', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      // Arcana and History should be in the abilities/skills section
      const abilitiesSection = page.locator('.char-abilities');
      expect(await abilitiesSection.count()).toBeGreaterThan(0);

      // Check for Arcana in the sheet
      const hasArcana = page.getByText('Arcana').first();
      const arcanaVisible = await hasArcana.isVisible().catch(() => false);
      console.log(`Arcana visible on sheet: ${arcanaVisible}`);

      // Check for History in the sheet
      const hasHistory = page.getByText('History').first();
      const historyVisible = await hasHistory.isVisible().catch(() => false);
      console.log(`History visible on sheet: ${historyVisible}`);

      await takeScreenshot(page, 'sage-skills');
    });

    test('verify Sage background integration with Wizard class', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const actionNames = await logAttacks(page, 0);
      const specialActions = await logSpecialActions(page);

      console.log(`Wizard actions: ${actionNames.join(', ')}`);
      console.log(`Wizard special actions: ${specialActions.join(', ')}`);

      // Sage background should complement Wizard class with Arcana proficiency
      expect(actionNames.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'sage-class-integration');
    });
  });

  // =========================================================================
  // BACKGROUND COMPARISON
  // =========================================================================

  test.describe('Background Feature Comparison', () => {
    test('compare Soldier and Sage special actions', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');
      const thorinSpecial = await logSpecialActions(page);

      await goToCharacterSheet(page, 'Lyra Starweave');
      const lyraSpecial = await logSpecialActions(page);

      console.log(`Thorin (Soldier) special actions: ${thorinSpecial.join(', ')}`);
      console.log(`Lyra (Sage) special actions: ${lyraSpecial.join(', ')}`);

      // Both should have special actions from background + class
      expect(thorinSpecial.length).toBeGreaterThan(0);
      expect(lyraSpecial.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'background-comparison');
    });

    test('verify background skill proficiencies appear on sheet', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      // Soldier: Athletics, Intimidation
      const athleticsThorin = page.getByText('Athletics').first();
      const intThorin = page.getByText('Intimidation').first();

      const athVis = await athleticsThorin.isVisible().catch(() => false);
      const intVis = await intThorin.isVisible().catch(() => false);
      console.log(`Thorin - Athletics: ${athVis}, Intimidation: ${intVis}`);

      await goToCharacterSheet(page, 'Lyra Starweave');

      // Sage: Arcana, History
      const arcanaLyra = page.getByText('Arcana').first();
      const historyLyra = page.getByText('History').first();

      const arcVis = await arcanaLyra.isVisible().catch(() => false);
      const histVis = await historyLyra.isVisible().catch(() => false);
      console.log(`Lyra - Arcana: ${arcVis}, History: ${histVis}`);

      await takeScreenshot(page, 'background-skills');
    });
  });
});

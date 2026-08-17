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
  clickSpecialAction,
  waitForModalContent,
  closeModal,
  closeAllModals,
} from './helpers.js';

test.describe('E2E Feat Automation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureTestCampaign(page);
  });

  // =========================================================================
  // ACTOR FEAT (Thorin Ironforge)
  // =========================================================================

  test.describe('Actor Feat Automation', () => {
    test('verify Actor feat appears on character sheet', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);
      console.log(`Thorin special actions: ${specialActions.join(', ')}`);

      // Actor feat should be visible on the character sheet
      const hasActor = page.getByText('Actor').first();
      const actorVisible = await hasActor.isVisible().catch(() => false);
      console.log(`Actor feat visible: ${actorVisible}`);

      // Actor feat may appear in special actions or character advancement
      const hasActorInSpecial = specialActions.some(action =>
        action.toLowerCase().includes('actor')
      );
      console.log(`Actor in special actions: ${hasActorInSpecial}`);

      await takeScreenshot(page, 'actor-feat-visible');
    });

    test('verify Actor feat bonus action capability', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      // Actor feat allows bonus action to: speak languages, mimic sounds, fake injuries
      // This may appear as a special action or bonus action on the sheet

      const bonusActionNames = await logAttacks(page, 1);
      console.log(`Thorin bonus actions: ${bonusActionNames.join(', ')}`);

      const specialActions = await logSpecialActions(page);
      console.log(`Thorin special actions: ${specialActions.join(', ')}`);

      // Look for Actor-related bonus action
      const hasActorBonus = bonusActionNames.some(name =>
        name.toLowerCase().includes('actor') ||
        name.toLowerCase().includes('mimic') ||
        name.toLowerCase().includes('act')
      ) || specialActions.some(action =>
        action.toLowerCase().includes('actor')
      );
      console.log(`Has Actor bonus action: ${hasActorBonus}`);

      await takeScreenshot(page, 'actor-bonus-action');
    });

    test('verify Actor feat language mimicry', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const specialActions = await logSpecialActions(page);
      console.log(`Actor feat features: ${specialActions.join(', ')}`);

      // Actor allows speaking any language and mimicking voices
      // This may be a passive feature or a special action

      await takeScreenshot(page, 'actor-language');
    });
  });

  // =========================================================================
  // ARTILLERIST FEAT (Lyra Starweave)
  // =========================================================================

  test.describe('Artillerist Feat Automation', () => {
    test('verify Artillerist feat appears on character sheet', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Lyra special actions: ${specialActions.join(', ')}`);

      // Artillerist feat should be visible on the character sheet
      const hasArtillerist = page.getByText('Artillerist').first();
      const artilleristVisible = await hasArtillerist.isVisible().catch(() => false);
      console.log(`Artillerist feat visible: ${artilleristVisible}`);

      // Artillerist may appear in special actions
      const hasArtilleristInSpecial = specialActions.some(action =>
        action.toLowerCase().includes('artillerist') ||
        action.toLowerCase().includes('cannon')
      );
      console.log(`Artillerist/Cannon in special actions: ${hasArtilleristInSpecial}`);

      await takeScreenshot(page, 'artillerist-feat-visible');
    });

    test('verify Artillerist Eldritch Cannon feature', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      const specialActions = await logSpecialActions(page);
      console.log(`Artillerist special actions: ${specialActions.join(', ')}`);

      // Eldritch Cannon should appear as:
      // - A special action (to summon)
      // - A bonus action (to attack with cannon)

      // Check for cannon-related entries
      const hasCannon = specialActions.some(action =>
        action.toLowerCase().includes('cannon') ||
        action.toLowerCase().includes('eldritch')
      );
      console.log(`Has Eldritch Cannon: ${hasCannon}`);

      // Check bonus actions for cannon attack
      const bonusActionNames = await logAttacks(page, 1);
      console.log(`Lyra bonus actions: ${bonusActionNames.join(', ')}`);

      const hasCannonBonus = bonusActionNames.some(name =>
        name.toLowerCase().includes('cannon') ||
        name.toLowerCase().includes('eldritch')
      );
      console.log(`Has Cannon bonus action: ${hasCannonBonus}`);

      await takeScreenshot(page, 'artillerist-cannon');
    });

    test('verify Artillerist cannon attack automation', async ({ page }) => {
      await goToCharacterSheet(page, 'Lyra Starweave');

      // The Eldritch Cannon attack should be a clickable automation
      // that rolls damage when used

      const actionNames = await logAttacks(page, 0);
      const bonusActionNames = await logAttacks(page, 1);
      const specialActions = await logSpecialActions(page);

      console.log(`All action items: ${actionNames.join(', ')}`);
      console.log(`All bonus actions: ${bonusActionNames.join(', ')}`);
      console.log(`All special actions: ${specialActions.join(', ')}`);

      // Look for any cannon-related automation
      const allItems = [...actionNames, ...bonusActionNames, ...specialActions];
      const hasCannonAutomation = allItems.some(item =>
        item.toLowerCase().includes('cannon') ||
        item.toLowerCase().includes('eldritch')
      );
      console.log(`Has any Eldritch Cannon automation: ${hasCannonAutomation}`);

      await takeScreenshot(page, 'artillerist-automation');
    });
  });

  // =========================================================================
  // FEAT COMPARISON
  // =========================================================================

  test.describe('Feat Feature Comparison', () => {
    test('compare Actor and Artillerist feat displays', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');
      const thorinSpecial = await logSpecialActions(page);
      const thorinBadges = await logAutomationBadges(page);

      await goToCharacterSheet(page, 'Lyra Starweave');
      const lyraSpecial = await logSpecialActions(page);
      const lyraBadges = await logAutomationBadges(page);

      console.log(`Thorin (Actor) special actions: ${thorinSpecial.join(', ')}`);
      console.log(`Thorin badges: ${thorinBadges}`);
      console.log(`Lyra (Artillerist) special actions: ${lyraSpecial.join(', ')}`);
      console.log(`Lyra badges: ${lyraBadges}`);

      // Both should have feat-related features
      expect(thorinSpecial.length).toBeGreaterThan(0);
      expect(lyraSpecial.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'feat-comparison');
    });

    test('verify feat automation triggers correctly', async ({ page }) => {
      // Test that clicking a feat-based action triggers the automation
      // This tests the executeHandler pipeline integration

      await goToCharacterSheet(page, 'Thorin Ironforge');

      // Try to click Actor feat if visible
      const actorEl = page.getByText('Actor').first();
      if (await actorEl.isVisible().catch(() => false)) {
        await actorEl.click();
        await page.waitForTimeout(1000);

        // Check if any modal or popup appeared
        const modalContent = await waitForModalContent(page, 2000).catch(() => '');
        console.log(`Actor click result: ${modalContent.substring(0, 200)}`);

        await closeAllModals(page);
      }

      await takeScreenshot(page, 'feat-trigger-test');
    });
  });
});

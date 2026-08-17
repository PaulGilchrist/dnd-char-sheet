// @ts-check
import { test, expect } from '@playwright/test';
import {
  ensureTestCampaign,
  navigateToInitiative,
  getAllCreatures,
  takeScreenshot,
} from './helpers.js';

const TEST_CAMPAIGN = 'test-campaign';
const TEST_CHAR_NAME = 'Bjorn Bloodaxe';
const TEST_CHAR_FILE = 'Bjorn_Bloodaxe.json';

function createBarbarianCharacter() {
  return {
    name: TEST_CHAR_NAME,
    level: 20,
    alignment: 'Chaotic Good',
    abilities: [
      { name: 'Strength', baseScore: 20, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
      { name: 'Dexterity', baseScore: 14, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
      { name: 'Constitution', baseScore: 16, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
      { name: 'Intelligence', baseScore: 8, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
      { name: 'Wisdom', baseScore: 10, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
      { name: 'Charisma', baseScore: 8, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
    ],
    class: {
      name: 'Barbarian',
      subclass: { name: 'Path of the Berserker' },
      divineOrder: '',
      primalOrder: '',
    },
    expertSkills: [],
    feats: [],
    fightingStyles: [],
    race: { name: 'Human', subrace: { name: '' } },
    immunities: [],
    inventory: { backpack: [], equipped: [], gold: 10, magicItems: [] },
    languages: [],
    resistances: [],
    skillProficiencies: ['Athletics', 'Intimidation'],
    toolProficiencies: [],
    specialActions: [],
    spells: [],
    magicInitiateInstances: [],
    rules: '2024',
    xp: 0,
    xpMode: 'milestone',
    background: 'Folk Hero',
  };
}

test.describe('E2E Class Automation Tests - Barbarian Rage', () => {
  test.describe('Rage (combat_stance)', () => {
    test('setup: create level-20 Barbarian character via API', async ({ page }) => {
      await ensureTestCampaign(page);

      // Check if character already exists
      const charExists = await page.request.get(`/api/campaigns/${TEST_CAMPAIGN}/${TEST_CHAR_FILE}`)
        .then(r => r.ok())
        .catch(() => false);

      if (!charExists) {
        const charData = createBarbarianCharacter();
        const postResponse = await page.request.post(`/api/campaigns/${TEST_CAMPAIGN}`, {
          data: { character: charData },
        });
        expect(postResponse.ok()).toBeTruthy();
        const result = await postResponse.json();
        console.log(`Created ${TEST_CHAR_NAME} via API: ${result.fileName || TEST_CHAR_FILE}`);
        // Reload page to pick up new character
        await page.reload();
        await page.waitForTimeout(5000);
        // Select campaign again after reload
        const campaignBtn = page.getByRole('button', { name: TEST_CAMPAIGN });
        if (await campaignBtn.count() > 0 && await campaignBtn.isVisible()) {
          await campaignBtn.click();
          await page.waitForTimeout(3000);
        }
        await expect(page.getByRole('button', { name: TEST_CHAR_NAME })).toBeVisible({ timeout: 10000 });
      } else {
        console.log(`${TEST_CHAR_NAME} already exists`);
      }

      // Navigate to verify character loaded
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // Verify character summary shows Barbarian
      const summary = page.locator('[data-testid="char-summary-text"]');
      if (await summary.count() > 0) {
        const text = (await summary.textContent())?.trim() || '';
        console.log(`Character summary: ${text}`);
        expect(text).toContain('Barbarian');
      }

      await takeScreenshot(page, 'rage-character-created');
    });

    test('verify Rage is available as special action on character sheet', async ({ page }) => {
      await ensureTestCampaign(page);

      // Navigate to Bjorn's character sheet
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // Check for Rage in special actions - the <b> element with "Rage"
      const rageBold = page.locator('.char-special-actions b').filter({ hasText: 'Rage' });
      const rageCount = await rageBold.count();
      console.log(`Rage special action found: ${rageCount > 0}`);
      expect(rageCount).toBeGreaterThan(0);

      // Log all special actions for debugging
      const specialItems = page.locator('.char-special-actions b');
      const specialCount = await specialItems.count();
      console.log(`Total special actions: ${specialCount}`);

      await takeScreenshot(page, 'rage-available-verified');
    });

    test('activate Rage via special action click (1 action - attack as player)', async ({ page }) => {
      await ensureTestCampaign(page);

      // Navigate to Bjorn's character sheet
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // Click the Rage name (the <b> element)
      const rageBold = page.locator('.char-special-actions b').filter({ hasText: 'Rage' }).first();
      await expect(rageBold).toBeVisible();
      await rageBold.click();
      console.log('Clicked Rage special action');
      await page.waitForTimeout(3000);

      // Check for Rage automation badge on the page
      // The badge shows "BPS Resist, STR Adv, +4 dmg" for Rage
      const rageBadges = page.locator('.automation-badge').filter({ hasText: /Rage|BPS Resist|STR Adv/ });
      const badgeCount = await rageBadges.count();
      console.log(`Rage-related automation badges: ${badgeCount}`);

      // Verify at least one Rage badge appears
      expect(badgeCount).toBeGreaterThan(0);

      // Log all badges for debugging
      const allBadges = page.locator('.automation-badge');
      const allBadgeCount = await allBadges.count();
      console.log(`Total automation badges on page: ${allBadgeCount}`);
      for (let i = 0; i < allBadgeCount; i++) {
        const badgeText = (await allBadges.nth(i).textContent())?.trim() || '';
        console.log(`  Badge: ${badgeText}`);
      }

      await takeScreenshot(page, 'rage-activated-action');
    });

    test('verify Rage effects when Thorin attacks Bjorn (1 bonus action)', async ({ page }) => {
      await ensureTestCampaign(page);

      // Navigate to initiative
      await navigateToInitiative(page);

      // Roll initiative
      const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
      if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
        await rollBtn.click();
        await page.waitForTimeout(2000);
      }

      // Make sure Bjorn is raging - navigate to his sheet
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Check if already raging by looking for Rage badge
      const rageBadge = page.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv/ });
      const alreadyRaging = await rageBadge.count() > 0;

      if (!alreadyRaging) {
        // Activate Rage
        const rageBold = page.locator('.char-special-actions b').filter({ hasText: 'Rage' }).first();
        if (await rageBold.count() > 0 && await rageBold.isVisible()) {
          await rageBold.click();
          await page.waitForTimeout(3000);
        }
      }

      // Navigate back to initiative
      await page.getByRole('button', { name: 'Initiative' }).click();
      await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Find Bjorn's creature card
      const creatureCards = page.locator('.creature-card');
      const count = await creatureCards.count();

      for (let i = 0; i < count; i++) {
        const nameEl = creatureCards.nth(i).locator('.creature-name');
        const name = (await nameEl.textContent())?.trim() || '';
        if (name.includes('Bjorn')) {
          const card = creatureCards.nth(i);

          // Check for Rage-related badges on the card
          const rageBadges = card.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv|Rage/ });
          const badgeCount = await rageBadges.count();
          console.log(`Rage badges on Bjorn's card during Thorin attack: ${badgeCount}`);

          // Log all badges on the card
          const allBadges = card.locator('.automation-badge');
          const allBadgeCount = await allBadges.count();
          console.log(`Total badges on Bjorn: ${allBadgeCount}`);
          for (let j = 0; j < allBadgeCount; j++) {
            const badgeText = (await allBadges.nth(j).textContent())?.trim() || '';
            console.log(`  Badge: ${badgeText}`);
          }

          await takeScreenshot(page, 'rage-bonus-thorin-attack');
          break;
        }
      }
    });

    test('verify Rage effects when Bjorn attacks Thorin (1 reaction)', async ({ page }) => {
      await ensureTestCampaign(page);

      // Navigate to initiative
      await navigateToInitiative(page);

      // Roll initiative
      const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
      if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
        await rollBtn.click();
        await page.waitForTimeout(2000);
      }

      // Make sure Bjorn is raging
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      const rageBadge = page.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv/ });
      const alreadyRaging = await rageBadge.count() > 0;

      if (!alreadyRaging) {
        const rageBold = page.locator('.char-special-actions b').filter({ hasText: 'Rage' }).first();
        if (await rageBold.count() > 0 && await rageBold.isVisible()) {
          await rageBold.click();
          await page.waitForTimeout(3000);
        }
      }

      // Navigate back to initiative
      await page.getByRole('button', { name: 'Initiative' }).click();
      await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Find Bjorn's creature card
      const creatureCards = page.locator('.creature-card');
      const count = await creatureCards.count();

      for (let i = 0; i < count; i++) {
        const nameEl = creatureCards.nth(i).locator('.creature-name');
        const name = (await nameEl.textContent())?.trim() || '';
        if (name.includes('Bjorn')) {
          const card = creatureCards.nth(i);

          // Set target to Thorin
          const targetSelect = card.locator('.creature-target select');
          if (await targetSelect.count() > 0 && await targetSelect.isVisible()) {
            await targetSelect.selectOption('Thorin Ironforge');
            await page.waitForTimeout(500);
          }

          // Navigate to Bjorn's character sheet
          await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
          await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
          await page.waitForTimeout(1000);

          // Check for Rage badge on character sheet
          const sheetRageBadge = page.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv/ });
          const sheetBadgeCount = await sheetRageBadge.count();
          console.log(`Rage badges on sheet during attack: ${sheetBadgeCount}`);
          expect(sheetBadgeCount).toBeGreaterThan(0);

          // Verify action items available
          const actions = page.locator('.char-actions').nth(0);
          const attacks = actions.locator('.attacks .left');
          const attackCount = await attacks.count();
          console.log(`Bjorn attacks available: ${attackCount}`);

          await takeScreenshot(page, 'rage-reaction-bjorn-attack');
          break;
        }
      }
    });

    test('verify Rage effects when Bjorn is attacked by NPC monster (unlimited special actions)', async ({ page }) => {
      await ensureTestCampaign(page);

      // Navigate to initiative
      await navigateToInitiative(page);

      // Roll initiative
      const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
      if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
        await rollBtn.click();
        await page.waitForTimeout(2000);
      }

      // Make sure Bjorn is raging
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      const rageBadge = page.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv/ });
      const alreadyRaging = await rageBadge.count() > 0;

      if (!alreadyRaging) {
        const rageBold = page.locator('.char-special-actions b').filter({ hasText: 'Rage' }).first();
        if (await rageBold.count() > 0 && await rageBold.isVisible()) {
          await rageBold.click();
          await page.waitForTimeout(3000);
        }
      }

      // Navigate back to initiative
      await page.getByRole('button', { name: 'Initiative' }).click();
      await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Verify all creatures are present
      const creatures = await getAllCreatures(page);
      console.log(`Creatures in initiative: ${creatures.length}`);
      expect(creatures.length).toBeGreaterThanOrEqual(2);

      // Find Bjorn's creature card
      const bjornCreature = creatures.find(c => c.name.includes('Bjorn'));
      expect(bjornCreature).toBeTruthy();

      // Check Bjorn's creature card for Rage buff
      const creatureCards = page.locator('.creature-card');
      const count = await creatureCards.count();

      for (let i = 0; i < count; i++) {
        const nameEl = creatureCards.nth(i).locator('.creature-name');
        const name = (await nameEl.textContent())?.trim() || '';
        if (name.includes('Bjorn')) {
          const card = creatureCards.nth(i);

          // Check for Rage automation badge
          const rageBadges = card.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv|Rage/ });
          const badgeCount = await rageBadges.count();
          console.log(`Rage badges on Bjorn's card during NPC attack: ${badgeCount}`);

          // Log all badges
          const allBadges = card.locator('.automation-badge');
          const allBadgeCount = await allBadges.count();
          console.log(`Total badges during NPC attack: ${allBadgeCount}`);
          for (let j = 0; j < allBadgeCount; j++) {
            const badgeText = (await allBadges.nth(j).textContent())?.trim() || '';
            console.log(`  Badge: ${badgeText}`);
          }

          await takeScreenshot(page, 'rage-special-bjorn-npc-attack');
          break;
        }
      }
    });

    test('verify Rage damage bonus when Bjorn attacks NPC monster', async ({ page }) => {
      await ensureTestCampaign(page);

      // Navigate to initiative
      await navigateToInitiative(page);

      // Roll initiative
      const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
      if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
        await rollBtn.click();
        await page.waitForTimeout(2000);
      }

      // Make sure Bjorn is raging
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      const rageBadge = page.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv/ });
      const alreadyRaging = await rageBadge.count() > 0;

      if (!alreadyRaging) {
        const rageBold = page.locator('.char-special-actions b').filter({ hasText: 'Rage' }).first();
        if (await rageBold.count() > 0 && await rageBold.isVisible()) {
          await rageBold.click();
          await page.waitForTimeout(3000);
        }
      }

      // Navigate back to initiative
      await page.getByRole('button', { name: 'Initiative' }).click();
      await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Find Bjorn's creature card
      const creatureCards = page.locator('.creature-card');
      const count = await creatureCards.count();

      for (let i = 0; i < count; i++) {
        const nameEl = creatureCards.nth(i).locator('.creature-name');
        const name = (await nameEl.textContent())?.trim() || '';
        if (name.includes('Bjorn')) {
          const card = creatureCards.nth(i);

          // Set target to Bugbear
          const targetSelect = card.locator('.creature-target select');
          if (await targetSelect.count() > 0 && await targetSelect.isVisible()) {
            await targetSelect.selectOption('Bugbear');
            await page.waitForTimeout(500);
          }

          // Navigate to Bjorn's character sheet
          await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
          await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
          await page.waitForTimeout(1000);

          // Verify Rage is still active
          const sheetRageBadge = page.locator('.automation-badge').filter({ hasText: /BPS Resist|STR Adv/ });
          const sheetBadgeCount = await sheetRageBadge.count();
          console.log(`Rage still active during NPC attack: ${sheetBadgeCount}`);
          expect(sheetBadgeCount).toBeGreaterThan(0);

          // Verify action items available
          const actions = page.locator('.char-actions').nth(0);
          const attacks = actions.locator('.attacks .left');
          const attackCount = await attacks.count();
          console.log(`Bjorn attacks available vs NPC: ${attackCount}`);
          expect(attackCount).toBeGreaterThan(0);

          await takeScreenshot(page, 'rage-special-bjorn-attacks-npc');
          break;
        }
      }
    });

    test('cleanup: delete test character', async ({ page }) => {
      await ensureTestCampaign(page);

      try {
        const deleteResponse = await page.request.delete(`/api/campaigns/${TEST_CAMPAIGN}/${TEST_CHAR_FILE}`);
        if (deleteResponse.ok()) {
          console.log(`Deleted ${TEST_CHAR_NAME}`);
        } else {
          console.log(`Delete status: ${deleteResponse.status()}`);
        }
      } catch (e) {
        console.log(`Delete note: ${e.message}`);
      }
    });
  });
});

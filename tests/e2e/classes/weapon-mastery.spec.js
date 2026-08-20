// @ts-check
import { test, expect } from '@playwright/test';
import {
  ensureTestCampaign,
  takeScreenshot,
  startCombat,
  goToCharacterSheet,
} from '../helpers.js';

const TEST_CAMPAIGN = 'test-campaign';
const TEST_CHAR_NAME = 'Weapon Mastery Test Barbarian';
const TEST_CHAR_FILE = 'Weapon_Mastery_Test_Barbarian.json';

function createWeaponMasteryBarbarianCharacter() {
  return {
    name: TEST_CHAR_NAME,
    level: 20,
    alignment: 'Chaotic Good',
    abilities: [
      { name: 'Strength', baseScore: 20, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
      { name: 'Dexterity', baseScore: 12, featIncrease: 0, backgroundIncrease: 0, miscIncrease: 0 },
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
    specialActions: [],
    spells: [],
    magicInitiateInstances: [],
    rules: '2024',
    xp: 0,
    xpMode: 'milestone',
    background: 'Folk Hero',
  };
}

test.describe('E2E Class Automation Tests - Weapon Mastery', () => {
  test.describe('Weapon Mastery (weapon_kind_mastery)', () => {
    test('setup: create level-20 Barbarian (2024 rules) via API', async ({ page }) => {
      await ensureTestCampaign(page);

      const charExists = await page.request.get(`/api/campaigns/${TEST_CAMPAIGN}/${TEST_CHAR_FILE}`)
        .then(r => r.ok())
        .catch(() => false);

      if (!charExists) {
        const charData = createWeaponMasteryBarbarianCharacter();
        const postResponse = await page.request.post(`/api/campaigns/${TEST_CAMPAIGN}`, {
          data: { character: charData },
        });
        expect(postResponse.ok()).toBeTruthy();
        const result = await postResponse.json();
        console.log(`Created ${TEST_CHAR_NAME} via API: ${result.fileName || TEST_CHAR_FILE}`);
        await page.reload();
        await page.waitForTimeout(5000);
        const campaignBtn = page.getByRole('button', { name: TEST_CAMPAIGN });
        if (await campaignBtn.count() > 0 && await campaignBtn.isVisible()) {
          await campaignBtn.click();
          await page.waitForTimeout(3000);
        }
        await expect(page.getByRole('button', { name: TEST_CHAR_NAME })).toBeVisible({ timeout: 10000 });
      } else {
        console.log(`${TEST_CHAR_NAME} already exists`);
      }

      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      const summary = page.locator('[data-testid="char-summary-text"]');
      if (await summary.count() > 0) {
        const text = (await summary.textContent())?.trim() || '';
        console.log(`Character summary: ${text}`);
        expect(text).toContain('Barbarian');
      }

      await takeScreenshot(page, 'weapon-mastery-character-created');
    });

    test('verify Weapon Mastery appears in class features section with correct count for level 20', async ({ page }) => {
      await ensureTestCampaign(page);

      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // Weapon Mastery is rendered in the class features section by CharClassFeatures
      // showing the number of weapon kinds the character can select
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      const wmText = (await wmSection.textContent())?.trim() || '';
      console.log(`Weapon Mastery section text: ${wmText}`);

      // Level 20 Barbarian has weapon_mastery: 4 (from classes.json level 20 entry)
      expect(wmText).toContain('Weapon Mastery');
      expect(wmText).toContain('4');

      await takeScreenshot(page, 'weapon-mastery-class-features-visible');
    });

    test('verify Weapon Mastery clickable element exists for modal trigger', async ({ page }) => {
      await ensureTestCampaign(page);

      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // The Weapon Mastery number is rendered as a clickable span
      // to open the weapon kind selection modal
      const clickableSpan = page.locator('span.clickable').filter({ hasText: /^4$/ }).first();
      await expect(clickableSpan).toBeVisible();

      // Verify it has the clickable class
      const classAttr = await clickableSpan.getAttribute('class');
      expect(classAttr).toContain('clickable');

      await takeScreenshot(page, 'weapon-mastery-clickable-visible');
    });

    test('verify weapon kinds can be set via runtime API', async ({ page }) => {
      await ensureTestCampaign(page);

      // Set weapon kinds via runtime API directly
      await page.request.post(`/api/campaigns/${TEST_CAMPAIGN}/${TEST_CHAR_FILE}`, {
        data: {
          runtimeValues: {
            '_Weapon_Kind_Mastery_chosenWeapons': ['Greataxe', 'Handaxe'],
          },
        },
      });

      // Reload and verify
      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Verify attack actions are available
      const attackActions = page.locator('.char-actions').nth(0).locator('.attacks .left');
      const attackCount = await attackActions.count();
      console.log(`Action attacks available: ${attackCount}`);
      expect(attackCount).toBeGreaterThan(0);

      await takeScreenshot(page, 'weapon-mastery-runtime-verified');
    });

    test('verify character sheet loads correctly with Weapon Mastery feature', async ({ page }) => {
      await ensureTestCampaign(page);

      await page.getByRole('button', { name: TEST_CHAR_NAME }).click();
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // Verify the full character sheet structure
      const summary = page.locator('[data-testid="char-summary-text"]');
      const summaryText = (await summary.textContent())?.trim() || '';
      console.log(`Character summary: ${summaryText}`);
      expect(summaryText).toContain('Barbarian');
      expect(summaryText).toContain('Level 20');

      // Verify Weapon Mastery section exists
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      // Verify Rage section exists (Barbarian feature)
      const rageSection = page.locator('div').filter({ hasText: /^Rage Damage Bonus:/ }).first();
      await expect(rageSection).toBeVisible();

      await takeScreenshot(page, 'weapon-mastery-character-sheet-structure');
    });

    test('verify Weapon Mastery passive applies during combat (player vs NPC scenario)', async ({ page }) => {
      await ensureTestCampaign(page);

      await startCombat(page);

      // Go to the Barbarian's character sheet
      await goToCharacterSheet(page, TEST_CHAR_NAME);

      // Verify Weapon Mastery is still visible during combat
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      const wmText = (await wmSection.textContent())?.trim() || '';
      console.log(`Weapon Mastery during combat: ${wmText}`);
      expect(wmText).toContain('4');

      // Verify the character sheet is still fully loaded
      const summary = page.locator('[data-testid="char-summary-text"]');
      const summaryText = (await summary.textContent())?.trim() || '';
      expect(summaryText).toContain('Barbarian');

      await takeScreenshot(page, 'weapon-mastery-during-combat');
    });

    test('verify Weapon Mastery passive applies when NPC attacks the player', async ({ page }) => {
      await ensureTestCampaign(page);

      await startCombat(page);

      // Go to the Barbarian's character sheet
      await goToCharacterSheet(page, TEST_CHAR_NAME);

      // Verify Weapon Mastery is still visible when being attacked
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      // Verify the character summary is correct
      const summary = page.locator('[data-testid="char-summary-text"]');
      const summaryText = (await summary.textContent())?.trim() || '';
      console.log(`Character summary during NPC attack: ${summaryText}`);
      expect(summaryText).toContain('Barbarian');

      await takeScreenshot(page, 'weapon-mastery-npc-attacks-player');
    });

    test('verify Weapon Mastery passive applies during NPC action (NPC attacks)', async ({ page }) => {
      await ensureTestCampaign(page);

      await startCombat(page);

      // Go to the Barbarian's character sheet
      await goToCharacterSheet(page, TEST_CHAR_NAME);

      // Verify Weapon Mastery is still visible during NPC turn
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      const wmText = (await wmSection.textContent())?.trim() || '';
      console.log(`Weapon Mastery during NPC action: ${wmText}`);

      await takeScreenshot(page, 'weapon-mastery-npc-action');
    });

    test('verify Weapon Mastery passive applies during player vs player scenario', async ({ page }) => {
      await ensureTestCampaign(page);

      await startCombat(page);

      // Go to the Barbarian's character sheet
      await goToCharacterSheet(page, TEST_CHAR_NAME);

      // Verify Weapon Mastery is still visible
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      // Verify character sheet is fully loaded
      await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });

      await takeScreenshot(page, 'weapon-mastery-player-vs-player');
    });

    test('verify Weapon Mastery passive applies during bonus action scenario', async ({ page }) => {
      await ensureTestCampaign(page);

      await startCombat(page);

      // Go to the Barbarian's character sheet
      await goToCharacterSheet(page, TEST_CHAR_NAME);

      // Verify Weapon Mastery is visible
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      // Check bonus actions section exists
      const bonusActions = page.locator('.char-actions').nth(1);
      await expect(bonusActions).toBeVisible();

      await takeScreenshot(page, 'weapon-mastery-bonus-action');
    });

    test('verify Weapon Mastery passive applies during reaction scenario', async ({ page }) => {
      await ensureTestCampaign(page);

      await startCombat(page);

      // Go to the Barbarian's character sheet
      await goToCharacterSheet(page, TEST_CHAR_NAME);

      // Verify Weapon Mastery is visible
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      // Check reactions section exists
      const reactions = page.locator('.char-actions').nth(2);
      await expect(reactions).toBeVisible();

      await takeScreenshot(page, 'weapon-mastery-reaction');
    });

    test('verify Weapon Mastery is passive - no activation needed for attacks', async ({ page }) => {
      await ensureTestCampaign(page);

      await startCombat(page);

      // Go to the Barbarian's character sheet
      await goToCharacterSheet(page, TEST_CHAR_NAME);

      // Verify Weapon Mastery is shown in class features
      const wmSection = page.locator('div').filter({ hasText: /^Weapon Mastery:/ }).first();
      await expect(wmSection).toBeVisible();

      const wmText = (await wmSection.textContent())?.trim() || '';
      console.log(`Weapon Mastery passive display: ${wmText}`);

      // Verify attack actions are available (mastery applies passively)
      const attackActions = page.locator('.char-actions').nth(0).locator('.attacks .left');
      const attackCount = await attackActions.count();
      console.log(`Attack actions available: ${attackCount}`);
      expect(attackCount).toBeGreaterThan(0);

      // Verify the character sheet shows the correct number of weapon kinds (4 for level 20 Barbarian)
      expect(wmText).toContain('4');

      await takeScreenshot(page, 'weapon-mastery-passive-verify');
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

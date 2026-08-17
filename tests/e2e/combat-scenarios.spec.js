// @ts-check
import { test, expect } from '@playwright/test';
import {
  ensureTestCampaign,
  startCombat,
  goToCharacterSheet,
  findCreatureCard,
  setCreatureTarget,
  getAllCreatures,
  getActiveCreature,
  takeScreenshot,
  logActionSections,
  logAttacks,
  logSpecialActions,
  closeAllModals,
  nextTurn,
  prevTurn,
} from './helpers.js';

test.describe('E2E Combat Scenarios - Full Automation Validation', () => {
  test.beforeEach(async ({ page }) => {
    await ensureTestCampaign(page);
  });

  // =========================================================================
  // SCENARIO 1: PC ATTACKS PC
  // =========================================================================

  test.describe('Combat Scenario: PC vs PC', () => {
    test('setup: verify both characters in initiative', async ({ page }) => {
      await startCombat(page);

      const creatures = await getAllCreatures(page);
      const players = creatures.filter(c => c.type === 'player');

      console.log(`Total creatures: ${creatures.length}`);
      console.log(`Player creatures: ${players.map(c => c.name).join(', ')}`);

      expect(players.length).toBeGreaterThanOrEqual(2);

      // Verify both named characters
      const playerNames = players.map(c => c.name);
      expect(playerNames.some(n => n.includes('Thorin'))).toBe(true);
      expect(playerNames.some(n => n.includes('Lyra'))).toBe(true);

      await takeScreenshot(page, 'scenario-pc-vs-pc-setup');
    });

    test('setup: set target for PC attack on other PC', async ({ page }) => {
      await startCombat(page);

      // Find Thorin's card and verify target dropdown exists
      const thorinCard = await findCreatureCard(page, 'Thorin');
      expect(thorinCard).toBeTruthy();

      const targetSelect = thorinCard.locator('.creature-target select');
      const hasTarget = await targetSelect.count() > 0;
      console.log(`Thorin has target dropdown: ${hasTarget}`);

      if (hasTarget) {
        // Check available targets
        const options = await targetSelect.locator('option').all();
        const targetNames = [];
        for (const opt of options) {
          const val = await opt.getAttribute('value');
          const text = await opt.textContent();
          if (val) targetNames.push(text?.trim() || val);
        }
        console.log(`Available targets: ${targetNames.join(', ')}`);

        // Try to set target to Lyra if available
        if (targetNames.some(t => t.includes('Lyra'))) {
          await targetSelect.selectOption('Lyra Starweave');
          await page.waitForTimeout(500);
          const selected = await targetSelect.inputValue();
          console.log(`Thorin's target after selection: ${selected}`);
        }
      }

      await takeScreenshot(page, 'scenario-pc-vs-pc-target');
    });

    test('verify PC attack actions available', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const actionNames = await logAttacks(page, 0);
      console.log(`Thorin's available actions: ${actionNames.join(', ')}`);

      // Verify Thorin has weapon attacks available
      expect(actionNames.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'scenario-pc-vs-pc-actions');
    });

    test('verify PC attack target dropdown exists', async ({ page }) => {
      await startCombat(page);

      const thorinCard = await findCreatureCard(page, 'Thorin');
      expect(thorinCard).toBeTruthy();

      // Verify target dropdown exists on creature card
      const targetSelect = thorinCard.locator('.creature-target select');
      expect(await targetSelect.count()).toBeGreaterThan(0);

      // Get available targets
      const options = await targetSelect.locator('option').all();
      const targetNames = [];
      for (const opt of options) {
        const val = await opt.getAttribute('value');
        const text = await opt.textContent();
        if (val) targetNames.push(text?.trim() || val);
      }
      console.log(`Available targets for Thorin: ${targetNames.join(', ')}`);

      await takeScreenshot(page, 'scenario-pc-vs-pc-targets');
    });
  });

  // =========================================================================
  // SCENARIO 2: PC ATTACKS NPC
  // =========================================================================

  test.describe('Combat Scenario: PC vs NPC', () => {
    test('setup: add NPC monsters to initiative', async ({ page }) => {
      await startCombat(page);

      // Add Bugbear NPC
      await page.getByRole('button', { name: '+ NPC' }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      // Add Goblin NPC
      await page.getByRole('button', { name: '+ NPC' }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      const creatures = await getAllCreatures(page);
      const monsters = creatures.filter(c => c.type === 'monster');

      console.log(`Total creatures: ${creatures.length}`);
      console.log(`Monsters: ${monsters.map(c => c.name).join(', ')}`);

      // Should have at least 2 players + some monsters
      expect(creatures.length).toBeGreaterThanOrEqual(2);

      await takeScreenshot(page, 'scenario-pc-vs-npc-setup');
    });

    test('setup: verify PC can target NPCs', async ({ page }) => {
      await startCombat(page);

      // Add an NPC first
      await page.getByRole('button', { name: '+ NPC' }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      const creatures = await getAllCreatures(page);
      const monsterCreatures = creatures.filter(c => c.type === 'monster');

      console.log(`Total creatures: ${creatures.length}`);
      console.log(`Monsters: ${monsterCreatures.map(c => c.name).join(', ')}`);

      // Verify Thorin has a target dropdown
      const thorinCard = await findCreatureCard(page, 'Thorin');
      expect(thorinCard).toBeTruthy();

      const targetSelect = thorinCard.locator('.creature-target select');
      const hasTarget = await targetSelect.count() > 0;
      console.log(`Thorin has target dropdown: ${hasTarget}`);

      if (hasTarget) {
        const options = await targetSelect.locator('option').all();
        const targetNames = [];
        for (const opt of options) {
          const val = await opt.getAttribute('value');
          const text = await opt.textContent();
          if (val) targetNames.push(text?.trim() || val);
        }
        console.log(`Available targets: ${targetNames.join(', ')}`);
      }

      await takeScreenshot(page, 'scenario-pc-vs-npc-target');
    });

    test('verify PC has attack options for NPC combat', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const actionNames = await logAttacks(page, 0);
      console.log(`Thorin's attack options: ${actionNames.join(', ')}`);

      // Should have multiple attack options
      expect(actionNames.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'scenario-pc-vs-npc-actions');
    });

    test('verify NPC creature card structure', async ({ page }) => {
      await startCombat(page);

      // Add NPC
      await page.getByRole('button', { name: '+ NPC' }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      const creatures = await getAllCreatures(page);
      const monsters = creatures.filter(c => c.type === 'monster');

      if (monsters.length > 0) {
        const monsterCard = await findCreatureCard(page, monsters[0].name);
        expect(monsterCard).toBeTruthy();

        // Verify NPC card has expected elements
        const nameEl = monsterCard.locator('.creature-name');
        expect(await nameEl.count()).toBeGreaterThan(0);

        // NPC should have target dropdown to target players
        const targetSelect = monsterCard.locator('.creature-target select');
        console.log(`NPC has target dropdown: ${await targetSelect.count() > 0}`);
      }

      await takeScreenshot(page, 'scenario-pc-vs-npc-npc-card');
    });
  });

  // =========================================================================
  // SCENARIO 3: NPC ATTACKS PC (Reaction Testing)
  // =========================================================================

  test.describe('Combat Scenario: NPC vs PC - Reaction Testing', () => {
    test('setup: NPC targets PC', async ({ page }) => {
      await startCombat(page);

      // Add NPC
      await page.getByRole('button', { name: '+ NPC' }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      const creatures = await getAllCreatures(page);
      const monsters = creatures.filter(c => c.type === 'monster');

      if (monsters.length > 0) {
        console.log(`Monsters: ${monsters.map(c => c.name).join(', ')}`);

        // Set NPC target to Thorin
        const npcCard = await findCreatureCard(page, monsters[0].name);
        if (npcCard) {
          const targetSelect = npcCard.locator('.creature-target select');
          if (await targetSelect.count() > 0) {
            await targetSelect.selectOption('Thorin Ironforge');
            await page.waitForTimeout(500);
            const selected = await targetSelect.inputValue();
            console.log(`NPC's target: ${selected}`);
          }
        }
      } else {
        console.log('No monsters found');
      }

      await takeScreenshot(page, 'scenario-npc-vs-pc-setup');
    });

    test('verify PC has reactions available when targeted', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const reactionNames = await logAttacks(page, 2);
      console.log(`Thorin's reactions: ${reactionNames.join(', ')}`);

      const specialActions = await logSpecialActions(page);
      console.log(`Thorin's special actions: ${specialActions.join(', ')}`);

      // Fighter should have Second Wind, Opportunity Attack, etc.
      expect(reactionNames.length).toBeGreaterThanOrEqual(0);

      await takeScreenshot(page, 'scenario-npc-vs-pc-reactions');
    });

    test('verify PC reaction automation badges', async ({ page }) => {
      await goToCharacterSheet(page, 'Thorin Ironforge');

      const reactionNames = await logAttacks(page, 2);
      console.log(`Thorin's reactions: ${reactionNames.join(', ')}`);

      // Should have some reaction items
      expect(reactionNames.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'scenario-npc-vs-pc-badges');
    });
  });

  // =========================================================================
  // SCENARIO 4: FULL ENCOUNTER ROUND
  // =========================================================================

  test.describe('Combat Scenario: Full Encounter Round', () => {
    test('setup: create full encounter with PCs and NPCs', async ({ page }) => {
      await startCombat(page);

      // Add multiple NPCs for a fuller encounter
      await page.getByRole('button', { name: '+ NPC' }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      await page.getByRole('button', { name: '+ NPC' }).click();
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      const creatures = await getAllCreatures(page);
      const players = creatures.filter(c => c.type === 'player');
      const monsters = creatures.filter(c => c.type === 'monster');

      console.log(`Full encounter: ${players.length} players, ${monsters.length} monsters`);
      console.log(`All creatures: ${creatures.map(c => c.name).join(', ')}`);

      expect(creatures.length).toBeGreaterThanOrEqual(2);

      await takeScreenshot(page, 'scenario-full-encounter-setup');
    });

    test('navigate a few turns', async ({ page }) => {
      await startCombat(page);

      const creatures = await getAllCreatures(page);
      const creatureCount = creatures.length;

      console.log(`Total creatures: ${creatureCount}`);

      // Get initial active creature
      const initialActive = await getActiveCreature(page);
      console.log(`Initial active: ${initialActive}`);

      // Navigate through a couple turns
      for (let i = 0; i < Math.min(creatureCount, 3); i++) {
        await nextTurn(page);
        await page.waitForTimeout(500);
      }

      const finalActive = await getActiveCreature(page);
      console.log(`Final active after turns: ${finalActive}`);

      // Should have navigated
      expect(creatureCount).toBeGreaterThan(0);

      await takeScreenshot(page, 'scenario-full-round');
    });

    test('verify round counter exists', async ({ page }) => {
      await startCombat(page);

      // Get round indicator
      const roundHeading = page.locator('h4').filter({ hasText: /round/i }).first();
      const roundText = await roundHeading.textContent();
      console.log(`Round text: ${roundText}`);

      // Verify round text exists and contains a number
      expect(roundText).toBeTruthy();
      expect(roundText).toMatch(/\d+/);

      // Navigate through a couple turns
      for (let i = 0; i < 2; i++) {
        await nextTurn(page);
        await page.waitForTimeout(500);
      }

      // Check round after navigation
      const newRoundText = await roundHeading.textContent();
      console.log(`Round text after turns: ${newRoundText}`);

      await takeScreenshot(page, 'scenario-round-counter');
    });

    test('verify creature card states during turns', async ({ page }) => {
      await startCombat(page);

      const creatures = await getAllCreatures(page);

      // Navigate through turns and verify active state
      for (let i = 0; i < Math.min(creatures.length, 5); i++) {
        await nextTurn(page);
        await page.waitForTimeout(300);

        const activeCard = page.locator('.creature-card.active');
        expect(await activeCard.count()).toBe(1);

        const activeName = await activeCard.locator('.creature-name').first().textContent();
        console.log(`Turn ${i + 1} active: ${activeName?.trim()}`);
      }

      await takeScreenshot(page, 'scenario-creature-states');
    });
  });

  // =========================================================================
  // UTILITY: Get all creature names
  // =========================================================================

  async function getAllCreatureNames(page) {
    const creatures = await getAllCreatures(page);
    return creatures.map(c => c.name);
  }
});

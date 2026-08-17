// @ts-check
import { expect } from '@playwright/test';

/**
 * E2E helper functions for D&D Campaign Suite testing.
 */

/**
 * Create a new campaign with the given name.
 * The page auto-reloads 2 seconds after creation.
 */
export async function createCampaign(page, campaignName) {
  // Click the "Add" button to create a new campaign
  await page.getByRole('button', { name: 'Add' }).click();

  // Wait for the modal to appear and fill in the campaign name
  await page.getByPlaceholder('Enter campaign name').fill(campaignName);
  await page.getByRole('button', { name: 'Create' }).click();

  // Wait for success message with emoji
  await expect(page.getByText('✅ Campaign created successfully!')).toBeVisible({ timeout: 10000 });

  // Wait for page reload (success message disappears and campaign list reappears)
  await expect(page.getByRole('button', { name: campaignName })).toBeVisible({ timeout: 10000 });
}

/**
 * Select a campaign by name from the campaign list.
 */
export async function selectCampaign(page, campaignName) {
  await expect(page.getByRole('button', { name: campaignName })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: campaignName }).click();

  // Wait for the app to load (sidebar or character wizard should appear)
  // If no characters, wizard auto-opens
  const [sidebarLoaded, wizardOpened] = await Promise.all([
    page.locator('.sidebar').isVisible().catch(() => false),
    page.locator('.character-creation-wizard-overlay').isVisible().catch(() => false),
  ]);

  if (!sidebarLoaded && !wizardOpened) {
    // Wait a bit for loading to complete
    await page.waitForTimeout(2000);
  }
}

/**
 * Open the character creation wizard by clicking "Add Character" in sidebar.
 */
export async function openCharacterWizard(page) {
  // Wait for sidebar to be ready
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });

  // The "Add Character" button is in the sidebar
  await page.getByRole('button', { name: 'Add Character' }).click();

  // Wait for the wizard overlay to appear
  await expect(page.locator('.character-creation-wizard-overlay')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to a wizard step by clicking the sidebar tab.
 */
export async function navigateToWizardStep(page, stepTitle) {
  // Click the sidebar tab by its title text
  const tabs = page.locator('.sidebar-tab');
  const count = await tabs.count();
  for (let i = 0; i < count; i++) {
    const title = await tabs.nth(i).locator('.sidebar-tab-title').textContent();
    if (title && title.includes(stepTitle)) {
      await tabs.nth(i).click();
      await page.waitForTimeout(500);
      return;
    }
  }
  throw new Error(`Step "${stepTitle}" not found in wizard sidebar`);
}

/**
 * Click the Next button in the wizard.
 */
export async function clickWizardNext(page) {
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(300);
}

/**
 * Click the Previous button in the wizard.
 */
export async function clickWizardPrevious(page) {
  await page.getByRole('button', { name: 'Previous' }).click();
  await page.waitForTimeout(300);
}

/**
 * Click the Save button in the wizard sidebar.
 */
export async function clickWizardSave(page) {
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(500);
}

/**
 * Click the Create Character button (final step).
 */
export async function clickCreateCharacter(page) {
  await page.getByRole('button', { name: 'Create Character' }).click();

  // Wait for the wizard to close and character to appear in sidebar
  await expect(page.locator('.character-creation-wizard-overlay')).toBeHidden({ timeout: 15000 });
}

/**
 * Select a race from the race dropdown.
 */
export async function selectRace(page, raceName) {
  await page.getByLabel('Race *').selectOption(raceName);
  await page.waitForTimeout(300);
}

/**
 * Select a subrace from the subrace dropdown.
 */
export async function selectSubrace(page, subraceName) {
  await page.getByLabel('Subrace *').selectOption(subraceName);
  await page.waitForTimeout(300);
}

/**
 * Select a background from the background dropdown.
 */
export async function selectBackground(page, backgroundName) {
  await page.getByLabel('Background *').selectOption(backgroundName);
  await page.waitForTimeout(300);
}

/**
 * Select a class from the class dropdown.
 */
export async function selectClass(page, className) {
  await page.getByLabel('Class *').selectOption(className);
  await page.waitForTimeout(300);
}

/**
 * Select a subclass from the subclass dropdown.
 */
export async function selectSubclass(page, subclassName) {
  await page.getByLabel('Subclass / Major *').selectOption(subclassName);
  await page.waitForTimeout(300);
}

/**
 * Select a feat from the feats selectable list by searching and clicking.
 */
export async function selectFeat(page, featName) {
  // Find the search input in the feats step
  const searchInputs = page.locator('.wizard-step-feats input[type="text"]');
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill(featName);
    await page.waitForTimeout(500);
  }

  // Click the feat item to select it
  await page.getByRole('listitem').filter({ hasText: featName }).first().click();
  await page.waitForTimeout(300);

  // Clear the search
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill('');
    await page.waitForTimeout(300);
  }
}

/**
 * Set ability score base value for a given ability.
 */
export async function setAbilityScore(page, abilityName, baseScore) {
  const abilityKey = abilityName.toLowerCase().replace(/[^a-z]/g, '');
  const input = page.locator(`#base-score-${abilityKey}`);
  if (await input.count() > 0) {
    await input.fill(baseScore.toString());
  }
  await page.waitForTimeout(200);
}

/**
 * Set the character name in the basic info step.
 */
export async function setCharacterName(page, name) {
  await page.getByLabel('Character Name *').fill(name);
  await page.waitForTimeout(200);
}

/**
 * Set the character level in the basic info step.
 */
export async function setCharacterLevel(page, level) {
  await page.getByLabel('Level *').fill(level.toString());
  await page.waitForTimeout(200);
}

/**
 * Navigate to the initiative view.
 */
export async function navigateToInitiative(page) {
  await page.getByRole('button', { name: 'Initiative' }).click();
  await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to the encounter builder view.
 */
export async function navigateToEncounter(page) {
  await page.getByRole('button', { name: 'Encounter' }).click();
  await expect(page.locator('.encounter-builder')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to the character sheet view by clicking the character name in sidebar.
 */
export async function navigateToCharacterSheet(page, characterName) {
  await page.getByRole('button', { name: characterName }).click();
  await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
}

/**
 * Click the "Add NPC" button in initiative.
 */
export async function addNPC(page, npcName) {
  await page.getByRole('button', { name: '+ NPC' }).click();
  // Wait for NPC name autocomplete to appear
  await page.waitForTimeout(500);
  if (npcName) {
    await page.getByPlaceholder('Search for a creature...').fill(npcName);
    await page.waitForTimeout(500);
    await page.getByText(npcName).first().click();
  }
}

/**
 * Roll initiative by clicking the "Roll Initiative" button on character sheet.
 */
export async function rollInitiative(page) {
  await page.getByRole('button', { name: 'Roll Initiative' }).click();
  await page.waitForTimeout(1000);
}

/**
 * Click the Next turn button in initiative.
 */
export async function nextTurn(page) {
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.waitForTimeout(500);
}

/**
 * Click the Previous turn button in initiative.
 */
export async function prevTurn(page) {
  await page.getByRole('button', { name: '← Prev' }).click();
  await page.waitForTimeout(500);
}

/**
 * Click an attack/action on the character sheet.
 */
export async function clickAttack(page, attackName) {
  await page.getByText(attackName).first().click();
  await page.waitForTimeout(500);
}

/**
 * Select a target from the target dropdown on a creature card.
 */
export async function selectTarget(page, targetName) {
  await page.getByLabel('Target').selectOption(targetName);
  await page.waitForTimeout(300);
}

/**
 * Wait for the app to be fully loaded after navigation.
 */
export async function waitForAppReady(page) {
  // Wait for sidebar to be visible
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });
}

/**
 * Wait for a modal/dialog to appear.
 */
export async function waitForModal(page, modalSelector) {
  await expect(page.locator(modalSelector)).toBeVisible({ timeout: 10000 });
}

/**
 * Close a modal by pressing Escape.
 */
export async function closeModal(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Get all creature names from the initiative tracker.
 */
export async function getCreatureNames(page) {
  const creatures = page.locator('.creature-card');
  const names = [];
  const count = await creatures.count();
  for (let i = 0; i < count; i++) {
    const nameEl = creatures.nth(i).locator('.creature-name');
    if (await nameEl.count() > 0) {
      names.push((await nameEl.textContent()).trim());
    }
  }
  return names;
}

/**
 * Get the current round number from the initiative tracker.
 */
export async function getCurrentRound(page) {
  const heading = page.locator('h4').filter({ hasText: /round/i }).first();
  const text = await heading.textContent();
  const match = text.match(/round\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

/**
 * Select a spell from the spells selectable list by searching.
 */
export async function selectSpell(page, spellName) {
  const searchInputs = page.locator('.wizard-step-spells input[type="text"]');
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill(spellName);
    await page.waitForTimeout(500);
  }

  // Click the spell item to select it
  await page.getByRole('listitem').filter({ hasText: spellName }).first().click();
  await page.waitForTimeout(300);

  // Clear the search
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill('');
    await page.waitForTimeout(300);
  }
}

/**
 * Select a magic item from the magic items selectable list.
 */
export async function selectMagicItem(page, itemName) {
  const searchInputs = page.locator('.wizard-step-magic-items input[type="text"]');
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill(itemName);
    await page.waitForTimeout(500);
  }

  // Click the item to select it
  await page.getByRole('listitem').filter({ hasText: itemName }).first().click();
  await page.waitForTimeout(300);

  // Clear the search
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill('');
    await page.waitForTimeout(300);
  }
}

/**
 * Toggle a checkbox in a multi-select container by label text.
 */
export async function toggleMultiSelect(page, labelText) {
  const label = page.locator('label.multi-select-item').filter({ hasText: labelText });
  const checkbox = label.locator('input[type="checkbox"]');
  const isChecked = await checkbox.isChecked();
  if (!isChecked) {
    await label.click();
    await page.waitForTimeout(200);
  }
}

/**
 * Enter gold pieces in the inventory step.
 */
export async function setGoldPieces(page, amount) {
  await page.getByLabel('Gold Pieces *').fill(amount.toString());
  await page.waitForTimeout(200);
}

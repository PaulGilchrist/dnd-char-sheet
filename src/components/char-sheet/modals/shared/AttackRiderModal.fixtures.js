import { screen, fireEvent } from '@testing-library/react';

export const defaultPlayerStats = { name: 'TestCharacter' };
export const defaultCampaignName = 'test-campaign';
export const defaultTargetName = 'Goblin A';
export const defaultResult = {
  type: 'popup',
  payload: {
    type: 'automation_info',
    name: 'Test Action',
    description: 'Effect applied successfully.',
  },
};

export function makeProps(overrides) {
  return {
    action: makeSingleSelectAction(),
    playerStats: { ...defaultPlayerStats },
    campaignName: defaultCampaignName,
    targetName: defaultTargetName,
    onClose: vi.fn(),
    ...(overrides || {}),
  };
}

export function makeSingleSelectAction(overrides) {
  return {
    name: 'Divine Smite',
    automation: {
      type: 'attack_rider',
      options: [
        { name: 'Burning Hands', effect: 'next_attack_advantage', value: 5 },
        { name: 'Push Back', effect: 'push_15ft' },
      ],
      maxEffects: 1,
      ...overrides,
    },
    ...overrides,
  };
}

export function makeMultiSelectAction(overrides) {
  return {
    name: 'Multi-Rider Attack',
    automation: {
      type: 'attack_rider',
      options: [
        { name: 'Disadvantage Curse', effect: 'disadvantage_on_next_save' },
        { name: 'No Opportunity', noOpportunityAttacks: true },
        { name: 'Speed Drain', effect: 'speed_reduction' },
      ],
      maxEffects: 3,
      ...overrides,
    },
    ...overrides,
  };
}

export const cunningStrikeAction = {
  name: 'Improved Cunning Strike',
  automation: {
    type: 'attack_rider',
    oncePerTurn: true,
    chooseOne: true,
    maxEffects: 2,
    options: [
      {
        name: 'Poison',
        cost: '1d6',
        effect: 'poisoned',
        saveType: 'CON',
        saveDc: 'ability',
        saveAbility: 'DEX',
        condition: 'poisoned',
        duration: '1_minute',
        repeatingSave: true,
        requires: "Poisoner's Kit",
      },
      {
        name: 'Trip',
        cost: '1d6',
        effect: 'prone',
        saveType: 'DEX',
        saveDc: 'ability',
        saveAbility: 'DEX',
        condition: 'prone',
        sizeLimit: 'large_or_smaller',
      },
      {
        name: 'Withdraw',
        cost: '1d6',
        effect: 'no_opportunity_attacks',
        movement: 'half_speed',
        noOAs: true,
      },
    ],
  },
};

export function selectSingleOption(labelText) {
  const optionLabel = screen.getByText(labelText).parentElement;
  fireEvent.click(optionLabel);
  return optionLabel;
}

export function clickApplySingle() {
  return fireEvent.click(screen.getByRole('button', { name: /Apply Effect$/ }));
}

export function clickApplyMulti() {
  return fireEvent.click(screen.getByRole('button', { name: /Apply Effects$/ }));
}

export function clickCheckbox(index) {
  const checkboxes = screen.getAllByRole('checkbox');
  fireEvent.click(checkboxes[index]);
}

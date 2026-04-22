export { default as CharacterCreationWizard } from './character-creation-wizard';
export { default as WizardHeader } from './wizard-header';
export { default as WizardProgressBar } from './wizard-progress-bar';
export { default as WizardFooter } from './wizard-footer';
export { default as WizardStepRules } from './wizard-step-rules';
export { default as WizardStepBasic } from './wizard-step-basic';
export { default as WizardStepRaceClass } from './wizard-step-race-class';
export { default as WizardStepAbilities } from './wizard-step-abilities';
export { default as WizardStepSkills } from './wizard-step-skills';
export { default as WizardStepLanguages } from './wizard-step-languages';
export { default as WizardStepInventory } from './wizard-step-inventory';
export { default as WizardStepSpecial } from './wizard-step-special';
export { default as WizardStepResistances } from './wizard-step-resistances';
export { default as WizardStepMagicItems } from './wizard-step-magic-items';

export const REQUIRED_FIELDS = [
  'name',
  'level',
  'alignment',
  'race',
  'class',
  'abilities',
  'inventory',
  'skillProficiencies',
  'expertSkills',
];

export const ABILITY_NAMES = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
];

export const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
];

export const LANGUAGES = [
  'Common',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
  'Abyssal',
  'Celestial',
  'Draconic',
  'Deep Speech',
  'Infernal',
  'Primordial',
  'Sylvan',
  'Undercommon',
];

export const RESISTANCES_IMMUNITIES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder"
];



export const SKILL_PROFICIENCIES = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
];

export const POINT_BUY_COSTS = {
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 6,
  15: 7,
  16: 9,
  17: 11,
};

export const DEFAULT_FORM_DATA = {
  name: '',
  level: 1,
  alignment: 'True Neutral',
  background: '',
  race: { name: 'Human', subrace: { name: '' } },
  class: {
    name: 'Fighter',
    subclass: { name: '' },
    fightingStyles: [],
    expertise: [],
    favoredEnemies: [],
    favoredTerrain: [],
  },
  abilities: ABILITY_NAMES.map((name) => ({
    name,
    baseScore: 8,
    abilityImprovements: 0,
    miscBonus: 0,
  })),
  skillProficiencies: [],
  expertSkills: [],
  inventory: {
    backpack: [],
    equipped: [],
    gold: 10,
    magicItems: [],
  },
  languages: [],
  spells: [],
  resistances: [],
  feats: [],
  magicItems: [],
  specialActions: [],
  rules: '5e',
};
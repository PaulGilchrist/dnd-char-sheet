import React, { useState, useEffect } from 'react';
import './wizard-step-spells.css';

// Spell limits per class and level
const SPELL_LIMITS = {
  Wizard: {
    1: { cantrip: 4, level1: 2 },
    2: { cantrip: 4, level1: 3 },
    3: { cantrip: 4, level1: 4, level2: 2 },
    4: { cantrip: 4, level1: 4, level2: 3 },
    5: { cantrip: 4, level1: 4, level2: 3, level3: 2 },
    6: { cantrip: 4, level1: 4, level2: 3, level3: 3 },
    7: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 1 },
    8: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2 },
    9: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 1 },
    10: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2 },
    11: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    12: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    13: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    14: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    15: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    16: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    17: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    18: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    19: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    20: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  },
  Sorcerer: {
    1: { cantrip: 4, level1: 2 },
    2: { cantrip: 4, level1: 3 },
    3: { cantrip: 4, level1: 4, level2: 2 },
    4: { cantrip: 4, level1: 4, level2: 3 },
    5: { cantrip: 4, level1: 4, level2: 3, level3: 2 },
    6: { cantrip: 4, level1: 4, level2: 3, level3: 3 },
    7: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 1 },
    8: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2 },
    9: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 1 },
    10: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2 },
    11: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    12: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    13: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    14: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    15: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    16: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    17: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    18: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    19: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    20: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  },
  Warlock: {
    1: { cantrip: 4, level1: 2 },
    2: { cantrip: 4, level1: 3 },
    3: { cantrip: 4, level1: 4, level2: 2 },
    4: { cantrip: 4, level1: 4, level2: 3 },
    5: { cantrip: 4, level1: 4, level2: 3, level3: 2 },
    6: { cantrip: 4, level1: 4, level2: 3, level3: 3 },
    7: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 1 },
    8: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2 },
    9: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 1 },
    10: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2 },
    11: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    12: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    13: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    14: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    15: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    16: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    17: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    18: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    19: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    20: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  },
  Paladin: {
    1: { cantrip: 2, level1: 2 },
    2: { cantrip: 2, level1: 2 },
    3: { cantrip: 2, level1: 3, level2: 2 },
    4: { cantrip: 2, level1: 3, level2: 2 },
    5: { cantrip: 2, level1: 3, level2: 3, level3: 2 },
    6: { cantrip: 2, level1: 3, level2: 3, level3: 2 },
    7: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 1 },
    8: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 1 },
    9: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 1 },
    10: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 1 },
    11: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    12: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    13: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 1 },
    14: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 1 },
    15: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 1 },
    16: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 1 },
    17: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 1 },
    18: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 1 },
    19: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
    20: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
  },
  Bard: {
    1: { cantrip: 4, level1: 4 },
    2: { cantrip: 4, level1: 5, level2: 2 },
    3: { cantrip: 4, level1: 5, level2: 3 },
    4: { cantrip: 4, level1: 5, level2: 3, level3: 2 },
    5: { cantrip: 4, level1: 5, level2: 3, level3: 3 },
    6: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 1 },
    7: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2 },
    8: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 1 },
    9: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2 },
    10: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    11: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2 },
    12: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 1 },
    13: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2 },
    14: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 1 },
    15: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2 },
    16: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 1 },
    17: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
    18: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
    19: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
    20: { cantrip: 4, level1: 5, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
  },
  Cleric: {
    1: { cantrip: 3, level1: 3 },
    2: { cantrip: 3, level1: 4 },
    3: { cantrip: 3, level1: 4, level2: 2 },
    4: { cantrip: 3, level1: 4, level2: 3 },
    5: { cantrip: 3, level1: 4, level2: 3, level3: 2 },
    6: { cantrip: 3, level1: 4, level2: 3, level3: 3 },
    7: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 1 },
    8: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2 },
    9: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 1 },
    10: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2 },
    11: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    12: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    13: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    14: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    15: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    16: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    17: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    18: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    19: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    20: { cantrip: 3, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  },
  Druid: {
    1: { cantrip: 2, level1: 2 },
    2: { cantrip: 2, level1: 3 },
    3: { cantrip: 2, level1: 3, level2: 2 },
    4: { cantrip: 2, level1: 3, level2: 3 },
    5: { cantrip: 2, level1: 3, level2: 3, level3: 2 },
    6: { cantrip: 2, level1: 3, level2: 3, level3: 3 },
    7: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 1 },
    8: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2 },
    9: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 1 },
    10: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2 },
    11: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    12: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    13: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    14: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
    15: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    16: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
    17: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    18: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    19: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
    20: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  },
  Ranger: {
    1: { cantrip: 2, level1: 2 },
    2: { cantrip: 2, level1: 2 },
    3: { cantrip: 2, level1: 3, level2: 2 },
    4: { cantrip: 2, level1: 3, level2: 2 },
    5: { cantrip: 2, level1: 3, level2: 3, level3: 2 },
    6: { cantrip: 2, level1: 3, level2: 3, level3: 2 },
    7: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 1 },
    8: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 1 },
    9: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 1 },
    10: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 1 },
    11: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    12: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
    13: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 1 },
    14: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 1 },
    15: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 1 },
    16: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 1 },
    17: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 1 },
    18: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 1 },
    19: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
    20: { cantrip: 2, level1: 3, level2: 3, level3: 3, level4: 2, level5: 2, level6: 2, level7: 2, level8: 2, level9: 2 },
  },
  Barbarian: {
    // Barbarians don't have spellcasting in standard 5e
  },
  Monk: {
    // Monks don't have spellcasting in standard 5e
  },
  Rogue: {
    // Rogues don't have spellcasting in standard 5e
  },
  Fighter: {
    // Fighters don't have spellcasting in standard 5e (unless Eldritch Knight)
  },
  Bard: {
    // Already defined above
  },
  Warlock: {
    // Already defined above
  },
  Sorcerer: {
    // Already defined above
  },
  Wizard: {
    // Already defined above
  },
  Paladin: {
    // Already defined above
  },
  Cleric: {
    // Already defined above
  },
  Druid: {
    // Already defined above
  },
  Ranger: {
    // Already defined above
  },
};

// Default limits for classes not defined
const DEFAULT_SPELL_LIMITS = {
  1: { cantrip: 4, level1: 2 },
  2: { cantrip: 4, level1: 3 },
  3: { cantrip: 4, level1: 4, level2: 2 },
  4: { cantrip: 4, level1: 4, level2: 3 },
  5: { cantrip: 4, level1: 4, level2: 3, level3: 2 },
  6: { cantrip: 4, level1: 4, level2: 3, level3: 3 },
  7: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 1 },
  8: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2 },
  9: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 1 },
  10: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2 },
  11: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
  12: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1 },
  13: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
  14: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1 },
  15: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
  16: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1 },
  17: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  18: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  19: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  20: { cantrip: 4, level1: 4, level2: 3, level3: 3, level4: 2, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
};

function WizardStepSpells({ formData, allSpells, onArrayFieldChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');
  const [showFullDetails, setShowFullDetails] = useState({});
  const [spellCounts, setSpellCounts] = useState({ cantrip: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 });
  const [validationMessage, setValidationMessage] = useState('');

  const [levels, setLevels] = useState([]);
  const [classes, setClasses] = useState([]);

  // Calculate spell counts by level
  useEffect(() => {
    console.log('=== SPELL COUNTS UPDATE ===');
    console.log('formData.spells:', formData.spells);
    console.log('allSpells loaded:', allSpells?.length || 0);
    
    const counts = { cantrip: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 };
    
    if (formData.spells && formData.spells.length > 0) {
      formData.spells.forEach(spellName => {
        console.log('Processing spell:', spellName);
        const spell = allSpells.find(s => s.name === spellName || s.index === spellName);
        if (spell) {
          console.log('Found spell:', spell.name, 'level:', spell.level);
          const level = spell.level !== undefined ? spell.level : 0;
          const levelKey = level === 0 ? 'cantrip' : `level${level}`;
          counts[levelKey] = (counts[levelKey] || 0) + 1;
        } else {
          console.log('Spell not found:', spellName);
        }
      });
    } else {
      console.log('No spells selected yet');
    }
    
    console.log('Final counts:', counts);
    setSpellCounts(counts);
  }, [formData.spells, allSpells]);

  // Get spell limits for current class and level
  const getSpellLimits = () => {
    if (!formData || !formData.class || !formData.level) {
      return { cantrip: 4, level1: 2, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 };
    }
    
    const className = formData.class.name;
    const charLevel = parseInt(formData.level) || 1;
    
    const classLimits = SPELL_LIMITS[className] || DEFAULT_SPELL_LIMITS;
    const levelLimits = classLimits[charLevel] || classLimits[1] || { cantrip: 4, level1: 2, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 };
    
    // Ensure all keys exist with default values
    return {
      cantrip: levelLimits.cantrip || 4,
      level1: levelLimits.level1 || 2,
      level2: levelLimits.level2 || 0,
      level3: levelLimits.level3 || 0,
      level4: levelLimits.level4 || 0,
      level5: levelLimits.level5 || 0,
      level6: levelLimits.level6 || 0,
      level7: levelLimits.level7 || 0,
      level8: levelLimits.level8 || 0,
      level9: levelLimits.level9 || 0
    };
  };

  const spellLimits = getSpellLimits();

  // Check if spell selection exceeds limits
  const getValidationMessage = () => {
    if (!formData || !formData.class) {
      return '';
    }
    
    const className = formData.class.name;
    const charLevel = parseInt(formData.level) || 1;
    
    if (className === 'Barbarian' || className === 'Monk' || className === 'Rogue' || className === 'Fighter') {
      return 'This class does not have spellcasting abilities. Consider choosing a spellcasting class.';
    }
    
    const counts = spellCounts;
    const limits = spellLimits || { cantrip: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 };
    
    const exceeded = [];
    if (counts && limits && counts.cantrip > (limits.cantrip || 0)) {
      exceeded.push(`Cantrips (${counts.cantrip}/${limits.cantrip})`);
    }
    if (counts && limits && counts.level1 > (limits.level1 || 0)) {
      exceeded.push(`1st level (${counts.level1}/${limits.level1})`);
    }
    if (counts && limits && counts.level2 > (limits.level2 || 0)) {
      exceeded.push(`2nd level (${counts.level2}/${limits.level2})`);
    }
    if (counts && limits && counts.level3 > (limits.level3 || 0)) {
      exceeded.push(`3rd level (${counts.level3}/${limits.level3})`);
    }
    if (counts && limits && counts.level4 > (limits.level4 || 0)) {
      exceeded.push(`4th level (${counts.level4}/${limits.level4})`);
    }
    if (counts && limits && counts.level5 > (limits.level5 || 0)) {
      exceeded.push(`5th level (${counts.level5}/${limits.level5})`);
    }
    if (counts && limits && counts.level6 > (limits.level6 || 0)) {
      exceeded.push(`6th level (${counts.level6}/${limits.level6})`);
    }
    if (counts && limits && counts.level7 > (limits.level7 || 0)) {
      exceeded.push(`7th level (${counts.level7}/${limits.level7})`);
    }
    if (counts && limits && counts.level8 > (limits.level8 || 0)) {
      exceeded.push(`8th level (${counts.level8}/${limits.level8})`);
    }
    if (counts && limits && counts.level9 > (limits.level9 || 0)) {
      exceeded.push(`9th level (${counts.level9}/${limits.level9})`);
    }
    
    if (exceeded.length > 0) {
      return `Spell limit exceeded: ${exceeded.join(', ')}`;
    }
    
    return '';
  };

  useEffect(() => {
    setValidationMessage(getValidationMessage());
  }, [spellCounts, spellLimits, formData.class, formData.level]);

  useEffect(() => {
    if (allSpells && allSpells.length > 0) {
      const levelSet = new Set(['All']);
      const classSet = new Set(['All']);
      allSpells.forEach(spell => {
        levelSet.add(spell.level !== undefined ? spell.level.toString() : '0');
        if (spell.classes) {
          spell.classes.forEach(cls => classSet.add(cls));
        }
      });
      setLevels(Array.from(levelSet).sort((a, b) => {
        if (a === 'All') return -1;
        if (b === 'All') return 1;
        return parseInt(a) - parseInt(b);
      }));
      setClasses(Array.from(classSet).sort());
    }
  }, [allSpells]);

  const filteredSpells = (() => {
    if (!allSpells || allSpells.length === 0) return [];
    
    let results = [...allSpells];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(spell => 
        spell.name.toLowerCase().includes(query) ||
        (spell.index && spell.index.toLowerCase().includes(query))
      );
    }

    if (selectedLevel !== 'All') {
      results = results.filter(spell => {
        const spellLevel = spell.level !== undefined ? spell.level.toString() : '0';
        return spellLevel === selectedLevel;
      });
    }

    if (selectedClass !== 'All') {
      results = results.filter(spell => 
        spell.classes && spell.classes.includes(selectedClass)
      );
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const handleSpellToggle = (spellName) => {
    const currentSpells = formData.spells || [];
    const newSpells = currentSpells.includes(spellName)
      ? currentSpells.filter(s => s !== spellName)
      : [...currentSpells, spellName];
    onArrayFieldChange('spells', newSpells);
  };

  const spellIsSelected = (spellName) => {
    return (formData.spells || []).includes(spellName);
  };

  const getLevelClass = (spell) => {
    const level = spell.level !== undefined ? spell.level : 0;
    if (level === 0) return 'cantrip';
    if (level <= 3) return 'low';
    if (level <= 5) return 'mid';
    return 'high';
  };

  const toggleFullDetails = (spellIndex) => {
    setShowFullDetails(prev => ({
      ...prev,
      [spellIndex]: !prev[spellIndex]
    }));
  };

  const removeSpell = (spellName) => {
    const currentSpells = formData.spells || [];
    const newSpells = currentSpells.filter(s => s !== spellName);
    onArrayFieldChange('spells', newSpells);
  };

  const renderSpellDetails = (spell, index) => {
    const isExpanded = showFullDetails[index];
    const isSelected = spellIsSelected(spell.name);

    return (
      <div
        key={spell.index || index}
        className={`spell-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSpellToggle(spell.name)}
      >
        <div className="spell-item-header">
          <div className="spell-name">{spell.name}</div>
          <span className={`spell-level ${getLevelClass(spell)}`}>
            {spell.level !== undefined ? spell.level : '0'}
          </span>
          <div className="spell-checkbox">
            {isSelected ? '✓' : ''}
          </div>
        </div>
        
        <div className="spell-item-details">
          <div className="spell-meta">
            <span className="spell-school">{spell.school || 'Unknown'}</span>
            {spell.ritual && <span className="spell-ritual">Ritual</span>}
            {spell.concentration && <span className="spell-concentration">Concentration</span>}
            {spell.duration && <span className="spell-duration">Duration: {spell.duration}</span>}
            {spell.casting_time && <span className="spell-casting-time">Casting: {spell.casting_time}</span>}
          </div>

          {isExpanded && (
            <div className="spell-full-details">
              <div className="spell-description">
                {spell.desc && spell.desc[0] && spell.desc[0]}
              </div>
              
              {spell.higher_level && spell.higher_level[0] && (
                <div className="spell-higher-level">
                  <strong>Higher Levels:</strong> {spell.higher_level[0]}
                </div>
              )}
              
              {spell.components && spell.components.length > 0 && (
                <div className="spell-components">
                  <strong>Components:</strong> {spell.components.join(', ')}
                </div>
              )}
              
              {spell.damage && spell.damage.damage_type && (
                <div className="spell-damage">
                  <strong>Damage:</strong> {spell.damage.damage_type}
                </div>
              )}
              
              {spell.material && (
                <div className="spell-material">
                  <strong>Material:</strong> {spell.material}
                </div>
              )}
            </div>
          )}

          <div className="spell-full-details">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullDetails(index);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '0.25rem 0.5rem',
                marginTop: '0.5rem'
              }}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchModal = () => {
    console.log('=== RENDERING SPELLS COMPONENT ===');
    console.log('spellCounts:', spellCounts);
    console.log('spellLimits:', spellLimits);
    console.log('formData.spells:', formData.spells);
    
    if (!allSpells || allSpells.length === 0) {
      return (
        <div className="wizard-step">
          <h2>Step 6: Spells</h2>
          <div className="no-spells-found">
            Spell data not yet loaded. Please try again.
          </div>
        </div>
      );
    }

    return (
      <div className="wizard-step-spells">
        <h2>Step 6: Spells</h2>
        
        {/* Spell Level Summary - Moved to top */}
        <div className="spells-summary" style={{display: 'block', backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem'}}>
          <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#333', fontWeight: '600'}}>Spell Selection Summary</h3>
          
          <div className="spell-levels-summary" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', margin: '1rem 0', padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0'}}>
            <div className="level-summary-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#f9f9f9'}}>
              <span className="level-label" style={{fontWeight: '600', color: '#555', fontSize: '0.9rem'}}>Cantrips:</span>
              <span className={`level-count ${spellCounts.cantrip > (spellLimits.cantrip || 0) ? 'exceeded' : ''}`} style={{fontWeight: '700', color: '#333', fontSize: '0.95rem', padding: '0.25rem 0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px', minWidth: '50px', textAlign: 'center'}}>
                {spellCounts.cantrip}/{spellLimits.cantrip || 0}
              </span>
            </div>
            {['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'].map(levelKey => (
              <div key={levelKey} className="level-summary-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#f9f9f9'}}>
                <span className="level-label" style={{fontWeight: '600', color: '#555', fontSize: '0.9rem'}}>{levelKey.replace('level', '')}th level:</span>
                <span className={`level-count ${spellCounts[levelKey] > (spellLimits[levelKey] || 0) ? 'exceeded' : ''}`} style={{fontWeight: '700', color: '#333', fontSize: '0.95rem', padding: '0.25rem 0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px', minWidth: '50px', textAlign: 'center'}}>
                  {spellCounts[levelKey] || 0}/{spellLimits[levelKey] || 0}
                </span>
              </div>
            ))}
          </div>
          
          {validationMessage && (
            <div className="validation-message error" style={{padding: '0.75rem 1rem', borderRadius: '6px', margin: '1rem 0', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a'}}>
              ⚠️ {validationMessage}
            </div>
          )}
        </div>
        
        <div className="spells-filters">
          <div className="filter-group">
            <label htmlFor="spell-search">Search Spells</label>
            <input
              type="text"
              id="spell-search"
              className="spell-search-input"
              placeholder="Search spells..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="level-filter">Spell Level</label>
            <select
              id="level-filter"
              className="level-filter"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              {levels.map(level => (
                <option key={level} value={level}>{level === '0' ? 'Cantrip' : level}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="class-filter">Class</label>
            <select
              id="class-filter"
              className="class-filter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="spell-results-container">
          <div className="spell-results-header">
            <span className="result-count">
              Showing {filteredSpells.length} spell{filteredSpells.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="spell-results-list">
            {filteredSpells.length === 0 ? (
              <div className="no-spells-found">
                {searchQuery || selectedLevel !== 'All' || selectedClass !== 'All'
                  ? 'No spells found matching your criteria.'
                  : 'No spells available.'}
              </div>
            ) : (
              filteredSpells.map((spell, index) => renderSpellDetails(spell, index))
            )}
          </div>
        </div>

        <div className="spells-summary" style={{display: 'block', backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem'}}>
          <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#333', fontWeight: '600'}}>Spell Selection Summary</h3>
          
          <div className="spell-levels-summary" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', margin: '1rem 0', padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0'}}>
            <div className="level-summary-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#f9f9f9'}}>
              <span className="level-label" style={{fontWeight: '600', color: '#555', fontSize: '0.9rem'}}>Cantrips:</span>
              <span className={`level-count ${spellCounts.cantrip > (spellLimits.cantrip || 0) ? 'exceeded' : ''}`} style={{fontWeight: '700', color: '#333', fontSize: '0.95rem', padding: '0.25rem 0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px', minWidth: '50px', textAlign: 'center'}}>
                {spellCounts.cantrip}/{spellLimits.cantrip || 0}
              </span>
            </div>
            {['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'].map(levelKey => (
              <div key={levelKey} className="level-summary-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#f9f9f9'}}>
                <span className="level-label" style={{fontWeight: '600', color: '#555', fontSize: '0.9rem'}}>{levelKey.replace('level', '')}th level:</span>
                <span className={`level-count ${spellCounts[levelKey] > (spellLimits[levelKey] || 0) ? 'exceeded' : ''}`} style={{fontWeight: '700', color: '#333', fontSize: '0.95rem', padding: '0.25rem 0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px', minWidth: '50px', textAlign: 'center'}}>
                  {spellCounts[levelKey] || 0}/{spellLimits[levelKey] || 0}
                </span>
              </div>
            ))}
          </div>
          
          {validationMessage && (
            <div className="validation-message error">
              ⚠️ {validationMessage}
            </div>
          )}
          
          {formData.spells && formData.spells.length > 0 ? (
            <div className="selected-spells-list">
              {formData.spells.map(spellName => (
                <span key={spellName} className="selected-spell-tag">
                  {spellName}
                  <button
                    type="button"
                    className="remove-spell-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSpell(spellName);
                    }}
                    title="Remove spell"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="no-spells-selected">No spells selected yet</p>
          )}
        </div>
      </div>
    );
  };

  return renderSearchModal();
}

export default WizardStepSpells;
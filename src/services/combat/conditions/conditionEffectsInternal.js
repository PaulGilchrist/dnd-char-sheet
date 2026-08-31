// ---------------------------------------------------------------------------
// Internal helpers (saveModifierApplies, applySaveModifiers, attackerHasBlindsightOrTruesight)
// ---------------------------------------------------------------------------

const CONDITION_KEYWORDS = new Set(['charmed', 'frightened', 'poison', 'magic'])

function saveModifierApplies(modifier, saveType, abilityName, isRaging = false, shapeShiftActive = false, isPeerlessAthlete = false, isLargeFormActive = false, combatContext = null, conditions = [], attackerName = null, isLivingLegendActive = false, isElderChampionActive = false, isElderChampionAttackerActive = false, holyAuraTargets = [], isProtectionFromPoisonActive = false, isTranceOfOrderActive = false, hasPowerfulBuild = false) {
  const conditionSet = new Set(conditions);
  if (modifier.effect === 'replacement') return true;
  if (modifier.effect === 'reliable_talent') return true;
  if (modifier.effect === 'dex_jump') return true;
  if (modifier.effect === 'restore_balance') return true;
  if (modifier.effect === 'dark_ones_luck') return true;
  if (modifier.effect === 'portent') return true;
  if (modifier.effect === 'potent_cantrip') return true;
  if (modifier.effect === 'soulstitch_spells') return true;
  if (modifier.condition === 'trance_of_order_active') return isTranceOfOrderActive;
  if (modifier.condition === 'grappling_target' || modifier.condition === 'creature_grappled_by_you') {
    if (!combatContext || !combatContext.creatures) return false;
    const attackerName = combatContext.activeCreatureName || combatContext.attackerName;
    if (!attackerName) return false;
    const attackerCreature = combatContext.creatures.find(c => c.name === attackerName);
    const targetName = attackerCreature?.targetName;
    if (!targetName) return false;
    const targetCreature = combatContext.creatures.find(c => c.name === targetName);
    if (targetCreature && targetCreature.conditions) {
      const targetConditions = targetCreature.conditions.map(c => {
        if (typeof c === 'object') return String(c.key || '').toLowerCase();
        return String(c).toLowerCase();
      });
      return targetConditions.includes('grappled');
    }
    return false;
  }
  if (modifier.condition === 'mounted_and_target_one_size_smaller') {
    if (!combatContext || !combatContext.creatures) return false;
    const attackerName = combatContext.activeCreatureName || combatContext.attackerName;
    if (!attackerName) return false;
    const attackerCreature = combatContext.creatures.find(c => c.name === attackerName);
    if (!attackerCreature) return false;
    const isMounted = attackerCreature.isMounted || false;
    if (!isMounted) return false;
    const isNotIncapacitated = !attackerCreature.conditions || !attackerCreature.conditions.some(c => {
      const cStr = typeof c === 'object' ? String(c.key || '') : String(c);
      return ['incapacitated'].includes(cStr.toLowerCase());
    });
    if (!isNotIncapacitated) return false;
    const targetName = attackerCreature.targetName;
    if (!targetName) return false;
    const targetCreature = combatContext.creatures.find(c => c.name === targetName);
    if (!targetCreature) return false;
    const mountSizeIndex = ['Fine', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
    const mountSizeIdx = mountSizeIndex.indexOf(attackerCreature.mountSize || 'Medium');
    const targetSizeIdx = mountSizeIndex.indexOf(targetCreature.size || 'Medium');
    if (mountSizeIdx === -1 || targetSizeIdx === -1) return false;
    if (targetSizeIdx >= mountSizeIdx) return false;
    const within5ft = attackerCreature.rangeToTarget == null || attackerCreature.rangeToTarget <= 5;
    if (!within5ft) return false;
    return true;
  }
  if (modifier.target !== 'saving_throw' && modifier.target !== 'save' && modifier.target !== 'attack_roll' && modifier.target !== 'attack_rolls' && modifier.target !== 'attack_rolls_vs_unmounted_near_mount' && modifier.target !== 'concentration_saving_throws' && modifier.target !== 'death_saving_throws' && modifier.target !== 'ability_check' && modifier.target !== 'check' && modifier.target !== 'd20' && modifier.target !== 'performance_checks' && modifier.target !== 'deception_performance_checks') return false;
  if (modifier.condition === 'raging') return isRaging;
  if (modifier.condition === 'shape_shift') return shapeShiftActive;
  if (modifier.condition === 'peerless_athlete') {
      if (!isPeerlessAthlete) return false;
      if (!modifier.abilities || modifier.abilities.length === 0) return true;
      if (!abilityName) return true;
      if (abilityName && modifier.abilities.includes(abilityName)) return true;
      return false;
  }
  if (modifier.condition === 'charmed' && saveType === 'charmed') return true;
  if (modifier.condition === 'frightened' && saveType === 'frightened') return true;
  if (modifier.condition === 'poison' && saveType === 'poison') return true;
  if (modifier.condition === 'magic') {
    if (!modifier.abilities || modifier.abilities.length === 0) return true;
    if (abilityName && modifier.abilities.includes(abilityName)) return true;
    return false;
    }
  if (modifier.condition === 'fiend_undead') return true;
  if (modifier.condition === 'holy_aura_active') return holyAuraTargets.includes(attackerName);
  if (modifier.condition === 'living_legend_active') return isLivingLegendActive;
  if (modifier.condition === 'elder_champion_active') return isElderChampionActive;
  if (modifier.condition === 'elder_champion_attacker') return isElderChampionAttackerActive;
  if (modifier.condition === 'large_form_active') return isLargeFormActive;
  if (CONDITION_KEYWORDS.has(modifier.condition)) return false;
  if (modifier.condition === 'first_round_target_no_turn') {
    if (!combatContext || !combatContext.creatures) return false;
    const currentRound = combatContext.round || 1;
    if (currentRound !== 1) return false;
    const attacker = combatContext.creatures.find(c => c.name === attackerName);
    if (!attacker) return true;
    const targetName = attacker.targetName;
    if (!targetName) return true;
    const targetCreature = combatContext.creatures.find(c => c.name === targetName);
    if (!targetCreature) return true;
    const attackerIndex = combatContext.creatures.indexOf(attacker);
    const targetIndex = combatContext.creatures.indexOf(targetCreature);
    return targetIndex > attackerIndex;
  }
  if (modifier.condition === 'target_hasnt_taken_turn') {
    if (!combatContext || !combatContext.creatures) return false;
    const attacker = combatContext.creatures.find(c => c.name === attackerName);
    if (!attacker) return true;
    const targetName = attacker.targetName;
    if (!targetName) return true;
    const targetCreature = combatContext.creatures.find(c => c.name === targetName);
    if (!targetCreature) return true;
    const attackerIndex = combatContext.creatures.indexOf(attacker);
    const targetIndex = combatContext.creatures.indexOf(targetCreature);
    return targetIndex > attackerIndex;
  }
  if (modifier.condition === 'concentration_breaker') return true;
  if (modifier.condition === 'pfeag_save_advantage') return true;
  if (modifier.condition === 'protection_from_poison_active') return isProtectionFromPoisonActive;
  if (modifier.condition === 'powerful_build_grapple_escape') return hasPowerfulBuild;
  if (modifier.condition === 'remarkable_athlete_athletics') {
    return true;
  }
  if (modifier.condition && conditionSet.has(modifier.condition)) return true;
  if (modifier.abilities && modifier.abilities.length > 0) {
    if (!abilityName) return true;
    return modifier.abilities.includes(abilityName);
  }
  return true;
}

function applySaveModifiers(effects, modifiers, saveType, abilityName, isRaging = false, shapeShiftActive = false, isPeerlessAthlete = false, isLargeFormActive = false, combatContext = null, conditions = [], attackerName = null, isLivingLegendActive = false, isElderChampionActive = false, isElderChampionAttackerActive = false, holyAuraTargets = [], isProtectionFromPoisonActive = false, isTranceOfOrderActive = false, hasPowerfulBuild = false) {
  if (!modifiers || modifiers.length === 0) return;
  for (const mod of modifiers) {
    if (!saveModifierApplies(mod, saveType, abilityName, isRaging, shapeShiftActive, isPeerlessAthlete, isLargeFormActive, combatContext, conditions, attackerName, isLivingLegendActive, isElderChampionActive, isElderChampionAttackerActive, holyAuraTargets, isProtectionFromPoisonActive, isTranceOfOrderActive, hasPowerfulBuild)) continue;
    if (mod.target === 'ability_check' || mod.target === 'check' || mod.target === 'performance_checks' || mod.target === 'deception_performance_checks') {
      if (mod.effect === 'advantage') {
        // Skill-specific advantage (e.g., Peerless Athlete) — check before abilities
        if (mod.skills && mod.skills.length > 0) {
          if (!effects.peerlessAthleteAdvantageSkills) {
            effects.peerlessAthleteAdvantageSkills = [];
          }
          effects.peerlessAthleteAdvantageSkills = [...new Set([
            ...(effects.peerlessAthleteAdvantageSkills || []),
            ...mod.skills
          ])];
        } else if (mod.abilities && mod.abilities.length > 0) {
          if (!abilityName) {
            // Per-ability check advantage (e.g., Remarkable Athlete for STR)
            // General computation: store abilities list for UI to match against
            effects.abilityCheckAdvantageAbilities = [...new Set([
              ...(effects.abilityCheckAdvantageAbilities || []),
              ...mod.abilities
            ])];
          } else {
            // Specific check: only set global advantage if ability matches (or no filter)
            const abbr = abilityName.substring(0, 3).toUpperCase();
            if (mod.abilities.includes(abbr)) {
              effects.abilityCheckAdvantage = true;
            }
          }
        } else if (mod.target === 'performance_checks') {
          // Performance checks specific: limit to Performance skill
          effects.abilityCheckAdvantage = true;
          effects.abilityCheckAdvantageSkill = 'Performance';
        } else if (mod.target === 'deception_performance_checks') {
          // Deception/Performance checks: store specific skills
          if (!effects.abilityCheckAdvantageSkills) {
            effects.abilityCheckAdvantageSkills = [];
          }
          effects.abilityCheckAdvantageSkills = [...new Set([
            ...(effects.abilityCheckAdvantageSkills || []),
            'Deception', 'Performance'
          ])];
        } else {
          effects.abilityCheckAdvantage = true;
        }
      }
      if (mod.effect === 'dex_jump') {
        effects.dexJump = true;
      }
    } else if (mod.target === 'all_attackers_vs_target') {
      if (mod.effect === 'advantage') {
        effects.targetAdvantageCount = (effects.targetAdvantageCount || 0) + 1;
      }
      if (mod.effect === 'disadvantage') {
        effects.targetDisadvantageCount = (effects.targetDisadvantageCount || 0) + 1;
      }
    } else if (mod.target === 'd20') {
      if (mod.effect === 'restore_balance') {
        effects.restoreBalance = true;
      }
      if (mod.effect === 'portent') {
        effects.portent = true;
      }
      if (mod.effect === 'stroke_of_luck') {
        effects.strokeOfLuck = true;
      }
      if (mod.effect === 'bardic_inspiration') {
        effects.bardicInspiration = true;
      }
    } else if (mod.target === 'attack_roll' || mod.target === 'attack_rolls' || mod.target === 'attack_rolls_vs_unmounted_near_mount') {
      if (mod.effect === 'advantage') {
        effects.attackAdvantageCount = (effects.attackAdvantageCount || 0) + 1;
      }
      if (mod.effect === 'disadvantage') {
        effects.attackDisadvantageCount = (effects.attackDisadvantageCount || 0) + 1;
      }
    } else if (mod.target !== 'saving_throw' && mod.target !== 'save' && mod.target !== 'concentration_saving_throws' && mod.target !== 'death_saving_throws') {
      continue;
    }
    if (mod.target === 'saving_throw' || mod.target === 'save' || mod.target === 'concentration_saving_throws' || mod.target === 'death_saving_throws') {
      if (mod.effect === 'advantage') {
        if (mod.abilities && mod.abilities.length > 0 && !abilityName) {
          // General computation: store abilities list for UI to match against
          effects.saveAdvantageAbilities = [...new Set([
            ...(effects.saveAdvantageAbilities || []),
            ...mod.abilities
          ])];
        } else if (mod.condition !== 'against_spell' && mod.target !== 'death_saving_throws') {
          // Specific save or no abilities filter: increment global count
          // death_saving_throws is handled separately by DeathSavingThrows.jsx via hasSaveModifier
          effects.saveAdvantageCount = (effects.saveAdvantageCount || 0) + 1;
        }
      } else if (mod.effect === 'disadvantage') {
        if (mod.abilities && mod.abilities.length > 0 && !abilityName) {
          effects.saveDisadvantageAbilities = [...new Set([
            ...(effects.saveDisadvantageAbilities || []),
            ...mod.abilities
          ])];
        } else if (mod.condition !== 'against_spell') {
          effects.saveDisadvantageCount = (effects.saveDisadvantageCount || 0) + 1;
        }
      }
    }
    if (mod.effect === 'reroll') {
      if (mod.target === 'saving_throw' || mod.target === 'save' || mod.target === 'concentration_saving_throws' || mod.target === 'death_saving_throws') {
        effects.autoRerollForSaves = true;
      } else if (mod.target === 'ability_check' || mod.target === 'check' || mod.target === 'd20') {
        effects.autoRerollForChecks = true;
        // A 'd20' target is a full d20 Test (Halfling Lucky: "a 1 on the d20 of a d20 Test") —
        // covers sheet saving throws too (autoRerollForAttack intentionally NOT set here:
        // that flag renders the manual Boon-of-Combat-Prowess button, and the attack
        // context has no auto-reroll consumer — see bug-cla-216 notes).
        if (mod.target === 'd20') {
          effects.autoRerollForSaves = true;
        }
      } else if (mod.target === 'attack' || mod.target === 'attack_roll') {
        effects.autoRerollForAttack = true;
      }
      effects.autoRerollCondition = mod.condition;
      if (mod.bonusExpression) {
        effects.autoRerollBonus = mod.bonusExpression;
      }
    } else if (mod.effect === 'replacement') {
      if (mod.saveType === 'STR') {
        if (mod.target === 'saving_throw' || mod.target === 'save') {
          effects.strSaveReplace = true;
        }
        if (mod.target === 'ability_check' || mod.target === 'check' || !mod.target) {
          effects.strCheckReplace = true;
        }
      }
    } else if (mod.effect === 'tactical_mind') {
      effects.tacticalMind = true;
      effects.tacticalMindBonus = mod.bonusExpression || '';
    } else if (mod.effect === 'wis_replacement') {
      effects.wisCheckReplace = true;
      effects.wisCheckReplaceAbilities = mod.abilities || ['CHA'];
    } else if (mod.effect === 'reliable_talent') {
      effects.reliableTalent = true;
    }
    else if (mod.effect === 'stroke_of_luck') {
      effects.strokeOfLuck = true;
    }
    else if (mod.effect === 'lucky_point') {
      if (mod.effectType === 'advantage') {
        effects.luckyAdvantage = true;
      }
      if (mod.effectType === 'disadvantage') {
        effects.luckyDisadvantage = true;
      }
    }
    else if (mod.effect === 'modify_d20_roll') {
      effects.modifyD20Roll = true;
      effects.modifyD20RollDice = mod.diceExpression || '2d4';
      effects.modifyD20RollCanBeBonusOrPenalty = !!mod.canBeBonusOrPenalty;
    }
    else if (mod.effect === 'restore_balance') {
      effects.restoreBalance = true;
    }
    else if (mod.effect === 'd20_floor_10') {
      effects.d20Floor10 = true;
    }
    else if (mod.effect === 'no_advantage_against') {
      effects.noAdvantageAgainst = true;
    }
    else if (mod.effect === 'dark_ones_luck') {
      effects.darkOnesLuck = true;
    }
    else if (mod.effect === 'portent') {
      effects.portent = true;
    }
    else if (mod.effect === 'improved_illusions') {
      effects.improvedIllusions = true;
    }
    else if (mod.effect === 'illusory_reality') {
      effects.illusoryReality = true;
    }
    else if (mod.effect === 'potent_cantrip') {
      effects.potentCantrip = true;
    }
    else if (mod.effect === 'soulstitch_spells') {
      effects.soulstitchSpells = true;
    }
    else if (mod.effect === 'pass_without_trace') {
      effects.passWithoutTraceBonus = mod.bonusExpression || '10';
    }
    else if (mod.effect === 'str_check_disadvantage') {
      effects.strCheckDisadvantage = true;
    }
    else if (mod.effect === 'powerful_build_grapple_escape') {
      effects.strCheckAdvantage = true;
    }
    else if (mod.effect === 'ray_of_enfeeble_damage_reduction') {
      effects.rayOfEnfeebleDamageReduction = true;
    }
    else if (mod.effect === 'save_bonus') {
      if (mod.abilities && mod.abilities.length > 0) {
        effects.saveBonusAbilities = [...(effects.saveBonusAbilities || []), ...mod.abilities];
      }
      effects.saveBonusExpression = (effects.saveBonusExpression || '0') + ' + ' + (mod.bonusExpression || '0');
    }
  }
}

export {
  saveModifierApplies,
  applySaveModifiers,
};

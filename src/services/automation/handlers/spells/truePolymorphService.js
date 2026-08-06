import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary, setCombatSummaryCache } from '../../../encounters/combatData.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';
import { addEntry } from '../../../ui/logService.js';
import storage from '../../../ui/storage.js';
import { handle as runTruePolymorphHandler } from './truePolymorphHandler.js';
import { revertPolymorph } from './polymorphService.js';

const TRUE_POLYMORPH_EFFECT = 'true_polymorph';
const OBJECT_TRANSFORM_EFFECT = 'object_transform';

export function getActiveTruePolymorphs(campaignName) {
    const effects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    return effects.filter(te => te.effect === TRUE_POLYMORPH_EFFECT);
}

export function getActiveObjectTransforms(campaignName) {
    const effects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    return effects.filter(te => te.effect === OBJECT_TRANSFORM_EFFECT);
}

export function getTruePolymorphCaster(targetName, campaignName) {
    const effects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const effect = effects.find(te => {
        const teTarget = Array.isArray(te.target) ? te.target[0] : te.target;
        return teTarget === targetName && te.effect === TRUE_POLYMORPH_EFFECT;
    });
    return effect?.source || null;
}

export function getObjectTransformCaster(targetName, campaignName) {
    const effects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const effect = effects.find(te => {
        const teTarget = Array.isArray(te.target) ? te.target[0] : te.target;
        return teTarget === targetName && te.effect === OBJECT_TRANSFORM_EFFECT;
    });
    return effect?.source || null;
}

export async function applyTruePolymorph(spell, metaCtx, playerStats, campaignName, mapName) {
    const spellName = (spell.name || '').toLowerCase();
    if (spellName !== 'true polymorph') return null;

    const spellSaveDc = metaCtx?.spellSaveDc || playerStats.spellAbilities?.saveDc || 8 + (playerStats.proficiency || 2);
    const slotLevel = metaCtx?.slotLevel || spell.level || 9;

    const action = {
        name: spell.name,
        automation: {
            type: 'true_polymorph',
            saveDc: spellSaveDc,
            saveType: 'WIS',
            mode: metaCtx?.truePolymorphPath,
        },
        spell,
        spellSlotLevel: slotLevel,
        metaCtx,
    };

    try {
        const result = await runTruePolymorphHandler(action, playerStats, campaignName, mapName);
        return result;
    } catch (e) {
        console.error(`[truePolymorphService] Failed to execute ${spell.name} handler:`, e);
        return null;
    }
}

export async function confirmTruePolymorphTransform({ targetName, creature, casterName, spell, playerStats, campaignName, mode }) {
    if (mode === 'object_into_creature' && !targetName) {
        const cs = getCombatSummary(campaignName);
        let initiativeValue = 0;
        if (cs?.creatures) {
            const casterCreature = cs.creatures.find(c => c.name === casterName);
            if (casterCreature?.initiative !== '' && casterCreature?.initiative !== undefined) {
                initiativeValue = parseInt(casterCreature.initiative, 10) || 0;
            }
            const casterInitBonus = casterCreature?.initiativeBonus || 0;
            initiativeValue = initiativeValue || (Math.floor(Math.random() * 20) + 1 + casterInitBonus);
        }
        return await summonCreatureFromObject(creature.index, casterName, initiativeValue, spell.level || 9, playerStats, campaignName);
    }

    const cs = await getCombatContext(campaignName);
    const creatureObj = cs.creatures.find(c => c.name === targetName);
    if (!creatureObj) {
        console.error(`[truePolymorphService] Target ${targetName} not found in combat.`);
        return { ok: false, reason: 'no_target' };
    }

    const creatureHp = typeof creature.hit_points === 'number' ? creature.hit_points : 0;
    const creatureAc = typeof creature.armor_class === 'number' ? creature.armor_class : 10;

    creatureObj.polymorphOriginal = {
        maxHp: creatureObj.maxHp ?? creatureHp,
        ac: creatureObj.ac ?? creatureAc,
        speed: creatureObj.speed,
    };
    creatureObj.polymorphSource = casterName;
    creatureObj.polymorphBeast = {
        name: creature.name,
        index: creature.index,
        size: creature.size,
        hitPoints: creatureHp,
        armorClass: creatureAc,
        speed: creature.speed,
        challengeRating: creature.challenge_rating,
    };
    creatureObj.beastName = creature.name;
    creatureObj.maxHp = creatureHp;
    creatureObj.ac = creatureAc;
    creatureObj.speed = creature.speed;

    setRuntimeValue(targetName, 'tempHp', creatureHp, campaignName);
    setRuntimeValue(targetName, 'polymorphTempHp', creatureHp, campaignName);

    await storage.set('combatSummary', cs, campaignName);
    setCombatSummaryCache(cs, campaignName);

    const targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const cleaned = targetEffects.filter(te => {
        const teTarget = Array.isArray(te.target) ? te.target[0] : te.target;
        return !(teTarget === targetName && (te.effect === TRUE_POLYMORPH_EFFECT || te.effect === 'polymorph'));
    });
    cleaned.push({
        target: targetName,
        source: casterName,
        effect: TRUE_POLYMORPH_EFFECT,
        duration: 'concentration',
        beastName: creature.name,
        mode: mode || 'creature_to_creature',
    });
    setRuntimeValue('campaign', 'targetEffects', cleaned, campaignName, true);

    const casterCreature = cs.creatures.find(c => c.name === casterName);
    if (casterCreature) {
        const concentrationDc = 8 + (playerStats.proficiency || 2) + (playerStats.abilities?.CON?.bonus ?? 0);
        addConcentration(cs, casterName, spell?.name || 'True Polymorph', concentrationDc);
        await storage.set('combatSummary', cs, campaignName);
        setCombatSummaryCache(cs, campaignName);
    }

    const expirations = getRuntimeValue(casterName, 'pendingExpirations', campaignName);
    const expList = Array.isArray(expirations) ? expirations : [];
    const filteredExp = expList.filter(e => !(e.target === targetName && (e.effects || []).some(ef => ef.type === TRUE_POLYMORPH_EFFECT)));
    filteredExp.push({
        target: targetName,
        effects: [{ type: TRUE_POLYMORPH_EFFECT }],
        appliedRound: getCurrentCombatRound(campaignName),
        expiryRounds: Infinity,
        expireOnCreatureName: null,
    });
    setRuntimeValue(casterName, 'pendingExpirations', filteredExp, campaignName);

    addEntry(campaignName, {
        type: 'save_result',
        characterName: casterName,
        rollType: 'save-polymorph',
        targetName,
        saveDc: 0,
        saveType: 'WIS',
        success: false,
        description: `${targetName} is transformed into ${creature.name} (CR ${creature.challenge_rating}) by ${casterName}'s True Polymorph.`,
    }).catch(() => {});

    return { ok: true };
}

export async function applyObjectTransform(targetName, objectType, casterName, spell, campaignName, playerStats) {
    const cs = await getCombatContext(campaignName);
    const creatureObj = cs.creatures.find(c => c.name === targetName);
    if (!creatureObj) {
        console.error(`[truePolymorphService] Target ${targetName} not found in combat for object transform.`);
        return { ok: false, reason: 'no_target' };
    }

    creatureObj.polymorphSource = casterName;
    creatureObj.polymorphObject = {
        type: objectType,
    };
    creatureObj.avatarOverride = 'object';
    creatureObj.objectType = objectType;

    const activeConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
    const hasIncapacitated = activeConditions.includes('incapacitated');
    if (!hasIncapacitated) {
        setRuntimeValue(targetName, 'activeConditions', [...activeConditions, 'incapacitated'], campaignName);
    }

    await storage.set('combatSummary', cs, campaignName);
    setCombatSummaryCache(cs, campaignName);

    const targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const cleaned = targetEffects.filter(te => {
        const teTarget = Array.isArray(te.target) ? te.target[0] : te.target;
        return !(teTarget === targetName && (te.effect === OBJECT_TRANSFORM_EFFECT || te.effect === TRUE_POLYMORPH_EFFECT || te.effect === 'polymorph'));
    });
    cleaned.push({
        target: targetName,
        source: casterName,
        effect: OBJECT_TRANSFORM_EFFECT,
        duration: 'concentration',
        objectType: objectType,
    });
    setRuntimeValue('campaign', 'targetEffects', cleaned, campaignName, true);

    const casterCreature = cs.creatures.find(c => c.name === casterName);
    if (casterCreature) {
        const concentrationDc = 8 + (playerStats.proficiency || 2) + (playerStats.abilities?.CON?.bonus ?? 0);
        addConcentration(cs, casterName, spell?.name || 'True Polymorph', concentrationDc);
        await storage.set('combatSummary', cs, campaignName);
        setCombatSummaryCache(cs, campaignName);
    }

    addEntry(campaignName, {
        type: 'save_result',
        characterName: casterName,
        rollType: 'save-polymorph',
        targetName,
        saveDc: 0,
        saveType: 'WIS',
        success: false,
        description: `${targetName} is transformed into an ${objectType} by ${casterName}'s True Polymorph.`,
    }).catch(() => {});

    return { ok: true };
}

export async function summonCreatureFromObject(monsterIndex, casterName, initiativeValue, slotLevel, playerStats, campaignName) {
    const { loadMonsters } = await import('../../../ui/dataLoader.js');
    const monsters = await loadMonsters();
    const monster = monsters.find(m => m.index === monsterIndex);
    if (!monster) {
        console.error(`[truePolymorphService] Monster "${monsterIndex}" not found in monsters.json`);
        return { ok: false, reason: 'no_monster' };
    }

    const baseAc = typeof monster.armor_class === 'number' ? monster.armor_class : 10;
    const baseHp = monster.hit_points || 10;

    const ac = baseAc + (slotLevel || 0);
    const hp = baseHp;

    const cs = getCombatSummary(campaignName);
    if (!cs) {
        return { ok: false, reason: 'no_combat' };
    }

    const creature = {
        name: monster.name,
        type: monster.type || 'monstrosity',
        initiative: String(initiativeValue - 0.1),
        targetName: null,
        ac,
        resistances: monster.damage_resistances || [],
        immunities: monster.damage_immunities || monster.immunities || [],
        concentration: null,
        maxHp: hp,
        currentHp: hp,
        saveBonuses: getMonsterSaveBonuses(monster),
        monsterIndex: monster.index,
        size: monster.size || 'Medium',
        speed: monster.speed || { walk: '30 ft.' },
        actions: monster.actions || [],
        summonedBy: casterName,
        summonSource: 'true_polymorph',
    };

    cs.creatures.push(creature);

    let targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
    const existingSummoned = targetEffects.find(
        te => te.target === creature.name && te.effect === 'summoned' && te.source === casterName
    );
    if (!existingSummoned) {
        targetEffects = [...targetEffects, { target: creature.name, source: casterName, effect: 'summoned', duration: 'concentration' }];
        setRuntimeValue('campaign', 'targetEffects', targetEffects, campaignName, true);
    }

    const concentrationDc = 8 + (playerStats.proficiency || 2) + (playerStats.abilities?.CON?.bonus ?? 0);
    addConcentration(cs, casterName, 'True Polymorph', concentrationDc);

    await storage.set('combatSummary', cs, campaignName);
    setCombatSummaryCache(cs, campaignName);

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: casterName,
        abilityName: 'True Polymorph',
        description: `${casterName} transforms an object into ${creature.name}. The creature is friendly to you and your companions.`,
    }).catch(() => {});

    return { ok: true, creatureName: creature.name };
}

function getCurrentCombatRound(campaignName) {
    const cs = getCombatSummary(campaignName);
    return cs?.round || 1;
}

function getMonsterSaveBonuses(monster) {
    const saveBonuses = {};
    if (monster.ability_scores) {
        const stats = monster.ability_scores;
        const prof = monster.proficiency_bonus || 2;
        const saves = monster.special_abilities || [];
        saveBonuses.str = Math.floor((stats.str - 10) / 2) + (saves.some(s => String(s?.name || '').toLowerCase().includes('str')) ? prof : 0);
        saveBonuses.dex = Math.floor((stats.dex - 10) / 2) + (saves.some(s => String(s?.name || '').toLowerCase().includes('dex')) ? prof : 0);
        saveBonuses.con = Math.floor((stats.con - 10) / 2) + (saves.some(s => String(s?.name || '').toLowerCase().includes('con')) ? prof : 0);
        saveBonuses.int = Math.floor((stats.int - 10) / 2) + (saves.some(s => String(s?.name || '').toLowerCase().includes('int')) ? prof : 0);
        saveBonuses.wis = Math.floor((stats.wis - 10) / 2) + (saves.some(s => String(s?.name || '').toLowerCase().includes('wis')) ? prof : 0);
        saveBonuses.cha = Math.floor((stats.cha - 10) / 2) + (saves.some(s => String(s?.name || '').toLowerCase().includes('cha')) ? prof : 0);
    }
    return saveBonuses;
}

export function revertTruePolymorph(targetName, campaignName) {
    const cs = getCombatSummary(campaignName);
    if (!cs?.creatures) {
        return false;
    }

    const creature = cs.creatures.find(c => c.name === targetName);
    if (!creature) {
        return false;
    }

    if (creature.summonSource === 'true_polymorph') {
        cs.creatures = cs.creatures.filter(c => c.name !== targetName);
        storage.set('combatSummary', cs, campaignName);
        setCombatSummaryCache(cs, campaignName);

        const targetEffects = getRuntimeValue('campaign', 'targetEffects', campaignName) || [];
        const filtered = targetEffects.filter(te => {
            const teTarget = Array.isArray(te.target) ? te.target[0] : te.target;
            return !(teTarget === targetName && te.effect === 'summoned');
        });
        if (filtered.length !== targetEffects.length) {
            setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
        }

        addEntry(campaignName, {
            type: 'ability_use',
            characterName: targetName,
            abilityName: 'True Polymorph',
            description: `${targetName} fades away as the True Polymorph spell ends.`,
        }).catch(() => {});

        return true;
    }

    if (creature.polymorphSource) {
        return revertPolymorph(targetName, campaignName);
    }

    return false;
}

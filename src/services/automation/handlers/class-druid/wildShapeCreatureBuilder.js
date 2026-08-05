import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';
import { setTempHp } from '../buffs/tempHpService.js';

const WILD_SHAPE_EFFECT = 'wild_shape';

function getTargetEffects() {
    const stored = getRuntimeValue('campaign', 'targetEffects');
    return stored || [];
}

function filterBeastSpeeds(beastSpeeds, limitations) {
    if (!beastSpeeds) return {};
    const filtered = {};
    if (beastSpeeds.walk) filtered.walk = beastSpeeds.walk;
    const hasFly = limitations.includes('fly');
    const hasSwim = limitations.includes('swim');
    if (beastSpeeds.swim && hasSwim) filtered.swim = beastSpeeds.swim;
    if (beastSpeeds.fly && hasFly) filtered.fly = beastSpeeds.fly;
    if (beastSpeeds.climb && hasSwim) filtered.climb = beastSpeeds.climb;
    if (beastSpeeds.burrow && hasSwim) filtered.burrow = beastSpeeds.burrow;
    return filtered;
}

function getDruidMaxHp(playerStats) {
    const hitPoints = getRuntimeValue(playerStats.name, 'hitPoints');
    if (hitPoints != null) return hitPoints;
    return playerStats.hitPoints || playerStats.computedStats?.hp?.max || playerStats.computedStats?.hitPoints || 0;
}

function getDruidCurrentHp(playerStats) {
    const currentHp = getRuntimeValue(playerStats.name, 'currentHitPoints');
    if (currentHp != null) return currentHp;
    return playerStats.computedStats?.currentHp || playerStats.currentHitPoints || 0;
}

function getDruidSaveBonuses(playerStats) {
    const saves = playerStats.savingThrows || [];
    const result = {};
    for (const save of saves) {
        const key = save.ability?.toLowerCase().substring(0, 3);
        if (key) {
            result[key] = save.bonus || 0;
        }
    }
    return result;
}

export function buildWildShapeCreature(druidName, baseMonster, druidStats, campaignName, druidInitiative) {
    const druidMaxHp = getDruidMaxHp(druidStats);
    const druidCurrentHp = getDruidCurrentHp(druidStats);
    const druidSaveBonuses = getDruidSaveBonuses(druidStats);
    const druidFeatures = druidStats.classFeatures || {};
    const druidClassFeatures = druidFeatures.Druid || {};
    const wildShapeLimitations = druidClassFeatures.wildShapeLimitations || 'walk only (no swim or fly)';

    const filteredSpeeds = filterBeastSpeeds(baseMonster.speed, wildShapeLimitations);

    const creature = {
        name: baseMonster.name,
        type: 'npc',
        initiative: druidInitiative,
        monsterIndex: baseMonster.index,
        ac: baseMonster.armor_class || 10,
        maxHp: druidMaxHp,
        currentHp: druidCurrentHp,
        size: baseMonster.size,
        speed: filteredSpeeds,
        saveBonuses: druidSaveBonuses,
        resistances: baseMonster.damage_resistances || baseMonster.damage_vulnerabilities || [],
        immunities: baseMonster.damage_immunities || baseMonster.immunities || [],
        conditionImmunities: baseMonster.condition_immunities || [],
        concentration: null,
        wildShapeSource: druidName,
    };

    return creature;
}

export function cleanupWildShape(druidName, campaignName) {
    const combatSummary = getCombatSummary(campaignName);
    if (combatSummary) {
        const beastCreature = combatSummary.creatures.find(c => c.wildShapeSource === druidName);
        if (beastCreature) {
            combatSummary.creatures = combatSummary.creatures.filter(c => c.name !== beastCreature.name);
            storage.set('combatSummary', combatSummary, campaignName);
        }
    }

    const targetEffects = getTargetEffects();
    const filtered = targetEffects.filter(te => !(te.effect === WILD_SHAPE_EFFECT && te.source === druidName));
    if (filtered.length !== targetEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
    }

    const activeBuffs = getRuntimeValue(druidName, 'activeBuffs') || [];
    setRuntimeValue(druidName, 'activeBuffs', activeBuffs.filter(b => b.effect !== 'shape_shift'), campaignName);

    setRuntimeValue(druidName, 'tempHp', 0, campaignName);
}

export async function activateWildShape(druidName, baseMonster, druidStats, campaignName) {
    setRuntimeValue(druidName, 'activeConditions', [], campaignName);

    const combatSummary = await storage.get('combatSummary', campaignName) || { creatures: [] };
    const druidCreatureIndex = combatSummary.creatures.findIndex(c => c.name === druidName && c.type === 'player');
    const druidInitiative = combatSummary.creatures.find(c => c.name === druidName && c.type === 'player')?.initiative || 0;
    if (druidCreatureIndex !== -1) {
        combatSummary.creatures.splice(druidCreatureIndex, 1);
    }

    const beastCreature = buildWildShapeCreature(druidName, baseMonster, druidStats, campaignName, druidInitiative);
    combatSummary.creatures.push(beastCreature);
    await storage.set('combatSummary', combatSummary, campaignName);

    const targetEffects = getTargetEffects();
    targetEffects.push({
        target: druidName,
        source: druidName,
        effect: WILD_SHAPE_EFFECT,
        beastName: baseMonster.name,
    });
    setRuntimeValue('campaign', 'targetEffects', targetEffects, campaignName);

    let amount = druidStats.level || 1;
    const isMoonDruid = druidStats.class?.major?.name === 'Moon' || druidStats.class?.subclass?.name === 'Moon';
    if (isMoonDruid) amount = 3 * amount;
    setTempHp(druidName, amount, campaignName);

    const maxWS = druidStats.class?.class_levels?.find(cl => cl.level === druidStats.level)?.wild_shape || 0;
    const currentWS = Number(getRuntimeValue(druidName, 'wildShapeUses', campaignName) ?? maxWS);
    setRuntimeValue(druidName, 'wildShapeUses', currentWS - 1, campaignName);

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: druidName,
        abilityName: 'Wild Shape',
        description: `${druidName} activated Wild Shape as ${baseMonster.name} (CR ${baseMonster.challenge_rating}).`,
    }).catch(() => {});

    return beastCreature;
}

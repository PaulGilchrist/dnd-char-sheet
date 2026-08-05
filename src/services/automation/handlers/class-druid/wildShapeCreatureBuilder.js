import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { setTempHp } from '../buffs/tempHpService.js';

const WILD_SHAPE_EFFECT = 'wild_shape';

function getTargetEffects() {
    const stored = getRuntimeValue('campaign', 'targetEffects');
    return stored || [];
}

function markDruidCreature(combatSummary, druidName, baseMonster) {
    if (!combatSummary?.creatures) return;
    const druidCreature = combatSummary.creatures.find(c => c.name === druidName && c.type === 'player');
    if (druidCreature) {
        druidCreature.wildShapeSource = druidName;
        druidCreature.beastIndex = baseMonster.index;
        druidCreature.beastName = baseMonster.name;
    }
}

function clearDruidCreature(combatSummary, druidName) {
    if (!combatSummary?.creatures) return;
    const druidCreature = combatSummary.creatures.find(c => c.name === druidName && c.type === 'player');
    if (druidCreature?.wildShapeSource) {
        delete druidCreature.wildShapeSource;
        delete druidCreature.beastIndex;
        delete druidCreature.beastName;
    }
    combatSummary.creatures = combatSummary.creatures.filter(c => !(c.wildShapeSource === druidName && c.type !== 'player'));
}

export function cleanupWildShape(druidName, campaignName) {
    const combatSummary = getCombatSummary(campaignName);
    if (combatSummary) {
        clearDruidCreature(combatSummary, druidName);
        storage.set('combatSummary', combatSummary, campaignName);
    }

    const targetEffects = getTargetEffects();
    const filtered = targetEffects.filter(te => !(te.effect === WILD_SHAPE_EFFECT && te.source === druidName));
    if (filtered.length !== targetEffects.length) {
        setRuntimeValue('campaign', 'targetEffects', filtered, campaignName, true);
    }

    const activeBuffs = getRuntimeValue(druidName, 'activeBuffs') || [];
    setRuntimeValue(druidName, 'activeBuffs', activeBuffs.filter(b => b.effect !== 'shape_shift'), campaignName);

    setRuntimeValue(druidName, 'tempHp', 0, campaignName);
    setRuntimeValue(druidName, 'circleFormsAC', null, campaignName);
}

export async function activateWildShape(druidName, baseMonster, druidStats, campaignName) {
    setRuntimeValue(druidName, 'activeConditions', [], campaignName);

    const combatSummary = await getCombatContext(campaignName) || { creatures: [] };
    clearDruidCreature(combatSummary, druidName);
    markDruidCreature(combatSummary, druidName, baseMonster);
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
    const isMoonDruid = druidStats.class?.major?.name === 'Circle of the Moon' || druidStats.class?.subclass?.name === 'Circle of the Moon';
    if (isMoonDruid) amount = 3 * amount;
    setTempHp(druidName, amount, campaignName);

    if (isMoonDruid) {
        const wis = druidStats.abilities?.find(a => a.name === 'Wisdom');
        const wisMod = wis?.bonus ?? 0;
        const beastAC = typeof baseMonster.armor_class === 'number' ? baseMonster.armor_class : 10;
        const circleFormsAC = Math.max(beastAC, 13 + wisMod);
        setRuntimeValue(druidName, 'circleFormsAC', circleFormsAC, campaignName);
    }

    const maxWS = druidStats.class?.class_levels?.find(cl => cl.level === druidStats.level)?.wild_shape || 0;
    const currentWS = Number(getRuntimeValue(druidName, 'wildShapeUses', campaignName) ?? maxWS);
    setRuntimeValue(druidName, 'wildShapeUses', currentWS - 1, campaignName);

    addEntry(campaignName, {
        type: 'ability_use',
        characterName: druidName,
        abilityName: 'Wild Shape',
        description: `${druidName} activated Wild Shape as ${baseMonster.name} (CR ${baseMonster.challenge_rating}).`,
    }).catch(() => {});

    return { name: baseMonster.name, index: baseMonster.index };
}

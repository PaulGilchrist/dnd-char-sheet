import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import storage from '../../../ui/storage.js';
import cloneDeep from 'lodash/cloneDeep.js';
import { loadMonsters } from '../../../ui/dataLoader.js';
import { getMonsterSaveBonuses } from '../../../encounters/encounterToInitiative.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';

function getTargetEffects() {
    const stored = getRuntimeValue('campaign', 'targetEffects');
    return stored || [];
}

function getSlotLevel(action) {
    const auto = action.automation;
    if (auto?.slotLevel) return auto.slotLevel;
    if (action.metaCtx?.slotLevel) return action.metaCtx.slotLevel;
    if (action.spell?.level) return action.spell.level;
    return auto?.baseLevel || 3;
}

function getSpellSaveDc(playerStats) {
    return playerStats.spellAbilities?.saveDc || (8 + (playerStats.proficiency || 2));
}

function getSpellAttackModifier(playerStats) {
    return playerStats.spellAbilities?.toHit || 0;
}

function getSpellcastingModifier(playerStats) {
    return playerStats.spellAbilities?.modifier || 0;
}

function getWisdomModifier(playerStats) {
    const wis = playerStats.abilities?.find(a => a.name === 'Wisdom');
    return wis?.bonus || 0;
}

async function loadMonsterData(monsterIndex) {
    const monsters = await loadMonsters();
    const monster = monsters.find(m => m.index === monsterIndex);
    if (!monster) {
        console.error(`[summonSpirit] Monster "${monsterIndex}" not found in monsters.json`);
        return null;
    }
    return monster;
}

function resolveMonsterActions(monster, { slotLevel, spellAttackMod, spellSaveDc, wisModifier, spellcastingModifier }) {
    return (monster.actions || []).map(action => {
        const resolved = { ...action };
        resolved.damage_dice_primary = String(resolved.damage_dice_primary || '')
            .replace(/WIS modifier/gi, String(wisModifier))
            .replace(/spellcasting modifier/gi, String(spellcastingModifier));
        let desc = String(resolved.description || '');
        desc = desc.replace(/WIS modifier/gi, String(wisModifier));
        desc = desc.replace(/spell attack modifier/gi, `+${spellAttackMod}`);
        desc = desc.replace(/spell level/gi, String(slotLevel));
        desc = desc.replace(/spellcasting modifier/gi, String(spellcastingModifier));
        resolved.description = desc;
        if (resolved.attack_bonus === null || resolved.attack_bonus === undefined) {
            resolved.attack_bonus = spellAttackMod;
        }
        if (resolved.save_dc != null && resolved.save_dc === 20) {
            resolved.save_dc = spellSaveDc;
        }
        return resolved;
    });
}

function buildSpiritCreature(monster, displayName, casterName, initiativeValue, slotLevel, auto, playerStats) {
    const baseAc = typeof monster.armor_class === 'number' ? monster.armor_class : 10;
    const baseHp = monster.hit_points || 10;
    const scale = auto.scale !== false;

    const ac = scale ? baseAc + slotLevel : baseAc;
    const hp = scale
        ? baseHp + (auto.hpPerLevelAbove || 0) * Math.max(0, slotLevel - (auto.baseLevel || slotLevel))
        : baseHp;

    const spellSaveDc = getSpellSaveDc(playerStats);
    const spellAttackMod = getSpellAttackModifier(playerStats);
    const wisModifier = getWisdomModifier(playerStats);
    const spellcastingModifier = getSpellcastingModifier(playerStats);

    return {
        name: displayName,
        type: monster.type || 'construct',
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
        actions: resolveMonsterActions(monster, { slotLevel, spellAttackMod, spellSaveDc, wisModifier, spellcastingModifier }),
        summonedBy: casterName,
        summonSource: 'spell',
    };
}

function infoPopup(action, description) {
    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            automationType: action.automation?.type,
            description,
            automation: action.automation,
        },
    };
}

function getCasterInitiativeValue(combatSummary, casterName) {
    const casterCreature = combatSummary.creatures.find(c => c.name === casterName);
    let initiativeValue = 0;
    if (casterCreature?.initiative !== '' && casterCreature?.initiative !== undefined) {
        initiativeValue = parseInt(casterCreature.initiative, 10) || 0;
    }
    const casterInitBonus = casterCreature?.initiativeBonus || 0;
    return initiativeValue || (Math.floor(Math.random() * 20) + 1 + casterInitBonus);
}

async function performSummon(action, playerStats, campaignName, variant) {
    const auto = action.automation;
    const casterName = playerStats.name;
    const slotLevel = getSlotLevel(action);

    const combatSummary = getCombatSummary(campaignName);
    if (!combatSummary) {
        return infoPopup(action, 'Failed to load combat summary.');
    }

    const monster = await loadMonsterData(variant.monsterIndex);
    if (!monster) {
        return infoPopup(action, `Failed to load monster data for ${variant.name}.`);
    }

    const initiativeValue = getCasterInitiativeValue(combatSummary, casterName);
    const creature = buildSpiritCreature(monster, variant.name, casterName, initiativeValue, slotLevel, auto, playerStats);
    combatSummary.creatures.push(creature);

    let targetEffects = getTargetEffects();
    const existingSummoned = targetEffects.find(
        te => te.target === creature.name && te.effect === 'summoned' && te.source === casterName
    );
    if (!existingSummoned) {
        targetEffects.push({
            target: creature.name,
            source: casterName,
            effect: 'summoned',
            summonSource: 'spell',
            duration: 'concentration',
        });
    }

    combatSummary.creatures.sort((a, b) => {
        const aInit = a.initiative === '' || a.initiative === undefined ? 0 : Number(a.initiative);
        const bInit = b.initiative === '' || b.initiative === undefined ? 0 : Number(b.initiative);
        return bInit - aInit;
    });

    addConcentration(combatSummary, casterName, action.name, getSpellSaveDc(playerStats));
    storage.set('combatSummary', cloneDeep(combatSummary), campaignName);
    setRuntimeValue('campaign', 'targetEffects', targetEffects, campaignName);
    window.dispatchEvent(new CustomEvent('initiative-rolled'));

    const summonLabel = auto.typeLabel || variant.name;
    const logDescription = `${casterName} casts ${action.name} (slot level ${slotLevel}), summoning ${variant.name}.`;

    await addEntry(campaignName, {
        type: 'summons',
        characterName: casterName,
        summonName: summonLabel,
        description: logDescription,
        summonedCreatures: [creature.name],
        timestamp: Date.now(),
    }).catch(() => {});

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: action.name,
            automationType: auto.type,
            description: `${casterName} casts ${action.name}, summoning ${variant.name}. It acts right after ${casterName}.`,
            automation: auto,
        },
        logEntries: [{
            type: 'summons',
            characterName: casterName,
            summonName: summonLabel,
            description: logDescription,
            summonedCreatures: [creature.name],
            timestamp: Date.now(),
        }],
    };
}

export async function handle(action, playerStats, campaignName) {
    const variants = action.automation?.variants || [];
    if (variants.length === 1) {
        return performSummon(action, playerStats, campaignName, variants[0]);
    }
    return {
        type: 'modal',
        modalName: 'summonSpirit',
        payload: { action, playerStats, campaignName },
    };
}

export async function confirmSummonSpirit(action, playerStats, campaignName, variantName) {
    const auto = action.automation;
    const variant = auto?.variants?.find(v => v.name === variantName);
    if (!variant) {
        return infoPopup(action, 'No summon variant selected.');
    }
    return performSummon(action, playerStats, campaignName, variant);
}

export { buildSpiritCreature, resolveMonsterActions };

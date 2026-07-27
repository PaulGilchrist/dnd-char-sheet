import { buildSaveDc, createSaveListener } from '../../common/savePrompt.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { setRuntimeValue, getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { findLastAttack, rollbackSpellEffects } from '../../common/damageRollback.js';

export async function handle(action, playerStats, campaignName, _mapName) {
    const auto = action.automation;
    const playerName = playerStats.name;
    const featureName = action.name || 'Counterspell';

    const cs = await getCombatContext(campaignName);
    if (!cs) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: featureName,
                description: `${featureName} requires an active combat. Select a creature in combat and try again.`,
                automation: auto,
            },
        };
    }

    const lastAttack = await findLastAttack(campaignName);
    if (!lastAttack.attackEvent) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: featureName,
                description: `${featureName} — No recent attack to counter.`,
                automation: auto,
            },
        };
    }

    const hasSpellIndicator = lastAttack.attackEvent.damageFormula ||
                              lastAttack.attackEvent.attackName ||
                              lastAttack.attackEvent.saveType;
    if (!hasSpellIndicator) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: featureName,
                description: `${featureName} — No spell detected in the most recent attack.`,
                automation: auto,
            },
        };
    }

    const attackerName = lastAttack.attackEvent.attackerName;
    if (!attackerName) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: featureName,
                description: `${featureName} — Could not identify the spellcaster.`,
                automation: auto,
            },
        };
    }

    const attackerCreature = cs.creatures.find(c => c.name === attackerName);
    if (!attackerCreature) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: featureName,
                description: `${featureName} — ${attackerName} is not in combat.`,
                automation: auto,
            },
        };
    }

    const saveDc = buildSaveDc(auto, playerStats);

    const { promptId } = createSaveListener(campaignName, {
        targetName: attackerName,
        saveType: 'CON',
        saveDc,
        disadvantage: !!action.metaCtx?.metamagicHeighten,
    });

    const spellName = lastAttack.attackEvent.attackName || 'unknown spell';
    addEntry(campaignName, {
        type: 'ability_use',
        characterName: playerName,
        abilityName: featureName,
        description: `${featureName} triggered — Countering ${attackerName}'s '${spellName}'. ${attackerName} must make CON save (DC ${saveDc})`,
        promptId,
    }).catch((e) => { console.error("[counterSpell] Error:", e); });

    const handleSaveResult = async (event) => {
        if (event.detail.promptId !== promptId) return;

        const spellResult = event.detail.success ? 'succeeded' : 'failed';
        const counterspellResult = event.detail.success ? 'fails to counter' : 'counters';

        window.dispatchEvent(new CustomEvent('counterspell-save-result', {
            detail: {
                promptId,
                attackerName,
                spellName,
                saveDc,
                success: event.detail.success,
                spellResult,
                counterspellResult,
            },
        }));

        if (!event.detail.success) {
            const rolledBack = await rollbackSpellEffects(lastAttack.attackEvent, campaignName, featureName);

            addEntry(campaignName, {
                type: 'save_result',
                characterName: playerName,
                rollType: `save-${auto.type}`,
                targetName: attackerName,
                saveDc,
                saveType: 'CON',
                success: false,
                description: `${attackerName} failed CON save. ${featureName} counters '${spellName}'!`,
            }).catch((e) => { console.error("[counterSpell] Error:", e); });

            if (rolledBack.logDescription) {
                addEntry(campaignName, {
                    type: 'ability_use',
                    characterName: playerName,
                    abilityName: featureName,
                    description: rolledBack.logDescription,
                }).catch((e) => { console.error("[counterSpell] Error:", e); });
            }
        } else {
            addEntry(campaignName, {
                type: 'save_result',
                characterName: playerName,
                rollType: `save-${auto.type}`,
                targetName: attackerName,
                saveDc,
                saveType: 'CON',
                success: true,
                description: `${attackerName} succeeded on CON save. ${featureName} fails to counter '${spellName}'.`,
            }).catch((e) => { console.error("[counterSpell] Error:", e); });

            const passives = playerStats.automation?.passives;
            const spellBreaker = passives?.find(p => p.type === 'spell_breaker');
            if (spellBreaker && spellBreaker.slotRetentionSpells?.includes('Counterspell')) {
                const slotKey = 'spell_slots_level_3';
                const currentSlots = getRuntimeValue(playerName, slotKey);
                if (currentSlots != null && currentSlots >= 0) {
                    setRuntimeValue(playerName, slotKey, currentSlots + 1, campaignName);
                }
            }
        }

        window.removeEventListener('save-result', handleSaveResult);
    };

    window.addEventListener('save-result', handleSaveResult);

    return {
        type: 'popup',
        payload: {
            type: 'automation_info',
            name: featureName,
            targetName: attackerName,
            description: `${attackerName}'s '${spellName}' is being countered — ${attackerName} must make a CON saving throw (DC ${saveDc}).`,
            automation: auto,
        },
    };
}

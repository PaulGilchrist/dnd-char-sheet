import { getRuntimeValue } from '../../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../../ui/logService.js';
import { isForcecageBlocked } from '../../../../automation/handlers/spells/forcecageHandler.js';
import { isMazeBlocked } from '../../../../automation/handlers/spells/mazeHandler.js';
import { isBanishmentBlocked } from '../../../../automation/handlers/spells/banishmentHandler.js';
import { isImprisonmentBlocked } from '../../../../automation/handlers/spells/imprisonmentHandler.js';

export async function checkGlobeOfInvulnerability(spell, targetName, playerStats, campaignName) {
    const effectiveSpellLevel = spell.level ?? spell.baseLevel ?? 1;
    if (effectiveSpellLevel <= 5 && targetName) {
        const storedEffects = getRuntimeValue('campaign', 'targetEffects') || [];
        const effects = Array.isArray(storedEffects) ? storedEffects : [];
        const globeEffects = effects.filter(te => te.effect === 'globe_barrier');
        const globeEffect = effects.find(
            te => te.target === targetName && te.effect === 'globe_barrier'
        );
        if (globeEffect) {
            const attackerProtected = globeEffects.some(ge => ge.target === playerStats.name);
            if (!attackerProtected) {
                await addEntry(campaignName, {
                    type: 'automation',
                    creatureName: globeEffect.source,
                    name: 'Globe of Invulnerability',
                    description: `${spell.name} (level ${effectiveSpellLevel}) from ${playerStats.name} blocked — target is protected by Globe of Invulnerability.`,
                    timestamp: Date.now(),
                }).catch(() => {});

                return {
                    automationPopup: {
                        type: 'popup',
                        payload: {
                            type: 'automation_info',
                            name: 'Globe of Invulnerability',
                            description: `${spell.name} (level ${effectiveSpellLevel}) is blocked by Globe of Invulnerability protecting ${targetName}.`,
                        },
                    },
                };
            }
        }
    }
    return null;
}

export async function checkForcecageBlocked(spell, targetName, playerStats, campaignName) {
    const casterName = playerStats.name;
    if (!targetName) return null;

    // A spell cannot pass between inside and outside a Forcecage prison. The
    // caster and target must be on the same side of every relevant cage.
    if (isForcecageBlocked(casterName, targetName, campaignName)) {
        await addEntry(campaignName, {
            type: 'automation',
            creatureName: casterName,
            name: 'Forcecage',
            description: `${spell.name} from ${casterName} blocked by Forcecage — ${casterName} and ${targetName} are on opposite sides of the prison.`,
            timestamp: Date.now(),
        }).catch(() => {});

        return {
            automationPopup: {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Forcecage',
                    description: `${spell.name} is blocked by Forcecage. ${casterName} and ${targetName} are on opposite sides of the prison, and no attack, spell, or effect can pass through it.`,
                },
            },
        };
    }

    // A spell cannot pass between inside and outside a Maze demiplane.
    if (isMazeBlocked(casterName, targetName, campaignName)) {
        await addEntry(campaignName, {
            type: 'automation',
            creatureName: casterName,
            name: 'Maze',
            description: `${spell.name} from ${casterName} blocked by Maze — ${casterName} and ${targetName} are on opposite sides of the demiplane.`,
            timestamp: Date.now(),
        }).catch(() => {});

        return {
            automationPopup: {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Maze',
                    description: `${spell.name} is blocked by Maze. ${casterName} and ${targetName} are on opposite sides of the demiplane, and no attack, spell, or effect can pass through it.`,
                },
            },
        };
    }

    // A spell cannot pass between inside and outside a Banishment demiplane.
    if (isBanishmentBlocked(casterName, targetName, campaignName)) {
        await addEntry(campaignName, {
            type: 'automation',
            creatureName: casterName,
            name: 'Banishment',
            description: `${spell.name} from ${casterName} blocked by Banishment — ${casterName} and ${targetName} are on opposite sides of the demiplane.`,
            timestamp: Date.now(),
        }).catch(() => {});

        return {
            automationPopup: {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Banishment',
                    description: `${spell.name} is blocked by Banishment. ${casterName} and ${targetName} are on opposite sides of the demiplane, and no attack, spell, or effect can pass through it.`,
                },
            },
        };
    }

    // A spell cannot pass between inside and outside an Imprisonment prison.
    if (isImprisonmentBlocked(casterName, targetName, campaignName)) {
        await addEntry(campaignName, {
            type: 'automation',
            creatureName: casterName,
            name: 'Imprisonment',
            description: `${spell.name} from ${casterName} blocked by Imprisonment — ${casterName} and ${targetName} are on opposite sides of the prison.`,
            timestamp: Date.now(),
        }).catch(() => {});

        return {
            automationPopup: {
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Imprisonment',
                    description: `${spell.name} is blocked by Imprisonment. ${casterName} and ${targetName} are on opposite sides of the prison, and no attack, spell, or effect can pass through it.`,
                },
            },
        };
    }
    return null;
}

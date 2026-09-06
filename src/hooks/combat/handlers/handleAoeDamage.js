import { applyDamageToTarget } from '../../../services/rules/combat/applyDamage.js';
import { getAffectedCreatures, processAoeNpcs, sendAoePlayerSaves } from '../../../services/rules/combat/aoeService.js';
import { setRuntimeValue } from '../../runtime/useRuntimeState.js';
import { getAllyList } from '../../useAllySelection.js';
import { loadCombatSummary } from '../../../services/encounters/combatData.js';
import { endInvisibilityOnHostileAction } from '../../../services/rules/features/invisibilityService.js';
import { readAoeContext, hasSoulstitchProtection, clearSoulstitchStamp } from '../loggedDiceRollUtils.js';
import { handleOverchannelSelfDamage } from './handleOverchannelSelfDamage.js';

export function createAoeDamageHandler(deps) {
    const { characterName, campaignName, characters, setPopupHtml, logEntry, pendingSaves } = deps;

    return async function handleAoeDamage(name, formula, total, rolls, modifier, context, adjustedTotal, displayRolls, gwfBaseRolls, gwfDisplayRolls) {
        const { saveDc, saveType, dcSuccess, damageType, attackerName } = context || {};
        const overlayId = context?.targetName?.startsWith('overlay-') ? context.targetName.slice('overlay-'.length) : null;
        const aoeCtx = overlayId ? await readAoeContext(campaignName, overlayId) : null;
        const combatSummary = await loadCombatSummary(campaignName);
        if (!aoeCtx || !combatSummary) return;

        const { overlay, players, npcs } = aoeCtx;
        const affected = getAffectedCreatures(overlay, players, npcs, combatSummary);
        const casterName = attackerName || characterName;
        const isCarefulSpell = context?.metamagicCareful || false;
        const allyList = isCarefulSpell ? getAllyList(casterName) : null;
        const heightenTarget = context?.heightenTarget || null;

        const isCarefulAlly = (creatureName) => {
            if (!allyList) return false;
            return allyList.includes(creatureName);
        };

        const npcResults = [];
        const carefulAllyResults = [];

        if (saveDc && saveType) {
            const nonCarefulAffected = affected.filter(a => !isCarefulAlly(a.creature.name));
            const carefulAffected = affected.filter(a => isCarefulAlly(a.creature.name));

            const npcResultsFromProcess = processAoeNpcs(combatSummary, nonCarefulAffected, adjustedTotal, damageType, saveDc, saveType, dcSuccess, campaignName, casterName, characters, heightenTarget);
            npcResults.push(...npcResultsFromProcess);

            for (const { creature } of carefulAffected) {
                if (creature.type === 'npc') {
                    const applyResult = await applyDamageToTarget(combatSummary, creature.name, 0, [damageType], campaignName, characters, false, casterName);
                    carefulAllyResults.push({
                        creatureName: creature.name,
                        saveSuccess: true,
                        saveRoll: null,
                        saveBonus: null,
                        finalDamage: 0,
                        newHp: applyResult?.newHp,
                        damageReduced: true,
                        carefulSpell: true,
                    });
                }
            }
        } else {
            const nonCarefulAffected = affected.filter(a => !isCarefulAlly(a.creature.name));
            const carefulAffected = affected.filter(a => isCarefulAlly(a.creature.name));

            for (const { creature } of nonCarefulAffected) {
                const applyResult = await applyDamageToTarget(combatSummary, creature.name, adjustedTotal, [damageType], campaignName, characters, false, casterName);
                if (applyResult && applyResult.finalDamage > 0) {
                    endInvisibilityOnHostileAction(casterName, campaignName);
                }
                npcResults.push({ creatureName: creature.name, finalDamage: applyResult?.finalDamage, newHp: applyResult?.newHp, damageReduced: applyResult?.damageReduced, saveSuccess: null });
            }

            for (const { creature } of carefulAffected) {
                const applyResult = await applyDamageToTarget(combatSummary, creature.name, 0, [damageType], campaignName, characters, false, casterName);
                carefulAllyResults.push({
                    creatureName: creature.name,
                    saveSuccess: true,
                    saveRoll: null,
                    saveBonus: null,
                    finalDamage: 0,
                    newHp: applyResult?.newHp,
                    damageReduced: true,
                    carefulSpell: true,
                });
            }
        }

        const playerAffected = affected.filter(a => a.creature.type === 'player');
        const playersNeedingSave = playerAffected.filter(a => !hasSoulstitchProtection(a.creature.name, casterName, campaignName) && !isCarefulAlly(a.creature.name));
        const soulstitchProtectedPlayers = playerAffected.filter(a => hasSoulstitchProtection(a.creature.name, casterName, campaignName) && !isCarefulAlly(a.creature.name));
        const carefulSpellPlayers = playerAffected.filter(a => isCarefulAlly(a.creature.name));

        for (const pp of soulstitchProtectedPlayers) {
            const creature = pp.creature;
            const applyResult = await applyDamageToTarget(combatSummary, creature.name, 0, [damageType], campaignName, characters, false, casterName);
            carefulAllyResults.push({
                creatureName: creature.name,
                saveSuccess: true,
                saveRoll: null,
                saveBonus: null,
                finalDamage: 0,
                newHp: applyResult?.newHp,
                damageReduced: true,
                soulstitchProtected: true,
            });
        }

        for (const pp of carefulSpellPlayers) {
            const creature = pp.creature;
            const applyResult = await applyDamageToTarget(combatSummary, creature.name, 0, [damageType], campaignName, characters, false, casterName);
            carefulAllyResults.push({
                creatureName: creature.name,
                saveSuccess: true,
                saveRoll: null,
                saveBonus: null,
                finalDamage: 0,
                newHp: applyResult?.newHp,
                damageReduced: true,
                carefulSpell: true,
            });
        }

        if (playersNeedingSave.length && saveDc && saveType) {
            const playerPrompts = sendAoePlayerSaves(playersNeedingSave, adjustedTotal, damageType, saveDc, saveType, dcSuccess, campaignName, name, casterName, rolls, formula, heightenTarget);
            for (const pp of playerPrompts) {
                pendingSaves[pp.promptId] = {
                    targetName: pp.targetName, rawDamage: adjustedTotal, saveDc, saveType, dcSuccess,
                    damageType, attackerName: casterName,
                    name, formula, modifier, rolls, campaignName, setPopupHtml, isAoe: true,
                    isCantrip: context?.isCantrip || false,
                    overchannelActive: context?.overchannelActive || false,
                    overchannelUseCount: context?.overchannelUseCount || 0,
                    overchannelSpellLevel: context?.overchannelSpellLevel || 1,
                    playerStats: context?.playerStats,
                };
            }
        }
        const overlayLabel = overlay.label || overlay.shape || 'AoE';
        const allResults = [...npcResults, ...carefulAllyResults];
        const resultRows = allResults.map(r => {
            const soulstitchNote = r.soulstitchProtected ? ' <em>(Soulstitch)</em>' : '';
            const carefulNote = r.carefulSpell ? ' <em>(Careful Spell)</em>' : '';
            const saveInfo = r.saveSuccess === null ? '' : (r.saveSuccess
                ? `<span class="aoe-save-success">SAVE ${r.saveRoll !== null ? r.saveRoll + '+' + r.saveBonus : 'auto'} PASS</span>`
                : `<span class="aoe-save-fail">SAVE ${r.saveRoll}+${r.saveBonus} FAIL</span>`);
            const reduced = r.damageReduced ? ' <em>(reduced)</em>' : '';
            return `<div class="aoe-result-row"><strong>${r.creatureName}</strong>: ${r.finalDamage} dmg${reduced} → ${r.newHp !== undefined ? `HP ${r.newHp}` : ''} ${saveInfo}${soulstitchNote}${carefulNote}</div>`;
        }).join('');
        const pendingList = playersNeedingSave.length
            ? `<div class="aoe-pending"><i class="fa-solid fa-spinner fa-spin"></i> Waiting for saves: ${playersNeedingSave.map(a => a.creature.name).join(', ')}</div>`
            : '';
        const displayTotal = adjustedTotal !== total ? `${total} (+${adjustedTotal - total} Elemental Adept)` : String(total);
        const html = `<div class="aoe-summary"><h3><i class="fa-solid fa-wand-magic-sparkles"></i> ${overlayLabel} — ${name}</h3><div class="aoe-damage-info">${formula}: <strong>${displayTotal}</strong> ${damageType || 'untyped'}${saveDc ? ` — ${saveType ? saveType.toUpperCase() : ''} save DC ${saveDc}` : ''}</div><div class="aoe-results">${resultRows || '<em>No creatures affected</em>'}</div>${pendingList}</div>`;
        logEntry({
            type: 'aoe-damage',
            characterName,
            rollType: 'aoe-damage',
            name,
            formula, rolls: displayRolls, total: adjustedTotal, modifier, damageType,
            targetName: overlayLabel,
            affectedCount: affected.length,
            npcResults: allResults.map(r => r.creatureName),
            saveType, saveDc, dcSuccess,
            gwfApplied: gwfDisplayRolls !== gwfBaseRolls,
            gwfOriginalRolls: gwfDisplayRolls !== gwfBaseRolls ? gwfBaseRolls : null,
            gwfDisplayRolls: gwfDisplayRolls,
        });
        setPopupHtml(html);

        // Write lastAttack for AoE — coverspell needs this for rollback
        const aoeAffectedNames = affected.map(a => a.creature.name);
        const aoeLastAttackData = {
            attackerName: casterName,
            targetName: overlayLabel,
            rollType: 'aoe-damage',
            saveType: saveType || null,
            saveDc: saveDc || null,
            damageFormula: formula || null,
            damageName: name || null,
            damageType: damageType || null,
            rawDamage: adjustedTotal,
            primaryDamage: adjustedTotal,
            primaryDamageType: damageType || null,
            actualDamage: adjustedTotal,
            damageApplied: adjustedTotal > 0,
            statusEffects: context?.statusEffects || null,
            affectedTargets: aoeAffectedNames,
            timestamp: Date.now(),
        };
        setRuntimeValue('campaign', 'lastAttack', aoeLastAttackData, campaignName);

        handleOverchannelSelfDamage(characterName, campaignName, context, logEntry, characters);

        // CLA-321: Soulstitch protection lasts only for the cast that wrote the stamp.
        clearSoulstitchStamp(casterName, campaignName);
    };
}

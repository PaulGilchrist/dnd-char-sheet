import { describe, it, expect } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';
import { createHooks, setupBeforeEach, campaignName, basePlayerStats } from './useCharActionsAutomation.test.setup.js';

describe('useCharActionsAutomation', () => {
    setupBeforeEach();

    describe('handleAutomationAction - modal cases', () => {
        it('should handle healingPool modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'healingPool',
                payload: { amount: 5 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ healingPoolModal: { amount: 5 } });
        });

        it('should handle handOfHealing modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'handOfHealing',
                payload: { amount: 3 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ handOfHealingModal: { amount: 3 } });
        });

        it('should handle fontOfMagic modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fontOfMagic',
                payload: {},
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ fontOfMagicModal: true });
        });

        it('should handle resourcePool modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'resourcePool',
                payload: { type: 'spell_slots' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ resourcePoolModal: { type: 'spell_slots' } });
        });

        it('should handle setCondition modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'setCondition',
                payload: { condition: 'blinded' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ setConditionModal: { condition: 'blinded' } });
        });

        it('should handle attackRider modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'attackRider',
                payload: { rider: 'extra_damage' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ attackRiderModal: { rider: 'extra_damage' } });
        });

        it('should handle openHandTechnique modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'openHandTechnique',
                payload: { option: 'shove' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ openHandTechniqueModal: { option: 'shove' } });
        });

        it('should handle shieldBash modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'shieldBash',
                payload: { target: 'enemy1' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ shieldBashModal: { target: 'enemy1' } });
        });

        it('should handle quiveringPalm modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'quiveringPalm',
                payload: { duration: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ quiveringPalmModal: { duration: 10 } });
        });

        it('should handle combatStance modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'combatStance',
                payload: { stance: 'berserker' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ combatStanceModal: { stance: 'berserker' } });
        });

        it('should handle teleport modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'teleport',
                payload: { destination: 'room2' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ teleportModal: { destination: 'room2' } });
        });

        it('should handle invokeDuplicity modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'invokeDuplicity',
                payload: { count: 2 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ invokeDuplicityModal: { count: 2 } });
        });

        it('should handle saveAttackHeal modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'saveAttackHeal',
                payload: { healAmount: 5 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ saveAttackHealModal: { healAmount: 5 } });
        });

        it('should handle saveAttackAoe modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'saveAttackAoe',
                payload: { radius: 15 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ saveAttackAoeModal: { radius: 15 } });
        });

        it('should handle aoeCondition modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'aoeCondition',
                payload: { condition: 'frightened' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ aoeConditionModal: { condition: 'frightened' } });
        });

        it('should handle elementalAttunement modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalAttunement',
                payload: { type: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ elementalAttunementModal: { type: 'fire' } });
        });

        it('should handle divineIntervention modal', async () => {
            const hooks = createHooks();
            const action = { name: 'Divine Intervention' };
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'divineIntervention',
                payload: { options: ['smite', 'teleport'] },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                divineInterventionAction: action,
                divineInterventionModal: { options: ['smite', 'teleport'] },
            });
        });

        it('should handle moonlightStepResource modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'moonlightStepResource',
                payload: { resource: 'mistyStep' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ moonlightStepResourceModal: { resource: 'mistyStep' } });
        });

        it('should handle starryFormConstellation modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'starryFormConstellation',
                payload: { shape: 'arrow' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ starryFormConstellationModal: { shape: 'arrow' } });
        });

        it('should handle arcaneCharge modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'arcaneCharge',
                payload: { type: 'bolt' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ arcaneChargeModal: { type: 'bolt' } });
        });

        it('should handle warMagicCantrip modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'warMagicCantrip',
                payload: { cantrip: 'lightningBoLt' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ warMagicCantripModal: { cantrip: 'lightningBoLt' } });
        });

        it('should handle sacredWeaponDamageType modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'sacredWeaponDamageType',
                payload: { type: 'radiant' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ sacredWeaponModal: { type: 'radiant' } });
        });

        it('should handle primalCompanionBonusActionCommand modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'primalCompanionBonusActionCommand',
                payload: { command: 'attack' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ primalCompanionBonusActionModal: { command: 'attack' } });
        });

        it('should handle primalCompanionSummon modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'primalCompanionSummon',
                payload: { companion: 'bear' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ primalCompanionSummonModal: { companion: 'bear' } });
        });

        it('should handle wildMagicSurge modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'wildMagicSurge',
                payload: { surge: 'teleport' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ wildMagicSurgeModal: { surge: 'teleport' } });
        });

        it('should handle weaponMasteryChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'weaponMasteryChoice',
                payload: { choice: 'push' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ weaponMasteryChoiceModal: { choice: 'push' } });
        });

        it('should handle bendFateChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bendFateChoice',
                payload: { option: 'reroll' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bendFateModal: { option: 'reroll' } });
        });

        it('should handle thirdEye modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'thirdEye',
                payload: { vision: 'truesight' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ thirdEyeModal: { vision: 'truesight' } });
        });

        it('should handle soulstitchSpells modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'soulstitchSpells',
                payload: { spell: 'magicMissile' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ soulstitchSpellsModal: { spell: 'magicMissile' } });
        });

        it('should handle illusoryReality modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'illusoryReality',
                payload: { effect: 'healing' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ illusoryRealityModal: { effect: 'healing' } });
        });

        it('should handle celestialRevelation modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'celestialRevelation',
                payload: { ability: 'healingHands' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ celestialRevelationModal: { ability: 'healingHands' } });
        });

        it('should handle fiendishResilience modal with damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fiendishResilience',
                payload: {
                    action: { name: 'Fiendish Resilience' },
                    damageTypes: ['Fire'],
                    existingType: 'Fire',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                fiendishResilienceModal: {
                    action: { name: 'Fiendish Resilience' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: ['Fire'],
                    existingType: 'Fire',
                },
            });
        });

        it('should handle fiendishResilience modal with default damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fiendishResilience',
                payload: {
                    action: { name: 'Fiendish Resilience' },
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                fiendishResilienceModal: {
                    action: { name: 'Fiendish Resilience' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: [
                        'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning',
                        'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
                    ],
                    existingType: undefined,
                },
            });
        });

        it('should handle breathWeaponShape modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'breathWeaponShape',
                payload: {
                    action: { name: 'Breath Weapon' },
                    options: ['cone', 'line'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                breathWeaponShapeModal: {
                    action: { name: 'Breath Weapon' },
                    playerStats: basePlayerStats,
                    campaignName,
                    options: ['cone', 'line'],
                },
            });
        });

        it('should handle hypnoticPatternShake modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'hypnoticPatternShake',
                payload: { effect: 'charmed' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ hypnoticPatternShakeModal: { effect: 'charmed' } });
        });

        it('should handle animateDead modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'animateDead',
                payload: { undead: 'zombie' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ animateDeadModal: { undead: 'zombie' } });
        });

        it('should handle createUndead modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'createUndead',
                payload: { undead: 'skeleton' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ createUndeadModal: { undead: 'skeleton' } });
        });

        it('should handle summonSpirit modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'summonSpirit',
                payload: { spirit: 'wolf' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ summonSpiritModal: { spirit: 'wolf' } });
        });

        it('should handle flurryOfBlows modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'flurryOfBlows',
                payload: { strikes: 3 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ flurryOfBlowsModal: { strikes: 3 } });
        });

        it('should handle elementalEpitome modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalEpitome',
                payload: { element: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ epitomeModal: { element: 'fire' } });
        });

        it('should handle destructiveStride modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'destructiveStride',
                payload: { effect: 'knockdown' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ destructiveStrideModal: { effect: 'knockdown' } });
        });

        it('should handle destructiveStrideTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'destructiveStrideTarget',
                payload: { target: 'enemy5' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ destructiveStrideTargetModal: { target: 'enemy5' } });
        });

        it('should handle wildCompanion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'wildCompanion',
                payload: { action: 'bite' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ wildCompanionModal: { action: 'bite' } });
        });

        it('should handle celestialResilienceModal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'celestialResilienceModal',
                payload: { resistance: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                celestialResilienceModal: {
                    resistance: 'fire',
                    playerStats: basePlayerStats,
                    campaignName,
                },
            });
        });

        it('should handle elfishLineage modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elfishLineage',
                payload: { trait: 'feyIntuition' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ elfishLineageModal: { trait: 'feyIntuition' } });
        });

        it('should handle gnomishLineage modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'gnomishLineage',
                payload: { trait: 'magicSensitive' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ gnomishLineageModal: { trait: 'magicSensitive' } });
        });

        it('should handle fiendishLegacy modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'fiendishLegacy',
                payload: { trait: 'hellishResistance' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ fiendishLegacyModal: { trait: 'hellishResistance' } });
        });

        it('should handle giantAncestry modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'giantAncestry',
                payload: { giantType: 'fire' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ giantAncestryModal: { giantType: 'fire' } });
        });

        it('should handle combatSuperiority modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'combatSuperiority',
                payload: { maneuver: 'precisionAttack' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ combatSuperiorityModal: { maneuver: 'precisionAttack' } });
        });

        it('should handle sweepingAttackTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'sweepingAttackTarget',
                payload: { target: 'enemy2' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ sweepingAttackTargetModal: { target: 'enemy2' } });
        });

        it('should handle baitAndSwitchChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'baitAndSwitchChoice',
                payload: { choice: 'switch' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ baitAndSwitchChoiceModal: { choice: 'switch' } });
        });

        it('should handle bulwarkOfForce modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bulwarkOfForceTarget',
                payload: { target: 'ally1' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bulwarkOfForceModal: { target: 'ally1' } });
        });

        it('should handle zealousPresenceTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'zealousPresenceTarget',
                payload: { target: 'ally2' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ zealousPresenceModal: { target: 'ally2' } });
        });

        it('should handle clockworkCavalcade modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'clockworkCavalcade',
                payload: { effect: 'dispel' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ clockworkCavalcadeModal: { effect: 'dispel' } });
        });

        it('should handle naturesSanctuaryCreatures modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'naturesSanctuaryCreatures',
                payload: { creature: 'goblin1' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: { creature: 'goblin1' } });
        });

        it('should handle coronaEnemySelection modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'coronaEnemySelection',
                payload: { enemy: 'darkLord' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ coronaEnemySelectionModal: { enemy: 'darkLord' } });
        });

        it('should handle radianceOfDawn modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'radianceOfDawn',
                payload: { radius: 15 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ radianceOfDawnModal: { radius: 15 } });
        });

        it('should handle mantleOfInspirationTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'mantleOfInspirationTarget',
                payload: { target: 'ally3' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ mantleOfInspirationTarget: { target: 'ally3' } });
        });

        it('should handle vitalitYOfTheTreeTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'vitalityOfTheTreeTarget',
                payload: { target: 'ally4' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ vitalityOfTheTreeTarget: { target: 'ally4' } });
        });

        it('should handle tricksterBlessing modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'tricksterBlessing',
                payload: { blessing: 'speed' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ tricksterBlessingModal: { blessing: 'speed' } });
        });

        it('should handle bardicInspirationTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bardicInspirationTarget',
                payload: { target: 'ally5' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bardicInspirationTargetModal: { target: 'ally5' } });
        });

        it('should handle inspiringMovementAlly modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'inspiringMovementAlly',
                payload: { ally: 'paladin' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ inspiringMovementAllyModal: { ally: 'paladin' } });
        });

        it('should handle arcaneWardRestore modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'arcaneWardRestore',
                payload: { amount: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ arcaneWardRestoreModal: { amount: 10 } });
        });

        it('should handle oceanicGiftTarget modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'oceanicGiftTarget',
                payload: { target: 'ally6' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ oceanicGiftTargetModal: { target: 'ally6' } });
        });

        it('should handle blindessDeafness modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'blindnessDeafness',
                payload: { effect: 'blind' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ blindnessDeafnessModal: { effect: 'blind' } });
        });

        it('should handle eyebiteEffect modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'eyebiteEffect',
                payload: { effect: 'sleep' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ eyebiteEffectModal: { effect: 'sleep' } });
        });

        it('should handle healingIllusion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'healingIllusion',
                payload: { amount: 8 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ healingIllusionModal: { amount: 8 } });
        });

        it('should handle elementalBurst modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalBurst',
                payload: { type: 'lightning' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ elementalBurstModal: { type: 'lightning' } });
        });

        it('should handle divineSpark modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'divineSpark',
                payload: { damage: 10 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ divineSparkModal: { damage: 10 } });
        });

        it('should handle moonlightStepFallback modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'moonlightStepFallback',
                payload: { fallback: 'dash' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ moonlightStepFallbackModal: { fallback: 'dash' } });
        });

        it('should handle twinklingConstellation modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'twinklingConstellation',
                payload: { effect: 'shield' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ twinklingConstellationModal: { effect: 'shield' } });
        });

        it('should handle warMagicSpell modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'warMagicSpell',
                payload: { spell: 'fireball' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ warMagicSpellModal: { spell: 'fireball' } });
        });

        it('should handle mistyWanderer modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'mistyWanderer',
                payload: { location: 'shadow' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ mistyWandererModal: { location: 'shadow' } });
        });

        it('should handle feyReinforcements modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'feyReinforcements',
                payload: { feyType: 'seelie' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ feyReinforcementsModal: { feyType: 'seelie' } });
        });

        it('should handle stepsOfTheFeyTaunt modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'stepsOfTheFeyTaunt',
                payload: { target: 'goblin3' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ stepsOfTheFeyTauntModal: { target: 'goblin3' } });
        });

        it('should handle bonusActionChoice modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bonusActionChoice',
                payload: { choices: ['attack', 'dash'] },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bonusActionChoiceModal: { choices: ['attack', 'dash'] } });
        });

        it('should handle stealthAttack modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'stealthAttack',
                payload: { damage: 15 },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ stealthAttackModal: { damage: 15 } });
        });

        it('should handle revelationInFlesh modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'revelationInFlesh',
                payload: { form: 'dragon' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ revelationInFleshModal: { form: 'dragon' } });
        });

        it('should handle bastionOfLaw modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bastionOfLaw',
                payload: { effect: 'lawful' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ bastionOfLawModal: { effect: 'lawful' } });
        });

        it('should handle elementalAffinity modal with damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalAffinity',
                payload: {
                    action: { name: 'Elemental Affinity' },
                    damageTypes: ['Fire', 'Cold'],
                    existingType: 'Fire',
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                elementalAffinityModal: {
                    action: { name: 'Elemental Affinity' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: ['Fire', 'Cold'],
                    existingType: 'Fire',
                },
            });
        });

        it('should handle elementalAffinity modal with default damageTypes', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'elementalAffinity',
                payload: {
                    action: { name: 'Elemental Affinity' },
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                elementalAffinityModal: {
                    action: { name: 'Elemental Affinity' },
                    playerStats: basePlayerStats,
                    campaignName,
                    damageTypes: ['Acid', 'Cold', 'Fire', 'Lightning', 'Poison'],
                    existingType: undefined,
                },
            });
        });

        it('should handle telepathicSpeech modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'telepathicSpeech',
                payload: {
                    action: { name: 'Telepathic Speech' },
                    creatureTargets: ['goblin1', 'goblin2'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({
                secondaryTargetModal: expect.objectContaining({
                    title: 'Telepathic Speech',
                    icon: 'fa-brain',
                    targets: ['goblin1', 'goblin2'],
                    confirmLabel: 'Establish Link',
                    confirmIcon: 'fa-brain',
                    description: 'Choose one creature within 30 feet to communicate with telepathically.',
                }),
            });
            // Verify the onTargetSelected and onSkip callbacks are function
            const callArgs = hooks.setModalState.mock.calls[0][0];
            expect(typeof callArgs.secondaryTargetModal.onTargetSelected).toBe('function');
            expect(typeof callArgs.secondaryTargetModal.onSkip).toBe('function');
        });

        it('should call onTargetSelected callback for telepathicSpeech', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'telepathicSpeech',
                payload: {
                    action: { name: 'Telepathic Speech' },
                    creatureTargets: ['goblin1'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            const callArgs = hooks.setModalState.mock.calls[0][0];
            await callArgs.secondaryTargetModal.onTargetSelected('goblin1');

            expect(hooks.setModalState).toHaveBeenCalledWith({ secondaryTargetModal: null });
        });

        it('should call onSkip callback for telepathicSpeech', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'telepathicSpeech',
                payload: {
                    action: { name: 'Telepathic Speech' },
                    creatureTargets: ['goblin1'],
                },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            const callArgs = hooks.setModalState.mock.calls[0][0];
            callArgs.secondaryTargetModal.onSkip();

            expect(hooks.setModalState).toHaveBeenCalledWith({ secondaryTargetModal: null });
        });

        it('should handle weaponKindMastery modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'weaponKindMastery',
                payload: { kind: 'melee' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ weaponKindMasteryModal: { kind: 'melee' } });
        });

        it('should handle dragonCompanion modal', async () => {
            const hooks = createHooks();
            hooks.executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'dragonCompanion',
                payload: { dragon: 'red' },
            });
            const { handleAutomationAction } = useCharActionsAutomation(hooks);
            const action = { name: 'TestAction', automation: {} };
            await handleAutomationAction(action);

            expect(hooks.setModalState).toHaveBeenCalledWith({ dragonCompanionModal: { dragon: 'red' } });
        });
    });
});

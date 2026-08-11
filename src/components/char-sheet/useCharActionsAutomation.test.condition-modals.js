import { describe, it, expect } from 'vitest';
import useCharActionsAutomation from './useCharActionsAutomation.js';
import { createHooks, setupBeforeEach } from './useCharActionsAutomation.test.setup.js';

describe('useCharActionsAutomation', () => {
    setupBeforeEach();

    describe('handleAutomationAction - condition/target modals', () => {
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

        it('should handle blindnessDeafness modal', async () => {
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
                    playerStats: expect.any(Object),
                    campaignName: expect.any(String),
                },
            });
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
                    playerStats: expect.any(Object),
                    campaignName: expect.any(String),
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
                    playerStats: expect.any(Object),
                    campaignName: expect.any(String),
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
                    playerStats: expect.any(Object),
                    campaignName: expect.any(String),
                    options: ['cone', 'line'],
                },
            });
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
                    playerStats: expect.any(Object),
                    campaignName: expect.any(String),
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
                    playerStats: expect.any(Object),
                    campaignName: expect.any(String),
                    damageTypes: ['Acid', 'Cold', 'Fire', 'Lightning', 'Poison'],
                    existingType: undefined,
                },
            });
        });
    });
});

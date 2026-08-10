import { describe, it, expect, beforeEach } from 'vitest';

import { registerPendingSavePrompt, getPendingSavePrompt } from './pendingSaveRegistry.js';

describe('pendingSaveRegistry', () => {
    beforeEach(() => {
        // The module uses a singleton Map. Tests are isolated by using unique keys
        // and relying on delete-on-get behavior. For true isolation we drain
        // unknown prior keys in each test that needs a clean slate.
    });

    describe('registerPendingSavePrompt', () => {
        it('should store a prompt for a given promptId', () => {
            const promptId = 'test-save-1';
            const promptData = {
                spellName: 'Fireball',
                dc: 15,
                saveType: 'dexterity',
            };

            registerPendingSavePrompt(promptId, promptData);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toEqual(promptData);
        });

        it('should overwrite an existing prompt for the same promptId', () => {
            const promptId = 'test-save-2';
            const data1 = { spellName: 'Fireball', dc: 15 };
            const data2 = { spellName: 'Lightning Bolt', dc: 17 };

            registerPendingSavePrompt(promptId, data1);
            registerPendingSavePrompt(promptId, data2);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toEqual(data2);
        });

        it('should store different prompts for different promptIds', () => {
            const dataA = { spellName: 'Fireball', dc: 15 };
            const dataB = { spellName: 'Hold Monster', dc: 18 };

            registerPendingSavePrompt('id-a', dataA);
            registerPendingSavePrompt('id-b', dataB);

            expect(getPendingSavePrompt('id-a')).toEqual(dataA);
            expect(getPendingSavePrompt('id-b')).toEqual(dataB);
        });

        it('should store empty object as promptData', () => {
            const promptId = 'test-save-empty';
            const promptData = {};

            registerPendingSavePrompt(promptId, promptData);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toEqual({});
        });

        it('should store null as promptData', () => {
            const promptId = 'test-save-null';
            const promptData = null;

            registerPendingSavePrompt(promptId, promptData);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toBeNull();
        });

        it('should store complex nested promptData', () => {
            const promptId = 'test-save-complex';
            const promptData = {
                spellName: 'Dominate Person',
                dc: 18,
                saveType: 'wisdom',
                effects: [
                    { type: 'charmed', duration: 'concentration' },
                    { type: 'incapacitated', duration: 'concentration' },
                ],
                metadata: { casterLevel: 15, source: 'player' },
            };

            registerPendingSavePrompt(promptId, promptData);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toEqual(promptData);
        });
    });

    describe('getPendingSavePrompt', () => {
        it('should return null when no prompt is registered for the promptId', () => {
            const result = getPendingSavePrompt('nonexistent-id');
            expect(result).toBeNull();
        });

        it('should retrieve and delete the prompt (one-time use)', () => {
            const promptId = 'test-save-delete';
            const promptData = { spellName: 'Fireball', dc: 15 };

            registerPendingSavePrompt(promptId, promptData);

            // First retrieval should return the data and delete it
            const first = getPendingSavePrompt(promptId);
            expect(first).toEqual(promptData);

            // Second retrieval should return null (prompt was deleted)
            const second = getPendingSavePrompt(promptId);
            expect(second).toBeNull();
        });

        it('should handle string promptIds', () => {
            const promptId = 'simple-string-id';
            const promptData = { spellName: 'Burning Hands', dc: 13 };

            registerPendingSavePrompt(promptId, promptData);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toEqual(promptData);
        });

        it('should handle numeric-looking string promptIds', () => {
            const promptId = '12345';
            const promptData = { spellName: 'Magic Missile', dc: 14 };

            registerPendingSavePrompt(promptId, promptData);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toEqual(promptData);
        });

        it('should handle UUID-style promptIds', () => {
            const promptId = '550e8400-e29b-41d4-a716-446655440000';
            const promptData = { spellName: 'Counterspell', dc: 16 };

            registerPendingSavePrompt(promptId, promptData);

            const retrieved = getPendingSavePrompt(promptId);
            expect(retrieved).toEqual(promptData);
        });
    });

    describe('integration', () => {
        it('should support register-then-use-then-reuse cycle with different data', () => {
            const promptId = 'test-reuse-cycle';
            const data1 = { spellName: 'Fireball', dc: 15 };
            const data2 = { spellName: 'Lightning Bolt', dc: 17 };

            // Register first prompt
            registerPendingSavePrompt(promptId, data1);

            // Get and verify it
            const retrieved1 = getPendingSavePrompt(promptId);
            expect(retrieved1).toEqual(data1);

            // Prompt is now deleted, so null
            expect(getPendingSavePrompt(promptId)).toBeNull();

            // Register a new prompt for the same promptId
            registerPendingSavePrompt(promptId, data2);

            // Get and verify the new one
            const retrieved2 = getPendingSavePrompt(promptId);
            expect(retrieved2).toEqual(data2);
        });

        it('should handle multiple prompts concurrently', () => {
            const prompts = [
                { id: 'concurrent-1', data: { spellName: 'Fireball', dc: 15 } },
                { id: 'concurrent-2', data: { spellName: 'Hold Monster', dc: 18 } },
                { id: 'concurrent-3', data: { spellName: 'Wish', dc: 20 } },
            ];

            // Register all prompts
            for (const { id, data } of prompts) {
                registerPendingSavePrompt(id, data);
            }

            // Retrieve and verify each one
            for (const { id, data } of prompts) {
                expect(getPendingSavePrompt(id)).toEqual(data);
            }

            // All should now be null
            for (const { id } of prompts) {
                expect(getPendingSavePrompt(id)).toBeNull();
            }
        });

        it('should handle rapid register-get-delete cycles', () => {
            const promptId = 'test-rapid-cycle';

            for (let i = 0; i < 5; i++) {
                registerPendingSavePrompt(promptId, { round: i });
                const retrieved = getPendingSavePrompt(promptId);
                expect(retrieved).toEqual({ round: i });
                expect(getPendingSavePrompt(promptId)).toBeNull();
            }
        });
    });
});

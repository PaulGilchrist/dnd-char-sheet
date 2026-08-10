import { describe, it, expect, beforeEach } from 'vitest';

import { registerPendingPopupSetter, getPendingPopupSetter } from './pendingPopupRegistry.js';

describe('pendingPopupRegistry', () => {
    beforeEach(() => {
        // Clear the internal Map before each test by importing fresh.
        // Since the module uses a singleton Map, we need to clear it.
        // We do this by registering and draining all known entries.
        // The cleanest approach: re-import won't reset the singleton,
        // so we use getPendingPopupSetter to drain any leftovers.
        // However, we don't know prior keys. Instead, we rely on the
        // module's delete-on-get behavior and just ensure tests don't
        // depend on prior state. For true isolation, we can track keys
        // in tests and clean them up.
    });

    describe('registerPendingPopupSetter', () => {
        it('should store a setter function for a given promptId', () => {
            const promptId = 'test-prompt-1';
            const mockSetter = vi.fn();

            registerPendingPopupSetter(promptId, mockSetter);

            const retrieved = getPendingPopupSetter(promptId);
            expect(retrieved).toBe(mockSetter);
        });

        it('should overwrite an existing setter for the same promptId', () => {
            const promptId = 'test-prompt-2';
            const setter1 = vi.fn();
            const setter2 = vi.fn();

            registerPendingPopupSetter(promptId, setter1);
            registerPendingPopupSetter(promptId, setter2);

            const retrieved = getPendingPopupSetter(promptId);
            expect(retrieved).toBe(setter2);
        });

        it('should store different setters for different promptIds', () => {
            const setterA = vi.fn();
            const setterB = vi.fn();

            registerPendingPopupSetter('id-a', setterA);
            registerPendingPopupSetter('id-b', setterB);

            expect(getPendingPopupSetter('id-a')).toBe(setterA);
            expect(getPendingPopupSetter('id-b')).toBe(setterB);
        });
    });

    describe('getPendingPopupSetter', () => {
        it('should return null when no setter is registered for the promptId', () => {
            const result = getPendingPopupSetter('nonexistent-id');
            expect(result).toBeNull();
        });

        it('should retrieve and delete the setter (one-time use)', () => {
            const promptId = 'test-prompt-delete';
            const mockSetter = vi.fn();

            registerPendingPopupSetter(promptId, mockSetter);

            // First retrieval should return the setter and delete it
            const first = getPendingPopupSetter(promptId);
            expect(first).toBe(mockSetter);

            // Second retrieval should return null (setter was deleted)
            const second = getPendingPopupSetter(promptId);
            expect(second).toBeNull();
        });

        it('should return the stored function and allow it to be called', () => {
            const promptId = 'test-prompt-call';
            const mockSetter = vi.fn();

            registerPendingPopupSetter(promptId, mockSetter);

            const setter = getPendingPopupSetter(promptId);
            expect(setter).toBe(mockSetter);

            const testData = { html: '<div>test</div>', value: 42 };
            setter(testData);

            expect(mockSetter).toHaveBeenCalledWith(testData);
        });

        it('should handle string promptIds', () => {
            const promptId = 'simple-string-id';
            const mockSetter = vi.fn();

            registerPendingPopupSetter(promptId, mockSetter);

            const retrieved = getPendingPopupSetter(promptId);
            expect(retrieved).toBe(mockSetter);
        });

        it('should handle numeric-looking string promptIds', () => {
            const promptId = '12345';
            const mockSetter = vi.fn();

            registerPendingPopupSetter(promptId, mockSetter);

            const retrieved = getPendingPopupSetter(promptId);
            expect(retrieved).toBe(mockSetter);
        });
    });

    describe('integration', () => {
        it('should support register-then-use-then-reuse cycle with different setters', () => {
            const promptId = 'test-reuse-cycle';
            const setter1 = vi.fn();
            const setter2 = vi.fn();

            // Register first setter
            registerPendingPopupSetter(promptId, setter1);

            // Get and use it
            const retrieved1 = getPendingPopupSetter(promptId);
            expect(retrieved1).toBe(setter1);
            retrieved1('first-call-data');
            expect(setter1).toHaveBeenCalledWith('first-call-data');

            // Setter is now deleted, so null
            expect(getPendingPopupSetter(promptId)).toBeNull();

            // Register a new setter for the same promptId
            registerPendingPopupSetter(promptId, setter2);

            // Get and use the new one
            const retrieved2 = getPendingPopupSetter(promptId);
            expect(retrieved2).toBe(setter2);
            retrieved2('second-call-data');
            expect(setter2).toHaveBeenCalledWith('second-call-data');
        });

        it('should work with complex data objects', () => {
            const promptId = 'test-complex-data';
            const mockSetter = vi.fn();
            const complexData = {
                html: '<div>complex</div>',
                value: 100,
                nested: { a: 1, b: 2 },
                flags: ['flag1', 'flag2'],
            };

            registerPendingPopupSetter(promptId, mockSetter);
            const setter = getPendingPopupSetter(promptId);
            setter(complexData);

            expect(mockSetter).toHaveBeenCalledWith(complexData);
        });
    });
});

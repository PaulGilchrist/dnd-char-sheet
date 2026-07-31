const pendingSavePrompts = new Map();

export function registerPendingSavePrompt(promptId, promptData) {
    pendingSavePrompts.set(promptId, promptData);
    console.debug(`[saveDebug] pendingSaveRegistry.register "${promptId}" target="${promptData?.targetName}" keys=${Object.keys(promptData || {}).length} mapSize=${pendingSavePrompts.size}`);
}

export function getPendingSavePrompt(promptId) {
    const prompt = pendingSavePrompts.get(promptId);
    if (prompt) {
        pendingSavePrompts.delete(promptId);
        console.debug(`[saveDebug] pendingSaveRegistry.get HIT "${promptId}" target="${prompt.targetName}" mapSize=${pendingSavePrompts.size}`);
        return prompt;
    }
    console.debug(`[saveDebug] pendingSaveRegistry.get MISS "${promptId}" mapSize=${pendingSavePrompts.size}`);
    return null;
}

export function peekPendingSavePrompt(promptId) {
    const prompt = pendingSavePrompts.get(promptId);
    console.debug(`[saveDebug] pendingSaveRegistry.peek "${promptId}" ${prompt ? `HIT target="${prompt.targetName}" keys=${Object.keys(prompt).length}` : 'MISS'} mapSize=${pendingSavePrompts.size}`);
    return prompt || null;
}

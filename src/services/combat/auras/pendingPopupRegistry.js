const pendingPopupSetters = new Map();

export function registerPendingPopupSetter(promptId, setPopupHtml) {
    pendingPopupSetters.set(promptId, setPopupHtml);
    console.debug(`[saveDebug] pendingPopupRegistry.register "${promptId}" mapSize=${pendingPopupSetters.size}`);
}

export function getPendingPopupSetter(promptId) {
    const setter = pendingPopupSetters.get(promptId);
    if (setter) {
        pendingPopupSetters.delete(promptId);
        console.debug(`[saveDebug] pendingPopupRegistry.get HIT "${promptId}" mapSize=${pendingPopupSetters.size}`);
        return setter;
    }
    console.debug(`[saveDebug] pendingPopupRegistry.get MISS "${promptId}" mapSize=${pendingPopupSetters.size}`);
    return null;
}

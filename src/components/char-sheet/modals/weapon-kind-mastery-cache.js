let weaponsCache = null;

export function resetWeaponsCache() {
    weaponsCache = null;
}

export async function loadWeapons() {
    if (weaponsCache === null) {
        weaponsCache = await (await fetch('/data/equipment.json')).json();
    }
    return weaponsCache;
}

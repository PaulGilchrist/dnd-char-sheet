const POLEARM_WEAPONS = ['Quarterstaff', 'Spear'];

let equipmentCache = null;

async function getEquipmentData() {
    if (equipmentCache) return equipmentCache;
    try {
        const response = await fetch('/data/equipment.json');
        equipmentCache = await response.json();
    } catch {
        equipmentCache = [];
    }
    return equipmentCache;
}

export async function isPolearmWeapon(weaponName) {
    if (!weaponName) return false;
    if (POLEARM_WEAPONS.includes(weaponName)) return true;
    const equipment = await getEquipmentData();
    const weapon = equipment.find(w => w.name === weaponName);
    if (!weapon) return false;
    const props = weapon.properties || [];
    return props.includes('Heavy') && props.includes('Reach');
}

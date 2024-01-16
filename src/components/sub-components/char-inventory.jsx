/* eslint-disable react/prop-types */

function CharInventory({ playerStats }) {
    return (
        <div>
            <div className='sectionHeader'>Inventory</div>
            <div><b>Backpack:</b> {playerStats.inventory.backpack.join(', ')}</div>
            <div><b>Equipped:</b> {playerStats.inventory.equipped.join(', ')}</div>
        </div>
    )
}

export default CharInventory

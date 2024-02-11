/* eslint-disable react/prop-types */
import './char-inventory.css'

function CharInventory({ playerStats }) {
    return (
        <div>
            <div className='sectionHeader'>Inventory</div>
            {playerStats.inventory.magicItems && playerStats.inventory.magicItems.map((magicItem) => {
                return <div key={magicItem.name}>
                    <b>{magicItem.name}:</b> <span dangerouslySetInnerHTML={{ __html: magicItem.description }}></span>
                </div>
            })}
            <div><b>Equipped:</b> {playerStats.inventory.equipped.join(', ')}</div>
            <div><b>Backpack:</b> {playerStats.inventory.backpack.join(', ')}</div>
        </div>
    )
}

export default CharInventory

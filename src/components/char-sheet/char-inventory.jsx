/* eslint-disable react/prop-types */
import './char-inventory.css'

function CharInventory({ playerStats }) {
    return (
        <div>
            {playerStats.inventory.magicItems && <div>
                <div className='sectionHeader'>Magic Items</div>
                {playerStats.inventory.magicItems.map((magicItem) => {
                    return <div key={magicItem.name}>
                        <b>{`${magicItem.name}${magicItem.quantity ? ` (${magicItem.quantity})` : '' }`}:</b> <span dangerouslySetInnerHTML={{ __html: magicItem.description }}></span>
                    </div>}
                )}
                <br/>
            </div>}
            <div className='sectionHeader'>Inventory</div>
            <div><b>Equipped:</b> {playerStats.inventory.equipped.join(', ')}</div>
            <div><b>Backpack:</b> {playerStats.inventory.backpack.join(', ')}</div>
        </div>
    )
}

export default CharInventory

/* eslint-disable react/prop-types */
import './char-inventory.css'

function CharInventory({ playerStats }) {
    return (
        <div>
            {playerStats.inventory.magicItems && <div>
                <div className='sectionHeader'>Magic Items</div>
                {playerStats.inventory.magicItems.map((magicItem) => {
                    return <div key={magicItem.name}>
                        {/* <b>{`${magicItem.name}${magicItem.quantity ? ` (qty ${magicItem.quantity})` : '' }`}:</b> <span dangerouslySetInnerHTML={{ __html: magicItem.description }}></span> */}
                        <b>
                            {magicItem.name} {magicItem.quantity ? `(qty ${magicItem.quantity}) ` : '' } -&nbsp;
                            <i>
                                {magicItem.type}&nbsp;
                                {magicItem.subtype && <span>({magicItem.subtype})</span>}, {magicItem.rarity}
                                {magicItem.requiresAttunement && !magicItem.attunementRequirements && <span> (requires attunement)</span>}
                                {magicItem.requiresAttunement && magicItem.attunementRequirements && <span> ({magicItem.attunementRequirements})</span>}
                            </i>
                            :&nbsp;
                        </b>
                        <span dangerouslySetInnerHTML={{ __html: magicItem.description }}></span>
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

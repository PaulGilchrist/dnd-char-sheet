/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../common/popup'
import { actions } from '../../data/actions';
import './char-actions.css'

function CharActions({ playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    const showActionsPopup = (actionOrBonusAction) => {
        if (actionOrBonusAction.details) {
            let html = `<b>${actionOrBonusAction.name}</b><br/>${actionOrBonusAction.description}<br/><br/>${actionOrBonusAction.details}`;
            setPopupHtml(html);
        }
    }
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });

    return (
        <div>
            <div>
                <span className='sectionHeader'>Actions</span>
                <div className='attacks'>
                    <div className='left'><b>Name</b></div>
                    <div><b>Range</b></div>
                    <div><b>Hit</b></div>
                    <div><b>Damage</b></div>
                    <div className='left'><b>Type</b></div>
                    {playerStats.attacks.map((attack) => {
                        if (attack.type != 'Action') return '';
                        return <React.Fragment key={attack.name}>
                            <div className='left'>{attack.name}</div>
                            <div>{attack.range} ft.</div>
                            <div className={attack.hitBonusFormula ? "clickable" : ""} onClick={() => setPopupHtml(attack.hitBonusFormula)}>{signFormatter.format(attack.hitBonus)}</div>
                            <div className={attack.damageFormula ? "clickable" : ""} onClick={() => setPopupHtml(attack.damageFormula)}>{attack.damage}</div>
                            <div className='left'>{attack.damageType}</div>
                        </React.Fragment>;
                    })}
                </div>
                <br />
                {playerStats.actions.map((action) => {
                    return <div key={action.name}>
                        {popupHtml && (<Popup html={popupHtml} onClickOrKeyDown={() => setPopupHtml(null)}></Popup>)}
                        <b className={action.details ? "clickable" : ""} onClick={() => showActionsPopup(action)}>{action.name}:</b> <span dangerouslySetInnerHTML={{ __html: action.description }}></span>;
                    </div>
                })}
                <div><b>Base Actions:</b> {actions.join(', ')}</div>
            </div>
            <div>
                {playerStats.attacks.find((attack) => attack.type === 'Bonus Action') && <div>
                    <hr />
                    <div className='sectionHeader'>Bonus Actions</div>
                    <div className='attacks'>
                        <div className='left'><b>Name</b></div>
                        <div><b>Range</b></div>
                        <div><b>Hit</b></div>
                        <div><b>Damage</b></div>
                        <div className='left'><b>Type</b></div>
                        {playerStats.attacks.map((attack) => {
                            if (attack.type != 'Bonus Action') return '';
                            return <React.Fragment key={attack.name}>
                                <div className='left'>{attack.name}</div>
                                <div>{attack.range} ft.</div>
                                <div>{signFormatter.format(attack.hitBonus)}</div>
                                <div>{attack.damage}</div>
                                <div className='left'>{attack.damageType}</div>
                            </React.Fragment>;
                        })}
                    </div>
                </div>}
                {/* No Bonus Action Attacks and only Bonus Actions so the Bonus Actions are the section's header */}
                {!playerStats.attacks.find((attack) => attack.type === 'Bonus Action') && playerStats.bonusActions.length > 0 && <div>
                    <div className='sectionHeader'>Bonus Actions</div>
                </div>}
                {/* Bonus Action Attacks and Bonus Actions so there has already been a section header and the Bonus Actions are a sub section */}
                {playerStats.attacks.find((attack) => attack.type === 'Bonus Action') && playerStats.bonusActions.length > 0 && <div>
                    <br />
                    {(playerStats.bonusActions.length > 0) && <div>
                        {playerStats.bonusActions.map((bonusAction) => {
                            return <div key={bonusAction.name}>
                                {popupHtml && (<Popup html={popupHtml} onClickOrKeyDown={() => setPopupHtml(null)}></Popup>)}
                                <b className={bonusAction.details ? "clickable" : ""} onClick={() => showPopup(bonusAction)}>{bonusAction.name}:</b> <span dangerouslySetInnerHTML={{ __html: bonusAction.description }}></span>;
                            </div>
                        })}
                    </div>}
                </div>}
            </div>
        </div>
    )
}

export default CharActions

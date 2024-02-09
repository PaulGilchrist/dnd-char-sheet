/* eslint-disable react/prop-types */
import React from 'react'

function CharAudit({ playerStats }) {

    return (<React.Fragment>
        {playerStats.audits.length > 0 && <div>
            <hr />
            <div className='sectionHeader'>Character Audit</div>
            {playerStats.audits.map(audit => {
                // dndbeyond is inconsistent and has sometimes allowed a total of 72 and other times a total of 71 base score
                const ignoreWarning = (audit.name === 'Ability Score Base Scores' && audit.allowed == audit.used+1);
                if(audit.used > audit.allowed) {
                    return (<div key={audit.name} className='error'>{`${audit.name}: Used=${audit.used}, Allowed=${audit.allowed}`}</div>)
                } else if(!ignoreWarning && audit.allowed > audit.used) {
                    return (<div key={audit.name} className='warning'>{`${audit.name}: Used=${audit.used}, Allowed=${audit.allowed}`}</div>)
                } else {
                    return;
                }
            })}
        </div>}
    </React.Fragment>)
}

export default CharAudit

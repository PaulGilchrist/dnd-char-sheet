/* eslint-disable react/prop-types */

function CharSummary2({ playerStats }) {
   
    return (
        <div>
            {(playerStats.resistances.length > 0) && <div>
                <b>Resistances: </b>
                {playerStats.resistances.join(', ')}
            </div>}
            {(playerStats.immunities.length > 0) && <div>
                <b>Immunities: </b>
                {playerStats.immunities.join(', ')}
            </div>}
            {(playerStats.vulnerabilities.length > 0) && <b>Vulnerabilities: </b>}{(playerStats.vulnerabilities.length > 0) && playerStats.vulnerabilities.join(', ')}
            <div><b>Senses: </b>{playerStats.senses.map((sense) => {
                return `${sense.name.toLowerCase()} ${sense.value}`;
            }).join(', ')}
            </div>
            <b>Languages: </b>{playerStats.languages.join(', ')}<br />
        </div>
    )
}

export default CharSummary2

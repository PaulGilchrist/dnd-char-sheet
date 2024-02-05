/* eslint-disable react/prop-types */
import React from 'react'
import rules from '../../services/rules'

function CharSummary2({ playerStats }) {
    const [languages, setLanguages] = React.useState([]);
    const [proficiencies, setProficiencies] = React.useState([]);
    const [senses, setSenses] = React.useState([]);
    React.useEffect(() => {
        setLanguages(rules.getLanguages(playerStats));
        setProficiencies(rules.getProficiencies(playerStats));
        setSenses(rules.getSenses(playerStats));
    }, [playerStats]);

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
            <div><b>Senses: </b>{senses.map((sense) => { return `${sense.name} ${sense.value}`;}).join(', ')}</div>
            <div><b>Proficiencies: </b>{proficiencies.join(', ')}</div>
            <b>Languages: </b>{languages.join(', ')}<br />
        </div>
    )
}

export default CharSummary2

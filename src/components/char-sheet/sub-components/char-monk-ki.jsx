/* eslint-disable react/prop-types */
// import './char-summary.css'
import CharKiPoints from './char-ki-points'

function CharMonkKi({ playerStats }) {
    const wisdomBonus = Math.floor((playerStats.abilities.find((ability) => ability.name === 'Wisdom').value - 10) / 2);
    const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);

    return (<div>
        {playerStats.class === 'Monk' && playerStats.level > 1 && <div>
            <CharKiPoints playerStats={playerStats}></CharKiPoints>
            <div><b>Ki Save DC: </b>{8 + wisdomBonus + proficiency}</div>
        </div>}
    </div>)
}

export default CharMonkKi

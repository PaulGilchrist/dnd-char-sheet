/* eslint-disable react/prop-types */
// import './char-summary.css'
import CharKiPoints from './char-ki-points'

function CharMonkKi({ playerStats }) {
    const wisdom = playerStats.abilities.find((ability) => ability.name === 'Wisdom');
    return (<div>
        {playerStats.class.name === 'Monk' && playerStats.level > 1 && <div>
            <CharKiPoints playerStats={playerStats}></CharKiPoints>
            <div><b>Ki Save DC: </b>{8 + wisdom.bonus + playerStats.proficiency}</div>
        </div>}
    </div>)
}

export default CharMonkKi

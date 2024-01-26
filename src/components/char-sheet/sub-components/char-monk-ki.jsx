/* eslint-disable react/prop-types */
// import './char-summary.css'
import utils from '../../../services/utils'
import CharKiPoints from './char-ki-points'

function CharMonkKi({ playerStats }) {
    const wisdom = utils.getAbility(playerStats, 'Wisdom');
    const proficiency = utils.getProficiency(playerStats);

    return (<div>
        {playerStats.class === 'Monk' && playerStats.level > 1 && <div>
            <CharKiPoints playerStats={playerStats}></CharKiPoints>
            <div><b>Ki Save DC: </b>{8 + wisdom.bonus + proficiency}</div>
        </div>}
    </div>)
}

export default CharMonkKi

import React from 'react'
import { useLocation } from 'react-router-dom';
import { cloneDeep } from 'lodash';
import { saveAs } from 'file-saver';
import './App.css'
import CharSheet from './components/char-sheet/char-sheet'
import CombatTracking from './components/combat-tracking/combat-tracking'
import Utils from './services/utils'

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function App() {
    const [abilityScores, setAbilityScores] = React.useState(null);
    const [activeCharacter, setActiveCharacter] = React.useState(null);
    const [characters, setCharacters] = React.useState([]);
    const [classes, setClasses] = React.useState([]);
    const [equipment, setEquipment] = React.useState([]);
    const [magicItems, setMagicItems] = React.useState([]);
    const [races, setRaces] = React.useState([]);
    const [showButton, setShowButton] = React.useState(false);
    const [spells, setSpells] = React.useState([]);
    const inputRef = React.useRef(null);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/ability-scores.json')
            .then(response => response.json())
            .then(data => {
                setAbilityScores(data);
            });
    }, []);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/classes.json')
            .then(response => response.json())
            .then(data => {
                setClasses(data);
            });
    }, []);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/equipment.json')
            .then(response => response.json())
            .then(data => {
                setEquipment(data);
            });
    }, []);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/magic-items.json')
            .then(response => response.json())
            .then(data => {
                setMagicItems(data);
            });
    }, []);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/races.json')
            .then(response => response.json())
            .then(data => {
                setRaces(data);
            });
    }, []);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/spells.json')
            .then(response => response.json())
            .then(data => {
                setSpells(data);
            });
    }, []);
    React.useEffect(() => {
        console.log(campaign);

        if (classes.length > 0 && equipment.length > 0 && spells.length > 0) {
            let urls = [];
            if(campaign==0) {
                urls = [
                    '/dnd-char-sheet/characters/level-1/barbarian-crom.json',
                    '/dnd-char-sheet/characters/level-1/bard-mordai.json',
                    '/dnd-char-sheet/characters/level-1/cleric-seti.json',
                    '/dnd-char-sheet/characters/level-1/druid-Immeral.json',
                    '/dnd-char-sheet/characters/level-1/fighter-agron.json',
                    '/dnd-char-sheet/characters/level-1/monk-ewyn.json',
                    '/dnd-char-sheet/characters/level-1/paladin-ramus.json',
                    '/dnd-char-sheet/characters/level-1/ranger-balasar.json',
                    '/dnd-char-sheet/characters/level-1/rogue-praxen.json',
                    '/dnd-char-sheet/characters/level-1/sorcerer-varis.json',
                    '/dnd-char-sheet/characters/level-1/warlock-naal.json',
                    '/dnd-char-sheet/characters/level-1/wizard-amric.json'
                ];
            } else if(campaign==1) { 
                urls = [
                    '/dnd-char-sheet/characters/campaign1/cleric-valena.json',
                    '/dnd-char-sheet/characters/campaign1/druid-lirael.json',
                    '/dnd-char-sheet/characters/campaign1/druid-loraleth.json',
                    '/dnd-char-sheet/characters/campaign1/fighter-devin.json',
                    '/dnd-char-sheet/characters/campaign1/monk-zareth.json',
                    '/dnd-char-sheet/characters/campaign1/paladin-valerius.json',
                    '/dnd-char-sheet/characters/campaign1/rogue-seraphina.json'
                ];
            } else { // default
                urls = [
                    '/dnd-char-sheet/characters/campaign2/barbarian-vexna.json',
                    '/dnd-char-sheet/characters/campaign2/cleric-garrick.json',
                    '/dnd-char-sheet/characters/campaign2/druid-xandria.json',
                    '/dnd-char-sheet/characters/campaign2/rogue-terra.json',
                    '/dnd-char-sheet/characters/campaign2/wizard-zeph.json'
                ];
            }
            const promises = urls.map(url => fetch(url).then(response => response.json()));
            Promise.all(promises)
                .then(data => {
                    setCharacters(data);
                })
                .catch(error => {
                    console.log(error);
                });
        }
    }, [abilityScores, classes, equipment, spells]);
    React.useEffect(() => {
        // Do not allow uploading character until everything is ready
        if (classes.length > 0 && equipment.length > 0 && spells.length > 0) {
            setShowButton(true);
        }
    }, [abilityScores, classes, equipment, spells]);
    React.useEffect(() => {
        setActiveCharacter(characters[0]);
    }, [characters]);
    const handleCharacterClick = (character) => {
        setActiveCharacter(cloneDeep(character));
    }
    const handleInitiativeClick = () => {
        setActiveCharacter(null);
    }
    const handleUploadChange = async (event) => {
        const files = event.target.files;
        const newCharacters = [];
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            const file = files[i];
            const readPromise = new Promise((resolve) => {
                reader.onload = (event) => {
                    const data = JSON.parse(event.target.result);
                    newCharacters.push(data);
                    resolve();
                };
            });
            reader.readAsText(file);
            await readPromise;
        }
        setCharacters(newCharacters);
    };
    const handleSaveClick = async () => {
        let fileName = `${activeCharacter.class.name}-${Utils.getFirstName(activeCharacter.name)}.json`;
        fileName = fileName.toLowerCase();
        const json = JSON.stringify(activeCharacter, null, 4);
        const blob = new Blob([json], { type: 'application/json' });
        saveAs(blob, fileName);
    };
    const handleUploadClick = async () => {
        inputRef.current.click();
    };

    const query = useQuery();
    const campaign = query.get('c');

    let combatTrackingActive = characters.length > 0 && activeCharacter == null;
    return (
        <div className="app">
            <input key={Date.now()} type="file" accept='.json' multiple ref={inputRef} onChange={handleUploadChange} hidden></input>
            {characters.length > 0 && characters.map((character) => { return (<button key={Utils.getFirstName(character.name)} className={`no-print ${activeCharacter && activeCharacter.name === character.name ? 'active' : ''}`} onClick={() => handleCharacterClick(character)}>{Utils.getFirstName(character.name)}</button>) })}
            {showButton && <button className="clickable mutted no-print" onClick={handleUploadClick}>Upload Characters</button>}
            {activeCharacter != null && <CharSheet allAbilityScores={abilityScores} allClasses={classes} allEquipment={equipment} allMagicItems={magicItems} allRaces={races} allSpells={spells} playerSummary={activeCharacter}></CharSheet>}
            {combatTrackingActive && <CombatTracking characters={characters}></CombatTracking>}
            {activeCharacter && <button className="clickable download no-print" onClick={handleSaveClick}>Download</button>}
            {characters.length > 0 && activeCharacter != null && <button className="clickable mutted no-print" onClick={handleInitiativeClick}>Combat</button>}<br />
        </div>
    )
}

export default App

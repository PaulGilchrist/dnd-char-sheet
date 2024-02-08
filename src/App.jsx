import React from 'react'
import { saveAs } from 'file-saver';
import './App.css'
import CharSheet from './components/char-sheet/char-sheet'
import CombatTracking from './components/combat-tracking/combat-tracking'
import Utils from './services/utils'


function App() {
    const [abilityScores, setAbilityScores] = React.useState(null);
    const [activeCharacter, setActiveCharacter] = React.useState(null);
    const [characters, setCharacters] = React.useState([]);
    const [classes, setClasses] = React.useState([]);
    const [equipment, setEquipment] = React.useState([]);
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
        if (classes.length > 0 && equipment.length > 0 && spells.length > 0) {
            const urls = [
                '/dnd-char-sheet/characters/campaign/cleric-valena.json',
                '/dnd-char-sheet/characters/campaign/druid-lirael.json',
                '/dnd-char-sheet/characters/campaign/druid-loraleth.json',
                '/dnd-char-sheet/characters/campaign/fighter-devin.json',
                '/dnd-char-sheet/characters/campaign/monk-zareth.json',
                '/dnd-char-sheet/characters/campaign/paladin-valerius.json',
                '/dnd-char-sheet/characters/campaign/ranger-seraphina.json'
            ];
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
        setActiveCharacter(character);
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
        const json = JSON.stringify(activeCharacter, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        saveAs(blob, fileName);
    };
    const handleUploadClick = async () => {
        inputRef.current.click();
    };
    return (
        <div className="app">
            <input key={Date.now()} type="file" accept='.json' multiple ref={inputRef} onChange={handleUploadChange} hidden></input>
            {characters.length > 0 && characters.map((character) => { return (<button key={Utils.getFirstName(character.name)} className={`no-print ${activeCharacter && activeCharacter.name === character.name ? 'active' : ''}`} onClick={() => handleCharacterClick(character)}>{Utils.getFirstName(character.name)}</button>) })}
            {showButton && <button className="clickable mutted no-print" onClick={handleUploadClick}>Upload Characters</button>}
            {activeCharacter != null && <CharSheet allAbilityScores={abilityScores} allClasses={classes} allEquipment={equipment} allRaces={races} allSpells={spells} playerSummary={activeCharacter}></CharSheet>}
            {characters.length > 0 && activeCharacter == null && <CombatTracking characters={characters}></CombatTracking>}
            {activeCharacter && <button className="clickable download no-print" onClick={handleSaveClick}>Download</button>}
            {characters.length > 0 && activeCharacter != null && <button className="clickable mutted no-print" onClick={handleInitiativeClick}>Combat</button>}<br/>
        </div>
    )
}

export default App

import React from 'react'
import { saveAs } from 'file-saver';
import './App.css'
import CharSheet from './components/char-sheet/char-sheet'
import Initiative from './components/initiative/initiative'
import Utils from './services/utils'


function App() {
    const [abilityScores, setAbilityScores] = React.useState(null);
    const [activeCharacter, setActiveCharacter] = React.useState(null);
    const [characters, setCharacters] = React.useState([]);
    const [classes, setClasses] = React.useState([]);
    const [equipment, setEquipment] = React.useState([]);
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
        fetch('/dnd-char-sheet/data/spells.json')
            .then(response => response.json())
            .then(data => {
                setSpells(data);
            });
    }, []);
    React.useEffect(() => {
        if (classes.length > 0 && equipment.length > 0 && spells.length > 0) {
            const urls = [
                '/dnd-char-sheet/characters/campaign/cleric_valena.json',
                '/dnd-char-sheet/characters/campaign/druid_lirael.json',
                '/dnd-char-sheet/characters/campaign/druid_loraleth.json',
                '/dnd-char-sheet/characters/campaign/fighter_devin.json',
                '/dnd-char-sheet/characters/campaign/monk_zareth.json',
                '/dnd-char-sheet/characters/campaign/paladin_valerius.json',
                '/dnd-char-sheet/characters/campaign/ranger_seraphina.json'
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
        const readers = [];
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            reader.readAsText(files[i]);
            readers.push(reader);
        }
        await Promise.all(
            readers.map(async (reader) => {
                await new Promise((resolve) => {
                    reader.onload = (event) => {
                        const data = JSON.parse(event.target.result);
                        setCharacters((characters) => [...characters, data]);
                        setActiveCharacter(characters[0]);
                        resolve();
                    };
                });
            })
        );
    };
    const handleSaveClick = async () => {
        let fileName = `${activeCharacter.class}-${Utils.getFirstName(activeCharacter.name)}.json`;
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
            <input type="file" accept='.json' multiple ref={inputRef} onChange={handleUploadChange} hidden></input>
            {characters.length > 0 && characters.map((character) => { return (<button key={Utils.getFirstName(character.name)} className={`no-print ${activeCharacter && activeCharacter.name === character.name ? 'active' : ''}`} onClick={() => handleCharacterClick(character)}>{Utils.getFirstName(character.name)}</button>) })}
            {showButton && <button className="clickable mutted no-print" onClick={handleUploadClick}>Upload Characters</button>}
            {activeCharacter != null && <CharSheet allAbilityScores={abilityScores} allClasses={classes} allEquipment={equipment} allSpells={spells} playerStats={activeCharacter}></CharSheet>}
            {characters.length > 0 && activeCharacter == null && <Initiative characters={characters}></Initiative>}
            {activeCharacter && <button className="clickable download no-print" onClick={handleSaveClick}>Download</button>}
            {characters.length > 0 && activeCharacter != null && <button className="clickable mutted no-print" onClick={handleInitiativeClick}>Initiative</button>}<br/>
        </div>
    )
}

export default App

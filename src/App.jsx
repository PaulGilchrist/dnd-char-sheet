import React from 'react'
import './App.css'
import CharSheet from './char-sheet'

function App() {
    const [activeCharacter, setActiveCharacter] = React.useState(null);
    const [characters, setCharacters] = React.useState([]);
    const [classes, setClasses] = React.useState([]);
    const [equipment, setEquipment] = React.useState([]);
    const [spells, setSpells] = React.useState([]);

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

    const handleCharacterClick = (character) => {
        setActiveCharacter(character);
    }

    const handleUploadClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.multiple = true;
        input.onchange = (event) => {
            const files = event.target.files;
            const readers = [];
            for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                reader.readAsText(files[i]);
                readers.push(reader);
            }
            setActiveCharacter(null);
            setCharacters([]);
            Promise.all(
                readers.map((reader) => reader.onload = (event) => {
                    const data = JSON.parse(event.target.result);
                    setCharacters((characters) => [...characters, data]);
                })
            );
        };
        input.click();
    }
    if(characters.length > 0 && !activeCharacter) {
        setActiveCharacter(characters[0]);
    }
    return (
        <div>
            {characters.length > 0 && characters.map((character) => { return (<button key={character.name} className={`no-print ${activeCharacter && activeCharacter.name === character.name ? 'active' : ''}`} onClick={() => handleCharacterClick(character)}>{character.name}</button>) })}
            <button className="inactive no-print" onClick={handleUploadClick}>Upload Characters</button>
            {activeCharacter && <CharSheet allClasses={classes} allEquipment={equipment} allSpells={spells} playerStats={activeCharacter}></CharSheet>}
        </div>
    )
}

export default App

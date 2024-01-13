import React from 'react'
import './App.css'
import CharSheet from './char-sheet'

function App() {
    const [classes, setClasses] = React.useState([]);
    const [equipment, setEquipment] = React.useState([]);
    const [spells, setSpells] = React.useState([]);
    const [stats, setStats] = React.useState(null);

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

    const handleButtonClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = (event) => {
                const data = JSON.parse(event.target.result);
                setStats(data);
            };
        };
        input.click();
    }

    return (
        <div>
            {stats && <CharSheet allClasses={classes} allEquipment={equipment} allSpells={spells} playerStats={stats}></CharSheet>}
            <button className="no-print" onClick={handleButtonClick}>Upload Character</button>
        </div>
    )
}

export default App

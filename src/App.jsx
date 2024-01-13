import React from 'react'
import './App.css'
import CharSheet from './char-sheet'

function App() {
    const [stats, setStats] = React.useState(null);
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
            {stats && <CharSheet stats={stats}></CharSheet>}
            <button onClick={handleButtonClick}>Upload JSON File</button>
        </div>
    )
}

export default App

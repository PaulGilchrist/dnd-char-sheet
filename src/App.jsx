import { Fragment } from 'react'
import './App.css'

function App() {
    // const [stats, setStats] = useState({});
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });

    const skills = [
        { name: 'Acrobatics', ability: 'Dexterity' },
        { name: 'Animal Handling', ability: 'Wisdom' },
        { name: 'Arcana', ability: 'Intelligence' },
        { name: 'Athletics', ability: 'Strength' },
        { name: 'Deception', ability: 'Charisma' },
        { name: 'History', ability: 'Intelligence' },
        { name: 'Insight', ability: 'Wisdom' },
        { name: 'Intimidation', ability: 'Charisma' },
        { name: 'Investigation', ability: 'Intelligence' },
        { name: 'Medicine', ability: 'Wisdom' },
        { name: 'Nature', ability: 'Intelligence' },
        { name: 'Perception', ability: 'Wisdom' },
        { name: 'Performance', ability: 'Charisma' },
        { name: 'Persuasion', ability: 'Charisma' },
        { name: 'Religion', ability: 'Intelligence' },
        { name: 'Sleight of Hand', ability: 'Dexterity' },
        { name: 'Stealth', ability: 'Dexterity' },
        { name: 'Survival', ability: 'Wisdom' }
    ];
    // Read in non-calculated stats
    const stats = {
        abilities: [
            { name: 'Strength', value: 13 },
            { name: 'Dexterity', value: 16 },
            { name: 'Constitution', value: 16 },
            { name: 'Intelligence', value: 10 },
            { name: 'Wisdom', value: 12 },
            { name: 'Charisma', value: 10 }
        ],
        abilityProficiencies: ['Strength','Constitution'],
        senses: ['Darkvision 60'],
        skillProficiencies: ['Intimidation','Perception','Survival'],
        proficiency: 2,
    }
    // Add all calculated properties to stats
    stats.abilities = stats.abilities.map((ability) => {
        ability.proficient = stats.abilityProficiencies.includes(ability.name);
        ability.bonus = Math.floor((ability.value - 10) / 2);
        ability.save = ability.proficient ? ability.bonus + stats.proficiency : ability.bonus;
        ability.skills = skills.filter(skill => skill.ability === ability.name);
        ability.skills = ability.skills.map((skill) => {
            skill.proficient = stats.skillProficiencies.includes(skill.name);
            skill.bonus = skill.proficient ? ability.bonus + stats.proficiency : ability.bonus;
            return skill
        });
        return ability
    });

    return (
        <>
            <div className='abilities'>
                <div className='ability_header left'>Ability</div>
                <div className='ability_header'>Score</div>
                <div className='ability_header'>Bonus</div>
                <div className='ability_header'>Save</div>
                <div className='ability_header left'>Skills</div>
                {stats.abilities.map((ability) => {
                    return <Fragment key={ability.name}>
                        <div className='left'>{ability.name}</div>
                        <div>{ability.value}</div>
                        <div>{signFormatter.format(ability.bonus)}</div>
                        <div>{signFormatter.format(ability.save)}</div>
                        <div className='left'>{ability.skills.map((skill) => {
                            return `${skill.name}  ${signFormatter.format(skill.bonus)}`;
                        }).join(', ')}</div>
                    </Fragment>;
                })}
            </div>
        </>
    )
}

export default App

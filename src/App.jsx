import { Fragment } from 'react'
import './App.css'

function App() {
    // const [stats, setStats] = useState({});
    let signFormatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });
    // Rule based objects
    const passiveSkills = ['Insight', 'Investigation', 'Perception'];
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
    // Character non-calculated stats
    const stats = {
        abilities: [
            { name: 'Strength', value: 13 },
            { name: 'Dexterity', value: 16 },
            { name: 'Constitution', value: 16 },
            { name: 'Intelligence', value: 10 },
            { name: 'Wisdom', value: 12 },
            { name: 'Charisma', value: 10 }
        ],
        abilityProficiencies: ['Strength', 'Constitution'],
        alignment: 'Neutral Good',
        armorClass: 16,
        class: 'Fighter',
        hitPoints: 31,
        immunities: [],
        initiative: 2,
        languages: ['Common', 'Elvish'],
        level: 3,
        name: 'Devin',
        proficiency: 2,
        race: 'Human',
        resistances: [],
        senses: [{ name: 'Darkvision', value: '60 ft.' }],
        skillProficiencies: ['Intimidation', 'Perception', 'Survival'],
        speed: '30',
        vulnerabilities: [],
    }
    // Add all character calculated stats
    stats.abilities = stats.abilities.map((ability) => {
        ability.proficient = stats.abilityProficiencies.includes(ability.name);
        ability.bonus = Math.floor((ability.value - 10) / 2);
        ability.save = ability.proficient ? ability.bonus + stats.proficiency : ability.bonus;
        ability.skills = skills.filter(skill => skill.ability === ability.name);
        ability.skills = ability.skills.map((skill) => {
            skill.proficient = stats.skillProficiencies.includes(skill.name);
            skill.bonus = skill.proficient ? ability.bonus + stats.proficiency : ability.bonus;
            if (passiveSkills.includes(skill.name)) {
                // Add skill based senses
                const sense = {
                    name: `passive ${skill.name}`,
                    value: 10 + skill.bonus
                }
                stats.senses.push(sense);
            }
            return skill
        });
        return ability
    });

    return (
        <div className='root'>
            <div className='name'>{stats.name}</div>
            <div className='summary'>{stats.race} {stats.class} (level {stats.level}), {stats.alignment}</div>
            <b>Armor Class: </b>{stats.armorClass}<br />
            <b>Hit Points: </b>{stats.hitPoints}<br />
            <b>Proficiency: </b>+{stats.proficiency}<br />
            <b>Initiative: </b>+{stats.initiative}<br />
            <b>Speed: </b>{stats.speed} ft.<br />
            <hr />
            <div className='abilities'>
                <div className='left'><b>Ability</b></div>
                <div><b>Score</b></div>
                <div><b>Bonus</b></div>
                <div><b>Save</b></div>
                <div className='left'><b>Skills</b></div>
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
            <hr />
            {(stats.resistances.length > 0) && <b>Resistances: </b>}{(stats.resistances.length > 0) && stats.resistances.join(', ')}
            {(stats.immunities.length > 0) && <b>Immunities: </b>}{(stats.immunities.length > 0) && stats.immunities.join(', ')}
            {(stats.vulnerabilities.length > 0) && <b>Vulnerabilities: </b>}{(stats.vulnerabilities.length > 0) && stats.vulnerabilities.join(', ')}
            <div><b>Senses: </b>{stats.senses.map((sense) => {
                return `${sense.name.toLowerCase()} ${sense.value}`;
            }).join(', ')}
            </div>
            <b>Languages: </b>{stats.languages.join(', ')}<br />
        </div>
    )
}

export default App

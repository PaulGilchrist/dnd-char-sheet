# Dungeons and Dragons Character Sheet

Load entire party at once, print or track changes, combat and initiative.

## Tracked During Play
* Gold
* Hit Points
* Initiative Order (including enemy creatures)
* Inspiration
* Classes
  * Barbarian Rage Points
  * Bard Inpiration Uses
  * Cleric Channel Divinity Charges
  * Fighter Action Surges
  * Fighter Indomitable Uses
  * Monk Ki Points
  * Sorcerer Sorcery Points
  * Wizard Arcane Recovery Levels
* Spell Slots
* Spells Prepared

## Sharing Tracked Changes
If during game play, you want to share all tracked changes made by any player or the game master, first ensure you have [Node.js](https://nodejs.org/en/download) and [GIT](https://git-scm.com/downloads) installed.  Next, clone this project using the following command:

```cmd
git clone https://github.com/PaulGilchrist/dnd-char-sheet.git
```

Change directory into the newly created project folder, install the needed packages, and start the project

```cmd
cd dnd-char-sheet
npm install
npm start
```

This command will show the network URL the application and API are hosted on.  The API will be started on the same ip but a different port (3000).  Finally, send the following URL to your players, replacing it's IP address with the one reported from the run command.
```url
http://192.168.0.201:5173/dnd-char-sheet?apiUrl=http://192.168.0.201:3000
```

The dnd-char-sheet application will automatically read and write all changes to the API caching them in memory to be quickly shared by all players as well as persisted to disk between game sessions.

## Character JSON File Syntax

The easiest way to make a new character is to download an existing character, modify it following the below syntax, then upload it back into the application.  You can upload multiple character sheets using shift or ctrl keys for bulk selection.

The spelling of anything added such as a language, spell, equipment name, etc. must exactly match the spelling and capitalization as found in the Player’s Handbook.


### Required Properties
```json
{
    "abilities": [
        { "name": "Strength", "abilityImprovements": number, "baseScore": number, "miscBonus": number },
        { "name": "Dexterity", "abilityImprovements": number, "baseScore": number, "miscBonus": number },
        { "name": "Constitution", "abilityImprovements": number, "baseScore": number, "miscBonus": number },
        { "name": "Intelligence", "abilityImprovements": number, "baseScore": number, "miscBonus": number0 },
        { "name": "Wisdom", "abilityImprovements": number, "baseScore": number1, "miscBonus": number },
        { "name": "Charisma", "abilityImprovements": number, "baseScore": number, "miscBonus": number }
    ],
    "alignment": string,
    "class": {
        "name": string,
    },
    "inventory": {
        "backpack": string[],
        "equipment": string[],
        "gold": number
    },
    "level": number,
    "name": string,
    "race": {
        "name": string
    },
}
```
 #### Required Property Notes
 * abilities[].baseScore should be no less than 8 and no greater than 15.  Using the point buy system, the total points across all abilities should not exceed 72.
 * abilities[].abilityImprovements start at 0 for level 1 characters and may go up for the first time at 4th level accoring to the Player's Handbook (see Ability Score Improvement).
 * abilities[].miscBonus is reserved for race or class ability bonuses, magical item enhancements, etc.

### Optional Properties
```json
{
    "actions": [
        {
            "name": string,
            "description": string,
            "details" string
        }
    ],
    "bonusActions": [
        {
            "name": string,
            "description": string,
            "details" string
        }
    ],
    "class": {
        "arcanums": string[],
        "expertise": string[],
        "favoredEnemies": string[],
        "favoredTerrain": string[],
        "fightingStyles": string[],
        "invocations": string[],
        "pactBoon": string,
        "subclass": {
            "name": string,
            "maneuvers": string[],
            "type": string,
        }
    },
    "feats": string[],
    "immunities": string[],
    "languages": string[],
    "proficiencies": string[],
    "race": {
        "subrace": {
            "name": string
        },
        "type": string
    },
    "reactions": [        {
            "name": string,
            "description": string,
            "details" string
        }],
    "resistances": string[],
    "senses": string[],
    "skillProficiencies": string[],
    "specialActions": [        {
            "name": string,
            "description": string,
            "details" string
        }],
    "spells":string[],
    "vulnerabilities": string[]
}
```
#### Optional Property Notes
* If class.subclass exists, it must have a name
  * class.subclass type examples include a Land Driud's circle name (ex: Forest)
* If race.subrace exists, it must have a name
  * race.subrace type examples include a Dragonborn's color (ex: Gold)
* if an action, bonusAction, reaction, or specialAction exists, it must have a name and descriptions, but need not have details
  * These arrays are shown above with only one object, but can contain multiple separated by commas

### Certificate Generation
```cmd
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 3650 -nodes -subj "/C=US/ST=Michigan/L=Detroit/O=None/CN=Paul Gilchrist/emailAddress=paul.gilchrist@outlook.com"
```

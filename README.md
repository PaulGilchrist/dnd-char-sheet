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

If during game play, you want to share all tracked changes made by any player or the game master, you can running the following command:
```cmd
node server.js
```
This requires nodejs installed, and server.js copied from this project repository.  This will start an API that will track and persist changes for all characters.  Then just send the link to the players with the querystring apiUrl that points to the local IP address of your PC and the port 3000.  Example:
```url
https://paulgilchrist.github.io/dnd-char-sheet?apiUrl=http://192.168.0.201:3000
```
The dnd-char-sheet application will then automatically read and write all changes to the API and they will be cached in memory to be quickly shared by all players as well as persisted to disk between game sessions.

To determine your IP address on a Windows PC, go to a CMD prompt and type `ipconfig`.

To determine your IP address on a Mac, go to `System Settings -> Network Wi-Fi -> Details`.

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


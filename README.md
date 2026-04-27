# 🐉 The Ultimate D&D Companion App

**Your Digital Adventurer's Toolkit - Where Strategy Meets Storytelling**

---

## 🌟 Welcome, Adventurer!

Are you tired of scribbling notes on napkins, losing track of spell slots mid-combat, or trying to remember whether your Bard has used their Inspiration yet? This app is your **digital dungeon master's best friend** and your party's most reliable scribe.

Whether you're a veteran Dungeon Master orchestrating epic battles or a player eager to dive into the next adventure, this application transforms how you experience Dungeons & Dragons.

---

## 🎯 What Makes This Special?

### 📜 **Campaign Management**
- **Multiple Campaigns**: Run several adventures simultaneously, each with its own cast of heroes
- **Easy Campaign Switching**: Jump between your epic fantasy saga and your one-shot dungeon crawl with a single click
- **Persistent Characters**: Your heroes remember everything from their last adventure

### 👤 **Character Creation Made Simple**
- **Guided Character Builder**: Step-by-step wizard walks you through creating your hero
  - Choose your race and class with detailed options
  - Customize your ability scores using the point-buy system
  - Select your background, skills, and languages
  - Equip your starting gear and gold
- **Ruleset Flexibility**: Choose between the classic 5th Edition rules or the updated 2024 Essentials rules
- **Complete Character Sheets**: Every detail of your hero, from hit points to special abilities, is tracked automatically

### 📊 **Comprehensive Character Tracking**
Your character sheet becomes a living document that follows you through every encounter:

**Core Stats Automatically Calculated:**
- Ability scores with modifiers
- Armor Class, Hit Points, and Speed
- Saving throws and skill proficiencies
- Languages and tool proficiencies

**Class-Specific Features Tracked:**
- **Barbarian**: Rage points and when you can rage again
- **Bard**: Inspiration uses and bardic performance
- **Cleric**: Channel Divinity charges
- **Fighter**: Action Surge and Indomitable uses
- **Monk**: Ki points for special maneuvers
- **Paladin**: Divine Smite resources
- **Ranger**: Favored enemies and terrain expertise
- **Sorcerer**: Sorcery points for metamagic
- **Warlock**: Mystic Arcanum and Eldritch Blast
- **Wizard**: Arcane Recovery and spell preparation

**Spell Management:**
- Track spell slots by level
- Mark which spells are prepared
- Quick reference to your spell list
- Filter by spell level and school

**Combat Essentials:**
- Gold and currency tracking
- Inventory management with categorized equipment
- Magic items and their powers
- Resistances and vulnerabilities

### ⚔️ **Combat Tracking System**
When battle erupts, this app becomes your tactical command center:

**Initiative Management:**
- Automatic initiative ordering
- Track player characters and monsters together
- Add custom NPCs and enemy creatures
- One-click initiative adjustments

**Round Counter:**
- Visual combat round tracker
- Easy round advancement
- Clear turn order visibility

**Battle Notes:**
- Add notes to any creature
- Track special combat conditions
- Remember enemy abilities and tactics

### 🎮 **User-Friendly Features**

**For Players:**
- **Character Portability**: Download your character as a file to work on offline, then upload it back later
- **Quick Access**: Jump between your party members instantly
- **Print-Ready Sheets**: Generate clean, professional character sheets for reference
- **No Math Required**: Everything is calculated automatically

**For Dungeon Masters:**
- **Party Overview**: See all your players' characters at a glance
- **Combat Organizer**: Manage encounters with multiple creatures
- **Session Notes**: Keep track of important battle details
- **Quick Setup**: Get combat started in seconds

### 🎨 **Beautiful, Intuitive Interface**
- Clean, organized layout designed for gaming tables
- Clear sections for quick reference during play
- Easy-to-read fonts and spacing
- Print-friendly design for offline use

---

## 🚀 How It Works

### When the Party Is Together (DM Hosts)
The DM runs the app and hosts the campaign. Players can view their characters and the DM can manage the party, run combat, and track everything in real time.

### When the Party Is Apart (Offline Work)
Players can still work on their characters between sessions:

1. **At the end of a session**: Click **Download Character** to save your character locally
2. **Between sessions**: Run the app on your own computer, click **Upload Character** to load your file, make any changes (level up, rest, adjust inventory, etc.)
3. **Before the next session**: Upload your updated character back to the DM's app, or send the file to your DM to upload for you

---

## 🎲 Perfect For

- **Online Campaigns**: Share liv e party stats during virtual table top sessions
- **In-Person Gaming**: Each person can view and update from their own device
- **Character Creation Sessions**: Guide new players through their first character
- **Quick Reference**: Keep essential info at your fingertips during play
- **Session Documentation**: Track character progression during and between sessions

---

## 🏆 Features That Make a Difference

**No More Lost Notes**: Everything is saved automatically
**No More Math Errors**: Calculations are handled for you
**No More Forgotten Features**: All your abilities are right there
**No More Character Sheet Chaos**: One clean, organized view

---

## 🎯 The Bottom Line

This isn't just a character sheet app. It's your **adventure companion** that handles the mechanics so you can focus on what matters most:

- **Telling epic stories**
- **Making memorable decisions**
- **Building your character's legend**
- **Having fun with friends**

The app takes care of the numbers, so you can take care of the adventure.

---

*May your rolls be high, your stories be epic, and your characters never run out of hit points!* 🎲✨

# How to Run This App

These steps are written for people who are *not* computer experts. Just follow them in order.

---

## 1. Install Node.js
If you don’t already have Node:

1. Go to https://nodejs.org  
2. Download the **LTS** version  
3. Install it using the default options  

---

## 2. Download the App
1. Click the green **Code** button on this page  
2. Choose **Download ZIP**  
3. Open the ZIP file  
4. Drag the folder inside to your Desktop (or anywhere you like)

---

## 3. Open a Terminal / Command Prompt
- **Windows:** Open *Command Prompt*  
- **Mac:** Open *Terminal*  

Then type `cd` followed by a space, and drag the app’s folder into the window.  
This automatically fills in the full path.

Example:  
cd /Users/you/Desktop/my-app

Press **Enter**.

---

## 4. Start the App
Type this and press Enter:  
npm start

This single command will:

1. Install everything the app needs  
2. Build the app  
3. Start the server  

---

## 5. Look for the URL
When the server starts, it will print a line showing the browser address where the app is running.

It will look something like:  

```bash
Server running at:
* Local:   http://localhost:3000/dnd-char-sheet/
* Network: http://192.168.0.187:3000/dnd-char-sheet/
```
The DM should use the "Local" link allowing him access to more capabilities like character delete, campagin rename and delete, etc.

The DM should message the "Network" link to the players so they can browse to the application and share realtime game information.

---

## That’s it
The app is now running.

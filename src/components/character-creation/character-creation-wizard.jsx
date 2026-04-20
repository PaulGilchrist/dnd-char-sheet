import React, { useState, useEffect } from 'react';
import './character-creation-wizard.css';
import './character-creation-wizard-compact.css';

const REQUIRED_FIELDS = [
  'name', 'level', 'alignment', 'race', 'class', 'abilities', 'inventory', 'skillProficiencies'
];

const ABILITY_NAMES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
];

const RACES = ['Human', 'Elf', 'Dwarf', 'Orc', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc'];

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];

function CharacterCreationWizard({ onComplete, onCancel, allRaces, allClasses, allSpells, allSpells2024 }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [ruleset, setRuleset] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [racesData, setRacesData] = useState([]);
  const [classSubtypes, setClassSubtypes] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    alignment: 'True Neutral',
    background: '',
    race: { name: 'Human', subrace: { name: '' } },
    class: { name: 'Fighter', subclass: { name: '' }, fightingStyles: [], expertise: [], favoredEnemies: [], favoredTerrain: [] },
    abilities: ABILITY_NAMES.map(name => ({ name, baseScore: 10, abilityImprovements: 0, miscBonus: 0 })),
    skillProficiencies: [],
    inventory: {
      backpack: [],
      equipped: [],
      gold: 10,
      magicItems: []
    },
    languages: [],
    spells: [],
    resistances: [],
    feats: [],
    specialActions: [],
    rules: '2024'
  });
  const [errors, setErrors] = useState({});

  // Validate ability scores when formData.abilities changes
  useEffect(() => {
    if (currentStep === 3) {
      const abilityErrors = {};
      let totalPointsSpent = 0;
      
      formData.abilities.forEach((ability, index) => {
        const baseScore = parseInt(ability.baseScore) || 8;
        const improvements = parseInt(ability.abilityImprovements) || 0;
        const misc = parseInt(ability.miscBonus) || 0;
        const totalScore = baseScore + improvements + misc;

        // Calculate point buy cost
        const cost = baseScore <= 8 ? 0 : baseScore <= 9 ? 1 : baseScore <= 10 ? 2 : baseScore <= 11 ? 3 : baseScore <= 12 ? 4 : baseScore <= 13 ? 5 : baseScore <= 14 ? 7 : baseScore <= 15 ? 9 : baseScore <= 16 ? 11 : baseScore <= 17 ? 13 : 15;
        totalPointsSpent += cost;

        // Validate base score range
        if (baseScore < 8) {
          abilityErrors[`ability_${index}_baseScore`] = 'Base score must be at least 8';
        }
        if (baseScore > 18) {
          abilityErrors[`ability_${index}_baseScore`] = 'Base score cannot exceed 18';
        }

        // Validate total score
        if (totalScore > 20) {
          abilityErrors[`ability_${index}_totalScore`] = `Total score (base + improvements + misc) cannot exceed 20`;
        }

        // Validate non-negative improvements and misc
        if (improvements < 0) {
          abilityErrors[`ability_${index}_abilityImprovements`] = 'Improvements must be 0 or above';
        }
        if (misc < 0) {
          abilityErrors[`ability_${index}_miscBonus`] = 'Misc bonus must be 0 or above';
        }
      });

      // Check if user has spent more than 27 points
      if (totalPointsSpent > 27) {
        abilityErrors.pointsExceeded = `You have spent ${totalPointsSpent} points. You only have 27 points to spend.`;
      }

      setErrors(prev => ({ ...prev, ...abilityErrors }));
    }
  }, [formData.abilities, currentStep]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleRulesetChange = async (ruleset) => {
    setRuleset(ruleset);
    
    // Load backgrounds for 2024 rules
    if (ruleset === '2024') {
      try {
        const response = await fetch('/dnd-char-sheet/data/2024/backgrounds.json');
        const data = await response.json();
        setBackgrounds(data);
      } catch (error) {
        console.error('Failed to load backgrounds:', error);
        setBackgrounds([]);
      }
    } else {
      setBackgrounds([]);
    }
    
    // Load races for selected ruleset
    if (ruleset === '2024') {
      try {
        const response = await fetch('/dnd-char-sheet/data/2024/races.json');
        const data = await response.json();
        setRacesData(data);
      } catch (error) {
        console.error('Failed to load 2024 races:', error);
        setRacesData([]);
      }
    } else {
      try {
        const response = await fetch('/dnd-char-sheet/data/races.json');
        const data = await response.json();
        setRacesData(data);
      } catch (error) {
        console.error('Failed to load 5e races:', error);
        setRacesData([]);
      }
    }
    
    // Load class subtypes for selected ruleset
    if (ruleset === '2024') {
      try {
        const response = await fetch('/dnd-char-sheet/data/2024/classes.json');
        const data = await response.json();
        const subtypes = data.map(cls => ({
          className: cls.name,
          subtypes: cls.subclasses || []
        }));
        setClassSubtypes(subtypes);
      } catch (error) {
        console.error('Failed to load 2024 classes:', error);
        setClassSubtypes([]);
      }
    } else {
      try {
        const response = await fetch('/dnd-char-sheet/data/classes.json');
        const data = await response.json();
        const subtypes = data.map(cls => ({
          className: cls.name,
          subtypes: cls.subclasses || []
        }));
        setClassSubtypes(subtypes);
      } catch (error) {
        console.error('Failed to load 5e classes:', error);
        setClassSubtypes([]);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      rules: ruleset,
      spells: ruleset === '2024' ? [] : allSpells || [],
      background: ruleset === '2024' ? '' : '',
      abilities: ABILITY_NAMES.map(name => ({ name, baseScore: 10, abilityImprovements: 0, miscBonus: 0 }))
    }));
    setCurrentStep(2);
  };

  const handleAbilityChange = (index, field, value) => {
    setFormData(prev => {
      const newAbilities = [...prev.abilities];
      newAbilities[index] = { ...newAbilities[index], [field]: value };
      return { ...prev, abilities: newAbilities };
    });
  };

  const handleAbilityImprovementChange = (index, value) => {
    setFormData(prev => {
      const newAbilities = [...prev.abilities];
      newAbilities[index] = { ...newAbilities[index], abilityImprovements: value };
      return { ...prev, abilities: newAbilities };
    });
  };

  const handleAbilityMiscBonusChange = (index, value) => {
    setFormData(prev => {
      const newAbilities = [...prev.abilities];
      newAbilities[index] = { ...newAbilities[index], miscBonus: value };
      return { ...prev, abilities: newAbilities };
    });
  };

  const handleArrayFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Character name is required';
      }
      if (formData.level < 1 || formData.level > 20) {
        newErrors.level = 'Level must be between 1 and 20';
      }
      if (!formData.alignment) {
        newErrors.alignment = 'Alignment is required';
      }
    }
    
    if (step === 2) {
      if (!formData.race || !formData.race.name) {
        newErrors.race = 'Race is required';
      }
      if (!formData.class || !formData.class.name) {
        newErrors.class = 'Class is required';
      }
    }
    
    if (step === 3) {
      // Calculate total points spent
      let totalPointsSpent = 0;
      formData.abilities.forEach((ability, index) => {
        const baseScore = parseInt(ability.baseScore) || 8;
        const improvements = parseInt(ability.abilityImprovements) || 0;
        const misc = parseInt(ability.miscBonus) || 0;
        const totalScore = baseScore + improvements + misc;

        // Calculate point buy cost
        const cost = baseScore <= 8 ? 0 : baseScore <= 9 ? 1 : baseScore <= 10 ? 2 : baseScore <= 11 ? 3 : baseScore <= 12 ? 4 : baseScore <= 13 ? 5 : baseScore <= 14 ? 7 : baseScore <= 15 ? 9 : baseScore <= 16 ? 11 : baseScore <= 17 ? 13 : 15;
        totalPointsSpent += cost;

        // Validate base score range
        if (baseScore < 8) {
          newErrors[`ability_${index}_baseScore`] = 'Base score must be at least 8';
        }
        if (baseScore > 18) {
          newErrors[`ability_${index}_baseScore`] = 'Base score cannot exceed 18';
        }

        // Validate total score
        if (totalScore > 20) {
          newErrors[`ability_${index}_totalScore`] = `Total score (base + improvements + misc) cannot exceed 20`;
        }

        // Validate non-negative improvements and misc
        if (improvements < 0) {
          newErrors[`ability_${index}_abilityImprovements`] = 'Improvements must be 0 or above';
        }
        if (misc < 0) {
          newErrors[`ability_${index}_miscBonus`] = 'Misc bonus must be 0 or above';
        }
      });

      // Check if user has spent more than 27 points
      if (totalPointsSpent > 27) {
        newErrors.pointsExceeded = `You have spent ${totalPointsSpent} points. You only have 27 points to spend.`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      // Validate all required fields
      const finalErrors = {};
      REQUIRED_FIELDS.forEach(field => {
        if (field === 'abilities' || field === 'inventory' || field === 'skillProficiencies') {
          // These are handled in their respective steps
          return;
        }
        if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
          finalErrors[field] = `${field} is required`;
        }
      });
      
      if (Object.keys(finalErrors).length > 0) {
        setErrors(finalErrors);
        return;
      }
      
      onComplete(formData);
    }
  };

  const renderRulesSelection = () => (
    <div className="wizard-step">
      <h2>Select Rules System</h2>
      <p className="step-description">Choose which D&D ruleset your character will follow:</p>
      
      <div className="rules-selection-container">
        <div 
          className={`rules-option ${ruleset === '5e' ? 'selected' : ''}`}
          onClick={() => handleRulesetChange('5e')}
        >
          <div className="rules-option-icon">📜</div>
          <h3>5th Edition (5e)</h3>
          <p>The classic D&D ruleset from 2014. Features traditional spell slots, class features, and ability scores.</p>
          <ul className="rules-features">
            <li>Traditional spell slots</li>
            <li>Classic class features</li>
            <li>Standard ability improvements</li>
            <li>Original subclass system</li>
          </ul>
        </div>
        
        <div 
          className={`rules-option ${ruleset === '2024' ? 'selected' : ''}`}
          onClick={() => handleRulesetChange('2024')}
        >
          <div className="rules-option-icon">✨</div>
          <h3>2024 Rules (Essentials)</h3>
          <p>The updated D&D ruleset with streamlined mechanics and modernized features.</p>
          <ul className="rules-features">
            <li>Revised spell mechanics</li>
            <li>Updated class features</li>
            <li>Improved ability improvements</li>
            <li>Modern subclass system</li>
          </ul>
        </div>
      </div>
      
      {errors.ruleset && <span className="error-message">{errors.ruleset}</span>}
    </div>
  );

  const renderStep1 = () => (
    <div className="wizard-step">
      <h2>Step 1: Basic Information</h2>
      
      <div className="form-group">
        <label>Character Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>
      
      <div className="form-group">
        <label>Level *</label>
        <input
          type="number"
          min="1"
          max="20"
          value={formData.level}
          onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
          className={errors.level ? 'error' : ''}
        />
        {errors.level && <span className="error-message">{errors.level}</span>}
      </div>
      
      <div className="form-group">
        <label>Alignment *</label>
        <select
          value={formData.alignment}
          onChange={(e) => handleInputChange('alignment', e.target.value)}
          className={errors.alignment ? 'error' : ''}
        >
          {ALIGNMENTS.map(alignment => (
            <option key={alignment} value={alignment}>{alignment}</option>
          ))}
        </select>
        {errors.alignment && <span className="error-message">{errors.alignment}</span>}
      </div>
      
      {ruleset === '2024' && (
        <div className="form-group">
          <label>Background (2024 Rules)</label>
          <select
            value={formData.background}
            onChange={(e) => handleInputChange('background', e.target.value)}
            className={errors.background ? 'error' : ''}
          >
            <option value="">Select a background</option>
            {backgrounds.map(background => (
              <option key={background.index} value={background.name}>{background.name}</option>
            ))}
          </select>
          {errors.background && <span className="error-message">{errors.background}</span>}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => {
    // Get available subclasses for the selected class
    const selectedClass = formData.class?.name;
    const availableSubclasses = classSubtypes.find(
      cs => cs.className === selectedClass
    )?.subtypes || [];
    
    return (
      <div className="wizard-step">
        <h2>Step 2: Race & Class</h2>
        
        <div className="form-group">
          <label>Race *</label>
          <select
            value={formData.race?.name || ''}
            onChange={(e) => handleInputChange('race', { name: e.target.value })}
            className={errors.race ? 'error' : ''}
          >
            {racesData.length > 0 ? (
              racesData.map(race => (
                <option key={race.name || race.index} value={race.name || race.index}>{race.name || race.index}</option>
              ))
            ) : (
              RACES.map(race => (
                <option key={race} value={race}>{race}</option>
              ))
            )}
          </select>
          {errors.race && <span className="error-message">{errors.race}</span>}
        </div>
        
        <div className="form-group">
          <label>Class *</label>
          <select
            value={formData.class?.name || ''}
            onChange={(e) => handleInputChange('class', { name: e.target.value })}
            className={errors.class ? 'error' : ''}
          >
            {CLASSES.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          {errors.class && <span className="error-message">{errors.class}</span>}
        </div>
        
        {availableSubclasses.length > 0 && (
          <div className="form-group">
            <label>Subclass</label>
            <select
              value={formData.class?.subclass?.name || ''}
              onChange={(e) => {
                const updatedClass = {
                  ...formData.class,
                  subclass: { name: e.target.value, type: '' }
                };
                handleInputChange('class', updatedClass);
              }}
            >
              <option value="">Select a subclass</option>
              {availableSubclasses.map(subclass => (
                <option key={subclass.name} value={subclass.name}>{subclass.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {availableSubclasses.length > 0 && (
          <div className="form-group">
            <label>Subclass Type (Optional)</label>
            <input
              type="text"
              value={formData.class?.subclass?.type || ''}
              onChange={(e) => {
                const updatedClass = {
                  ...formData.class,
                  subclass: { ...formData.class.subclass, type: e.target.value }
                };
                handleInputChange('class', updatedClass);
              }}
            />
          </div>
        )}
      </div>
  );
  };

  const renderStep3 = () => {
    // Calculate total points spent on base scores
    const totalPointsSpent = formData.abilities.reduce((sum, ability) => {
      const baseScore = parseInt(ability.baseScore) || 8;
      // Point buy cost: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9, 16=11, 17=13, 18=15
      const cost = baseScore <= 8 ? 0 : baseScore <= 9 ? 1 : baseScore <= 10 ? 2 : baseScore <= 11 ? 3 : baseScore <= 12 ? 4 : baseScore <= 13 ? 5 : baseScore <= 14 ? 7 : baseScore <= 15 ? 9 : baseScore <= 16 ? 11 : baseScore <= 17 ? 13 : 15;
      return sum + cost;
    }, 0);

    const pointsRemaining = 27 - totalPointsSpent;

    // Calculate total score for each ability (base + improvements + misc)
    const calculateTotalScore = (ability) => {
      const base = parseInt(ability.baseScore) || 8;
      const improvements = parseInt(ability.abilityImprovements) || 0;
      const misc = parseInt(ability.miscBonus) || 0;
      return base + improvements + misc;
    };

    // Validate each ability
    const validateAbility = (ability, index) => {
      const errors = {};
      const baseScore = parseInt(ability.baseScore) || 8;
      const totalScore = calculateTotalScore(ability);

      // Base score validation
      if (baseScore < 8) {
        errors.baseScore = 'Base score must be at least 8';
      }
      if (baseScore > 18) {
        errors.baseScore = 'Base score cannot exceed 18 (point buy max)';
      }

      // Total score validation
      if (totalScore > 20) {
        errors.totalScore = `Total score (base + improvements + misc) cannot exceed 20`;
      }

      // Non-negative validation
      if (parseInt(ability.abilityImprovements) < 0) {
        errors.abilityImprovements = 'Improvements must be 0 or above';
      }
      if (parseInt(ability.miscBonus) < 0) {
        errors.miscBonus = 'Misc bonus must be 0 or above';
      }

      return errors;
    };

    // Note: Validation errors are set in useEffect to prevent infinite re-renders

    return (
      <div className="wizard-step wizard-step-3">
        <h2>Step 3: Ability Scores</h2>
        <p className="step-description">
          Use point buy: Each ability starts at 8. You have <strong>{pointsRemaining} points</strong> remaining.
          Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9, 16=11, 17=13, 18=15
        </p>
        <p className="step-description">
          Total score (base + improvements + misc) cannot exceed 20 for any ability.
        </p>

        <div className="ability-scores-grid">
          {ABILITY_NAMES.map((ability, index) => {
            const baseScore = parseInt(formData.abilities[index].baseScore) || 8;
            const improvements = parseInt(formData.abilities[index].abilityImprovements) || 0;
            const misc = parseInt(formData.abilities[index].miscBonus) || 0;
            const totalScore = baseScore + improvements + misc;

            // Calculate point buy cost for this ability
            const cost = baseScore <= 8 ? 0 : baseScore <= 9 ? 1 : baseScore <= 10 ? 2 : baseScore <= 11 ? 3 : baseScore <= 12 ? 4 : baseScore <= 13 ? 5 : baseScore <= 14 ? 7 : baseScore <= 15 ? 9 : baseScore <= 16 ? 11 : baseScore <= 17 ? 13 : 15;

            return (
              <div key={ability} className="ability-score-card">
                <h4>{ability}</h4>
                <div className="form-group">
                  <label>Base Score (8-18)</label>
                  <input
                    type="number"
                    min="8"
                    max="18"
                    value={formData.abilities[index].baseScore}
                    onChange={(e) => handleAbilityChange(index, 'baseScore', parseInt(e.target.value))}
                    className={errors[`ability_${index}_baseScore`] ? 'error' : ''}
                  />
                  <span className="point-cost">Cost: {cost}</span>
                  {errors[`ability_${index}_baseScore`] && <span className="error-message">{errors[`ability_${index}_baseScore`]}</span>}
                </div>
                <div className="form-group">
                  <label>Improvements</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.abilities[index].abilityImprovements}
                    onChange={(e) => handleAbilityImprovementChange(index, parseInt(e.target.value))}
                    className={errors[`ability_${index}_abilityImprovements`] ? 'error' : ''}
                  />
                  {errors[`ability_${index}_abilityImprovements`] && <span className="error-message">{errors[`ability_${index}_abilityImprovements`]}</span>}
                </div>
                <div className="form-group">
                  <label>Misc Bonus</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.abilities[index].miscBonus}
                    onChange={(e) => handleAbilityMiscBonusChange(index, parseInt(e.target.value))}
                    className={errors[`ability_${index}_miscBonus`] ? 'error' : ''}
                  />
                  {errors[`ability_${index}_miscBonus`] && <span className="error-message">{errors[`ability_${index}_miscBonus`]}</span>}
                </div>
                <div className={`total-score ${totalScore > 20 ? 'error' : ''}`}>
                  Total: <strong>{totalScore}</strong>
                  {totalScore > 20 && <span className="error-message"> (max 20)</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="wizard-step">
      <h2>Step 4: Skills & Proficiencies</h2>
      
      <div className="form-group">
        <label>Skill Proficiencies</label>
        <textarea
          value={formData.skillProficiencies.join(', ')}
          onChange={(e) => handleArrayFieldChange('skillProficiencies', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
          placeholder="Enter skills separated by commas"
          rows={4}
        />
        <p className="field-description">e.g., Acrobatics, Athletics, Perception</p>
      </div>
      
      <div className="form-group">
        <label>Languages</label>
        <textarea
          value={formData.languages.join(', ')}
          onChange={(e) => handleArrayFieldChange('languages', e.target.value.split(',').map(l => l.trim()).filter(l => l))}
          placeholder="Enter languages separated by commas"
          rows={2}
        />
        <p className="field-description">e.g., Common, Elvish, Dwarvish</p>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="wizard-step">
      <h2>Step 5: Inventory</h2>
      
      <div className="form-group">
        <label>Gold Pieces *</label>
        <input
          type="number"
          min="0"
          value={formData.inventory.gold}
          onChange={(e) => {
            const updatedInventory = {
              ...formData.inventory,
              gold: parseInt(e.target.value)
            };
            handleInputChange('inventory', updatedInventory);
          }}
        />
      </div>
      
      <div className="form-group">
        <label>Backpack Items</label>
        <textarea
          value={formData.inventory.backpack.join(', ')}
          onChange={(e) => handleArrayFieldChange('backpack', e.target.value.split(',').map(i => i.trim()).filter(i => i))}
          placeholder="Enter items separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Rope, Torch, rations</p>
      </div>
      
      <div className="form-group">
        <label>Equipped Items</label>
        <textarea
          value={formData.inventory.equipped.join(', ')}
          onChange={(e) => handleArrayFieldChange('equipped', e.target.value.split(',').map(i => i.trim()).filter(i => i))}
          placeholder="Enter items separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Longsword, Chain mail, Shield</p>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="wizard-step">
      <h2>Step 6: Special Features</h2>
      
      <div className="form-group">
        <label>Spells Known/Prepared</label>
        <textarea
          value={formData.spells.join(', ')}
          onChange={(e) => handleArrayFieldChange('spells', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
          placeholder="Enter spells separated by commas"
          rows={4}
        />
      </div>
      
      <div className="form-group">
        <label>Resistances</label>
        <textarea
          value={formData.resistances.join(', ')}
          onChange={(e) => handleArrayFieldChange('resistances', e.target.value.split(',').map(r => r.trim()).filter(r => r))}
          placeholder="Enter damage types separated by commas"
          rows={2}
        />
        <p className="field-description">e.g., Fire, Cold, Lightning</p>
      </div>
      
      <div className="form-group">
        <label>Feats</label>
        <textarea
          value={formData.feats.join(', ')}
          onChange={(e) => handleArrayFieldChange('feats', e.target.value.split(',').map(f => f.trim()).filter(f => f))}
          placeholder="Enter feats separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Alert, War Caster, Sharpshooter</p>
      </div>
      
      <div className="form-group">
        <label>Special Actions</label>
        <textarea
          value={formData.specialActions.join(', ')}
          onChange={(e) => handleArrayFieldChange('specialActions', e.target.value.split(',').map(a => a.trim()).filter(a => a))}
          placeholder="Enter special actions separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Second Wind (1d10 + CON modifier)</p>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1: return renderRulesSelection();
      case 2: return renderStep1();
      case 3: return renderStep2();
      case 4: return renderStep3();
      case 5: return renderStep4();
      case 6: return renderStep5();
      case 7: return renderStep6();
      default: return renderRulesSelection();
    }
  };

  return (
    <div className="character-creation-wizard-overlay">
      <div className="character-creation-wizard">
        <div className="wizard-header">
          <h2>Create New Character</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
          ></div>
        </div>
        
        <div className="wizard-content">
          {renderStep()}
        </div>
        
        <div className="wizard-footer">
          <button 
            className="btn btn-secondary" 
            onClick={currentStep === 1 ? onCancel : handlePrevious}
            disabled={currentStep === 1}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          
          {currentStep < 7 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmit}>
              Create Character
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CharacterCreationWizard;
import React, { useState } from 'react';
import './character-creation-wizard.css';

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

function CharacterCreationWizard({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
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
      formData.abilities.forEach((ability, index) => {
        if (ability.baseScore < 1 || ability.baseScore > 30) {
          newErrors[`ability_${index}`] = `Base score must be between 1 and 30`;
        }
      });
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
      
      <div className="form-group">
        <label>Background</label>
        <input
          type="text"
          value={formData.background}
          onChange={(e) => handleInputChange('background', e.target.value)}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="wizard-step">
      <h2>Step 2: Race & Class</h2>
      
      <div className="form-group">
        <label>Race *</label>
        <select
          value={formData.race?.name || ''}
          onChange={(e) => handleInputChange('race', { name: e.target.value })}
          className={errors.race ? 'error' : ''}
        >
          {RACES.map(race => (
            <option key={race} value={race}>{race}</option>
          ))}
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
      
      <div className="form-group">
        <label>Subclass (Optional)</label>
        <input
          type="text"
          value={formData.class?.subclass?.name || ''}
          onChange={(e) => {
            const updatedClass = {
              ...formData.class,
              subclass: { name: e.target.value, type: '' }
            };
            handleInputChange('class', updatedClass);
          }}
        />
      </div>
      
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
      
      <div className="form-group">
        <label>Rules System</label>
        <select
          value={formData.rules}
          onChange={(e) => handleInputChange('rules', e.target.value)}
        >
          <option value="2024">2024 Rules</option>
          <option value="5e">5e Rules</option>
        </select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="wizard-step">
      <h2>Step 3: Ability Scores</h2>
      <p className="step-description">Set base scores for each ability (1-30)</p>
      
      {ABILITY_NAMES.map((ability, index) => (
        <React.Fragment key={ability}>
          <div className="form-group">
            <label>{ability} - Base Score *</label>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.abilities[index].baseScore}
              onChange={(e) => handleAbilityChange(index, 'baseScore', parseInt(e.target.value))}
              className={errors[`ability_${index}`] ? 'error' : ''}
            />
            {errors[`ability_${index}`] && <span className="error-message">{errors[`ability_${index}`]}</span>}
          </div>
          <div className="form-group">
            <label>{ability} - Ability Improvements</label>
            <input
              type="number"
              min="0"
              value={formData.abilities[index].abilityImprovements}
              onChange={(e) => handleAbilityImprovementChange(index, parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>{ability} - Misc Bonus</label>
            <input
              type="number"
              min="0"
              value={formData.abilities[index].miscBonus}
              onChange={(e) => handleAbilityMiscBonusChange(index, parseInt(e.target.value))}
            />
          </div>
        </React.Fragment>
      ))}
    </div>
  );

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
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return renderStep1();
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
            style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
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
          
          {currentStep < 6 ? (
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


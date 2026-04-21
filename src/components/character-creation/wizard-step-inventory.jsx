import React from 'react';

function WizardStepInventory({ formData, tempInventory, onInventoryChange, onTempInventoryChange }) {
  const handleBackpackBlur = () => {
    const items = tempInventory.backpack.split(',').map(item => item.trim()).filter(item => item.length > 0);
    onInventoryChange('backpack', items);
  };

  const handleEquippedBlur = () => {
    const items = tempInventory.equipped.split(',').map(item => item.trim()).filter(item => item.length > 0);
    onInventoryChange('equipped', items);
  };

  return (
    <div className="wizard-step">
      <h2>Step 5: Inventory</h2>
      
      <div className="form-group">
        <label>Gold Pieces *</label>
        <input
          type="number"
          min="0"
          value={formData.inventory.gold}
          onChange={(e) => onInventoryChange('gold', parseInt(e.target.value) || 0)}
        />
      </div>
      
      <div className="form-group">
        <label>Backpack Items</label>
        <textarea
          value={tempInventory.backpack}
          onChange={(e) => onTempInventoryChange('backpack', e.target.value)}
          onBlur={handleBackpackBlur}
          placeholder="Enter items separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Rope, Torch, rations</p>
      </div>
      
      <div className="form-group">
        <label>Equipped Items</label>
        <textarea
          value={tempInventory.equipped}
          onChange={(e) => onTempInventoryChange('equipped', e.target.value)}
          onBlur={handleEquippedBlur}
          placeholder="Enter items separated by commas"
          rows={3}
        />
        <p className="field-description">e.g., Longsword, Chain mail, Shield</p>
      </div>
    </div>
  );
}

export default WizardStepInventory;

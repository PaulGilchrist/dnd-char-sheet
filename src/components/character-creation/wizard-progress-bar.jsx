import React from 'react';

function WizardProgressBar({ currentStep, totalSteps }) {
  return (
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
      ></div>
    </div>
  );
}

export default WizardProgressBar;

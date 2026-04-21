import React from 'react';

function WizardFooter({ 
  currentStep, 
  isFirstStep, 
  isLastStep, 
  onCancel, 
  onPrevious, 
  onNext, 
  onSubmit 
}) {
  return (
    <div className="wizard-footer">
      <button 
        className="btn btn-secondary" 
        onClick={isFirstStep ? onCancel : onPrevious}
        disabled={isFirstStep}
      >
        {isFirstStep ? 'Cancel' : 'Previous'}
      </button>
      
      {isLastStep ? (
        <button className="btn btn-success" onClick={onSubmit}>
          Create Character
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onNext}>
          Next
        </button>
      )}
    </div>
  );
}

export default WizardFooter;

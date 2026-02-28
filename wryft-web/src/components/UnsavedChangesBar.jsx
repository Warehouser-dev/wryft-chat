import { useState, useEffect } from 'react';
import { FloppyDisk, X } from 'phosphor-react';

function UnsavedChangesBar({ onSave, onReset, saving = false, isClosing = false }) {
  const handleSave = () => {
    onSave();
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <div className={`unsaved-changes-bar ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="unsaved-changes-content">
        <span className="unsaved-changes-text">
          Careful — you have unsaved changes!
        </span>
        <div className="unsaved-changes-actions">
          <button 
            className="unsaved-reset-btn" 
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </button>
          <button 
            className="unsaved-save-btn" 
            onClick={handleSave}
            disabled={saving}
          >
            <FloppyDisk size={18} weight="bold" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnsavedChangesBar;

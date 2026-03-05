import React from 'react';
import { X } from 'phosphor-react';

const shortcuts = [
    { keys: ['Ctrl', 'F'], label: 'Search messages in current channel' },
    { keys: ['Ctrl', '/'], label: 'Show keyboard shortcuts' },
    { keys: ['Esc'], label: 'Close modal / cancel reply / clear search' },
    { keys: ['↑ / ↓'], label: 'Navigate mention autocomplete' },
    { keys: ['Tab', 'Enter'], label: 'Select autocomplete suggestion' },
    { keys: ['Enter'], label: 'Send message' },
];

function KeyboardShortcutsModal({ onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content shortcuts-modal" onClick={e => e.stopPropagation()}>
                <div className="shortcuts-modal-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="shortcuts-list">
                    {shortcuts.map(({ keys, label }, i) => (
                        <div key={i} className="shortcut-row">
                            <span className="shortcut-label">{label}</span>
                            <span className="shortcut-keys">
                                {keys.map((k, j) => (
                                    <span key={j}>
                                        <kbd className="shortcut-key">{k}</kbd>
                                        {j < keys.length - 1 && <span className="shortcut-plus">+</span>}
                                    </span>
                                ))}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default KeyboardShortcutsModal;

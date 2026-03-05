import { useState, useEffect, useRef } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/solid';
import MessageInput from './MessageInput';
import Message from './Message';
import { api } from '../services/api';

function PersonalNotes({ user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Load notes from backend
  useEffect(() => {
    loadNotes();
  }, [user.id]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const userNotes = await api.getPersonalNotes(user.id);
      setNotes(userNotes);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when new note is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleSendNote = async (text, attachments = []) => {
    if (!text.trim()) return;
    
    try {
      const newNote = await api.createPersonalNote(user.id, text, attachments);
      setNotes([...notes, newNote]);
    } catch (err) {
      console.error('Failed to create note:', err);
      alert('Failed to save note');
    }
  };

  const handleEditNote = async (note) => {
    const noteText = prompt('Edit your note:', note.text);
    if (noteText !== null && noteText.trim()) {
      try {
        await api.updatePersonalNote(note.id, noteText);
        setNotes(notes.map(n => 
          n.id === note.id 
            ? { ...n, text: noteText, edited: true }
            : n
        ));
      } catch (err) {
        console.error('Failed to update note:', err);
        alert('Failed to update note');
      }
    }
  };

  const handleDeleteNote = async (note) => {
    if (window.confirm('Delete this note?')) {
      try {
        await api.deletePersonalNote(note.id);
        setNotes(notes.filter(n => n.id !== note.id));
      } catch (err) {
        console.error('Failed to delete note:', err);
        alert('Failed to delete note');
      }
    }
  };

  return (
    <div className="chat">
      <div className="chat-header">
        <DocumentTextIcon className="icon-24 channel-icon" />
        <span>Personal Notes</span>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="loading">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="notes-empty-state">
            <DocumentTextIcon className="icon-64" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--text-main)', marginTop: '16px' }}>Your Personal Notes</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', maxWidth: '400px' }}>
              This is your private space to jot down thoughts, reminders, links, or anything else you want to keep handy.
            </p>
          </div>
        ) : (
          <>
            {notes.map(note => (
              <Message
                key={note.id}
                message={note}
                isDM={false}
                avatar={null}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                showActions={true}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendNote}
        channel="personal-notes"
        placeholder="Jot something down..."
      />
    </div>
  );
}

export default PersonalNotes;

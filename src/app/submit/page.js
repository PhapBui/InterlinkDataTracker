'use client';

import { useState } from 'react';
import { regions } from '../regions';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Send, Sparkles, AlertTriangle, Users, FileText } from 'lucide-react';

export default function SubmitEventForm() {
  const router = useRouter();
  const [submitter, setSubmitter] = useState('');
  const [region, setRegion] = useState(regions[0] || 'Global');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkXp, setBulkXp] = useState(100);
  const [bulkItlg, setBulkItlg] = useState(0);
  const [bulkNote, setBulkNote] = useState('');
  const [members, setMembers] = useState([
    { discord_username: '', xp: 100, itlg: 0, noted: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateOverride, setShowDuplicateOverride] = useState(false);

  // Add a single empty member row
  const addMemberRow = () => {
    setDuplicateWarning(null);
    setShowDuplicateOverride(false);
    setMembers([
      ...members,
      { discord_username: '', xp: 100, itlg: 0, noted: '' }
    ]);
  };

  // Remove a member row
  const removeMemberRow = (index) => {
    if (members.length === 1) {
      setError('An event report must include at least 1 member.');
      return;
    }
    setDuplicateWarning(null);
    setShowDuplicateOverride(false);
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  // Handle member row change
  const handleMemberChange = (index, field, value) => {
    setDuplicateWarning(null);
    setShowDuplicateOverride(false);
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
    setError(null);
  };

  // Bulk add usernames from textarea
  const handleBulkAdd = () => {
    if (!bulkInput.trim()) return;
    
    // Split by comma or new line
    const usernames = bulkInput
      .split(/[\n,]+/)
      .map(u => u.trim().replace(/^@/, '')) // remove leading @ if pasted
      .filter(Boolean);
      
    if (usernames.length === 0) {
      setError('No valid usernames found in the bulk input.');
      return;
    }

    const newRows = usernames.map(username => ({
      discord_username: username,
      xp: parseInt(bulkXp) || 0,
      itlg: parseInt(bulkItlg) || 0,
      noted: bulkNote.trim()
    }));

    // Filter out initial empty row if it's untouched
    const cleanedExisting = members.filter(m => m.discord_username.trim() !== '');
    
    setDuplicateWarning(null);
    setShowDuplicateOverride(false);
    setMembers([...cleanedExisting, ...newRows]);
    setBulkInput('');
    setBulkNote('');
    setError(null);
  };

  // Calculate live stats
  const totalXp = members.reduce((sum, m) => sum + (parseInt(m.xp) || 0), 0);

  // Submit data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!submitter.trim()) return setError('Please enter the submitter name.');
    if (!title.trim()) return setError('Please enter the event title.');
    if (!time.trim()) return setError('Please choose the event date and time.');
    if (participantCount < 0) return setError('Total participants must be 0 or more.');

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.discord_username.trim()) {
        return setError(`Row ${i + 1}: Please enter the Discord Username.`);
      }
      if (m.xp === '' || isNaN(m.xp) || parseInt(m.xp) < 0) {
        return setError(`Row ${i + 1}: XP must be a number greater than or equal to 0.`);
      }
      if (m.itlg === '' || isNaN(m.itlg) || parseInt(m.itlg) < 0) {
        return setError(`Row ${i + 1}: ITLG must be a valid number (quantity).`);
      }
    }

    // Check for duplicate usernames (case-insensitive)
    const usernames = members.map(m => m.discord_username.trim().toLowerCase());
    const duplicates = usernames.filter((name, idx) => name && usernames.indexOf(name) !== idx);
    const uniqueDuplicates = [...new Set(duplicates)];

    if (uniqueDuplicates.length > 0 && !showDuplicateOverride) {
      setDuplicateWarning(`Duplicate usernames detected: ${uniqueDuplicates.map(name => `@${name}`).join(', ')}.`);
      setShowDuplicateOverride(true);
      return;
    }

    let finalMembers = members;
    if (uniqueDuplicates.length > 0 && showDuplicateOverride) {
      const seen = new Set();
      finalMembers = members.filter(m => {
        const name = m.discord_username.trim().toLowerCase();
        if (!name) return false;
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitter,
          region,
          title,
          time,
          participantCount,
          members: finalMembers
        })
      });

      if (!res.ok) throw new Error('Failed to connect to the server.');
      const result = await res.json();

      if (result.status === 'success') {
        router.push(`/details/${result.id}`);
      } else {
        throw new Error(result.message || 'Failed to submit report.');
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Back button and header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.push('/')} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '10px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Submit <span className="text-gradient-purple">Weekly Report</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Report weekly events held in your region. Data will be saved to Google Sheets.
          </p>
        </div>
      </div>

      {error && (
        <div className="card animate-fade-in" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          <p style={{ color: '#fca5a5', fontSize: '0.9rem', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {duplicateWarning && (
        <div className="card animate-fade-in" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
            <p style={{ color: '#fcd34d', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Duplicate Usernames Detected</p>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {duplicateWarning}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
            Please review the list to resolve duplicates. If you still want to proceed, click <b>"Submit Anyway"</b> and the duplicate entries will be filtered out automatically.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* General details */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            General Event Details
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            
            <div className="form-group">
              <label className="form-label">Submitter Name</label>
              <input
                type="text"
                placeholder="e.g., Châu Long"
                className="form-input"
                value={submitter}
                onChange={(e) => { setSubmitter(e.target.value); setError(null); }}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Region</label>
              <select
                className="form-input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={submitting}
              >
                {regions.map((reg) => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Event Title</label>
              <input
                type="text"
                placeholder="e.g., Gaming Night #3"
                className="form-input"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(null); }}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Event Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={time}
                onChange={(e) => { setTime(e.target.value); setError(null); }}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Participants (Attendees)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g., 50"
                className="form-input"
                value={participantCount}
                onChange={(e) => { setParticipantCount(parseInt(e.target.value) || 0); setError(null); }}
                disabled={submitting}
              />
            </div>

          </div>
        </div>

        {/* Bulk User Input */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            Bulk Import Usernames
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.4 }}>
            💡 Enter multiple usernames separated by commas or new lines. Each username will be added to the table below with the XP, ITLG, and Notes specified below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              placeholder="Enter list: user1, user2, user3..."
              className="form-input"
              style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.9rem' }}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              disabled={submitting}
            />

            {/* Bulk Columns Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Default XP</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                  value={bulkXp}
                  onChange={(e) => setBulkXp(parseInt(e.target.value) || 0)}
                  disabled={submitting}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Default ITLG Qty</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                  value={bulkItlg}
                  onChange={(e) => setBulkItlg(parseInt(e.target.value) || 0)}
                  disabled={submitting}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Default Notes</label>
                <input
                  type="text"
                  placeholder="e.g., Active support"
                  className="form-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            
            <button
              type="button"
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-end', padding: '0.5rem 1.25rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
              onClick={handleBulkAdd}
              disabled={submitting}
            >
              Add Usernames to List
            </button>
          </div>
        </div>

        {/* Dynamic list */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              Participant List & XP Rewards
            </h2>
            
            {/* Live Stats */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
              <span className="badge badge-primary">Members: {members.length}</span>
              <span className="badge badge-success">Total XP: {totalXp}</span>
            </div>
          </div>

          <div className="table-container" style={{ marginTop: '0', background: 'transparent', border: 'none' }}>
            <table className="custom-table" style={{ border: '1px solid var(--border)', borderRadius: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Discord Username</th>
                  <th style={{ width: '15%' }}>XP</th>
                  <th style={{ width: '15%' }}>ITLG (Qty)</th>
                  <th style={{ width: '25%' }}>Notes (Noted)</th>
                  <th style={{ width: '5%', textAlign: 'center' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        placeholder="clong_mod"
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                        value={member.discord_username}
                        onChange={(e) => handleMemberChange(index, 'discord_username', e.target.value)}
                        disabled={submitting}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="100"
                        min="0"
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                        value={member.xp}
                        onChange={(e) => handleMemberChange(index, 'xp', e.target.value)}
                        disabled={submitting}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                        value={member.itlg}
                        onChange={(e) => handleMemberChange(index, 'itlg', parseInt(e.target.value) || 0)}
                        disabled={submitting}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="e.g., Main Host"
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                        value={member.noted}
                        onChange={(e) => handleMemberChange(index, 'noted', e.target.value)}
                        disabled={submitting}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '0.5rem', borderRadius: '8px' }}
                        onClick={() => removeMemberRow(index)}
                        disabled={submitting}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--border)' }}
            onClick={addMemberRow}
            disabled={submitting}
          >
            <Plus size={18} />
            <span>Add Individual Row</span>
          </button>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push('/')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: '160px', backgroundColor: showDuplicateOverride ? 'var(--warning)' : 'var(--primary)', borderColor: showDuplicateOverride ? 'var(--warning)' : 'var(--primary)', color: showDuplicateOverride ? '#000' : '#fff' }}
          >
            {submitting ? (
              <>
                <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }}></div>
                <span>Submitting...</span>
              </>
            ) : showDuplicateOverride ? (
              <>
                <Send size={18} />
                <span>Submit Anyway</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Submit Report</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

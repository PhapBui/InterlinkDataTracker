'use client';

import { useState, useEffect } from 'react';
import { regions } from '../../regions';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Send, Sparkles, AlertTriangle, Users, FileText, CheckCircle } from 'lucide-react';

export default function SubmitEventForm() {
  const router = useRouter();
  const [submitter, setSubmitter] = useState('');
  const [region, setRegion] = useState(regions[0] || 'Global');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [proofUrl, setProofUrl] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkXp, setBulkXp] = useState(100);
  const [bulkItlg, setBulkItlg] = useState(0);
  const [bulkNote, setBulkNote] = useState('');
  const [members, setMembers] = useState([
    { discord_username: '', xp: 100, itlg: 0, noted: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateOverride, setShowDuplicateOverride] = useState(false);
  const [bulkDuplicateWarning, setBulkDuplicateWarning] = useState(null);
  const [showBulkOverride, setShowBulkOverride] = useState(false);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

    // Filter out initial empty row if it's untouched
    const cleanedExisting = members.filter(m => m.discord_username.trim() !== '');

    // Check for duplicate usernames (case-insensitive)
    const lowerUsernames = usernames.map(u => u.toLowerCase());
    const duplicatesWithin = lowerUsernames.filter((name, idx) => lowerUsernames.indexOf(name) !== idx);
    
    const existingLower = cleanedExisting.map(m => m.discord_username.trim().toLowerCase()).filter(Boolean);
    const duplicatesBetween = lowerUsernames.filter(name => existingLower.includes(name));
    
    const allDuplicates = [...new Set([...duplicatesWithin, ...duplicatesBetween])];

    if (allDuplicates.length > 0 && !showBulkOverride) {
      setBulkDuplicateWarning(`Duplicate usernames found in bulk input or existing list: ${allDuplicates.map(u => `@${u}`).join(', ')}.`);
      setShowBulkOverride(true);
      return;
    }

    // Deduplicate on merge
    const newRows = usernames.map(username => ({
      discord_username: username,
      xp: parseInt(bulkXp) || 0,
      itlg: parseInt(bulkItlg) || 0,
      noted: bulkNote.trim()
    }));
    const combined = [...cleanedExisting, ...newRows];
    const seen = new Set();
    const uniqueCombined = combined.filter(m => {
      const name = m.discord_username.trim().toLowerCase();
      if (!name) return false;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    setDuplicateWarning(null);
    setShowDuplicateOverride(false);
    setBulkDuplicateWarning(null);
    setShowBulkOverride(false);
    setMembers(uniqueCombined);
    setBulkInput('');
    setBulkNote('');
    setError(null);
    setToast({ type: 'success', message: `Imported ${uniqueCombined.length - cleanedExisting.length} members successfully!` });
  };

  const handleConfirmBulkAddAnyway = () => {
    const usernames = bulkInput
      .split(/[\n,]+/)
      .map(u => u.trim().replace(/^@/, ''))
      .filter(Boolean);
      
    const newRows = usernames.map(username => ({
      discord_username: username,
      xp: parseInt(bulkXp) || 0,
      itlg: parseInt(bulkItlg) || 0,
      noted: bulkNote.trim()
    }));

    const cleanedExisting = members.filter(m => m.discord_username.trim() !== '');
    const combined = [...cleanedExisting, ...newRows];
    const seen = new Set();
    const uniqueCombined = combined.filter(m => {
      const name = m.discord_username.trim().toLowerCase();
      if (!name) return false;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    setDuplicateWarning(null);
    setShowDuplicateOverride(false);
    setBulkDuplicateWarning(null);
    setShowBulkOverride(false);
    setMembers(uniqueCombined);
    setBulkInput('');
    setBulkNote('');
    setError(null);
    setToast({ type: 'success', message: `Imported ${uniqueCombined.length - cleanedExisting.length} unique members!` });
  };

  // Calculate live stats
  const totalXp = members.reduce((sum, m) => sum + (parseInt(m.xp) || 0), 0);

  // Submit data
  const submitData = async (finalMembers) => {
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
          proofUrl,
          members: finalMembers
        })
      });

      let result;
      try {
        result = await res.json();
      } catch (_) {}

      if (!res.ok) {
        throw new Error(result?.message || `HTTP Error ${res.status}: Failed to submit event report.`);
      }

      if (result && result.status === 'success') {
        setToast({ type: 'success', message: 'Report submitted successfully!' });
        setTimeout(() => {
          router.push(`/details/${result.id}`);
        }, 1500);
      } else {
        throw new Error(result?.message || 'Failed to submit report.');
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const scrollToElement = (id) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        // Custom gradual acceleration/deceleration smooth scroll
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - (window.innerHeight / 2);
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 900; // 900ms duration
        let start = null;

        const step = (timestamp) => {
          if (!start) start = timestamp;
          const progress = timestamp - start;
          // Cubic ease-in-out easing function
          const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
          const ease = easeInOutCubic(Math.min(progress / duration, 1));
          
          window.scrollTo(0, startPosition + distance * ease);
          
          if (progress < duration) {
            window.requestAnimationFrame(step);
          } else {
            element.focus();
          }
        };
        window.requestAnimationFrame(step);
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!submitter.trim()) {
      setError('Please enter the submitter name.');
      scrollToElement('submitter-name');
      return;
    }
    if (!title.trim()) {
      setError('Please enter the event title.');
      scrollToElement('event-title');
      return;
    }
    if (!time.trim()) {
      setError('Please choose the event date.');
      scrollToElement('event-date');
      return;
    }
    if (participantCount < 0) {
      setError('Total participants must be 0 or more.');
      scrollToElement('participant-count');
      return;
    }
    if (proofUrl.trim() !== '') {
      try {
        const url = new URL(proofUrl.trim());
        if (!url.hostname.includes('snipboard.io')) {
          setError('Please enter a valid snipboard.io screenshot link (e.g., https://snipboard.io/xxxxxx).');
          scrollToElement('proof-url');
          return;
        }
      } catch (_) {
        setError('Please enter a valid URL for the screenshot proof link (including http:// or https://).');
        scrollToElement('proof-url');
        return;
      }
    }

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.discord_username.trim()) {
        setError(`Row ${i + 1}: Please enter the Discord Username.`);
        scrollToElement(`discord-username-${i}`);
        return;
      }
      if (m.xp === '' || isNaN(m.xp) || parseInt(m.xp) < 0) {
        setError(`Row ${i + 1}: XP must be a number greater than or equal to 0.`);
        scrollToElement(`xp-${i}`);
        return;
      }
      if (m.itlg === '' || isNaN(m.itlg) || parseInt(m.itlg) < 0) {
        setError(`Row ${i + 1}: ITLG must be a valid number (quantity).`);
        scrollToElement(`itlg-${i}`);
        return;
      }
    }

    // Check for duplicate usernames (case-insensitive)
    const usernames = members.map(m => m.discord_username.trim().toLowerCase());
    const duplicates = usernames.filter((name, idx) => name && usernames.indexOf(name) !== idx);
    const uniqueDuplicates = [...new Set(duplicates)];

    if (uniqueDuplicates.length > 0) {
      setDuplicateWarning(`Duplicate usernames detected: ${uniqueDuplicates.map(name => `@${name}`).join(', ')}.`);
      setShowDuplicateOverride(true);
      return;
    }

    submitData(members);
  };

  const handleConfirmSubmitAnyway = () => {
    const usernames = members.map(m => m.discord_username.trim().toLowerCase());
    const seen = new Set();
    const finalMembers = members.filter(m => {
      const name = m.discord_username.trim().toLowerCase();
      if (!name) return false;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    setDuplicateWarning(null);
    setShowDuplicateOverride(false);
    submitData(finalMembers);
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

      {/* Notifications are handled via modern overlay popups and toasts */}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* General details */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            General Event Details
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            
            <div className="form-group">
              <label className="form-label">Submitter Name <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span></label>
              <input
                id="submitter-name"
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
              <label className="form-label">Event Title <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span></label>
              <input
                id="event-title"
                type="text"
                placeholder="e.g., Gaming Night #3"
                className="form-input"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(null); }}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Event Date <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span></label>
              <input
                id="event-date"
                type="date"
                className="form-input"
                value={time}
                onChange={(e) => { setTime(e.target.value); setError(null); }}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Participants (Attendees)</label>
              <input
                id="participant-count"
                type="number"
                min="0"
                placeholder="e.g., 50"
                className="form-input"
                value={participantCount}
                onChange={(e) => { setParticipantCount(parseInt(e.target.value) || 0); setError(null); }}
                disabled={submitting}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Screenshot Proof Link (snipboard.io)</label>
              <input
                id="proof-url"
                type="url"
                placeholder="https://snipboard.io/xxxxxx"
                className="form-input"
                value={proofUrl}
                onChange={(e) => { setProofUrl(e.target.value); setError(null); }}
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
              onChange={(e) => {
                setBulkInput(e.target.value);
                setBulkDuplicateWarning(null);
                setShowBulkOverride(false);
              }}
              disabled={submitting}
            />

            {/* Bulk duplicates handled via modal dialog popup */}

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
              style={{ 
                alignSelf: 'flex-end', 
                padding: '0.5rem 1.25rem', 
                fontSize: '0.9rem', 
                marginTop: '0.5rem',
                borderRadius: '8px'
              }}
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
                  <th style={{ width: '40%' }}>Discord Username <span style={{ color: 'var(--danger)' }}>*</span></th>
                  <th style={{ width: '15%' }}>XP <span style={{ color: 'var(--danger)' }}>*</span></th>
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
                        id={`discord-username-${index}`}
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
                        id={`xp-${index}`}
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
                        id={`itlg-${index}`}
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
                        id={`noted-${index}`}
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
            style={{ minWidth: '160px' }}
          >
            {submitting ? (
              <>
                <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }}></div>
                <span>Submitting...</span>
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

      {/* Toast Notifications container */}
      <div className="toast-container">
        {error && (
          <div className="toast toast-error animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem', display: 'block', marginBottom: '0.15rem' }}>Error</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{error}</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setError(null)} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-dim)', 
                cursor: 'pointer', 
                fontSize: '1.2rem',
                padding: '0 0.25rem',
                lineHeight: 1,
                transition: 'color 0.2s',
                marginTop: '-2px'
              }}
              onMouseOver={(e) => e.target.style.color = '#fff'}
              onMouseOut={(e) => e.target.style.color = 'var(--text-dim)'}
            >
              &times;
            </button>
          </div>
        )}
        {toast && (
          <div className={`toast toast-${toast.type} animate-fade-in`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {toast.type === 'success' ? (
                <CheckCircle size={20} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem', display: 'block', marginBottom: '0.15rem' }}>
                  {toast.type === 'success' ? 'Success' : 'Warning'}
                </strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{toast.message}</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setToast(null)} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-dim)', 
                cursor: 'pointer', 
                fontSize: '1.2rem',
                padding: '0 0.25rem',
                lineHeight: 1,
                transition: 'color 0.2s',
                marginTop: '-2px'
              }}
              onMouseOver={(e) => e.target.style.color = '#fff'}
              onMouseOut={(e) => e.target.style.color = 'var(--text-dim)'}
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Modal: Duplicate Submissions Check */}
      {showDuplicateOverride && duplicateWarning && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>Duplicate Usernames Detected</h3>
            </div>
            
            <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
              {duplicateWarning}
            </p>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
              If you submit anyway, the system will automatically filter out the duplicate entries (keeping only the first occurrence of each username) before saving to the database.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setDuplicateWarning(null);
                  setShowDuplicateOverride(false);
                }}
              >
                Cancel & Review
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ backgroundColor: 'var(--warning)', color: '#000', fontWeight: 600 }}
                onClick={handleConfirmSubmitAnyway}
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Duplicate Bulk Import Check */}
      {showBulkOverride && bulkDuplicateWarning && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>Duplicate Usernames in Bulk Input</h3>
            </div>
            
            <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
              {bulkDuplicateWarning}
            </p>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
              If you proceed anyway, duplicate usernames (within the input or matching existing rows) will be automatically filtered out, and only unique users will be added to the list.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setBulkDuplicateWarning(null);
                  setShowBulkOverride(false);
                }}
              >
                Cancel & Edit
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ backgroundColor: 'var(--warning)', color: '#000', fontWeight: 600 }}
                onClick={handleConfirmBulkAddAnyway}
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, Calendar, MapPin, CheckCircle, Copy, Check, Info, Sparkles, FileSpreadsheet, Star } from 'lucide-react';

export default function SubmissionDetails() {
  const router = useRouter();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/submissions?id=${id}`);
        if (!res.ok) throw new Error('Could not fetch event details.');
        
        const result = await res.json();
        if (result.status === 'success') {
          setData(result);
        } else {
          throw new Error(result.message || 'An error occurred.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const formatEventDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getDirectImageUrl = (urlStr) => {
    if (!urlStr) return null;
    try {
      const url = new URL(urlStr.trim());
      if (url.hostname.includes('snipboard.io')) {
        let path = url.pathname;
        if (!path.endsWith('.jpg') && !path.endsWith('.png')) {
          path = path + '.jpg';
        }
        return `${url.protocol}//${url.hostname}${path}`;
      }
    } catch (_) {}
    return null;
  };

  // Copy formatting for Discord posts
  const handleCopyDiscordFormat = () => {
    if (!data) return;
    
    const { submission, members } = data;
    
    let text = `**WEEKLY EVENT REPORT - ${(submission.region || '').toUpperCase()}**\n`;
    text += `**Event:** ${submission.title}\n`;
    text += `**Time:** ${formatEventDate(submission.time)}\n`;
    text += `**Submitter:** ${submission.submitter}\n`;
    if (submission.proofUrl) {
      text += `**Evidence:** ${submission.proofUrl}\n`;
    }
    text += `-------------------------------------------------\n`;
    text += `**PARTICIPANT LIST & XP REWARDS:**\n`;
    
    members.forEach((m, idx) => {
      const itlgVal = parseInt(m.itlg) || 0;
      const itlgText = itlgVal > 0 ? ` 👑 [ITLG: ${itlgVal}]` : '';
      const noteText = m.noted ? ` - *(${m.noted})*` : '';
      text += `${idx + 1}. @${m.discord_username} : **${m.xp} XP**${itlgText}${noteText}\n`;
    });
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVerify = () => {
    setVerified(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '10rem 0' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Retrieving event information from database...</p>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
        <div style={{ color: 'var(--danger)', fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Event Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'The requested event does not exist.'}</p>
        <button onClick={() => router.push('/')} className="btn btn-primary">Go to Home</button>
      </div>
    );
  }

  const { submission, members, isMock } = data;
  const totalXp = members.reduce((sum, m) => sum + (parseInt(m.xp) || 0), 0);
  const totalItlg = members.reduce((sum, m) => sum + (parseInt(m.itlg) || 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push('/')} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '10px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>EVENT DETAILS #{id.substring(id.length - 6)}</span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', marginTop: '0.15rem' }}>
              Verify & <span className="text-gradient-purple">Review</span>
            </h1>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleCopyDiscordFormat} 
            className="btn btn-secondary"
            style={{ borderColor: 'rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}
          >
            {copied ? <Check size={18} style={{ color: 'var(--success)' }} /> : <Copy size={18} />}
            <span>{copied ? 'Copied Discord Format!' : 'Copy Discord Format'}</span>
          </button>
          
          <button 
            onClick={handleVerify} 
            className={`btn ${verified ? 'btn-secondary' : 'btn-primary'}`}
            disabled={verified}
            style={verified ? { color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' } : {}}
          >
            <CheckCircle size={18} />
            <span>{verified ? 'Verified Correct' : 'Confirm Correct'}</span>
          </button>
        </div>
      </div>

      {/* Database Connection Banner */}
      {isMock ? (
        <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--border)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Info size={18} style={{ color: 'var(--primary)', shrink: 0 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            This report is loaded from the <b>local Mock Database</b>. Please configure <code style={{color: 'white', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px'}}>.env.local</code> to sync with your actual Google Sheet.
          </p>
        </div>
      ) : (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.04)', borderColor: 'rgba(16, 185, 129, 0.25)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--success)', shrink: 0 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Connected successfully! This report has been synced and verified directly from your <b>Google Sheet</b>.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Members list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
              Participants & XP Breakdown
            </h2>
            
            <div className="table-container" style={{ marginTop: '0', border: '1px solid var(--border)' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Discord Username</th>
                    <th>XP Reward</th>
                    <th>ITLG (Qty)</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => {
                    const itlgQty = parseInt(m.itlg) || 0;
                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            @{m.discord_username}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>
                            +{m.xp} XP
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${itlgQty > 0 ? 'badge-warning' : 'badge-primary'}`} style={{ gap: '0.25rem' }}>
                            {itlgQty > 0 && <Star size={10} fill="currentColor" />}
                            {itlgQty > 0 ? `👑 Leader (x${itlgQty})` : 'Member'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.9rem', color: m.noted ? 'var(--text-muted)' : 'var(--text-dim)', fontStyle: m.noted ? 'italic' : 'normal' }}>
                            {m.noted || 'No notes'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Summary details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} style={{ color: 'var(--primary)' }} />
              Event Info
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginTop: '0.25rem', display: 'block' }}>
                  {submission.title}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occurred Time</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                  <Calendar size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 500 }}>{formatEventDate(submission.time)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitter</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <User size={14} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 500 }}>{submission.submitter}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Region</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <MapPin size={14} style={{ color: 'var(--accent)' }} />
                    <span className="badge badge-primary">{submission.region}</span>
                  </div>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Participants</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.25rem', display: 'block' }}>
                  {submission.participantcount || submission.participantCount || 0} attendees
                </strong>
              </div>

              {submission.proofUrl && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Screenshot Proof</span>
                  <a 
                    href={submission.proofUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getDirectImageUrl(submission.proofUrl) || submission.proofUrl} 
                      alt="Event Screenshot Proof" 
                      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '180px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.6)', fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-main)', borderTop: '1px solid var(--border)' }}>
                      Click to view full screenshot 🔗
                    </div>
                  </a>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted At</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  {formatDate(submission.timestamp)}
                </span>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="card" style={{ 
            padding: '1.5rem', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(217, 70, 239, 0.08) 100%)',
            borderColor: 'rgba(99, 102, 241, 0.2)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>XP & Role Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL XP</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{totalXp}</strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL ITLG</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--warning)' }}>{totalItlg}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}

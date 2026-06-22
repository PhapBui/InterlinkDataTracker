'use client';

import { useState, useEffect } from 'react';
import { regions as configRegions } from './regions';
import Link from 'next/link';
import { Search, Filter, Calendar, MapPin, User, ChevronRight, FileSpreadsheet, Plus, AlertCircle, RefreshCw } from 'lucide-react';

export default function SubmissionsList() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isMock, setIsMock] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/submissions');
      if (!res.ok) throw new Error('Could not fetch data.');
      const result = await res.json();
      if (result.status === 'success') {
        setSubmissions(result.data || []);
        setIsMock(result.isMock || false);
      } else {
        throw new Error(result.message || 'An error occurred.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleRegionChange = (e) => setSelectedRegion(e.target.value);

  // Filter submissions by search term and region
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = 
      (sub.submitter || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map region filter to raw values in DB (just in case they are different)
    const matchesRegion = selectedRegion === '' || sub.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  // Get unique regions list for filter
  const regions = [...new Set(submissions.map((sub) => sub.region))].filter(Boolean);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Banner / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-1px' }}>
            Event <span className="text-gradient-purple">Submissions</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Weekly event reports submitted by local moderators.
          </p>
        </div>
        <Link href="/submit" className="btn btn-primary">
          <Plus size={18} />
          <span>Submit New Report</span>
        </Link>
      </div>

      {/* Demo Mode / Configuration Alert */}
      {isMock && (
        <div className="card" style={{ 
          background: 'rgba(245, 158, 11, 0.04)', 
          borderColor: 'rgba(245, 158, 11, 0.25)', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertCircle style={{ color: 'var(--warning)', shrink: 0, marginTop: '2px' }} size={20} />
            <div>
              <h3 style={{ color: '#fcd34d', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                Running in Demo Mode (Mock Database)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                The application is temporarily saving data to <code style={{color: 'white', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px'}}>mock_db.json</code>. To connect it to your live Google Sheet, follow these steps:
              </p>
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1rem', 
            fontSize: '0.85rem', 
            color: 'var(--text-muted)',
            borderTop: '1px solid rgba(245, 158, 11, 0.1)',
            paddingTop: '1rem'
          }}>
            <div>
              <strong style={{ color: 'var(--text-main)' }}>Step 1: Setup Google Sheet</strong>
              <p style={{ marginTop: '0.25rem' }}>Create a Google Sheet and open <b>Extensions &gt; Apps Script</b>. Paste the contents of <code style={{color: '#818cf8'}}>apps_script.js</code> into the editor and save it.</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-main)' }}>Step 2: Deploy Web App</strong>
              <p style={{ marginTop: '0.25rem' }}>Click <b>Deploy &gt; New deployment</b>, select <b>Web App</b>. Set executing as yourself and access to <b>Anyone</b>, then deploy to receive a Web App URL.</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-main)' }}>Step 3: Set Env Variable</strong>
              <p style={{ marginTop: '0.25rem' }}>Copy the URL and paste it into <code style={{color: '#818cf8'}}>.env.local</code> (as the <code style={{color: '#f472b6'}}>NEXT_PUBLIC_SHEETS_API_URL</code> value) and restart the server.</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by submitter name or event title..."
              className="form-input"
              style={{ paddingLeft: '2.75rem' }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div style={{ minWidth: '180px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0 0.75rem' }}>
            <Filter size={16} style={{ color: 'var(--text-dim)' }} />
            <select
              className="form-input"
              style={{ border: 'none', background: 'transparent', padding: '0.75rem 0.25rem', width: '100%' }}
              value={selectedRegion}
              onChange={handleRegionChange}
            >
              <option value="" style={{ background: 'var(--bg-main)' }}>All Regions</option>
              {regions.map((reg) => (
                <option key={reg} value={reg} style={{ background: 'var(--bg-main)' }}>{reg}</option>
              ))}
              {regions.length === 0 && configRegions.map((reg) => (
                <option key={reg} value={reg} style={{ background: 'var(--bg-main)' }}>{reg}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '0.75rem' }} title="Reload Data">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table / List View */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 0' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Syncing database from Google Sheets...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Failed to Load Data</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={fetchData} className="btn btn-primary">Try Again</button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <FileSpreadsheet size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Submissions Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {searchTerm || selectedRegion ? 'No events match your search criteria.' : 'No event reports have been submitted for this week yet.'}
          </p>
          {(searchTerm || selectedRegion) ? (
            <button onClick={() => { setSearchTerm(''); setSelectedRegion(''); }} className="btn btn-secondary">Clear Filters</button>
          ) : (
            <Link href="/submit" className="btn btn-primary">
              <Plus size={18} />
              <span>Submit First Report</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Submitted Date</th>
                <th>Submitter</th>
                <th>Region</th>
                <th>Event Title</th>
                <th>Mods Count</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                      <span>{formatDate(sub.timestamp)}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                      <User size={14} style={{ color: 'var(--primary)' }} />
                      <span>{sub.submitter}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      sub.region === 'North' ? 'badge-primary' : 
                      sub.region === 'South' ? 'badge-success' : 'badge-warning'
                    }`}>
                      <MapPin size={10} style={{ marginRight: '4px' }} />
                      {sub.region}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{sub.title}</span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Occurred: {formatDate(sub.time)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{sub.memberCount || 0} mods</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/details/${sub.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px' }}>
                      <span>Verify</span>
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Animation spinner style */}
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

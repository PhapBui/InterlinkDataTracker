'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Trophy, MapPin, Calendar, Users, Award, Star, RefreshCw, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getBarColor = (regionName) => {
    const themeColors = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--accent)'];
    let hash = 0;
    for (let i = 0; i < regionName.length; i++) {
      hash = regionName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % themeColors.length;
    return themeColors[index];
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/submissions?type=dashboard');
      let result;
      try {
        result = await res.json();
      } catch (_) {}

      if (!res.ok) {
        throw new Error(result?.message || `HTTP Error ${res.status}: Could not load dashboard statistics.`);
      }
      
      if (result && result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result?.message || 'An error occurred while loading dashboard statistics.');
      }
    } catch (err) {
      setError(`Google Sheets API Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '10rem 0' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Calculating leaderboard rankings and statistics...</p>
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
        <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Failed to Load Statistics</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  const { submissionsCount, totalXp, activeModsCount, leaderboard, regionStats } = data;

  // Max XP for relative leaderboard progress bars
  const maxXp = leaderboard.length > 0 ? leaderboard[0].xp : 1;
  // Max event count per region for relative regional progress bars
  const maxRegionEvents = regionStats.reduce((max, r) => r.eventsCount > max ? r.eventsCount : max, 1);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-1px' }}>
            Dashboard & <span className="text-gradient-purple">Leaderboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Event activity metrics and aggregated XP rankings for Local Moderators.
          </p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ padding: '0.75rem' }}>
          <RefreshCw size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '12px' }}>
            <Calendar size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 500 }}>Total Events</span>
            <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>{submissionsCount}</strong>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ background: 'rgba(217, 70, 239, 0.15)', color: 'var(--accent)', padding: '0.75rem', borderRadius: '12px' }}>
            <Award size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 500 }}>XP Distributed</span>
            <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalXp} XP</strong>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ background: 'var(--success-glow)', color: 'var(--success)', padding: '0.75rem', borderRadius: '12px' }}>
            <Users size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 500 }}>Active Mods</span>
            <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>{activeModsCount}</strong>
          </div>
        </div>

      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Leaderboard Column */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={20} style={{ color: '#fbbf24' }} />
            Global Moderator XP Leaderboard
          </h2>

          {leaderboard.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>No ranking data available.</p>
          ) : (
            <div className="table-container" style={{ marginTop: '0', border: '1px solid var(--border)' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '10%', textAlign: 'center' }}>Rank</th>
                    <th style={{ width: '40%' }}>Moderator</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Events</th>
                    <th style={{ width: '30%', textAlign: 'right' }}>Total XP</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((member, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;
                    const pct = (member.xp / maxXp) * 100;
                    
                    return (
                      <tr key={member.username}>
                        <td style={{ textAlign: 'center' }}>
                          {rank === 1 ? (
                            <span style={{ fontSize: '1.25rem', filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' }}>👑</span>
                          ) : rank === 2 ? (
                            <span style={{ fontSize: '1.15rem' }}>🥈</span>
                          ) : rank === 3 ? (
                            <span style={{ fontSize: '1.15rem' }}>🥉</span>
                          ) : (
                            <span style={{ fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.9rem' }}>#{rank}</span>
                          )}
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600, color: isTop3 ? 'var(--text-main)' : 'var(--text-muted)', fontSize: isTop3 ? '1rem' : '0.95rem' }}>
                              @{member.username}
                            </span>
                            {member.leaderCount > 0 && (
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', marginLeft: '0.5rem', transform: 'translateY(-1px)' }}>
                                <Star size={8} fill="currentColor" style={{ marginRight: '2px' }} />
                                ITLG Qty: {member.leaderCount}
                              </span>
                            )}
                            
                            {/* XP Progress bar */}
                            <div style={{ width: '120px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: isTop3 ? 'linear-gradient(90deg, var(--primary), var(--accent))' : 'var(--primary)', borderRadius: '2px' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 500 }}>
                          {member.eventsCount}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontWeight: 800, 
                            fontSize: isTop3 ? '1.1rem' : '1rem',
                            color: rank === 1 ? '#fbbf24' : rank === 2 ? '#e2e8f0' : rank === 3 ? '#cd7f32' : 'var(--text-main)'
                          }}>
                            {member.xp} XP
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Regional Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.50rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} style={{ color: 'var(--accent)' }} />
              Regional Activity
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {regionStats.map((reg) => {
                const eventPct = (reg.eventsCount / maxRegionEvents) * 100;
                
                return (
                  <div key={reg.region} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{reg.region}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <b>{reg.eventsCount}</b> events | <b>{reg.totalXp} XP</b>
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', width: '100%' }}>
                      <div style={{ 
                        width: `${eventPct}%`, 
                        height: '100%', 
                        background: getBarColor(reg.region), 
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard Calculation Rule */}
          <div className="card" style={{ 
            padding: '1.25rem', 
            background: 'rgba(99, 102, 241, 0.03)', 
            borderColor: 'rgba(99, 102, 241, 0.15)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5
          }}>
            <h4 style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              💡 Ranking Formula
            </h4>
            <p>
              This leaderboard updates in real-time as event submissions are logged. 
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              The system sums the XP of all events each moderator participated in. Trophies and medals (👑, 🥈, 🥉) honor the top 3 high-performing mods. ITLG credits are accumulated based on quantitative leadership scores entered during submission.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

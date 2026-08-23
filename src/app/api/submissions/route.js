import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { regions } from '../../regions';
import { getSession } from '../../auth/session';

// Đường dẫn tới file mock_db.json
const getMockDbPath = () => path.join(process.cwd(), 'mock_db.json');

// Chuẩn hóa tên khóa (keys) nhận từ Google Sheets để tránh lỗi lệch kiểu chữ và dấu cách
function normalizeKeys(obj) {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeKeys);
  if (typeof obj !== 'object') return obj;
  
  const normalized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, '');
      
      let mappedKey = normalizedKey;
      if (normalizedKey === 'submissionid') {
        mappedKey = 'submission_id';
      } else if (normalizedKey === 'discordusername' || normalizedKey === 'username' || normalizedKey === 'discord') {
        mappedKey = 'discord_username';
      } else if (normalizedKey === 'membercount') {
        mappedKey = 'memberCount';
      } else if (normalizedKey === 'participantcount') {
        mappedKey = 'participantCount';
      } else if (normalizedKey === 'proofurl' || normalizedKey === 'prooflink' || normalizedKey === 'evidence') {
        mappedKey = 'proofUrl';
      } else if (normalizedKey === 'notes') {
        mappedKey = 'noted';
      } else if (normalizedKey === 'submitteremail' || normalizedKey === 'email') {
        mappedKey = 'submitterEmail';
      }
      
      normalized[mappedKey] = normalizeKeys(obj[key]);
    }
  }
  return normalized;
}

// Đọc dữ liệu từ mock_db.json
async function readMockDb() {
  try {
    const filePath = getMockDbPath();
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Lỗi khi đọc file mock_db.json, trả về dữ liệu trống:', error);
    return { submissions: [], members: [] };
  }
}

// Ghi dữ liệu vào mock_db.json
async function writeMockDb(data) {
  try {
    const filePath = getMockDbPath();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Không thể ghi file mock_db.json (có thể do môi trường serverless):', error);
    return false;
  }
}

// Tính toán số liệu thống kê cho Dashboard
function calculateDashboard(submissions, members) {
  const submissionsCount = submissions.length;
  const totalXp = members.reduce((sum, m) => sum + (parseInt(m.xp) || 0), 0);
  
  // Tính toán bảng xếp hạng (Leaderboard) theo Người gửi báo cáo (Submitter / Moderator)
  const subStatsMap = new Map();
  members.forEach(m => {
    const subId = m.submission_id;
    const xp = parseInt(m.xp) || 0;
    const itlg = parseInt(m.itlg) || 0;
    
    if (!subStatsMap.has(subId)) {
      subStatsMap.set(subId, { xp: 0, itlg: 0 });
    }
    const stats = subStatsMap.get(subId);
    stats.xp += xp;
    stats.itlg += itlg;
  });

  const moderatorMap = new Map();
  submissions.forEach(sub => {
    const rawModerator = sub.submitter || 'Anonymous';
    const moderator = rawModerator.trim();
    const key = moderator.toLowerCase();
    const subStats = subStatsMap.get(sub.id) || { xp: 0, itlg: 0 };
    
    if (!moderatorMap.has(key)) {
      moderatorMap.set(key, {
        username: moderator,
        xp: 0,
        eventsCount: 0,
        leaderCount: 0
      });
    }
    const current = moderatorMap.get(key);
    current.xp += subStats.xp;
    current.eventsCount += 1;
    current.leaderCount += subStats.itlg;
  });

  const leaderboard = Array.from(moderatorMap.values())
    .sort((a, b) => b.xp - a.xp); // Sắp xếp giảm dần theo tổng XP phân phối
  
  const activeModsCount = leaderboard.length;
  
  // Tính toán thống kê theo khu vực (Region)
  const regionMap = new Map();
  // Khởi tạo các khu vực mặc định để đảm bảo chúng xuất hiện dù chưa có sự kiện
  regions.forEach(r => {
    regionMap.set(r, { region: r, eventsCount: 0, totalXp: 0 });
  });
  
  submissions.forEach(sub => {
    const region = sub.region || 'Unknown';
    if (!regionMap.has(region)) {
      regionMap.set(region, { region, eventsCount: 0, totalXp: 0 });
    }
    regionMap.get(region).eventsCount += 1;
  });
  
  // Ghép các thành viên để tính tổng XP từng khu vực
  const submissionRegionMap = new Map(submissions.map(s => [s.id, s.region]));
  members.forEach(m => {
    const subId = m.submission_id;
    const region = submissionRegionMap.get(subId) || 'Unknown';
    const xp = parseInt(m.xp) || 0;
    
    if (!regionMap.has(region)) {
      regionMap.set(region, { region, eventsCount: 0, totalXp: 0 });
    }
    regionMap.get(region).totalXp += xp;
  });
  
  const regionStats = Array.from(regionMap.values());
  
  return {
    submissionsCount,
    totalXp,
    activeModsCount,
    leaderboard,
    regionStats
  };
}

export async function GET(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const sheetsUrl = process.env.NEXT_PUBLIC_SHEETS_API_URL;
  const isMock = !sheetsUrl || sheetsUrl.trim() === '';
  
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  
  // 1. CHẾ ĐỘ GOOGLE SHEETS
  if (!isMock) {
    try {
      if (id) {
        // Lấy chi tiết sự kiện
        const response = await fetch(`${sheetsUrl}?action=get_detail&id=${id}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'error') {
          return NextResponse.json({ status: 'error', message: `Google Sheets API Error: ${result.message}` }, { status: 400 });
        }
        const normalizedResult = normalizeKeys(result);
        return NextResponse.json({ ...normalizedResult, isMock: false });
      } else if (type === 'dashboard') {
        // Lấy đồng thời cả submissions và members để tự động tính toán dashboard
        const [subRes, memRes] = await Promise.all([
          fetch(`${sheetsUrl}?action=get_all`, { cache: 'no-store' }),
          fetch(`${sheetsUrl}?action=get_members`, { cache: 'no-store' })
        ]);
        
        if (!subRes.ok || !memRes.ok) {
          throw new Error(`Failed to fetch dashboard components. Submissions HTTP: ${subRes.status}, Members HTTP: ${memRes.status}`);
        }
        
        const subData = await subRes.json();
        const memData = await memRes.json();
        
        if (subData.status === 'success' && memData.status === 'success') {
          const normSubData = normalizeKeys(subData.data || []);
          const normMemData = normalizeKeys(memData.data || []);
          const stats = calculateDashboard(normSubData, normMemData);
          return NextResponse.json({ status: 'success', data: stats, isMock: false });
        } else {
          throw new Error(subData.message || memData.message || 'Invalid status returned from Google Sheets');
        }
      } else {
        // Lấy toàn bộ sự kiện
        const response = await fetch(`${sheetsUrl}?action=get_all`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'error') {
          return NextResponse.json({ status: 'error', message: `Google Sheets API Error: ${result.message}` }, { status: 400 });
        }
        const normalizedResult = normalizeKeys(result);
        return NextResponse.json({ ...normalizedResult, isMock: false });
      }
    } catch (error) {
      console.error('Lỗi kết nối tới Google Sheets API:', error);
      return NextResponse.json({ 
        status: 'error', 
        message: `Google Sheets API Error: ${error.message || 'Connection failed'}. Please verify your Web App URL, Google Sheets configuration, and deployment permissions.` 
      }, { status: 502 });
    }
  }
  
  // 2. CHẾ ĐỘ MOCK DATA DỰ PHÒNG
  const db = await readMockDb();
  
  if (id) {
    const submission = db.submissions.find(s => String(s.id) === String(id));
    if (!submission) {
      return NextResponse.json({ status: 'error', message: 'Không tìm thấy sự kiện', isMock: true }, { status: 404 });
    }
    const members = db.members.filter(m => String(m.submission_id) === String(id));
    const history = db.editHistory ? db.editHistory.filter(h => String(h.submission_id) === String(id)) : [];
    return NextResponse.json({ status: 'success', submission, members, history, isMock: true });
  } else if (type === 'dashboard') {
    const stats = calculateDashboard(db.submissions, db.members);
    return NextResponse.json({ status: 'success', data: stats, isMock: true });
  } else {
    return NextResponse.json({ status: 'success', data: db.submissions, isMock: true });
  }
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const sheetsUrl = process.env.NEXT_PUBLIC_SHEETS_API_URL;
  const isMock = !sheetsUrl || sheetsUrl.trim() === '';
  
  try {
    const payload = await request.json();
    const { id } = payload;
    
    // Use the submitter name typed by the user, fallback to Google profile name if empty
    payload.submitter = payload.submitter || session.name || 'Anonymous';
    const submitterEmail = session.email;
    
    if (id) {
      // EDIT MODE
      // 1. Fetch current submission to verify ownership and paid status
      let existingSubmission;
      if (!isMock) {
        try {
          const response = await fetch(`${sheetsUrl}?action=get_detail&id=${id}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
          });
          if (!response.ok) throw new Error(`Google Sheets fetch failed with status: ${response.status}`);
          const result = await response.json();
          if (result.status === 'success') {
            existingSubmission = result.submission;
          }
        } catch (e) {
          console.error('Error fetching details for verification:', e);
          return NextResponse.json({ status: 'error', message: 'Failed to verify submission state' }, { status: 502 });
        }
      } else {
        const db = await readMockDb();
        existingSubmission = db.submissions.find(s => String(s.id) === String(id));
      }

      if (!existingSubmission) {
        return NextResponse.json({ status: 'error', message: 'Event not found' }, { status: 404 });
      }

      // 2. Validate ownership: email must match the creator's email
      const existingEmail = existingSubmission.submitterEmail || existingSubmission.submitteremail || '';
      if (existingEmail.toLowerCase().trim() !== session.email.toLowerCase().trim()) {
        return NextResponse.json({ status: 'error', message: 'Forbidden: You can only edit your own submissions' }, { status: 403 });
      }

      // 3. Validate paid status: already paid reports cannot be edited
      const isPaid = existingSubmission.paid === true || String(existingSubmission.paid).toLowerCase() === 'true';
      if (isPaid) {
        return NextResponse.json({ status: 'error', message: 'Forbidden: Already paid reports cannot be edited' }, { status: 403 });
      }

      // 4. Update data
      if (!isMock) {
        try {
          const response = await fetch(sheetsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_submission', submitterEmail, ...payload })
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const result = await response.json();
          if (result.status === 'error') {
            return NextResponse.json({ status: 'error', message: `Google Sheets API Error: ${result.message}` }, { status: 400 });
          }
          return NextResponse.json({ ...result, isMock: false });
        } catch (error) {
          console.error('Lỗi kết nối Google Sheets khi update:', error);
          return NextResponse.json({ 
            status: 'error', 
            message: `Google Sheets API Error: Failed to update report. ${error.message || 'Connection failed'}.` 
          }, { status: 502 });
        }
      } else {
        const db = await readMockDb();
        const subIdx = db.submissions.findIndex(s => String(s.id) === String(id));
        if (subIdx !== -1) {
          const currentSub = db.submissions[subIdx];
          const changes = [];
          if (currentSub.submitter !== payload.submitter) changes.push(`Submitter (${currentSub.submitter} -> ${payload.submitter})`);
          if (currentSub.region !== payload.region) changes.push(`Region (${currentSub.region} -> ${payload.region})`);
          if (currentSub.title !== payload.title) changes.push(`Title (${currentSub.title} -> ${payload.title})`);
          if (currentSub.time !== payload.time) changes.push(`Time (${currentSub.time} -> ${payload.time})`);
          if (currentSub.participantCount !== parseInt(payload.participantCount)) changes.push(`Participants (${currentSub.participantCount} -> ${payload.participantCount})`);
          if (currentSub.proofUrl !== payload.proofUrl) changes.push(`Proof URL`);

          db.submissions[subIdx] = {
            ...db.submissions[subIdx],
            submitter: payload.submitter,
            region: payload.region,
            title: payload.title,
            time: payload.time,
            memberCount: payload.members ? payload.members.length : 0,
            participantCount: parseInt(payload.participantCount) || 0,
            proofUrl: payload.proofUrl || ''
          };

          if (!db.editHistory) {
            db.editHistory = [];
          }
          const logDetails = changes.length > 0 ? `Modified: ${changes.join(', ')}` : 'Updated member list rewards';
          db.editHistory.push({
            id: 'LOG_' + Date.now(),
            submission_id: id,
            timestamp: new Date().toISOString(),
            editor_email: session.email,
            editor_name: session.name || 'Anonymous',
            details: logDetails
          });
        }
        
        db.members = db.members.filter(m => String(m.submission_id) !== String(id));
        if (payload.members && Array.isArray(payload.members)) {
          payload.members.forEach(m => {
            db.members.push({
              submission_id: id,
              discord_username: m.discord_username || 'unknown_user',
              xp: parseInt(m.xp) || 0,
              itlg: parseInt(m.itlg) || 0,
              noted: m.noted || ''
            });
          });
        }
        
        await writeMockDb(db);
        return NextResponse.json({ status: 'success', id, isMock: true });
      }
    }

    // 1. CHẾ ĐỘ GOOGLE SHEETS (CREATE MODE)
    if (!isMock) {
      try {
        const response = await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit', submitterEmail, ...payload })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'error') {
          return NextResponse.json({ status: 'error', message: `Google Sheets API Error: ${result.message}` }, { status: 400 });
        }
        return NextResponse.json({ ...result, isMock: false });
      } catch (error) {
        console.error('Lỗi kết nối Google Sheets khi POST:', error);
        return NextResponse.json({ 
          status: 'error', 
          message: `Google Sheets API Error: Failed to submit report. ${error.message || 'Connection failed'}. Please check your Google Sheets connection and deployment.` 
        }, { status: 502 });
      }
    }
    
    // 2. CHẾ ĐỘ MOCK DATA DỰ PHÒNG
    const db = await readMockDb();
    
    const newId = 'EVT_' + Date.now();
    const timestamp = new Date().toISOString();
    const { submitter, region, title, time, participantCount, proofUrl, members } = payload;
    
    // Tạo record Submission mới
    const newSubmission = {
      id: newId,
      timestamp,
      submitter: submitter || 'Anonymous',
      submitterEmail,
      region: region || 'Unknown',
      title: title || 'Untitled Event',
      time: time || new Date().toISOString().slice(0, 16).replace('T', ' '),
      memberCount: members ? members.length : 0,
      participantCount: parseInt(participantCount) || 0,
      proofUrl: proofUrl || '',
      paid: false
    };
    
    db.submissions.unshift(newSubmission); // Thêm vào đầu danh sách
    
    // Tạo các record Members mới
    if (members && Array.isArray(members)) {
      members.forEach(m => {
        db.members.push({
          submission_id: newId,
          discord_username: m.discord_username || 'unknown_user',
          xp: parseInt(m.xp) || 0,
          itlg: parseInt(m.itlg) || 0,
          noted: m.noted || ''
        });
      });
    }
    
    const success = await writeMockDb(db);
    
    if (success) {
      return NextResponse.json({ status: 'success', id: newId, isMock: true });
    } else {
      return NextResponse.json({ 
        status: 'success', 
        id: newId, 
        isMock: true, 
        warning: 'Saved locally in memory, but could not write file due to serverless read-only filesystem limits. Please configure Google Sheets.'
      });
    }
    
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.toString() }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const sheetsUrl = process.env.NEXT_PUBLIC_SHEETS_API_URL;
  const isMock = !sheetsUrl || sheetsUrl.trim() === '';
  
  try {
    const payload = await request.json();
    const { id, paid } = payload;
    
    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Missing submission ID' }, { status: 400 });
    }
    
    // 1. GOOGLE SHEETS MODE
    if (!isMock) {
      try {
        const response = await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_paid', id, paid })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'error') {
          return NextResponse.json({ status: 'error', message: `Google Sheets API Error: ${result.message}` }, { status: 400 });
        }
        return NextResponse.json(result);
      } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái trả thưởng trên Google Sheets:', error);
        return NextResponse.json({ 
          status: 'error', 
          message: `Google Sheets API Error: Failed to update payment status. ${error.message || 'Connection failed'}.` 
        }, { status: 502 });
      }
    }
    
    // 2. MOCK DATA MODE
    const db = await readMockDb();
    const submission = db.submissions.find(s => String(s.id) === String(id));
    if (!submission) {
      return NextResponse.json({ status: 'error', message: 'Submission not found' }, { status: 404 });
    }
    
    submission.paid = paid;
    await writeMockDb(db);
    
    return NextResponse.json({ status: 'success', id, paid });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.toString() }, { status: 500 });
  }
}

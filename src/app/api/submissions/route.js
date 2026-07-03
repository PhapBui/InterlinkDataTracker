import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { regions } from '../../regions';

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
  
  // Tính toán bảng xếp hạng (Leaderboard)
  const memberMap = new Map();
  members.forEach(m => {
    const username = m.discord_username;
    const xp = parseInt(m.xp) || 0;
    const itlgQty = parseInt(m.itlg) || 0;
    
    if (!memberMap.has(username)) {
      memberMap.set(username, {
        username,
        xp: 0,
        eventsCount: 0,
        leaderCount: 0
      });
    }
    const current = memberMap.get(username);
    current.xp += xp;
    current.eventsCount += 1;
    current.leaderCount += itlgQty;
  });
  
  const leaderboard = Array.from(memberMap.values())
    .sort((a, b) => b.xp - a.xp); // Sắp xếp giảm dần theo XP
  
  const activeModsCount = leaderboard.length;
  
  // Tính toán thống kê theo khu vực (Region)
  const regionMap = new Map();
  // Khởi tạo các khu vực mặc định để đảm bảo chúng xuất hiện dù chưa có sự kiện
  regions.forEach(r => {
    regionMap.set(r, { region: r, eventsCount: 0, totalXp: 0 });
  });
  
  submissions.forEach(sub => {
    const region = sub.region || 'Khác';
    if (!regionMap.has(region)) {
      regionMap.set(region, { region, eventsCount: 0, totalXp: 0 });
    }
    regionMap.get(region).eventsCount += 1;
  });
  
  // Ghép các thành viên để tính tổng XP từng khu vực
  const submissionRegionMap = new Map(submissions.map(s => [s.id, s.region]));
  members.forEach(m => {
    const subId = m.submission_id;
    const region = submissionRegionMap.get(subId) || 'Khác';
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
    return NextResponse.json({ status: 'success', submission, members, isMock: true });
  } else if (type === 'dashboard') {
    const stats = calculateDashboard(db.submissions, db.members);
    return NextResponse.json({ status: 'success', data: stats, isMock: true });
  } else {
    return NextResponse.json({ status: 'success', data: db.submissions, isMock: true });
  }
}

export async function POST(request) {
  const sheetsUrl = process.env.NEXT_PUBLIC_SHEETS_API_URL;
  const isMock = !sheetsUrl || sheetsUrl.trim() === '';
  
  try {
    const payload = await request.json();
    
    // 1. CHẾ ĐỘ GOOGLE SHEETS
    if (!isMock) {
      try {
        const response = await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit', ...payload })
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
    
    const id = 'EVT_' + Date.now();
    const timestamp = new Date().toISOString();
    const { submitter, region, title, time, participantCount, proofUrl, members } = payload;
    
    // Tạo record Submission mới
    const newSubmission = {
      id,
      timestamp,
      submitter: submitter || 'Ẩn danh',
      region: region || 'Không rõ',
      title: title || 'Sự kiện không tiêu đề',
      time: time || new Date().toISOString().slice(0, 16).replace('T', ' '),
      memberCount: members ? members.length : 0,
      participantCount: parseInt(participantCount) || 0,
      proofUrl: proofUrl || ''
    };
    
    db.submissions.unshift(newSubmission); // Thêm vào đầu danh sách
    
    // Tạo các record Members mới
    if (members && Array.isArray(members)) {
      members.forEach(m => {
        db.members.push({
          submission_id: id,
          discord_username: m.discord_username || 'unknown_user',
          xp: parseInt(m.xp) || 0,
          itlg: parseInt(m.itlg) || 0,
          noted: m.noted || ''
        });
      });
    }
    
    const success = await writeMockDb(db);
    
    if (success) {
      return NextResponse.json({ status: 'success', id, isMock: true });
    } else {
      return NextResponse.json({ 
        status: 'success', 
        id, 
        isMock: true, 
        warning: 'Ghi cục bộ thành công vào bộ nhớ tạm thời, nhưng không thể lưu file do giới hạn quyền của Vercel Serverless. Vui lòng cấu hình Google Sheets.'
      });
    }
    
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.toString() }, { status: 500 });
  }
}

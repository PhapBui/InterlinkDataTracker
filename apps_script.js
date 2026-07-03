/**
 * GOOGLE APPS SCRIPT FOR GOOGLE SHEETS DATABASE
 * 
 * Hướng dẫn thiết lập:
 * 1. Mở file Google Sheet của bạn.
 * 2. Chọn Extensions (Tiện ích mở rộng) -> Apps Script.
 * 3. Xóa mọi mã có sẵn và dán đoạn mã này vào.
 * 4. Nhấn nút Save (Lưu - biểu tượng đĩa mềm).
 * 5. Nhấn nút Deploy (Triển khai) -> New deployment (Triển khai mới).
 * 6. Chọn loại triển khai: Web app (Ứng dụng web).
 * 7. Cấu hình:
 *    - Description: Event Tracker API
 *    - Execute as (Chạy dưới dạng): Me (Tôi - địa chỉ email của bạn)
 *    - Who has access (Ai có quyền truy cập): Anyone (Mọi người)
 * 8. Nhấn Deploy, cấp quyền nếu được yêu cầu.
 * 9. Copy URL nhận được (URL ứng dụng web) và dán vào biến NEXT_PUBLIC_SHEETS_API_URL trong file .env.local
 */

// Đảm bảo tiêu đề cột luôn chính xác và không bị thiếu cột quan trọng
function ensureHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var submissionsSheet = ss.getSheetByName("Submissions") || ss.insertSheet("Submissions");
  var membersSheet = ss.getSheetByName("Members") || ss.insertSheet("Members");
  
  // 1. Kiểm tra bảng Submissions
  if (submissionsSheet.getLastRow() === 0) {
    submissionsSheet.appendRow(["id", "timestamp", "submitter", "region", "title", "time", "memberCount", "participantCount", "proofUrl"]);
  } else {
    var lastCol = submissionsSheet.getLastColumn();
    var headers = submissionsSheet.getRange(1, 1, 1, Math.max(1, lastCol)).getValues()[0];
    
    // Kiểm tra participantCount
    var hasParticipantCount = false;
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === "participantCount") {
        hasParticipantCount = true;
        break;
      }
    }
    if (!hasParticipantCount) {
      submissionsSheet.getRange(1, lastCol + 1).setValue("participantCount");
      lastCol = submissionsSheet.getLastColumn(); // Cập nhật lại số cột cuối
    }
    
    // Kiểm tra proofUrl
    var hasProofUrl = false;
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === "proofUrl") {
        hasProofUrl = true;
        break;
      }
    }
    if (!hasProofUrl) {
      submissionsSheet.getRange(1, lastCol + 1).setValue("proofUrl");
    }
  }
  
  // 2. Kiểm tra bảng Members
  if (membersSheet.getLastRow() === 0) {
    membersSheet.appendRow(["submission_id", "discord_username", "xp", "itlg", "noted"]);
  }
}

function doGet(e) {
  ensureHeaders();
  
  var action = e.parameter.action || "get_all";
  var id = e.parameter.id;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var submissionsSheet = ss.getSheetByName("Submissions");
  var membersSheet = ss.getSheetByName("Members");
  
  if (!submissionsSheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "get_all") {
    var rows = submissionsSheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = rows[0];
    var data = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      data.push(item);
    }
    
    // Đảo ngược để sự kiện mới nhất hiển thị đầu tiên
    data.reverse(); 
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } else if (action === "get_members") {
    if (!membersSheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var rows = membersSheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var headers = rows[0];
    var data = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      data.push(item);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } else if (action === "get_detail" && id) {
    var subRows = submissionsSheet.getDataRange().getValues();
    var subHeaders = subRows[0];
    var subData = null;
    
    for (var i = 1; i < subRows.length; i++) {
      if (String(subRows[i][0]) === String(id)) {
        subData = {};
        for (var j = 0; j < subHeaders.length; j++) {
          subData[subHeaders[j]] = subRows[i][j];
        }
        break;
      }
    }
    
    if (!subData) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy sự kiện này." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var memberData = [];
    if (membersSheet) {
      var memRows = membersSheet.getDataRange().getValues();
      var memHeaders = memRows[0];
      for (var i = 1; i < memRows.length; i++) {
        if (String(memRows[i][0]) === String(id)) {
          var member = {};
          for (var j = 0; j < memHeaders.length; j++) {
            member[memHeaders[j]] = memRows[i][j];
          }
          memberData.push(member);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      submission: subData, 
      members: memberData 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Hành động không hợp lệ." }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  ensureHeaders();
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var submissionsSheet = ss.getSheetByName("Submissions");
  var membersSheet = ss.getSheetByName("Members");
  
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    if (action === "submit") {
      var id = "EVT_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
      var timestamp = new Date().toISOString();
      var submitter = payload.submitter;
      var region = payload.region;
      var title = payload.title;
      var time = payload.time;
      var participantCount = Number(payload.participantCount) || 0;
      var proofUrl = payload.proofUrl || "";
      var members = payload.members || [];
      
      submissionsSheet.appendRow([id, timestamp, submitter, region, title, time, members.length, participantCount, proofUrl]);
      
      for (var i = 0; i < members.length; i++) {
        var m = members[i];
        membersSheet.appendRow([
          id, 
          m.discord_username, 
          m.xp, 
          Number(m.itlg) || 0, 
          m.noted || ""
        ]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", id: id }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Dữ liệu không hợp lệ." }))
    .setMimeType(ContentService.MimeType.JSON);
}

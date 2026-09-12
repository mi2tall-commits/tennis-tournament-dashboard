/**
 * ==============================================================================
 * 🎾 테니스 동호회 실시간 대회 전광판 Google Apps Script (GAS) 백엔드 API
 * (Tennis Club Live Tournament Dashboard GAS Backend API)
 * ==============================================================================
 * 
 * [배포 방법 / How to Deploy]:
 * 1. Google Drive에서 새 'Google 스프레드시트(Google Sheets)'를 하나 생성합니다.
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 이 스크립트 내용 전체를 붙여넣습니다.
 * 4. 상단 [배포(Deploy)] > [새 배포(New deployment)]를 클릭합니다.
 * 5. 유형 선택(톱니바퀴) > [웹 앱(Web app)] 선택:
 *    - 설명(Description): 테니스 전광판 클라우드 API v1
 *    - 다음 사용자 권한으로 실행(Execute as): 나(My account)
 *    - 액세스 권한이 있는 사용자(Who has access): 모든 사용자(Anyone) ★필수★
 * 6. [배포] 버튼 클릭 후 생성된 웹 앱 URL(Web App URL)을 복사하여
 *    테니스 전광판 웹앱의 [클라우드 설정]에 입력하면 즉시 실시간 동기화가 활성화됩니다!
 */

// 시트 탭 이름 상수
const SHEET_TOURNAMENT = "TOURNAMENT_DATA";
const SHEET_MEMBERS = "MEMBERS_DATA";
const SHEET_LOGS = "MATCH_LOGS";

/**
 * 초기 시트 설정 확인 및 생성
 */
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === SHEET_LOGS) {
      sheet.appendRow(["타임스탬프", "대회ID", "코트", "팀A", "팀B", "스코어A", "스코어B", "상태", "수정자IP/식별"]);
    }
  }
  return sheet;
}

/**
 * HTTP GET 핸들러 (데이터 조회)
 * - ?action=ping : 헬스체크
 * - ?action=get_tournament : 최신 대회 데이터 반환
 * - ?action=get_members : 최신 회원 명단 반환
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || "get_tournament";

  try {
    if (action === "ping") {
      return jsonResponse({
        status: "ok",
        message: "Tennis Tournament GAS Backend is online!",
        timestamp: new Date().toISOString()
      });
    }

    if (action === "get_tournament") {
      const sheet = getOrCreateSheet(SHEET_TOURNAMENT);
      const val = sheet.getRange("A1").getValue();
      let data = null;
      if (val && typeof val === "string" && val.trim().startsWith("{")) {
        data = JSON.parse(val);
      }
      return jsonResponse({
        status: "ok",
        action: "get_tournament",
        data: data,
        updatedAt: sheet.getRange("B1").getValue() || null
      });
    }

    if (action === "get_members") {
      const sheet = getOrCreateSheet(SHEET_MEMBERS);
      const val = sheet.getRange("A1").getValue();
      let data = null;
      if (val && typeof val === "string" && val.trim().startsWith("[")) {
        data = JSON.parse(val);
      }
      return jsonResponse({
        status: "ok",
        action: "get_members",
        data: data,
        updatedAt: sheet.getRange("B1").getValue() || null
      });
    }

    return jsonResponse({
      status: "error",
      message: "Unknown action: " + action
    }, 400);

  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    }, 500);
  }
}

/**
 * HTTP POST 핸들러 (데이터 저장 및 업데이트)
 * - action=save_tournament : 전체 대회 데이터 저장
 * - action=update_match : 특정 단일 경기 스코어 업데이트 및 로그 기록
 * - action=save_members : 회원 명단 저장
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15초 동시성 락 대기

    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || "save_tournament";
    const nowStr = new Date().toISOString();

    if (action === "save_tournament") {
      const tournamentData = payload.data || payload.tournament;
      if (!tournamentData) {
        return jsonResponse({ status: "error", message: "Missing tournament data" }, 400);
      }

      const sheet = getOrCreateSheet(SHEET_TOURNAMENT);
      const jsonStr = typeof tournamentData === "string" ? tournamentData : JSON.stringify(tournamentData);
      
      sheet.getRange("A1").setValue(jsonStr);
      sheet.getRange("B1").setValue(nowStr);

      return jsonResponse({
        status: "ok",
        action: "save_tournament",
        message: "Tournament data saved successfully to Google Sheets.",
        savedAt: nowStr
      });
    }

    if (action === "update_match") {
      const matchUpdate = payload.match;
      if (!matchUpdate || !matchUpdate.id) {
        return jsonResponse({ status: "error", message: "Missing match object or match.id" }, 400);
      }

      const sheet = getOrCreateSheet(SHEET_TOURNAMENT);
      const val = sheet.getRange("A1").getValue();
      if (!val) {
        return jsonResponse({ status: "error", message: "No active tournament found in cloud" }, 404);
      }

      const tourney = JSON.parse(val);
      let found = false;

      if (Array.isArray(tourney.matches)) {
        for (let i = 0; i < tourney.matches.length; i++) {
          if (tourney.matches[i].id === matchUpdate.id) {
            tourney.matches[i] = Object.assign({}, tourney.matches[i], matchUpdate);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        return jsonResponse({ status: "error", message: "Match ID not found in active tournament" }, 404);
      }

      sheet.getRange("A1").setValue(JSON.stringify(tourney));
      sheet.getRange("B1").setValue(nowStr);

      // 경기 로그 기록
      try {
        const logSheet = getOrCreateSheet(SHEET_LOGS);
        logSheet.appendRow([
          nowStr,
          tourney.id || "",
          matchUpdate.court || "",
          (matchUpdate.teamA || []).join(", "),
          (matchUpdate.teamB || []).join(", "),
          matchUpdate.scoreA !== undefined ? matchUpdate.scoreA : "",
          matchUpdate.scoreB !== undefined ? matchUpdate.scoreB : "",
          matchUpdate.status || "",
          payload.clientIp || "web-client"
        ]);
      } catch (logErr) {
        console.warn("Log write error:", logErr);
      }

      return jsonResponse({
        status: "ok",
        action: "update_match",
        message: "Match updated and synced to cloud.",
        savedAt: nowStr
      });
    }

    if (action === "save_members") {
      const membersData = payload.data || payload.members;
      if (!membersData) {
        return jsonResponse({ status: "error", message: "Missing members data" }, 400);
      }

      const sheet = getOrCreateSheet(SHEET_MEMBERS);
      const jsonStr = typeof membersData === "string" ? membersData : JSON.stringify(membersData);
      sheet.getRange("A1").setValue(jsonStr);
      sheet.getRange("B1").setValue(nowStr);

      return jsonResponse({
        status: "ok",
        action: "save_members",
        message: "Members list saved successfully to Google Sheets.",
        savedAt: nowStr
      });
    }

    return jsonResponse({
      status: "error",
      message: "Unsupported action: " + action
    }, 400);

  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    }, 500);
  } finally {
    try {
      lock.releaseLock();
    } catch(e) {}
  }
}

/**
 * JSON 응답 유틸리티
 */
function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

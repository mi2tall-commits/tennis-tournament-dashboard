/**
 * ⚙️ 대진표 관리 엔진 (Matchmaker Engine)
 * 1) 경기 시작시간 & 슬롯 자동 생성기 (코트 x 시간 그리드 구성용)
 * 2) 경기이사가 코트/시간 빈 칸을 직접 클릭해 입력하는 수동 매치 생성
 */

class MatchmakerEngine {
  constructor(memberManager) {
    this.memberManager = memberManager;
  }

  /**
   * 경기 시작 시간과 게임 소요 시간(분)을 기반으로 타임슬롯 자동 생성
   */
  generateTimeSlots(startTime = "08:00", durationMinutes = 40, slotCount = 5) {
    const slots = [];
    const [startH, startM] = startTime.split(":").map(Number);
    let currentTotalMinutes = (startH * 60) + startM;

    for (let i = 0; i < slotCount; i++) {
      const slotStartH = Math.floor(currentTotalMinutes / 60) % 24;
      const slotStartM = currentTotalMinutes % 60;
      const endTotalMinutes = currentTotalMinutes + durationMinutes;
      const slotEndH = Math.floor(endTotalMinutes / 60) % 24;
      const slotEndM = endTotalMinutes % 60;

      const formatTime = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      slots.push({
        start: formatTime(slotStartH, slotStartM),
        end: formatTime(slotEndH, slotEndM)
      });

      currentTotalMinutes = endTotalMinutes;
    }

    return slots;
  }

  createManualMatch(params) {
    return {
      id: "m_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      court: params.court || "15번",
      matchNo: parseInt(params.matchNo) || 1,
      timeSlotIndex: parseInt(params.timeSlotIndex) || 0,
      teamA: params.teamA || [],
      teamB: params.teamB || [],
      scoreA: params.scoreA !== undefined && params.scoreA !== "" && params.scoreA !== null ? parseInt(params.scoreA) : null,
      scoreB: params.scoreB !== undefined && params.scoreB !== "" && params.scoreB !== null ? parseInt(params.scoreB) : null,
      tieBreak: params.tieBreak || null,
      status: params.status || "waiting",
      matchType: params.matchType || "regular_individual"
    };
  }
}

window.MatchmakerEngine = MatchmakerEngine;

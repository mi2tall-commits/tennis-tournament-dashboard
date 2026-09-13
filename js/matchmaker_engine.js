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

  /**
   * ⚡ 1차 초안 자동 균형 추천 생성기
   * - 불참자를 제외한 실제 출전 선수를 대상으로 경기 수가 적은 선수를 우선 배정
   * - 4인 복식 편성 시 (1등+4등 vs 2등+3등) 레벨 밸런스를 맞춰 공평한 승부 유도
   */
  generateBalancedDraft({ courts = ["15번", "16번", "17번", "18번"], timeSlots = [], members = [], preserveExisting = true, currentMatches = [] }) {
    const attendees = members.filter(m => m.group !== "미참석" && m.status !== "inactive");
    const pool = attendees.length >= 4 ? attendees : members.filter(m => m.status !== "inactive");
    if (pool.length < 4) return currentMatches;

    const matches = [];
    const playCounts = new Map();
    pool.forEach(m => playCounts.set(m.name, 0));

    // 기존 매치 중 보존할 매치 반영
    let matchCounter = 1;
    const existingMap = new Map();
    if (preserveExisting && Array.isArray(currentMatches)) {
      currentMatches.forEach(m => {
        const key = `${m.court}_${m.timeSlotIndex}`;
        existingMap.set(key, m);
        (m.teamA || []).forEach(name => playCounts.set(name, (playCounts.get(name) || 0) + 1));
        (m.teamB || []).forEach(name => playCounts.set(name, (playCounts.get(name) || 0) + 1));
        if (m.matchNo >= matchCounter) matchCounter = m.matchNo + 1;
      });
    }

    // 각 시간대(Slot)별 코트 순회 배정
    timeSlots.forEach((slot, tIdx) => {
      const assignedInThisSlot = new Set();

      // 이미 존재하는 매치에 등록된 선수 먼저 해당 시간대 중복 방지 Set에 추가
      courts.forEach(courtName => {
        const key = `${courtName}_${tIdx}`;
        const exist = existingMap.get(key);
        if (exist && (exist.teamA?.length || exist.teamB?.length)) {
          (exist.teamA || []).forEach(n => assignedInThisSlot.add(n));
          (exist.teamB || []).forEach(n => assignedInThisSlot.add(n));
          matches.push(exist);
        }
      });

      // 비어 있는 코트에 신규 배정
      courts.forEach(courtName => {
        const key = `${courtName}_${tIdx}`;
        if (existingMap.has(key) && (existingMap.get(key).teamA?.length || existingMap.get(key).teamB?.length)) {
          return; // 이미 배정됨
        }

        // 이번 슬롯에 아직 배정되지 않은 후보군 추출
        const available = pool.filter(m => !assignedInThisSlot.has(m.name));
        if (available.length < 4) {
          // 인원 부족 시 빈 슬롯 생성
          matches.push(this.createManualMatch({
            court: courtName,
            matchNo: matchCounter++,
            timeSlotIndex: tIdx,
            teamA: [],
            teamB: []
          }));
          return;
        }

        // 출전 횟수가 적은 선수 우선 정렬 (동률 시 약간의 랜덤 셔플)
        available.sort((a, b) => {
          const countA = playCounts.get(a.name) || 0;
          const countB = playCounts.get(b.name) || 0;
          if (countA !== countB) return countA - countB;
          return 0.5 - Math.random();
        });

        // 4명 선발
        const selected = available.slice(0, 4);
        selected.forEach(m => assignedInThisSlot.add(m.name));

        // 레벨 정렬 (U1~U3) -> (1등+4등) vs (2등+3등) 밸런스 페어링
        const getLvlNum = (lvl) => {
          if (lvl === "U1" || lvl === 1) return 1;
          if (lvl === "U2" || lvl === 2) return 2;
          return 3; // U3 or default
        };
        selected.sort((a, b) => getLvlNum(a.clubLevel) - getLvlNum(b.clubLevel));
        const teamA = [selected[0].name, selected[3].name];
        const teamB = [selected[1].name, selected[2].name];

        teamA.forEach(name => playCounts.set(name, (playCounts.get(name) || 0) + 1));
        teamB.forEach(name => playCounts.set(name, (playCounts.get(name) || 0) + 1));

        matches.push(this.createManualMatch({
          court: courtName,
          matchNo: matchCounter++,
          timeSlotIndex: tIdx,
          teamA,
          teamB,
          status: "waiting"
        }));
      });
    });

    return matches;
  }

  /**
   * 동일 시간대 코트 간 중복 출전 선수 검출기
   */
  checkTimeSlotCollisions(matches = []) {
    const slotMap = new Map(); // slotIndex -> Map(playerName -> [courtNames])
    const collisions = [];

    matches.forEach(m => {
      const tIdx = m.timeSlotIndex;
      if (!slotMap.has(tIdx)) slotMap.set(tIdx, new Map());
      const playerMap = slotMap.get(tIdx);

      const allPlayers = [...(m.teamA || []), ...(m.teamB || [])].filter(Boolean);
      allPlayers.forEach(p => {
        if (!playerMap.has(p)) playerMap.set(p, []);
        playerMap.get(p).push(m.court);
      });
    });

    slotMap.forEach((playerMap, tIdx) => {
      playerMap.forEach((courts, playerName) => {
        if (courts.length > 1) {
          collisions.push({
            timeSlotIndex: tIdx,
            player: playerName,
            courts: courts
          });
        }
      });
    });

    return collisions;
  }
}

window.MatchmakerEngine = MatchmakerEngine;


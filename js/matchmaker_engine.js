/**
 * ⚙️ 4대 대진표 생성 & 스케줄링 엔진 (Matchmaker Engine)
 * 1) 경기 시작시간 & 40분 슬롯 자동 생성기
 * 2) 코트 개수 및 코트 고유 번호 커스텀 매핑
 * 3) 개인 레벨(NTRP) 밸런스 1차 자동 편성 (드래프트 생성)
 * 4) 이벤트 경기: 조별 조원 랜덤 복식 페어링 엔진
 */

class MatchmakerEngine {
  constructor(memberManager) {
    this.memberManager = memberManager;
  }

  /**
   * 경기 시작 시간과 게임 소요 시간(분)을 기반으로 타임슬롯 자동 생성
   */
  generateTimeSlots(startTime = "10:00", durationMinutes = 40, slotCount = 5) {
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
   * 개인 레벨(NTRP) 밸런스 1차 드래프트 생성기
   */
  generateLevelBalancedMatches(activeMembers, courts, timeSlots) {
    if (activeMembers.length < 4) {
      throw new Error("경기를 구성하려면 최소 4명 이상의 활동 선수가 필요합니다.");
    }

    const matches = [];
    const playerMatchCount = {};
    activeMembers.forEach(m => playerMatchCount[m.name] = 0);

    const pairHistory = new Set();
    let globalMatchNo = 1;

    for (let tIdx = 0; tIdx < timeSlots.length; tIdx++) {
      for (let cIdx = 0; cIdx < courts.length; cIdx++) {
        const sorted = [...activeMembers].sort((a, b) => {
          return (playerMatchCount[a.name] || 0) - (playerMatchCount[b.name] || 0);
        });

        const selected4 = sorted.slice(0, 4);
        if (selected4.length < 4) break;

        const pairings = [
          { teamA: [selected4[0], selected4[1]], teamB: [selected4[2], selected4[3]] },
          { teamA: [selected4[0], selected4[2]], teamB: [selected4[1], selected4[3]] },
          { teamA: [selected4[0], selected4[3]], teamB: [selected4[1], selected4[2]] }
        ];

        let bestPairing = pairings[0];
        let minDiff = 999;

        pairings.forEach(p => {
          const sumA = p.teamA[0].level + p.teamA[1].level;
          const sumB = p.teamB[0].level + p.teamB[1].level;
          const diff = Math.abs(sumA - sumB);
          
          const pairKeyA = [p.teamA[0].name, p.teamA[1].name].sort().join(":");
          const pairKeyB = [p.teamB[0].name, p.teamB[1].name].sort().join(":");
          const penalty = (pairHistory.has(pairKeyA) ? 1.5 : 0) + (pairHistory.has(pairKeyB) ? 1.5 : 0);

          if (diff + penalty < minDiff) {
            minDiff = diff + penalty;
            bestPairing = p;
          }
        });

        bestPairing.teamA.forEach(m => playerMatchCount[m.name] = (playerMatchCount[m.name] || 0) + 1);
        bestPairing.teamB.forEach(m => playerMatchCount[m.name] = (playerMatchCount[m.name] || 0) + 1);
        pairHistory.add([bestPairing.teamA[0].name, bestPairing.teamA[1].name].sort().join(":"));
        pairHistory.add([bestPairing.teamB[0].name, bestPairing.teamB[1].name].sort().join(":"));

        matches.push({
          id: "m_draft_" + Date.now() + "_" + globalMatchNo,
          court: courts[cIdx],
          matchNo: globalMatchNo++,
          timeSlotIndex: tIdx,
          teamA: [bestPairing.teamA[0].name, bestPairing.teamA[1].name],
          teamB: [bestPairing.teamB[0].name, bestPairing.teamB[1].name],
          scoreA: null,
          scoreB: null,
          tieBreak: null,
          status: "waiting",
          matchType: "regular_individual"
        });
      }
    }

    return matches;
  }

  /**
   * 이벤트 경기: 조별 조원 랜덤 복식 페어링 생성기
   * - 조장이 입력/선택한 조원들을 무작위 셔플하여 2인 1조 복식 페어 생성
   */
  generateEventRandomDoubles(memberNames, courts, timeSlots, groupName = "이벤트조") {
    if (!memberNames || memberNames.length < 4) {
      throw new Error("이벤트 복식 경기를 구성하려면 최소 4명 이상의 선수가 필요합니다.");
    }

    // Fisher-Yates 셔플
    const shuffled = [...memberNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const matches = [];
    let globalMatchNo = 1;
    let memberIdx = 0;

    for (let tIdx = 0; tIdx < timeSlots.length; tIdx++) {
      for (let cIdx = 0; cIdx < courts.length; cIdx++) {
        if (memberIdx + 3 >= shuffled.length) {
          // 인원이 순환되도록 리셋
          memberIdx = 0;
        }

        const teamA = [shuffled[memberIdx], shuffled[memberIdx + 1]];
        const teamB = [shuffled[memberIdx + 2], shuffled[memberIdx + 3]];
        memberIdx += 4;

        matches.push({
          id: "m_event_" + Date.now() + "_" + globalMatchNo,
          court: courts[cIdx],
          matchNo: globalMatchNo++,
          timeSlotIndex: tIdx,
          teamA: teamA,
          teamB: teamB,
          groupA: groupName,
          groupB: groupName,
          scoreA: null,
          scoreB: null,
          tieBreak: null,
          status: "waiting",
          matchType: "event"
        });
      }
    }

    return matches;
  }

  /**
   * A~D 4개조 조별 대항전 매치 생성기
   */
  generateGroupMatches(membersByGroup, courts, timeSlots) {
    const matches = [];
    let globalMatchNo = 1;

    const fixtures = [
      { g1: "A조", g2: "B조" },
      { g1: "C조", g2: "D조" },
      { g1: "A조", g2: "C조" },
      { g1: "B조", g2: "D조" },
      { g1: "A조", g2: "D조" },
      { g1: "B조", g2: "C조" }
    ];

    let fixtureIdx = 0;

    for (let tIdx = 0; tIdx < timeSlots.length; tIdx++) {
      for (let cIdx = 0; cIdx < courts.length; cIdx++) {
        if (fixtureIdx >= fixtures.length) break;

        const f = fixtures[fixtureIdx % fixtures.length];
        const g1Members = membersByGroup[f.g1] || [];
        const g2Members = membersByGroup[f.g2] || [];

        const teamA = g1Members.slice(0, 2).map(m => m.name);
        const teamB = g2Members.slice(0, 2).map(m => m.name);

        if (teamA.length < 2) teamA.push(f.g1 + " 선수1", f.g1 + " 선수2");
        if (teamB.length < 2) teamB.push(f.g2 + " 선수1", f.g2 + " 선수2");

        matches.push({
          id: "m_grp_" + globalMatchNo,
          court: courts[cIdx],
          matchNo: globalMatchNo++,
          timeSlotIndex: tIdx,
          teamA: teamA.slice(0, 2),
          teamB: teamB.slice(0, 2),
          groupA: f.g1,
          groupB: f.g2,
          scoreA: null,
          scoreB: null,
          tieBreak: null,
          status: "waiting",
          matchType: "regular_group"
        });

        fixtureIdx++;
      }
    }

    return matches;
  }
}

window.MatchmakerEngine = MatchmakerEngine;
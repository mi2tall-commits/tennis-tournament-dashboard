/**
 * ⚙️ 4대 대진표 생성 엔진 (Matchmaker Engine)
 * 1) 경기이사 수동 지정 모드 (Manual Match Builder)
 * 2) 개인 레벨 밸런스 자동 대진 (NTRP Level-Balanced Algorithm)
 * 3) A~D조 조장 대진 세팅 (Captain Lineup Inter-Group Mode)
 * 4) 개인 리그전 순환 대진 (Rotating Doubles League)
 */

class MatchmakerEngine {
  constructor(memberManager) {
    this.memberManager = memberManager;
  }

  /**
   * 1) 경기이사 수동 지정 경기 생성
   */
  createManualMatch(params) {
    return {
      id: "m_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      court: params.court || "1번",
      matchNo: parseInt(params.matchNo) || 1,
      timeSlotIndex: parseInt(params.timeSlotIndex) || 0,
      teamA: params.teamA || [],
      teamB: params.teamB || [],
      scoreA: params.scoreA !== undefined && params.scoreA !== "" ? parseInt(params.scoreA) : null,
      scoreB: params.scoreB !== undefined && params.scoreB !== "" ? parseInt(params.scoreB) : null,
      tieBreak: params.tieBreak || null,
      status: params.status || "waiting", // waiting, calling, playing, finished, delayed
      matchType: params.matchType || "regular_individual" // regular_individual, regular_group, event
    };
  }

  /**
   * 2) 개인 레벨(NTRP) 밸런스 자동 대진 생성기
   * - 선수들의 NTRP 레벨을 합산하여 양 팀의 격차가 최소화되도록 페어링
   */
  generateLevelBalancedMatches(activeMembers, courts, timeSlots, roundsPerPlayer = 4) {
    if (activeMembers.length < 4) {
      throw new Error("경기를 구성하려면 최소 4명 이상의 활동 선수가 필요합니다.");
    }

    const matches = [];
    const playerMatchCount = {};
    activeMembers.forEach(m => playerMatchCount[m.name] = 0);

    const pairHistory = new Set(); // 중복 파트너 방지
    let globalMatchNo = 1;

    for (let tIdx = 0; tIdx < timeSlots.length; tIdx++) {
      for (let cIdx = 0; cIdx < courts.length; cIdx++) {
        // 출전 횟수가 가장 적은 선수 4명 선별
        const sorted = [...activeMembers].sort((a, b) => {
          return (playerMatchCount[a.name] || 0) - (playerMatchCount[b.name] || 0);
        });

        const selected4 = sorted.slice(0, 4);
        if (selected4.length < 4) break;

        // 4명의 최적 밸런스 페어링 탐색 (3가지 조합 중 레벨 합 차이가 최소인 조합)
        // [0,1 vs 2,3], [0,2 vs 1,3], [0,3 vs 1,2]
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
          
          // 파트너 중복 페널티 가산
          const pairKeyA = [p.teamA[0].name, p.teamA[1].name].sort().join(":");
          const pairKeyB = [p.teamB[0].name, p.teamB[1].name].sort().join(":");
          const penalty = (pairHistory.has(pairKeyA) ? 1.5 : 0) + (pairHistory.has(pairKeyB) ? 1.5 : 0);

          if (diff + penalty < minDiff) {
            minDiff = diff + penalty;
            bestPairing = p;
          }
        });

        // 사용 기록 갱신
        bestPairing.teamA.forEach(m => playerMatchCount[m.name] = (playerMatchCount[m.name] || 0) + 1);
        bestPairing.teamB.forEach(m => playerMatchCount[m.name] = (playerMatchCount[m.name] || 0) + 1);
        pairHistory.add([bestPairing.teamA[0].name, bestPairing.teamA[1].name].sort().join(":"));
        pairHistory.add([bestPairing.teamB[0].name, bestPairing.teamB[1].name].sort().join(":"));

        matches.push({
          id: "m_" + Date.now() + "_" + globalMatchNo,
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
   * 3) A~D 4개조 조별 대항전 매치 생성기
   * - A조 vs B조, C조 vs D조 등 조별 라운드로빈 편성
   */
  generateGroupMatches(membersByGroup, courts, timeSlots) {
    const groups = ["A조", "B조", "C조", "D조"];
    const matches = [];
    let globalMatchNo = 1;

    // 조별 풀리그 대진 페어: A vs B, C vs D, A vs C, B vs D, A vs D, B vs C
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

        // 조원 중 출전 가능한 선수 2명씩 선별
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
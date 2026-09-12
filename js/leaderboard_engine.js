/**
 * 🏆 순위 계산 및 누적 랭킹 엔진 (Leaderboard Engine)
 * - 개인 리그전 순위표 (복식 경기 개인 승점 누적)
 * - 개인 리그전 순위 리셋 지원 (시즌 연간 랭킹과 분리)
 * - ☕ 월별 코트 예약자 커피 쿠폰 순위표 (1위: 3매, 2위: 2매, 3위: 1매)
 * - 연간 시즌 누적 랭킹
 */

class LeaderboardEngine {
  constructor() {
    this.seasonStorageKey = "tennis_season_tournaments_v2";
    this.bookingStorageKey = "tennis_court_bookings_v2";
    this.leagueCumulativeKey = "tennis_league_cumulative_stats_v2";
    this.previousRanks = {};
  }

  /**
   * 🏆 운영진 리셋 전까지 누적되는 리그전 누적 전적 가져오기
   */
  getLeagueCumulativeStats() {
    try {
      const data = localStorage.getItem(this.leagueCumulativeKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch(e) {}
    return {};
  }

  /**
   * 🏆 대회가 공식 종료될 때 리그전 경기 결과를 영구 누적치에 합산 커밋
   */
  commitTournamentToLeague(matches, pointsRule = { win: 3, draw: 1, loss: 0 }) {
    const cumulative = this.getLeagueCumulativeStats();

    (matches || []).forEach(m => {
      if (m.status !== "finished" || m.scoreA === null || m.scoreB === null) return;

      const sA = m.scoreA;
      const sB = m.scoreB;
      const teamA = m.teamA || [];
      const teamB = m.teamB || [];

      teamA.forEach(name => {
        if (!cumulative[name]) {
          cumulative[name] = { name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
        }
        cumulative[name].played++;
        cumulative[name].gamesWon += sA;
        cumulative[name].gamesLost += sB;
        if (sA > sB) { cumulative[name].wins++; cumulative[name].points += pointsRule.win; }
        else if (sA === sB) { cumulative[name].draws++; cumulative[name].points += pointsRule.draw; }
        else { cumulative[name].losses++; cumulative[name].points += pointsRule.loss; }
      });

      teamB.forEach(name => {
        if (!cumulative[name]) {
          cumulative[name] = { name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
        }
        cumulative[name].played++;
        cumulative[name].gamesWon += sB;
        cumulative[name].gamesLost += sA;
        if (sB > sA) { cumulative[name].wins++; cumulative[name].points += pointsRule.win; }
        else if (sA === sB) { cumulative[name].draws++; cumulative[name].points += pointsRule.draw; }
        else { cumulative[name].losses++; cumulative[name].points += pointsRule.loss; }
      });
    });

    Object.values(cumulative).forEach(s => {
      s.diff = (s.gamesWon || 0) - (s.gamesLost || 0);
    });

    try {
      localStorage.setItem(this.leagueCumulativeKey, JSON.stringify(cumulative));
    } catch(e) {}
    return cumulative;
  }

  /**
   * 🔄 운영진이 [순위 리셋]을 실행할 때만 누적 리그전 데이터 완전 초기화
   */
  resetLeagueCumulativeStats() {
    try {
      localStorage.removeItem(this.leagueCumulativeKey);
    } catch(e) {}
    this.previousRanks = {};
  }

  /**
   * 🏆 개인 리그전 누적 순위표 산출
   * - isCurrentLeague = true: 현재 진행 중인 대회의 실시간 스코어도 합산
   * - isCommitted = true: 이미 대회가 종료되어 누적 데이터에 반영 완료된 상태 (중복 합산 방지)
   * - isCurrentLeague = false: 친선/이벤트전이므로 현재 경기는 제외하고 과거 누적치만 표출
   */
  calculateIndividualLeaderboard(matches, players, isCurrentLeague = true, isCommitted = false, pointsRule = { win: 3, draw: 1, loss: 0 }) {
    const stats = {};
    const cumulative = this.getLeagueCumulativeStats();

    // 1. 모든 활동 회원에 대해 과거 누적 기록 기본 세팅
    players.forEach(p => {
      const past = cumulative[p.name] || {};
      stats[p.name] = {
        name: p.name,
        played: past.played || 0,
        wins: past.wins || 0,
        draws: past.draws || 0,
        losses: past.losses || 0,
        points: past.points || 0,
        gamesWon: past.gamesWon || 0,
        gamesLost: past.gamesLost || 0,
        diff: past.diff || 0
      };
    });

    // 1-1. 누적 데이터에 존재하는 모든 선수(게스트 및 이전 참가자 포함) 기본 세팅
    Object.keys(cumulative).forEach(name => {
      if (!stats[name]) {
        const past = cumulative[name];
        stats[name] = {
          name: name,
          played: past.played || 0,
          wins: past.wins || 0,
          draws: past.draws || 0,
          losses: past.losses || 0,
          points: past.points || 0,
          gamesWon: past.gamesWon || 0,
          gamesLost: past.gamesLost || 0,
          diff: past.diff || 0
        };
      }
    });

    // 2. 현재 대회가 리그전 반영 대회이고, 아직 영구 누적치에 합산되지 않은 경우에만 실시간 진행 경기 점수 합산
    if (isCurrentLeague && !isCommitted) {
      (matches || []).forEach(m => {
        if (m.status !== "finished" || m.scoreA === null || m.scoreB === null) return;

        const sA = m.scoreA;
        const sB = m.scoreB;
        const teamA = m.teamA || [];
        const teamB = m.teamB || [];

        teamA.forEach(name => {
          if (!stats[name]) {
            stats[name] = { name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
          }
          stats[name].played++;
          stats[name].gamesWon += sA;
          stats[name].gamesLost += sB;
          if (sA > sB) { stats[name].wins++; stats[name].points += pointsRule.win; }
          else if (sA === sB) { stats[name].draws++; stats[name].points += pointsRule.draw; }
          else { stats[name].losses++; stats[name].points += pointsRule.loss; }
        });

        teamB.forEach(name => {
          if (!stats[name]) {
            stats[name] = { name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
          }
          stats[name].played++;
          stats[name].gamesWon += sB;
          stats[name].gamesLost += sA;
          if (sB > sA) { stats[name].wins++; stats[name].points += pointsRule.win; }
          else if (sA === sB) { stats[name].draws++; stats[name].points += pointsRule.draw; }
          else { stats[name].losses++; stats[name].points += pointsRule.loss; }
        });
      });
    }

    Object.values(stats).forEach(s => {
      s.diff = s.gamesWon - s.gamesLost;
    });

    const ranked = Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.name.localeCompare(b.name, "ko");
    });

    ranked.forEach((item, index) => {
      const currentRank = index + 1;
      const prevRank = this.previousRanks[item.name];
      let delta = 0;
      if (prevRank !== undefined) {
        delta = prevRank - currentRank;
      }
      item.rank = currentRank;
      item.delta = delta;
      item.record = `${item.wins}-${item.draws}-${item.losses}`;
    });

    return ranked;
  }

  resetIndividualRanks() {
    this.previousRanks = {};
  }

  /**
   * ☕ 월별 코트 예약 순위표 산출
   * - 예약 횟수 & 예약 시간 집계
   * - 1위: 커피쿠폰 3매, 2위: 2매, 3위: 1매 지급 상태 계산
   */
  calculateCourtBookingLeaderboard(bookings = [], targetMonth = null) {
    const bookerStats = {};

    // 월별 자동 리셋 필터 (지정된 월이 없으면 현재 월 기준 자동 필터)
    // 매월 말일 자정에 해당 월이 마감되고, 익월 1일 00시부터는 0건으로 자동 리셋되어 새로 집계됨
    const curMonth = targetMonth || new Date().toISOString().slice(0, 7);
    const monthlyBookings = bookings.filter(b => {
      if (!b.date) return true;
      return b.date.startsWith(curMonth);
    });

    monthlyBookings.forEach(b => {
      const name = (b.booker || "미상").trim();
      if (!bookerStats[name]) {
        bookerStats[name] = {
          name: name,
          count: 0,
          totalHours: 0,
          courts: new Set(),
          lastDate: b.date || "-"
        };
      }
      bookerStats[name].count += 1;
      bookerStats[name].totalHours += (parseFloat(b.hours) || 2);
      if (b.court) bookerStats[name].courts.add(b.court);
      if (b.date && b.date > bookerStats[name].lastDate) {
        bookerStats[name].lastDate = b.date;
      }
    });

    const ranked = Object.values(bookerStats).map(item => ({
      ...item,
      courtsSummary: Array.from(item.courts).join(", ")
    })).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
      return a.name.localeCompare(b.name, "ko");
    });

    // 커피 쿠폰 배정 (3위까지만 시상, 쿠폰 장수 미표시)
    ranked.forEach((item, idx) => {
      const rank = idx + 1;
      item.rank = rank;
      if (rank === 1) {
        item.badge = "🥇 1위 (☕ 커피쿠폰)";
        item.status = "시상 대상";
      } else if (rank === 2) {
        item.badge = "🥈 2위 (☕ 커피쿠폰)";
        item.status = "시상 대상";
      } else if (rank === 3) {
        item.badge = "🥉 3위 (☕ 커피쿠폰)";
        item.status = "시상 대상";
      } else {
        item.badge = "-";
        item.status = "참여 감사";
      }
    });

    return ranked;
  }

  calculateGroupLeaderboard(matches) {
    const groups = ["A조", "B조", "C조", "D조"];
    const stats = {};

    groups.forEach(g => {
      stats[g] = { group: g, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
    });

    (matches || []).forEach(m => {
      if (m.status !== "finished" || m.scoreA === null || m.scoreB === null || !m.groupA || !m.groupB) return;
      const gA = m.groupA;
      const gB = m.groupB;
      const sA = m.scoreA;
      const sB = m.scoreB;

      if (stats[gA]) {
        stats[gA].played++;
        stats[gA].gamesWon += sA;
        stats[gA].gamesLost += sB;
        if (sA > sB) { stats[gA].wins++; stats[gA].points += 3; }
        else if (sA === sB) { stats[gA].draws++; stats[gA].points += 1; }
        else { stats[gA].losses++; }
      }

      if (stats[gB]) {
        stats[gB].played++;
        stats[gB].gamesWon += sB;
        stats[gB].gamesLost += sA;
        if (sB > sA) { stats[gB].wins++; stats[gB].points += 3; }
        else if (sA === sB) { stats[gB].draws++; stats[gB].points += 1; }
        else { stats[gB].losses++; }
      }
    });

    Object.values(stats).forEach(s => s.diff = s.gamesWon - s.gamesLost);

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return b.gamesWon - a.gamesWon;
    });
  }

  recordTournamentSummary(tournament, rankedList) {
    if (!tournament) return [];
    let history = this.getSeasonHistory();
    const existingIdx = history.findIndex(t => t.id === tournament.id);

    const topRanks = Array.isArray(rankedList) ? rankedList : [];
    const top1 = topRanks[0] ? topRanks[0].name : "-";
    const top2 = topRanks[1] ? topRanks[1].name : "-";
    const top3 = topRanks[2] ? topRanks[2].name : "-";
    const finishedCount = Array.isArray(tournament.matches)
      ? tournament.matches.filter(m => m.status === "finished").length
      : 0;

    const tourneySnapshot = {
      id: tournament.id,
      title: tournament.title,
      date: tournament.date || new Date().toISOString().slice(0, 10),
      mode: tournament.mode || "regular_individual",
      firstPlace: top1,
      secondPlace: top2,
      thirdPlace: top3,
      matchesCount: finishedCount || (tournament.matches ? tournament.matches.length : 0),
      summary: `${tournament.title} 공식 종료 (우승: ${top1})`,
      ranks: topRanks
    };

    if (existingIdx >= 0) {
      history[existingIdx] = tourneySnapshot;
    } else {
      history.unshift(tourneySnapshot);
    }

    try {
      localStorage.setItem(this.seasonStorageKey, JSON.stringify(history));
    } catch(e) {}

    // tournament 객체 자체의 history 배열에도 동기화
    if (!Array.isArray(tournament.history)) {
      tournament.history = [];
    }
    const tIdx = tournament.history.findIndex(t => t.id === tournament.id);
    if (tIdx >= 0) {
      tournament.history[tIdx] = tourneySnapshot;
    } else {
      tournament.history.unshift(tourneySnapshot);
    }

    return history;
  }

  saveTournamentToSeason(tournament, rankedList) {
    return this.recordTournamentSummary(tournament, rankedList);
  }

  getSeasonHistory(currentTournament = null) {
    let list = [];
    try {
      const saved = localStorage.getItem(this.seasonStorageKey);
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch(e) {}

    if (!Array.isArray(list)) {
      list = [];
    }

    // Merge current tournament history if provided
    if (currentTournament && Array.isArray(currentTournament.history)) {
      currentTournament.history.forEach(h => {
        if (!list.some(item => item.id === h.id)) {
          list.push(h);
        }
      });
    }

    return list;
  }

  getSeasonCumulativeLeaderboard() {
    const history = this.getSeasonHistory();
    const cumulative = {};

    history.forEach(tourney => {
      if (!Array.isArray(tourney.ranks)) return;
      tourney.ranks.forEach(r => {
        if (!cumulative[r.name]) {
          cumulative[r.name] = {
            name: r.name,
            tournamentsCount: 0,
            totalPoints: 0,
            totalWins: 0,
            totalDraws: 0,
            totalLosses: 0,
            totalDiff: 0,
            championships: 0,
            runnerUps: 0
          };
        }
        cumulative[r.name].tournamentsCount++;
        cumulative[r.name].totalPoints += (r.points || 0);
        cumulative[r.name].totalWins += (r.wins || 0);
        cumulative[r.name].totalDraws += (r.draws || 0);
        cumulative[r.name].totalLosses += (r.losses || 0);
        cumulative[r.name].totalDiff += (r.diff || 0);
        if (r.rank === 1) cumulative[r.name].championships++;
        if (r.rank === 2) cumulative[r.name].runnerUps++;
      });
    });

    return Object.values(cumulative).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.totalDiff !== a.totalDiff) return b.totalDiff - a.totalDiff;
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      return b.championships - a.championships;
    });
  }
}

window.LeaderboardEngine = LeaderboardEngine;
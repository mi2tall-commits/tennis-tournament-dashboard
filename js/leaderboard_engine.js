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
    this.previousRanks = {};
  }

  /**
   * 실시간 개인 리그전 순위표 산출
   */
  calculateIndividualLeaderboard(matches, players, pointsRule = { win: 3, draw: 1, loss: 0 }) {
    const stats = {};

    players.forEach(p => {
      stats[p.name] = {
        name: p.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        gamesWon: 0,
        gamesLost: 0,
        diff: 0
      };
    });

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
  calculateCourtBookingLeaderboard(bookings = []) {
    const bookerStats = {};

    bookings.forEach(b => {
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

  saveTournamentToSeason(tournament, rankedList) {
    let history = this.getSeasonHistory();
    const existingIdx = history.findIndex(t => t.id === tournament.id);
    const tourneySnapshot = {
      id: tournament.id,
      title: tournament.title,
      date: tournament.date || new Date().toISOString().slice(0, 10),
      mode: tournament.mode,
      ranks: rankedList
    };

    if (existingIdx >= 0) {
      history[existingIdx] = tourneySnapshot;
    } else {
      history.push(tourneySnapshot);
    }

    localStorage.setItem(this.seasonStorageKey, JSON.stringify(history));
    return history;
  }

  getSeasonHistory() {
    try {
      const saved = localStorage.getItem(this.seasonStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch(e) {
      return [];
    }
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
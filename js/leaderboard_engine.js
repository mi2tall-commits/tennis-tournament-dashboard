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

  getSeasonHistory(currentTournament = null) {
    let list = [];
    try {
      const saved = localStorage.getItem(this.seasonStorageKey);
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch(e) {}

    // Seed with sample_history if empty or missing
    if (!list || list.length === 0) {
      if (typeof DEFAULT_TOURNAMENT !== "undefined" && Array.isArray(DEFAULT_TOURNAMENT.history) && DEFAULT_TOURNAMENT.history.length > 0) {
        list = JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT.history));
      } else {
        list = [
  {
    "id": "tourney_2026_09",
    "title": "2026년 9월 정기 월례회",
    "date": "2026-09-20",
    "mode": "regular_individual",
    "summary": "9월 정기 월례회: 김성윤(회장) 4전 전승 단독 1위 달성.",
    "ranks": [
      {
        "rank": 1,
        "name": "김성윤(회장)",
        "wins": 4,
        "draws": 0,
        "losses": 0,
        "points": 12,
        "diff": 14,
        "record": "4-0-0"
      },
      {
        "rank": 2,
        "name": "서동원",
        "wins": 3,
        "draws": 0,
        "losses": 1,
        "points": 9,
        "diff": 8,
        "record": "3-0-1"
      },
      {
        "rank": 3,
        "name": "김현제",
        "wins": 3,
        "draws": 0,
        "losses": 1,
        "points": 9,
        "diff": 6,
        "record": "3-0-1"
      },
      {
        "rank": 4,
        "name": "이정윤",
        "wins": 2,
        "draws": 1,
        "losses": 1,
        "points": 7,
        "diff": 3,
        "record": "2-1-1"
      },
      {
        "rank": 5,
        "name": "정우근",
        "wins": 2,
        "draws": 0,
        "losses": 2,
        "points": 6,
        "diff": 1,
        "record": "2-0-2"
      },
      {
        "rank": 6,
        "name": "강선균",
        "wins": 2,
        "draws": 0,
        "losses": 2,
        "points": 6,
        "diff": 0,
        "record": "2-0-2"
      },
      {
        "rank": 7,
        "name": "장경찬",
        "wins": 1,
        "draws": 1,
        "losses": 2,
        "points": 4,
        "diff": -2,
        "record": "1-1-2"
      },
      {
        "rank": 8,
        "name": "한성호",
        "wins": 1,
        "draws": 0,
        "losses": 3,
        "points": 3,
        "diff": -5,
        "record": "1-0-3"
      }
    ]
  },
  {
    "id": "tourney_2026_08",
    "title": "2026년 8월 여름 특별대회",
    "date": "2026-08-16",
    "mode": "regular_individual",
    "summary": "8월 특별전: 장경찬 3승 1무 무패 우승.",
    "ranks": [
      {
        "rank": 1,
        "name": "장경찬",
        "wins": 3,
        "draws": 1,
        "losses": 0,
        "points": 10,
        "diff": 9,
        "record": "3-1-0"
      },
      {
        "rank": 2,
        "name": "한성호",
        "wins": 3,
        "draws": 0,
        "losses": 1,
        "points": 9,
        "diff": 7,
        "record": "3-0-1"
      },
      {
        "rank": 3,
        "name": "손정철",
        "wins": 2,
        "draws": 1,
        "losses": 1,
        "points": 7,
        "diff": 4,
        "record": "2-1-1"
      },
      {
        "rank": 4,
        "name": "김성윤(회장)",
        "wins": 2,
        "draws": 0,
        "losses": 2,
        "points": 6,
        "diff": 2,
        "record": "2-0-2"
      },
      {
        "rank": 5,
        "name": "서동원",
        "wins": 2,
        "draws": 0,
        "losses": 2,
        "points": 6,
        "diff": 1,
        "record": "2-0-2"
      },
      {
        "rank": 6,
        "name": "강수정",
        "wins": 1,
        "draws": 0,
        "losses": 3,
        "points": 3,
        "diff": -4,
        "record": "1-0-3"
      }
    ]
  },
  {
    "id": "tourney_2026_07",
    "title": "2026년 7월 정기 월례회",
    "date": "2026-07-19",
    "mode": "regular_individual",
    "summary": "7월 정기전: 강선균 4승 전승 우승.",
    "ranks": [
      {
        "rank": 1,
        "name": "강선균",
        "wins": 4,
        "draws": 0,
        "losses": 0,
        "points": 12,
        "diff": 11,
        "record": "4-0-0"
      },
      {
        "rank": 2,
        "name": "서동원",
        "wins": 3,
        "draws": 1,
        "losses": 0,
        "points": 10,
        "diff": 8,
        "record": "3-1-0"
      },
      {
        "rank": 3,
        "name": "김성윤(회장)",
        "wins": 3,
        "draws": 0,
        "losses": 1,
        "points": 9,
        "diff": 6,
        "record": "3-0-1"
      },
      {
        "rank": 4,
        "name": "장경찬",
        "wins": 2,
        "draws": 1,
        "losses": 1,
        "points": 7,
        "diff": 3,
        "record": "2-1-1"
      },
      {
        "rank": 5,
        "name": "한성호",
        "wins": 2,
        "draws": 0,
        "losses": 2,
        "points": 6,
        "diff": 0,
        "record": "2-0-2"
      },
      {
        "rank": 6,
        "name": "이정윤",
        "wins": 2,
        "draws": 0,
        "losses": 2,
        "points": 6,
        "diff": -1,
        "record": "2-0-2"
      },
      {
        "rank": 7,
        "name": "정우근",
        "wins": 1,
        "draws": 1,
        "losses": 2,
        "points": 4,
        "diff": -3,
        "record": "1-1-2"
      }
    ]
  }
];
      }
      try { localStorage.setItem(this.seasonStorageKey, JSON.stringify(list)); } catch(e) {}
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
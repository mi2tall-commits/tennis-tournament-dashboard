/**
 * 🏆 실시간 순위 계산 및 누적 랭킹 엔진 (Leaderboard Engine)
 * - 승점(3/1/0) > 득실차 > 다득점 순위 정렬
 * - 순위 변동(▲/▼) 실시간 추적
 * - 조별 대항전 조별 순위 계산
 * - 연간/시즌 개인 누적 순위표 (Cumulative Season Tracker)
 */

class LeaderboardEngine {
  constructor() {
    this.seasonStorageKey = "tennis_season_tournaments_v1";
    this.previousRanks = {}; // 이전 순위 메모리
  }

  /**
   * 실시간 개인 순위표 산출
   */
  calculateIndividualLeaderboard(matches, players, pointsRule = { win: 3, draw: 1, loss: 0 }) {
    const stats = {};

    // 등록된 선수 초기화
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

    // 완료된 경기 집계
    matches.forEach(m => {
      if (m.status !== "finished" || m.scoreA === null || m.scoreB === null) return;

      const sA = m.scoreA;
      const sB = m.scoreB;

      const teamA = m.teamA || [];
      const teamB = m.teamB || [];

      // Team A 선수 스탯 누적
      teamA.forEach(name => {
        if (!stats[name]) {
          stats[name] = { name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
        }
        stats[name].played++;
        stats[name].gamesWon += sA;
        stats[name].gamesLost += sB;
        if (sA > sB) {
          stats[name].wins++;
          stats[name].points += pointsRule.win;
        } else if (sA === sB) {
          stats[name].draws++;
          stats[name].points += pointsRule.draw;
        } else {
          stats[name].losses++;
          stats[name].points += pointsRule.loss;
        }
      });

      // Team B 선수 스탯 누적
      teamB.forEach(name => {
        if (!stats[name]) {
          stats[name] = { name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
        }
        stats[name].played++;
        stats[name].gamesWon += sB;
        stats[name].gamesLost += sA;
        if (sB > sA) {
          stats[name].wins++;
          stats[name].points += pointsRule.win;
        } else if (sA === sB) {
          stats[name].draws++;
          stats[name].points += pointsRule.draw;
        } else {
          stats[name].losses++;
          stats[name].points += pointsRule.loss;
        }
      });
    });

    // 득실차 계산
    Object.values(stats).forEach(s => {
      s.diff = s.gamesWon - s.gamesLost;
    });

    // 정렬 공식: 승점 내림차순 > 득실차 내림차순 > 다득점 내림차순
    const ranked = Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.name.localeCompare(b.name, "ko");
    });

    // 순위 및 변동(Delta) 부여
    ranked.forEach((item, index) => {
      const currentRank = index + 1;
      const prevRank = this.previousRanks[item.name];
      let delta = 0;

      if (prevRank !== undefined) {
        delta = prevRank - currentRank; // 양수: 순위 상승, 음수: 하강
      }

      item.rank = currentRank;
      item.delta = delta;
      item.record = `${item.wins}-${item.draws}-${item.losses}`;
    });

    return ranked;
  }

  snapshotRanks(rankedList) {
    this.previousRanks = {};
    rankedList.forEach(item => {
      this.previousRanks[item.name] = item.rank;
    });
  }

  /**
   * 조별 순위 산출 (A조, B조, C조, D조)
   */
  calculateGroupLeaderboard(matches) {
    const groups = ["A조", "B조", "C조", "D조"];
    const stats = {};

    groups.forEach(g => {
      stats[g] = { group: g, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
    });

    matches.forEach(m => {
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

  /**
   * 4) 연간/시즌 누적 순위표 저장 및 조회
   */
  saveTournamentToSeason(tournament, rankedList) {
    let history = this.getSeasonHistory();
    // 이미 존재하는 대회면 업데이트, 아니면 추가
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
            championships: 0, // 1위 횟수
            runnerUps: 0      // 2위 횟수
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
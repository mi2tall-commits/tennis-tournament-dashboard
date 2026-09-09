/**
 * 🎾 테니스 동호회 실시간 대회 전광판 & 모바일 대시보드 (Main App Controller)
 * 8대 실전 운영 기능 탑재:
 * 1) 코트 개수 및 코트 고유 번호 개별 지정 (15번~18번 등)
 * 2) 40분 단위 경기 시간표 자동 생성 및 커스텀
 * 3) 개인 레벨별 1차 자동 대진 드래프트 생성 후 경기이사 수동 조정
 * 4) 이벤트 경기: 조별 조원 랜덤 복식 페어링 및 조장 최종 수정
 * 5) 개인 리그전 순위 리셋 & 연간 누적 랭킹 분리
 * 6) ☕ 월별 코트 예약자 커피 쿠폰 순위표 (1위:3매, 2위:2매, 3위:1매)
 * 7) 6대 역할 표준화 (회장, 부회장, 경기이사, 재무이사, 총무이사, 회원)
 */

class TournamentApp {
  constructor() {
    this.storageKey = "tennis_active_tournament_v7";
    this.memberManager = new MemberManager();
    this.matchmaker = new MatchmakerEngine(this.memberManager);
    this.leaderboard = new LeaderboardEngine();
    
    this.tournament = this.loadTournament();
    this.activeMobileTab = "tab-courts";
    this.leaderboardViewMode = "monthly"; // monthly (개인리그전) vs annual (연간 종합 랭킹)
    this.selectedPlayerFilter = "";
    this.audioEnabled = true;
    this.editingMatchId = null;
    this.draftMatches = []; // 1차 자동 생성 임시 드래프트 대진 목록

    this.initAudioContext();
    this.initClock();
    this.bindEvents();
    this.render();
  }

  loadTournament() {
    try {
      localStorage.removeItem("tennis_active_tournament_v1");
      localStorage.removeItem("tennis_active_tournament_v2");
      localStorage.removeItem("tennis_active_tournament_v3");
      localStorage.removeItem("tennis_active_tournament_v4");
      localStorage.removeItem("tennis_active_tournament_v5");

      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          // If master reset or explicitly zero matches, preserve clean state
          if (parsed.isMasterReset || (Array.isArray(parsed.matches) && parsed.matches.length === 0)) {
            return parsed;
          }
          if (Array.isArray(parsed.matches) && parsed.matches.length > 0) {
            const validNames = new Set(this.memberManager.getAllMembers().map(m => m.name));
            const hasLegacy = parsed.matches.some(m => 
              (m.teamA || []).some(name => !validNames.has(name)) ||
              (m.teamB || []).some(name => !validNames.has(name))
            );
            if (!hasLegacy) {
              return parsed;
            }
            console.warn("기존 레거시 명단 경기 감지됨, 공식 64명 명단으로 자동 교체합니다.");
          }
        }
      }
    } catch(e) {
      console.warn("대회 데이터 로드 실패, 기본값 사용:", e);
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT));
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(fresh));
    } catch(e) {}
    return fresh;
  }

  saveTournament() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tournament));
    } catch(e) {
      console.error("대회 데이터 저장 실패:", e);
    }
  }

  initClock() {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const clockEl = document.getElementById("liveClock");
      if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
    };
    update();
    setInterval(update, 1000);
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch(e) {
      this.audioCtx = null;
    }
  }

  playChime(type = "score") {
    if (!this.audioEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === "score") {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === "call") {
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880.00, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch(e) {}
  }

  render() {
    this.renderHeader();
    this.renderLeaderboard();
    this.renderNewsTicker();
    this.renderTimeline();
    this.renderBreakingBanner();
    this.renderMyMatchesView();
    this.renderRosterTable();
    this.renderBookingTable();
    this.renderHistoryTab();
    this.renderQrCode();
  }

  renderHeader() {
    const titleEl = document.getElementById("tournamentTitleDisplay");
    if (titleEl) titleEl.textContent = this.tournament.title;

    const dateBadgeEl = document.getElementById("tournamentDateBadge");
    if (dateBadgeEl) {
      dateBadgeEl.textContent = `📅 ${this.tournament.date || new Date().toISOString().slice(0, 10)}`;
    }

    const modeBadgeEl = document.getElementById("tournamentModeBadge");
    if (modeBadgeEl) {
      const mode = this.tournament.mode || "regular_individual";
      if (mode === "event") {
        modeBadgeEl.textContent = "🎉 이벤트 게임 (조별 랜덤 복식)";
        modeBadgeEl.className = "mode-pill mode-event";
      } else if (mode === "regular_group") {
        modeBadgeEl.textContent = "👥 정기전: 조별 대항전 (A~D 4개조)";
        modeBadgeEl.className = "mode-pill mode-group";
      } else {
        modeBadgeEl.textContent = "👤 정기전: 개인 리그전 (전 경기 복식 · 개인 승점 누적)";
        modeBadgeEl.className = "mode-pill mode-individual";
      }
    }
  }

renderLeaderboard() {
    const tbody = document.getElementById("leaderboardBody");
    const mobTbody = document.getElementById("mobileLeaderboardBody");
    const dtThead = document.getElementById("leaderboardThead");
    const mobThead = document.getElementById("mobileLeaderboardThead");
    const modeBadgeEl = document.getElementById("leaderboardCurrentModeText");
    const resetBtn = document.getElementById("btnResetLeagueUi");
    const mobModeText = document.getElementById("mobLeaderboardModeText");
    const mobResetBtn = document.getElementById("mobBtnResetLeague");
    const bannerEl = document.getElementById("leaderboardBannerNotice");
    const mobBannerEl = document.getElementById("mobLeaderboardBannerNotice");

    // 1. Sync Tab Button Active Styles (Desktop & Mobile)
    const tabMonthlyBtn = document.getElementById("tabBtnMonthlyLeague");
    const tabAnnualBtn = document.getElementById("tabBtnAnnualSeason");
    if (tabMonthlyBtn && tabAnnualBtn) {
      tabMonthlyBtn.classList.toggle("active", this.leaderboardViewMode === "monthly");
      tabAnnualBtn.classList.toggle("active", this.leaderboardViewMode === "annual");
    }

    const mobTabMonthlyBtn = document.getElementById("mobTabBtnMonthlyLeague");
    const mobTabAnnualBtn = document.getElementById("mobTabBtnAnnualSeason");
    if (mobTabMonthlyBtn && mobTabAnnualBtn) {
      mobTabMonthlyBtn.classList.toggle("active", this.leaderboardViewMode === "monthly");
      mobTabAnnualBtn.classList.toggle("active", this.leaderboardViewMode === "annual");
    }

    // 2. Render Annual Cumulative Season Leaderboard
    if (this.leaderboardViewMode === "annual") {
      const annualDesc = "👑 [연간 종합 랭킹] 2026 시즌 역대 월별 대회 누적 성적 및 명예의 전당";
      if (modeBadgeEl) modeBadgeEl.textContent = annualDesc;
      if (mobModeText) mobModeText.textContent = annualDesc;
      if (resetBtn) resetBtn.style.display = "none";
      if (mobResetBtn) mobResetBtn.style.display = "none";

      const bannerHtml = `
        <div class="ranking-mode-banner banner-annual">
          <div style="font-weight:900; font-size:13px; color:#fbbf24;">👑 2026 시즌 연간 종합 누적 순위표 (명예의 전당)</div>
          <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">역대 종료된 모든 정기전 성적이 누적 합산된 공식 시즌 랭킹입니다. (다승왕 · 포인트왕)</div>
        </div>
      `;
      if (bannerEl) bannerEl.innerHTML = bannerHtml;
      if (mobBannerEl) mobBannerEl.innerHTML = bannerHtml;

      // Annual Table Headers
      if (dtThead) {
        dtThead.innerHTML = `
          <tr>
            <th style="width: 50px; text-align: center;">시즌순위</th>
            <th>선수명</th>
            <th style="text-align: center; color:#fbbf24;">누적 포인트</th>
            <th style="text-align: center;">통산 전적</th>
            <th style="text-align: center;">총 득실차</th>
            <th style="text-align: center; color:#f59e0b;">입상 (🥇우승/🥈준우승)</th>
            <th style="text-align: center;">참가 대회</th>
          </tr>
        `;
      }
      if (mobThead) {
        mobThead.innerHTML = `
          <tr>
            <th style="width: 38px; text-align: center;">순위</th>
            <th>선수명</th>
            <th style="text-align: center; color:#fbbf24;">누적승점</th>
            <th style="text-align: center;">통산전적</th>
            <th style="text-align: center;">우승/준우승</th>
          </tr>
        `;
      }

      const cumulative = this.leaderboard.getSeasonCumulativeLeaderboard();
      let dtHtml = "";
      let mobHtml = "";

      cumulative.forEach((c, idx) => {
        const rank = idx + 1;
        const rankClass = rank === 1 ? "rank-pill-1" : rank === 2 ? "rank-pill-2" : rank === 3 ? "rank-pill-3" : "rank-pill-default";
        const rowClass = rank <= 3 ? `row-rank-${rank}` : "";

        dtHtml += `
          <tr class="${rowClass}">
            <td style="text-align: center;"><span class="rank-pill ${rankClass}">${rank}</span></td>
            <td class="player-name-cell"><b>${c.name}</b></td>
            <td style="text-align: center;"><span class="pts-badge" style="background:rgba(251,191,36,0.2); color:#fbbf24; border:1px solid rgba(251,191,36,0.4);">${c.totalPoints}점</span></td>
            <td style="text-align: center;">${c.totalWins}승 ${c.totalDraws}무 ${c.totalLosses}패</td>
            <td style="text-align: center;"><span class="${c.totalDiff > 0 ? "diff-positive" : c.totalDiff < 0 ? "diff-negative" : "diff-zero"}">${c.totalDiff > 0 ? "+" + c.totalDiff : c.totalDiff}</span></td>
            <td style="text-align: center; font-weight:800; color:#fbbf24;">🥇 ${c.championships}회 / 🥈 ${c.runnerUps}회</td>
            <td style="text-align: center; color:var(--text-muted); font-size:11px;">${c.tournamentsCount}개 대회</td>
          </tr>
        `;

        mobHtml += `
          <tr class="${rowClass}">
            <td style="text-align: center;"><span class="rank-pill ${rankClass}">${rank}</span></td>
            <td class="player-name-cell"><b>${c.name}</b></td>
            <td style="text-align: center;"><span class="pts-badge" style="background:rgba(251,191,36,0.2); color:#fbbf24;">${c.totalPoints}점</span></td>
            <td style="text-align: center; font-size:11px;">${c.totalWins}승 ${c.totalLosses}패</td>
            <td style="text-align: center; font-size:11px; font-weight:800; color:#fbbf24;">🥇${c.championships} 🥈${c.runnerUps}</td>
          </tr>
        `;
      });

      if (tbody) tbody.innerHTML = dtHtml;
      if (mobTbody) mobTbody.innerHTML = mobHtml;
      return;
    }

    // 3. Render Monthly Individual League Leaderboard
    const monthlyDesc = "👤 [당월 개인 리그전] 이번 대회 복식 경기 개인별 승점 집계 (승:3점 / 무:1점 / 패:0점)";
    if (modeBadgeEl) modeBadgeEl.textContent = monthlyDesc;
    if (mobModeText) mobModeText.textContent = monthlyDesc;
    if (resetBtn) resetBtn.style.display = "inline-flex";
    if (mobResetBtn) mobResetBtn.style.display = "inline-flex";

    const bannerMonthlyHtml = `
      <div class="ranking-mode-banner banner-monthly">
        <div style="font-weight:900; font-size:13px; color:#38bdf8;">🏆 당월 정기전 개인 리그 순위표</div>
        <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">모든 게임은 복식으로 진행되며, 각 개인의 승패 및 득실 결과를 실시간으로 누적합니다.</div>
      </div>
    `;
    if (bannerEl) bannerEl.innerHTML = bannerMonthlyHtml;
    if (mobBannerEl) mobBannerEl.innerHTML = bannerMonthlyHtml;

    // Monthly Table Headers
    if (dtThead) {
      dtThead.innerHTML = `
        <tr>
          <th style="width: 45px; text-align: center;">순위</th>
          <th style="width: 50px;">변동</th>
          <th>선수명</th>
          <th>전적(승-무-패)</th>
          <th>승점</th>
          <th>득실차</th>
        </tr>
      `;
    }
    if (mobThead) {
      mobThead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">순위</th>
          <th style="width: 45px;">변동</th>
          <th>선수명</th>
          <th>전적</th>
          <th>승점</th>
          <th>득실차</th>
        </tr>
      `;
    }

    const activePlayers = this.memberManager.getActiveMembers();
    const ranked = this.leaderboard.calculateIndividualLeaderboard(
      this.tournament.matches, 
      activePlayers, 
      { win: this.tournament.pointsWin || 3, draw: this.tournament.pointsDraw || 1, loss: this.tournament.pointsLoss || 0 }
    );

    let html = "";
    ranked.forEach(p => {
      const rankClass = p.rank === 1 ? "rank-pill-1" : p.rank === 2 ? "rank-pill-2" : p.rank === 3 ? "rank-pill-3" : "rank-pill-default";
      const rowClass = p.rank <= 3 ? `row-rank-${p.rank}` : "";

      let deltaHtml = `<span class="delta-same">-</span>`;
      if (p.delta > 0) deltaHtml = `<span class="delta-up">▲${p.delta}</span>`;
      else if (p.delta < 0) deltaHtml = `<span class="delta-down">▼${Math.abs(p.delta)}</span>`;

      const diffClass = p.diff > 0 ? "diff-positive" : p.diff < 0 ? "diff-negative" : "diff-zero";
      const diffStr = p.diff > 0 ? `+${p.diff}` : `${p.diff}`;

      html += `
        <tr class="${rowClass}">
          <td style="text-align: center;"><span class="rank-pill ${rankClass}">${p.rank}</span></td>
          <td style="text-align:center;">${deltaHtml}</td>
          <td class="player-name-cell">${p.name}</td>
          <td>${p.record}</td>
          <td><span class="pts-badge">${p.points}</span></td>
          <td><span class="${diffClass}">${diffStr}</span></td>
        </tr>
      `;
    });

    if (tbody) tbody.innerHTML = html;
    if (mobTbody) mobTbody.innerHTML = html;
  }
  setLeaderboardMode(mode) {
    this.leaderboardViewMode = mode;
    this.renderLeaderboard();
  }

  /**
   * 🔄 개인 리그전 순위 리셋 (사용자 요청 #5)
   * - 당월 대회 경기 스코어를 초기화하여 처음부터 다시 랭킹 산출
   * - 연간 누적 랭킹은 안전하게 보존
   */
  resetCurrentLeague() {
    if (!confirm("⚠️ [개인 리그전 순위 리셋]\n\n이번 대회의 경기 스코어와 순위표를 초기화하시겠습니까?\n(연간 종합 랭킹 데이터는 안전하게 보존됩니다)")) {
      return;
    }

    (this.tournament.matches || []).forEach(m => {
      m.scoreA = null;
      m.scoreB = null;
      m.tieBreak = null;
      m.status = "waiting";
    });

    this.leaderboard.resetIndividualRanks();
    this.tournament.breakingNews = "개인 리그전 순위가 리셋되었습니다. 1경기부터 새롭게 시작합니다.";
    this.saveTournament();
    this.render();
    alert("✅ 개인 리그전 순위가 성공적으로 리셋되었습니다. 새로운 경기를 진행해주세요!");
  }

  renderNewsTicker() {
    const listEl = document.getElementById("tickerFeedList");
    if (!listEl) return;

    const list = this.tournament.newsTicker || [];
    let html = "";
    list.slice(0, 10).forEach(item => {
      html += `
        <div class="ticker-item">
          <div class="ticker-content">
            <div class="ticker-title">${this.escape(item.text)}</div>
            <div class="ticker-sub">${this.escape(item.sub || "")}</div>
          </div>
          <div class="ticker-time">${item.timeAgo || "방금 전"}</div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  }

  renderTimeline() {
    const thead = document.getElementById("timelineTheadRow");
    const tbody = document.getElementById("timelineTbody");
    if (!thead || !tbody) return;

    const courts = this.tournament.courts || ["15번", "16번", "17번", "18번"];
    const timeSlots = this.tournament.timeSlots || [];

    let thHtml = `<th class="th-court">코트</th>`;
    timeSlots.forEach(ts => {
      thHtml += `<th class="th-time">${ts.start} - ${ts.end}</th>`;
    });
    thead.innerHTML = thHtml;

    let rowsHtml = "";
    courts.forEach(courtName => {
      rowsHtml += `<tr>`;
      rowsHtml += `<td class="court-label-cell">${courtName}</td>`;

      timeSlots.forEach((ts, tIdx) => {
        const match = (this.tournament.matches || []).find(
          m => m.court === courtName && m.timeSlotIndex === tIdx
        );

        if (match) {
          const statusText = this.getStatusText(match.status);
          const statusClass = `status-${match.status}`;
          const teamAStr = (match.teamA || []).join(", ");
          const teamBStr = (match.teamB || []).join(", ");
          const scoreStr = match.scoreA !== null && match.scoreB !== null ? `${match.scoreA} : ${match.scoreB}` : "- : -";
          const tieBreakStr = match.tieBreak ? `<span class="tiebreak-tag">(${match.tieBreak})</span>` : "";

          rowsHtml += `
            <td>
              <div class="match-card" onclick="app.openScoreModal('${match.id}')">
                <div class="match-card-top">
                  <span class="match-no">#${match.matchNo}</span>
                  <span class="match-status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="match-players">
                  <div class="match-vs-row">
                    <div class="team-line"><span>${this.escape(teamAStr)}</span></div>
                    <div style="font-size: 9px; color: var(--text-muted);">vs</div>
                    <div class="team-line"><span>${this.escape(teamBStr)}</span></div>
                  </div>
                </div>
                <div class="match-score-row">
                  <span class="score-label">Score</span>
                  <div class="score-box">${scoreStr} ${tieBreakStr}</div>
                </div>
              </div>
            </td>
          `;
        } else {
          rowsHtml += `
            <td>
              <div class="match-card-empty" onclick="app.openNewMatchModal('${courtName}', ${tIdx})">
                + 경기 배정
              </div>
            </td>
          `;
        }
      });

      rowsHtml += `</tr>`;
    });

    tbody.innerHTML = rowsHtml;
  }

  getStatusText(status) {
    switch (status) {
      case "finished": return "종료";
      case "playing": return "진행";
      case "calling": return "호출";
      case "delayed": return "지연";
      default: return "대기";
    }
  }

  renderBreakingBanner() {
    const bannerText = document.getElementById("breakingNewsText");
    if (bannerText) {
      bannerText.textContent = this.tournament.breakingNews || "실시간 대회가 원활하게 진행 중입니다.";
    }
  }

  renderMyMatchesView() {
    const selectEl = document.getElementById("myPlayerSelect");
    const containerEl = document.getElementById("myMatchesContainer");
    if (!selectEl || !containerEl) return;

    const members = this.memberManager.getActiveMembers();
    let optHtml = `<option value="">-- 내 이름 선택 (출전 경기 모아보기) --</option>`;
    members.forEach(m => {
      const selected = m.name === this.selectedPlayerFilter ? "selected" : "";
      optHtml += `<option value="${m.name}" ${selected}>${m.name} (NTRP ${m.level})</option>`;
    });
    selectEl.innerHTML = optHtml;

    if (!this.selectedPlayerFilter) {
      containerEl.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-muted);">위 드롭다운에서 본인 이름을 선택하시면 출전 코트와 시간대만 요약됩니다.</div>`;
      return;
    }

    const myName = this.selectedPlayerFilter;
    const myMatches = (this.tournament.matches || []).filter(m => {
      return (m.teamA || []).includes(myName) || (m.teamB || []).includes(myName);
    });

    if (myMatches.length === 0) {
      containerEl.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-muted);">[${myName}] 님의 배정된 경기가 없습니다.</div>`;
      return;
    }

    let cardsHtml = "";
    myMatches.forEach(m => {
      const slot = (this.tournament.timeSlots || [])[m.timeSlotIndex] || { start: "-", end: "-" };
      const statusText = this.getStatusText(m.status);
      const isTeamA = (m.teamA || []).includes(myName);
      const partner = isTeamA ? (m.teamA || []).filter(p => p !== myName).join(", ") : (m.teamB || []).filter(p => p !== myName).join(", ");
      const opponents = isTeamA ? (m.teamB || []).join(", ") : (m.teamA || []).join(", ");
      const scoreStr = m.scoreA !== null && m.scoreB !== null ? `${m.scoreA} : ${m.scoreB}` : "대기 중";

      cardsHtml += `
        <div class="my-match-card" onclick="app.openScoreModal('${m.id}')">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <span style="font-weight:900; color:var(--neon-cyan);">${m.court} 코트 #${m.matchNo}</span>
            <span style="font-size:11px; color:#cbd5e1; font-family:var(--font-mono);">${slot.start} ~ ${slot.end}</span>
            <span class="match-status-badge status-${m.status}">${statusText}</span>
          </div>
          <div style="font-size:13px; font-weight:700; color:#fff; margin-bottom: 4px;">
            🤝 파트너: <span style="color:#67e8f9;">${partner || "단식"}</span> vs ⚔️ 상대: <span style="color:#f87171;">${opponents}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:#080f1d; padding:6px 10px; border-radius:4px; margin-top:6px;">
            <span style="font-size:11px; color:var(--text-muted);">스코어</span>
            <span style="font-size:15px; font-weight:900; color:var(--neon-cyan); font-family:var(--font-mono);">${scoreStr}</span>
          </div>
        </div>
      `;
    });

    containerEl.innerHTML = cardsHtml;
  }

  renderRosterTable() {
    const tbody = document.getElementById("rosterTableBody");
    if (!tbody) return;

    const members = this.memberManager.getAllMembers();
    const countEl = document.getElementById("rosterMemberCount");
    if (countEl) countEl.textContent = members.length;
    let html = "";
    members.forEach((m, idx) => {
      const statusBadge = m.status === "active" 
        ? `<span class="status-pill-active">출전중</span>`
        : m.status === "inactive" 
          ? `<span class="status-pill-inactive">불참</span>` 
          : `<span class="status-pill-withdrawn">탈퇴</span>`;

      const roleBadge = m.role === "회장" 
        ? `<span style="background:rgba(251,191,36,0.2); color:#fbbf24; padding:2px 6px; border-radius:4px; font-weight:800; font-size:11px;">👑 회장</span>`
        : m.role === "부회장"
          ? `<span style="background:rgba(148,163,184,0.2); color:#cbd5e1; padding:2px 6px; border-radius:4px; font-weight:800; font-size:11px;">🎖️ 부회장</span>`
          : m.role === "경기이사"
            ? `<span style="background:rgba(56,189,248,0.2); color:#38bdf8; padding:2px 6px; border-radius:4px; font-weight:800; font-size:11px;">🎾 경기이사</span>`
            : m.role === "재무이사"
              ? `<span style="background:rgba(52,211,153,0.2); color:#34d399; padding:2px 6px; border-radius:4px; font-weight:800; font-size:11px;">💰 재무이사</span>`
              : m.role === "총무이사"
                ? `<span style="background:rgba(192,132,252,0.2); color:#c084fc; padding:2px 6px; border-radius:4px; font-weight:800; font-size:11px;">📋 총무이사</span>`
                : `<span style="color:#94a3b8; font-size:11px;">회원</span>`;

      const ntrpDisplay = m.level && parseFloat(m.level) > 0 
        ? `<span class="level-badge" style="cursor:pointer;" onclick="app.editMemberModal('${m.id}')">NTRP ${m.level}</span>`
        : `<span style="color:var(--text-muted); font-size:11px; cursor:pointer;" onclick="app.editMemberModal('${m.id}')">-</span>`;

      const curLevel = parseInt(m.clubLevel) || 2;
      const levelSelectHtml = `
        <select class="form-select-xs" onchange="app.updateMemberClubLevel('${m.id}', this.value)" style="padding:2px 4px; font-size:11px; font-weight:800; border-radius:4px; background:#0d182e; color:#38bdf8; border:1px solid #233c6e;">
          <option value="1" ${curLevel === 1 ? "selected" : ""}>1등급</option>
          <option value="2" ${curLevel === 2 ? "selected" : ""}>2등급</option>
          <option value="3" ${curLevel === 3 ? "selected" : ""}>3등급</option>
          <option value="4" ${curLevel === 4 ? "selected" : ""}>4등급</option>
        </select>
      `;

      html += `
        <tr>
          <td style="text-align:center; font-family:var(--font-mono); font-size:11px; color:#94a3b8;">${m.no || idx + 1}</td>
          <td><b>${m.name}</b></td>
          <td style="text-align:center; font-family:var(--font-mono); font-size:11px; color:#cbd5e1;">${m.joinDate || "-"}</td>
          <td style="text-align:center;">${ntrpDisplay}</td>
          <td style="text-align:center;">${levelSelectHtml}</td>
          <td style="text-align:center;">${roleBadge}</td>
          <td style="text-align:center;">${statusBadge}</td>
          <td style="text-align:center; white-space:nowrap;">
            <button class="btn-xs" onclick="app.editMemberModal('${m.id}')">수정</button>
            <button class="btn-xs btn-danger-xs" onclick="app.toggleMemberStatus('${m.id}')">${m.status === "active" ? "불참" : "출전"}</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  updateMemberClubLevel(id, newLevel) {
    this.memberManager.updateMember(id, { clubLevel: parseInt(newLevel) });
    this.renderRosterTable();
  }

  editMemberModal(id) {
    const m = this.memberManager.getMemberById(id);
    if (!m) return;
    this.editingMemberId = id;
    document.getElementById("editMemName").value = m.name || "";
    document.getElementById("editMemJoinDate").value = m.joinDate || "";
    document.getElementById("editMemNtrp").value = m.level && parseFloat(m.level) > 0 ? m.level : "";
    document.getElementById("editMemLevel").value = parseInt(m.clubLevel) || 2;
    document.getElementById("editMemRole").value = m.role || "회원";
    this.showModal("editMemberModalWindow");
  }

  
  onTournamentDateChange(newDate) {
    if (!newDate) return;
    this.tournament.date = newDate;
    this.saveTournament();
    this.renderHeader();
  }

  deleteCurrentMember() {
    if (!this.editingMemberId) return;
    const m = this.memberManager.getMemberById(this.editingMemberId);
    const name = m ? m.name : "해당 회원";

    // 탈퇴 확인 팝업창 (사용자 요청 #2)
    const confirmed = confirm(`[회원 탈퇴 확인]

정말 "${name}" 회원을 탈퇴 처리 하시겠습니까?

탈퇴 시 동호회 명단에서 완전히 삭제 조치됩니다.`);
    if (!confirmed) return;

    this.memberManager.deleteMember(this.editingMemberId);
    this.editingMemberId = null;
    this.closeModal("editMemberModalWindow");

    // 명단, 순위, 조별 편성 화면 즉시 동기화
    this.renderRosterTable();
    this.renderLeaderboard();
    if (document.getElementById("groupManagerModal") && document.getElementById("groupManagerModal").classList.contains("active")) {
      this.renderGroupManagerModal();
    }

    alert(`✅ "${name}" 회원이 정상적으로 탈퇴 처리(명단 삭제)되었습니다.`);
  }

  saveEditedMember() {
    if (!this.editingMemberId) return;
    const name = document.getElementById("editMemName").value.trim();
    const joinDate = document.getElementById("editMemJoinDate").value.trim();
    const rawNtrp = document.getElementById("editMemNtrp").value.trim();
    const ntrp = rawNtrp ? parseFloat(rawNtrp) : null;
    const clubLevel = parseInt(document.getElementById("editMemLevel").value) || 2;
    const role = document.getElementById("editMemRole").value;

    this.memberManager.updateMember(this.editingMemberId, {
      name,
      joinDate,
      level: ntrp,
      clubLevel,
      role
    });

    this.closeModal("editMemberModalWindow");
    this.renderRosterTable();
    this.renderLeaderboard();
    this.renderMyMatchesView();
    alert(`[${name}] 선수의 LEVEL 및 정보가 정상 수정되었습니다.`);
  }

  /**
   * ☕ 6) 월별 코트 예약 순위표 렌더링 (커피 쿠폰 1위:3매, 2위:2매, 3위:1매)
   */
  renderBookingTable() {
    const tbody = document.getElementById("courtBookingLeaderboardBody");
    const summaryCards = document.getElementById("coffeeCouponPodium");
    const bookings = this.tournament.courtBookings || [];
    const ranked = this.leaderboard.calculateCourtBookingLeaderboard(bookings);

    if (summaryCards) {
      const top1 = ranked[0] || { name: "-", count: 0, totalHours: 0 };
      const top2 = ranked[1] || { name: "-", count: 0, totalHours: 0 };
      const top3 = ranked[2] || { name: "-", count: 0, totalHours: 0 };

      summaryCards.innerHTML = `
        <div class="podium-card podium-silver">
          <div class="podium-medal">🥈 2위</div>
          <div class="podium-name">${top2.name}</div>
          <div class="podium-meta">${top2.count}회 예약 (${top2.totalHours}시간)</div>
          <div class="podium-prize">☕ 커피쿠폰 시상</div>
        </div>
        <div class="podium-card podium-gold">
          <div class="podium-medal">🥇 1위</div>
          <div class="podium-name">${top1.name}</div>
          <div class="podium-meta">${top1.count}회 예약 (${top1.totalHours}시간)</div>
          <div class="podium-prize">☕ 커피쿠폰 시상</div>
        </div>
        <div class="podium-card podium-bronze">
          <div class="podium-medal">🥉 3위</div>
          <div class="podium-name">${top3.name}</div>
          <div class="podium-meta">${top3.count}회 예약 (${top3.totalHours}시간)</div>
          <div class="podium-prize">☕ 커피쿠폰 시상</div>
        </div>
      `;
    }

    if (tbody) {
      let html = "";
      ranked.forEach(r => {
        const rankClass = r.rank === 1 ? "rank-pill-1" : r.rank === 2 ? "rank-pill-2" : r.rank === 3 ? "rank-pill-3" : "rank-pill-default";
        html += `
          <tr>
            <td style="text-align:center;"><span class="rank-pill ${rankClass}">${r.rank}</span></td>
            <td class="player-name-cell"><b>${r.name}</b></td>
            <td style="text-align:center;"><span class="pts-badge">${r.count}회</span></td>
            <td style="text-align:center;">${r.totalHours}시간</td>
            <td><span style="font-size:11px; color:#38bdf8;">${r.courtsSummary || "-"}</span></td>
            <td style="text-align:center; font-weight:800; color:var(--neon-gold);">${r.badge}</td>
            <td style="text-align:center; font-size:11px; color:var(--text-muted);">${r.lastDate}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }

    // 모바일 예약 리스트 렌더링
    const mobList = document.getElementById("mobileBookingList");
    if (mobList) {
      let html = "";
      bookings.slice().reverse().forEach(b => {
        html += `
          <div class="booking-log-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; color:#fff;">${b.booker} (${b.court})</span>
              <span style="font-size:11px; color:var(--neon-cyan);">${b.date} (${b.hours}시간)</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${b.note || "정기 예약"}</div>
          </div>
        `;
      });
      mobList.innerHTML = html;
    }
  }

  addCourtBooking() {
    const booker = document.getElementById("bookerNameInput").value.trim();
    const court = document.getElementById("bookingCourtInput").value.trim() || "15번";
    const date = document.getElementById("bookingDateInput").value || new Date().toISOString().slice(0, 10);
    const hours = parseFloat(document.getElementById("bookingHoursInput").value) || 2;
    const note = document.getElementById("bookingNoteInput").value.trim();

    if (!booker) {
      alert("예약자 이름을 입력해주세요.");
      return;
    }

    if (!this.tournament.courtBookings) this.tournament.courtBookings = [];
    this.tournament.courtBookings.push({
      id: "bk_" + Date.now(),
      booker,
      court,
      date,
      hours,
      note
    });

    this.saveTournament();
    this.renderBookingTable();
    document.getElementById("bookerNameInput").value = "";
    document.getElementById("bookingNoteInput").value = "";
    alert(`[${booker}] 님의 ${court} (${hours}시간) 코트 예약 기록이 추가되었습니다!`);
  }


  // ==============================================================================
  // 🏁 대회 종료 & 대회 내역 요약 관리 (#3)
  // ==============================================================================
  finishCurrentTournament() {
    if (!confirm(`🏁 [${this.tournament.title}] 대회를 최종 완료하시겠습니까?\n\n확인을 누르시면 현재 대진 및 순위 결과가 '대회 내역' 탭에 영구 보관되며, 연간 종합 랭킹에 자동 누적 반영됩니다.`)) {
      return;
    }

    const activePlayers = this.memberManager.getActiveMembers();
    const finalRanks = this.leaderboard.calculateIndividualLeaderboard(this.tournament.matches, activePlayers);
    const top1 = finalRanks[0] ? finalRanks[0].name : "-";
    const top2 = finalRanks[1] ? finalRanks[1].name : "-";
    const top3 = finalRanks[2] ? finalRanks[2].name : "-";

    const completedTourney = {
      id: "tourney_" + Date.now(),
      title: this.tournament.title,
      date: this.tournament.date || new Date().toISOString().slice(0, 10),
      mode: this.tournament.mode || "regular_individual",
      status: "completed",
      matchesCount: (this.tournament.matches || []).filter(m => m.status === "finished").length,
      firstPlace: top1,
      secondPlace: top2,
      thirdPlace: top3,
      summary: `${this.tournament.title} 공식 완료: 우승 ${top1}, 준우승 ${top2}, 3위 ${top3}.`,
      ranks: finalRanks.slice(0, 10)
    };

    if (!this.tournament.history) this.tournament.history = [];
    this.tournament.history.unshift(completedTourney);

    // Save snapshot to Season Cumulative storage
    this.leaderboard.saveTournamentToSeason(this.tournament, finalRanks);

    this.tournament.status = "completed";
    this.tournament.breakingNews = `[대회 공식 종료] ${this.tournament.title}가 성황리에 종료되었습니다! 🥇 우승: ${top1}`;
    this.saveTournament();
    this.render();
    this.renderHistoryTab();

    alert(`🎉 [${this.tournament.title}] 대회가 성공적으로 종료되었습니다!\n\n🥇 1위: ${top1}\n🥈 2위: ${top2}\n🥉 3위: ${top3}\n\n결과가 [대회 내역] 탭 및 연간 랭킹에 영구 보관되었습니다.`);
  }

  startNewTournamentPrompt() {
    const defaultTitle = new Date().getFullYear() + "년 " + (new Date().getMonth() + 1) + "월 정기대회";
    const newTitle = prompt("새로운 대회 공식 명칭을 입력하세요:", defaultTitle);
    if (!newTitle) return;

    // Reset current tournament to fresh state
    this.tournament.title = newTitle.trim();
    this.tournament.date = new Date().toISOString().slice(0, 10);
    this.tournament.startTime = "08:00";
    this.tournament.timeSlots = this.matchmaker.generateTimeSlots("08:00", 40, 5);
    this.tournament.status = "ongoing";

    // Generate balanced new matches with 64 members
    const active = this.memberManager.getActiveMembers();
    const courts = this.tournament.courts || ["15번", "16번", "17번", "18번"];
    this.tournament.matches = this.matchmaker.generateLevelBalancedMatches(active, courts, this.tournament.timeSlots);
    this.leaderboard.resetIndividualRanks();
    this.tournament.breakingNews = `[신규 대회] ${this.tournament.title}가 시작되었습니다!`;

    this.saveTournament();
    this.render();
    this.renderHistoryTab();
    alert(`🎾 새로운 대회 [${this.tournament.title}]가 시작되었습니다! (08:00 시작 40분 슬롯 편성 완료)`);
  }

  openHistoryModal() {
    this.renderHistoryTab();
    this.showModal("historyModal");
  }

  renderHistoryTab() {
    const listEl = document.getElementById("historyTournamentList");
    const mobListEl = document.getElementById("mobileHistoryList");
    const historyList = this.leaderboard.getSeasonHistory(this.tournament);

    const generateCardsHtml = () => {
      if (!historyList || historyList.length === 0) {
        return `<div style="text-align:center; padding:30px; color:var(--text-muted);">보관된 대회 내역이 없습니다. 대회가 끝나면 [대회 종료] 버튼을 눌러 저장하세요.</div>`;
      }

      let html = "";
      historyList.forEach((h, idx) => {
        const topRanks = Array.isArray(h.ranks) ? h.ranks.slice(0, 5) : [];
        html += `
          <div class="history-tourney-card">
            <div class="history-card-header">
              <div>
                <span class="history-title-badge">${h.title}</span>
                <span class="history-date">${h.date}</span>
              </div>
              <span class="badge-completed">종료 완료</span>
            </div>
            <div class="history-podium-row">
              <span class="hist-medal">🥇 1위: <b>${h.firstPlace || (topRanks[0] ? topRanks[0].name : "-")}</b></span>
              <span class="hist-medal">🥈 2위: <b>${h.secondPlace || (topRanks[1] ? topRanks[1].name : "-")}</b></span>
              <span class="hist-medal">🥉 3위: <b>${h.thirdPlace || (topRanks[2] ? topRanks[2].name : "-")}</b></span>
            </div>
            <div class="history-meta-info">
              <span>총 완료 경기: <b>${h.matchesCount || 15}경기</b></span>
              <span>대회 요약: ${h.summary || "정기 월례회 완료"}</span>
            </div>
            ${topRanks.length > 0 ? `
              <div class="history-mini-table-wrap">
                <table class="history-mini-table">
                  <thead>
                    <tr><th>순위</th><th>선수명</th><th>전적</th><th>승점</th><th>득실</th></tr>
                  </thead>
                  <tbody>
                    ${topRanks.map(r => `
                      <tr>
                        <td style="text-align:center;">${r.rank}</td>
                        <td><b>${r.name}</b></td>
                        <td>${r.record || (r.wins + "-" + r.draws + "-" + r.losses)}</td>
                        <td>${r.points}</td>
                        <td>${r.diff > 0 ? "+" + r.diff : r.diff}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : ""}
          </div>
        `;
      });
      return html;
    };

    const cardsHtml = generateCardsHtml();
    if (listEl) listEl.innerHTML = cardsHtml;
    if (mobListEl) mobListEl.innerHTML = cardsHtml;
  }

  renderQrCode() {
    const qrImg = document.getElementById("mobileQrImg");
    if (!qrImg) return;
    const currentUrl = encodeURIComponent(window.location.href);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUrl}`;
  }

  // ==========================================
  // 🎮 대화형 모달 & 조작 로직
  // ==========================================

  openScoreModal(matchId) {
    const match = (this.tournament.matches || []).find(m => m.id === matchId);
    if (!match) return;

    this.editingMatchId = matchId;
    document.getElementById("modalMatchTitle").textContent = `${match.court} #${match.matchNo} 경기 스코어 입력`;
    document.getElementById("modalTeamAName").textContent = (match.teamA || []).join(", ");
    document.getElementById("modalTeamBName").textContent = (match.teamB || []).join(", ");

    document.getElementById("scoreADisplay").textContent = match.scoreA !== null ? match.scoreA : 0;
    document.getElementById("scoreBDisplay").textContent = match.scoreB !== null ? match.scoreB : 0;
    document.getElementById("tieBreakInput").value = match.tieBreak || "";
    document.getElementById("matchStatusSelect").value = match.status || "finished";

    this.showModal("scoreModal");
  }

  changeScore(team, delta) {
    const displayId = team === "A" ? "scoreADisplay" : "scoreBDisplay";
    const el = document.getElementById(displayId);
    let val = parseInt(el.textContent) || 0;
    val = Math.max(0, Math.min(15, val + delta));
    el.textContent = val;
  }

  saveScore() {
    if (!this.editingMatchId) return;
    const match = (this.tournament.matches || []).find(m => m.id === this.editingMatchId);
    if (!match) return;

    const sA = parseInt(document.getElementById("scoreADisplay").textContent) || 0;
    const sB = parseInt(document.getElementById("scoreBDisplay").textContent) || 0;
    const tie = document.getElementById("tieBreakInput").value.trim();
    const status = document.getElementById("matchStatusSelect").value;

    match.scoreA = sA;
    match.scoreB = sB;
    match.tieBreak = tie || null;
    match.status = status;

    if (status === "finished") {
      const newsItem = {
        text: `${match.court} #${match.matchNo}경기 결과 (${sA} : ${sB}${tie ? " " + tie : ""})`,
        sub: `${match.court} 스코어 [${sA} : ${sB}] 확정.`,
        timeAgo: "방금 전"
      };
      this.tournament.newsTicker = [newsItem, ...(this.tournament.newsTicker || [])].slice(0, 15);
      this.tournament.breakingNews = `[속보] ${match.court} #${match.matchNo}경기 [${sA} : ${sB}] 확정!`;
      this.playChime("score");
    } else if (status === "calling") {
      this.tournament.breakingNews = `[호출] ${match.court} #${match.matchNo}경기: ${(match.teamA || []).join(",")} vs ${(match.teamB || []).join(",")} 선수 코트 입장 바랍니다!`;
      this.playChime("call");
    }

    this.saveTournament();
    this.closeModal("scoreModal");
    this.render();
  }

  openNewMatchModal(courtName, timeSlotIndex) {
    document.getElementById("newMatchCourt").value = courtName;
    document.getElementById("newMatchSlot").value = timeSlotIndex;
    
    const members = this.memberManager.getActiveMembers();
    const populateSelect = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = members.map(m => `<option value="${m.name}">${m.name} (${m.level})</option>`).join("");
    };

    populateSelect("newTeamA1");
    populateSelect("newTeamA2");
    populateSelect("newTeamB1");
    populateSelect("newTeamB2");

    this.showModal("newMatchModal");
  }

  saveNewMatch() {
    const court = document.getElementById("newMatchCourt").value;
    const tIdx = parseInt(document.getElementById("newMatchSlot").value) || 0;
    const teamA = [document.getElementById("newTeamA1").value, document.getElementById("newTeamA2").value];
    const teamB = [document.getElementById("newTeamB1").value, document.getElementById("newTeamB2").value];

    const matchNo = (this.tournament.matches || []).length + 1;
    const newMatch = this.matchmaker.createManualMatch({
      court,
      matchNo,
      timeSlotIndex: tIdx,
      teamA,
      teamB,
      status: "waiting"
    });

    this.tournament.matches.push(newMatch);
    this.saveTournament();
    this.closeModal("newMatchModal");
    this.render();
  }

  // ==============================================================================
  // ⚙️ 대진표 생성 마법사 & 1차 드래프트 조정 로직 (요구사항 #1, #2, #3, #4)
  // ==============================================================================

  // ==============================================================================
  // 👥 A~D 4개조 조 편성 관리자 (요구사항 #2)
  // ==============================================================================
  openGroupManagerModal() {
    this.renderGroupManagerModal();
    this.showModal("groupManagerModal");
  }

  renderGroupManagerModal() {
    const active = this.memberManager.getActiveMembers();
    const groups = ["A조", "B조", "C조", "D조"];

    const attending = active.filter(m => m.group !== "미참석");
    const absent = active.filter(m => m.group === "미참석");

    // 1. Group summary cards (A, B, C, D조 + 미참석 불참 카드)
    const summaryEl = document.getElementById("groupSummaryGrid");
    if (summaryEl) {
      let html = "";
      groups.forEach(g => {
        const inGroup = active.filter(m => m.group === g);
        html += `
          <div class="group-col-card">
            <div class="group-col-header">
              <span class="group-col-title">${g}</span>
              <span class="group-col-count">${inGroup.length}명</span>
            </div>
            <div class="group-members-pill-list">
              ${inGroup.map(m => `
                <span class="group-mem-pill">
                  ${m.name} <span class="badge-lvl">${m.clubLevel || 2}등</span>
                </span>
              `).join("")}
            </div>
          </div>
        `;
      });
      html += `
        <div class="group-col-card" style="border-color:#475569; background:rgba(30,41,59,0.5);">
          <div class="group-col-header" style="border-color:#475569;">
            <span class="group-col-title" style="color:#94a3b8;">❌ 미참석 (불참)</span>
            <span class="group-col-count" style="color:#94a3b8;">${absent.length}명</span>
          </div>
          <div class="group-members-pill-list">
            ${absent.length === 0 ? '<span style="font-size:11px; color:#64748b;">불참자 없음</span>' : absent.map(m => `
              <span class="group-mem-pill" style="opacity:0.6; background:#1e293b; color:#94a3b8; border-color:#334155;">
                ${m.name} <span class="badge-lvl">${m.clubLevel || 2}등</span>
              </span>
            `).join("")}
          </div>
        </div>
      `;
      summaryEl.innerHTML = html;
    }

    // Header badge
    const headerInfo = document.getElementById("groupSummaryHeaderInfo");
    if (headerInfo) {
      headerInfo.innerHTML = `총 <b>${active.length}명</b> 중 당일 참석: <b style="color:#38bdf8;">${attending.length}명</b> / <span style="color:#94a3b8;">불참: ${absent.length}명</span>`;
    }

    // 2. Member assignment table
    const tbody = document.getElementById("groupAssignmentTableBody");
    if (tbody) {
      let html = "";
      active.forEach((m, idx) => {
        const curGroup = m.group || "A조";
        const isAbsent = curGroup === "미참석";
        html += `
          <tr style="${isAbsent ? 'opacity:0.55; background:rgba(15,23,42,0.4);' : ''}">
            <td style="text-align:center; font-family:var(--font-mono);">${m.no || idx + 1}</td>
            <td><b>${m.name}</b> ${isAbsent ? '<span style="font-size:10px; color:#ef4444; font-weight:800; margin-left:4px;">[불참]</span>' : ''}</td>
            <td style="text-align:center;"><span class="level-badge">${m.clubLevel || 2}등급</span></td>
            <td style="text-align:center;">
              <select class="form-select form-select-xs" onchange="app.changeMemberGroup('${m.id}', this.value)" style="width:115px; padding:3px 6px; font-weight:800; background:#0e1726; color:${isAbsent ? '#ef4444' : '#38bdf8'}; border:1px solid ${isAbsent ? '#ef4444' : '#1e3358'};">
                <option value="A조" ${curGroup === "A조" ? "selected" : ""}>A조</option>
                <option value="B조" ${curGroup === "B조" ? "selected" : ""}>B조</option>
                <option value="C조" ${curGroup === "C조" ? "selected" : ""}>C조</option>
                <option value="D조" ${curGroup === "D조" ? "selected" : ""}>D조</option>
                <option value="미참석" ${isAbsent ? "selected" : ""} style="color:#ef4444;">❌ 불참 (미참석)</option>
              </select>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }
  }

  changeMemberGroup(id, group) {
    this.memberManager.setMemberGroup(id, group);
    this.renderGroupManagerModal();
  }

  autoBalanceGroups() {
    const active = this.memberManager.getActiveMembers();
    // Only balance attendees (exclude members marked as '미참석')
    const attendees = active.filter(m => m.group !== "미참석");
    const targetMembers = attendees.length >= 4 ? attendees : active;

    const sorted = [...targetMembers].sort((a, b) => (a.clubLevel || 2) - (b.clubLevel || 2));
    const groups = ["A조", "B조", "C조", "D조"];
    sorted.forEach((m, idx) => {
      const g = groups[idx % 4];
      this.memberManager.setMemberGroup(m.id, g);
    });
    this.renderGroupManagerModal();
    alert(`⚖️ 참석 회원 ${targetMembers.length}명의 LEVEL을 고려하여 A~D조로 균등하게 자동 편성되었습니다!`);
  }

  saveGroupAssignments() {
    this.renderRosterTable();
    this.closeModal("groupManagerModal");
    alert("✅ A~D조 조 편성이 성공적으로 저장되었습니다!");
  }

  openMatchmakerModal() {
    // 설정값 반영
    const dateInput = document.getElementById("mmTournamentDate");
    if (dateInput) {
      dateInput.value = this.tournament.date || new Date().toISOString().slice(0, 10);
    }
    const startTimeVal = this.tournament.startTime;
    document.getElementById("mmStartTime").value = (startTimeVal && startTimeVal !== "10:00") ? startTimeVal : "08:00";
    document.getElementById("mmDuration").value = this.tournament.gameDurationMinutes || 40;
    document.getElementById("mmCourtNames").value = (this.tournament.courts || ["15번", "16번", "17번", "18번"]).join(", ");
    document.getElementById("mmCourtCount").value = (this.tournament.courts || []).length || 4;
    this.showModal("matchmakerModal");
  }

  onCourtCountChange() {
    const count = parseInt(document.getElementById("mmCourtCount").value) || 4;
    const defaultCourtNames = ["15번", "16번", "17번", "18번", "19번", "20번", "1번", "2번"];
    const names = defaultCourtNames.slice(0, count);
    document.getElementById("mmCourtNames").value = names.join(", ");
  }

  /**
   * 1차 자동 대진 드래프트 생성 (경기이사 수동 조정 화면으로 연결)
   */
  generateDraftMatches(type) {
    const dateInput = document.getElementById("mmTournamentDate");
    if (dateInput && dateInput.value) {
      this.tournament.date = dateInput.value;
      this.renderHeader();
    }
    const startTime = document.getElementById("mmStartTime").value || "08:00";
    const duration = parseInt(document.getElementById("mmDuration").value) || 40;
    const rawCourts = document.getElementById("mmCourtNames").value;
    const courts = rawCourts.split(",").map(c => c.trim()).filter(Boolean);

    if (courts.length === 0) {
      alert("최소 1개 이상의 코트 번호를 입력해주세요.");
      return;
    }

    const timeSlots = this.matchmaker.generateTimeSlots(startTime, duration, 5);
    const allActive = this.memberManager.getActiveMembers();
    const attendees = allActive.filter(m => m.group !== "미참석");
    const active = attendees.length >= 4 ? attendees : allActive;

    let draft = [];
    if (type === "level_balanced") {
      draft = this.matchmaker.generateLevelBalancedMatches(active, courts, timeSlots);
    } else if (type === "group_matches") {
      const byGroup = {};
      active.forEach(m => {
        if (m.group && m.group !== "미참석") {
          if (!byGroup[m.group]) byGroup[m.group] = [];
          byGroup[m.group].push(m);
        }
      });
      draft = this.matchmaker.generateGroupMatches(byGroup, courts, timeSlots);
    }

    this.draftMatches = draft;
    this.draftCourts = courts;
    this.draftTimeSlots = timeSlots;
    this.draftDuration = duration;
    this.draftStartTime = startTime;
    this.draftMode = type === "group_matches" ? "regular_group" : "regular_individual";

    this.closeModal("matchmakerModal");
    this.openDraftReviewModal();
  }

  /**
   * 경기이사 1차 드래프트 검토 & 수동 변경 모달 열기
   */
  openDraftReviewModal() {
    const container = document.getElementById("draftMatchListContainer");
    if (!container) return;

    const members = this.memberManager.getActiveMembers();
    const memberOptions = members.map(m => `<option value="${m.name}">${m.name} (${m.level})</option>`).join("");

    let html = "";
    this.draftMatches.forEach((m, idx) => {
      const slot = this.draftTimeSlots[m.timeSlotIndex] || { start: "-", end: "-" };
      html += `
        <div class="draft-match-card" data-idx="${idx}">
          <div class="draft-card-header">
            <span class="draft-badge">${m.court} 코트 #${m.matchNo}</span>
            <span class="draft-time">${slot.start} ~ ${slot.end}</span>
          </div>
          <div class="draft-teams-grid">
            <div class="draft-team-box">
              <span class="team-label text-cyan">Team A (복식)</span>
              <select class="form-select draft-select" onchange="app.updateDraftPlayer(${idx}, 'teamA', 0, this.value)">
                ${members.map(mb => `<option value="${mb.name}" ${mb.name === m.teamA[0] ? "selected" : ""}>${mb.name} (${mb.level})</option>`).join("")}
              </select>
              <select class="form-select draft-select" onchange="app.updateDraftPlayer(${idx}, 'teamA', 1, this.value)">
                ${members.map(mb => `<option value="${mb.name}" ${mb.name === m.teamA[1] ? "selected" : ""}>${mb.name} (${mb.level})</option>`).join("")}
              </select>
            </div>
            <div class="draft-vs-divider">VS</div>
            <div class="draft-team-box">
              <span class="team-label text-red">Team B (복식)</span>
              <select class="form-select draft-select" onchange="app.updateDraftPlayer(${idx}, 'teamB', 0, this.value)">
                ${members.map(mb => `<option value="${mb.name}" ${mb.name === m.teamB[0] ? "selected" : ""}>${mb.name} (${mb.level})</option>`).join("")}
              </select>
              <select class="form-select draft-select" onchange="app.updateDraftPlayer(${idx}, 'teamB', 1, this.value)">
                ${members.map(mb => `<option value="${mb.name}" ${mb.name === m.teamB[1] ? "selected" : ""}>${mb.name} (${mb.level})</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    this.showModal("draftReviewModal");
  }

  updateDraftPlayer(matchIdx, team, playerIdx, newName) {
    if (!this.draftMatches[matchIdx]) return;
    this.draftMatches[matchIdx][team][playerIdx] = newName;
  }

  commitDraftMatches() {
    if (!this.draftMatches || this.draftMatches.length === 0) return;
    this.tournament.matches = JSON.parse(JSON.stringify(this.draftMatches));
    this.tournament.courts = this.draftCourts;
    this.tournament.timeSlots = this.draftTimeSlots;
    this.tournament.gameDurationMinutes = this.draftDuration;
    this.tournament.startTime = this.draftStartTime;
    this.tournament.mode = this.draftMode;

    this.saveTournament();
    this.closeModal("draftReviewModal");
    this.render();
    alert(`🎉 경기이사 최종 검토 완료! ${this.tournament.matches.length}개 대진표가 전광판에 즉시 반영되었습니다.`);
  }

  /**
   * 4) 이벤트 경기: 조별 조원 랜덤 복식 페어링 모달 열기
   */
  openEventMatchmakerModal() {
    this.closeModal("matchmakerModal");
    const active = this.memberManager.getActiveMembers();
    const memberCheckboxes = document.getElementById("eventMemberCheckboxes");
    if (memberCheckboxes) {
      let html = "";
      active.forEach(m => {
        html += `
          <label class="checkbox-pill">
            <input type="checkbox" name="eventMember" value="${m.name}" checked>
            <span>${m.name} <b style="color:var(--neon-cyan);">[${m.group || "A조"}]</b> (${m.clubLevel || 2}등급)</span>
          </label>
        `;
      });
      memberCheckboxes.innerHTML = html;
    }
    this.showModal("eventMatchmakerModal");
  }

  filterEventMembersByGroup(groupName) {
    const checkboxes = document.querySelectorAll("input[name='eventMember']");
    const members = this.memberManager.getActiveMembers();
    checkboxes.forEach(cb => {
      if (groupName === "ALL") {
        cb.checked = true;
      } else {
        const mem = members.find(m => m.name === cb.value);
        cb.checked = mem ? (mem.group === groupName) : false;
      }
    });
  }

  generateEventDoublesFromModal() {
    const checkedBoxes = Array.from(document.querySelectorAll("input[name='eventMember']:checked"));
    const selectedNames = checkedBoxes.map(cb => cb.value);

    if (selectedNames.length < 4) {
      alert("복식 경기를 생성하려면 최소 4명 이상의 조원을 선택해주세요.");
      return;
    }

    const courts = this.tournament.courts || ["15번", "16번", "17번", "18번"];
    const timeSlots = this.tournament.timeSlots || [];
    const groupName = document.getElementById("eventGroupNameInput").value || "이벤트조";

    const draft = this.matchmaker.generateEventRandomDoubles(selectedNames, courts, timeSlots, groupName);
    this.draftMatches = draft;
    this.draftCourts = courts;
    this.draftTimeSlots = timeSlots;
    this.draftDuration = this.tournament.gameDurationMinutes || 40;
    this.draftStartTime = this.tournament.startTime || "10:00";
    this.draftMode = "event";

    this.closeModal("eventMatchmakerModal");
    this.openDraftReviewModal();
  }

  // 회원 관리 모달 액션
  openRosterModal() {
    this.renderRosterTable();
    this.showModal("rosterModal");
  }

  addNewMember() {
    const name = document.getElementById("addMemberName").value.trim();
    const rawLevel = document.getElementById("addMemberLevel").value;
    const level = rawLevel ? parseFloat(rawLevel) : null;
    const clubLevel = parseInt(document.getElementById("addMemberClubLevel").value) || 2;
    const role = document.getElementById("addMemberRole").value;

    if (!name) {
      alert("선수 이름을 입력해주세요.");
      return;
    }

    this.memberManager.addMember({ name, level, clubLevel, role, status: "active" });
    document.getElementById("addMemberName").value = "";
    this.renderRosterTable();
    this.renderLeaderboard();
    this.renderMyMatchesView();
    alert(`[${name}] 선수가 추가되었습니다.`);
  }

  toggleMemberStatus(id) {
    const m = this.memberManager.getMemberById(id);
    if (!m) return;
    const nextStatus = m.status === "active" ? "inactive" : "active";
    this.memberManager.setMemberStatus(id, nextStatus);
    this.renderRosterTable();
    this.renderLeaderboard();
  }

  executeBulkImport() {
    const text = document.getElementById("bulkImportTextarea").value;
    if (!text.trim()) {
      alert("명단 텍스트를 입력해주세요.");
      return;
    }
    const count = this.memberManager.bulkImport(text);
    document.getElementById("bulkImportTextarea").value = "";
    this.renderRosterTable();
    this.renderLeaderboard();
    this.renderMyMatchesView();
    alert(`총 ${count}명의 회원 정보가 성공적으로 등록/갱신되었습니다!`);
  }

  // 연간/시즌 누적 순위표 모달
  openSeasonModal() {
    const activePlayers = this.memberManager.getActiveMembers();
    const currentRanked = this.leaderboard.calculateIndividualLeaderboard(
      this.tournament.matches, 
      activePlayers
    );
    this.leaderboard.saveTournamentToSeason(this.tournament, currentRanked);

    const cumulative = this.leaderboard.getSeasonCumulativeLeaderboard();
    const tbody = document.getElementById("seasonLeaderboardBody");
    if (tbody) {
      let html = "";
      cumulative.forEach((c, idx) => {
        const rank = idx + 1;
        const rankClass = rank === 1 ? "rank-pill-1" : rank === 2 ? "rank-pill-2" : rank === 3 ? "rank-pill-3" : "rank-pill-default";
        html += `
          <tr>
            <td style="text-align:center;"><span class="rank-pill ${rankClass}">${rank}</span></td>
            <td class="player-name-cell">${c.name}</td>
            <td style="text-align:center;"><span class="pts-badge">${c.totalPoints}</span></td>
            <td style="text-align:center;">${c.totalWins}승 ${c.totalDraws}무 ${c.totalLosses}패</td>
            <td style="text-align:center;"><span class="${c.totalDiff > 0 ? "diff-positive" : "diff-negative"}">${c.totalDiff > 0 ? "+" + c.totalDiff : c.totalDiff}</span></td>
            <td style="text-align:center;">🥇 ${c.championships}회 / 🥈 ${c.runnerUps}회</td>
            <td style="text-align:center;">${c.tournamentsCount}개 대회</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }

    this.showModal("seasonModal");
  }

  openCourtBookingModal() {
    this.renderBookingTable();
    this.showModal("courtBookingModal");
  }

  openSettingsModal() {
    document.getElementById("setTourneyTitle").value = this.tournament.title;
    document.getElementById("setTourneyDate").value = this.tournament.date || "";
    document.getElementById("setTourneyMode").value = this.tournament.mode || "regular_individual";
    this.showModal("settingsModal");
  }

  saveSettings() {
    this.tournament.title = document.getElementById("setTourneyTitle").value.trim() || "월례회 대회";
    this.tournament.date = document.getElementById("setTourneyDate").value;
    this.tournament.mode = document.getElementById("setTourneyMode").value;
    this.saveTournament();
    this.closeModal("settingsModal");
    this.render();
  }

  openMasterResetModal() {
    this.closeModal("settingsModal");
    this.showModal("masterResetModal");
  }

  executeMasterReset() {
    // 1. Keep 64 official members 100% intact!
    // 2. Create clean tournament object
    const cleanTournament = {
      id: "tourney_" + Date.now(),
      title: (this.tournament && this.tournament.title) || "2026년 정기대회",
      date: (this.tournament && this.tournament.date) || new Date().toISOString().slice(0, 10),
      startTime: "08:00",
      gameDurationMinutes: 40,
      courts: ["15번", "16번", "17번", "18번"],
      timeSlots: this.matchmaker.generateTimeSlots("08:00", 40, 5),
      matches: [],
      courtBookings: [],
      history: [],
      status: "ready",
      isMasterReset: true
    };

    this.tournament = cleanTournament;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cleanTournament));

      // Remove legacy storage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("tennis_active_tournament_") && k !== this.storageKey) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();

      if (window.caches) {
        caches.keys().then(names => {
          names.forEach(n => caches.delete(n));
        });
      }
    } catch(e) {
      console.error("Master reset storage error:", e);
    }

    this.closeModal("masterResetModal");
    alert("✅ 마스터 리셋 완료!\n\n모든 예시 경기 결과, 대회 내역, 커피 순위 및 브라우저 캐시가 완전히 초기화되었습니다.\n(※ 64명 공식 회원 명단과 LEVEL 정보는 안전하게 보존되었습니다)\n\n페이지가 최신 상태로 새로고침됩니다.");
    window.location.href = window.location.origin + window.location.pathname + "?reset=" + Date.now();
  }

  resetTournamentData() {
    if (!confirm("테스트를 위해 초기 예시 샘플 데이터셋으로 복원하시겠습니까?")) return;
    this.tournament = JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT));
    this.saveTournament();
    this.closeModal("settingsModal");
    this.render();
    alert("예시 샘플 데이터로 복원되었습니다.");
  }

  syncOfficialRoster() {
    this.memberManager.resetToDefault();
    this.renderRosterTable();
    this.renderLeaderboard();
    this.renderMyMatchesView();
    alert("✅ 64명 공식 회원 명부로 완벽하게 최신화되었습니다!");
  }

  showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("active");
    // Mobile native Back button support
    try {
      if (!history.state || history.state.modalId !== id) {
        history.pushState({ modalId: id }, "");
      }
    } catch(e) {}
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
    // Pop history state if closing programmatically
    try {
      if (history.state && history.state.modalId === id) {
        history.back();
      }
    } catch(e) {}
  }

  closeAllActiveModals() {
    document.querySelectorAll(".modal-backdrop.active").forEach(m => m.classList.remove("active"));
  }

  switchMobileTab(tabId) {
    this.activeMobileTab = tabId;
    document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    document.querySelectorAll(".mobile-view-section").forEach(sec => {
      sec.classList.toggle("active", sec.id === tabId);
    });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`전체화면 전환 오류: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
    const btn = document.getElementById("btnToggleAudio");
    if (btn) {
      btn.textContent = this.audioEnabled ? "🔔 알림음 켜짐" : "🔕 알림음 꺼짐";
    }
  }

  bindEvents() {
    // 1. Mobile Phone Native Back Button Listener (popstate)
    window.addEventListener("popstate", (e) => {
      const activeModals = document.querySelectorAll(".modal-backdrop.active");
      if (activeModals.length > 0) {
        activeModals.forEach(m => m.classList.remove("active"));
      }
    });

    // 2. Click outside (backdrop tap) to close modal
    document.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("modal-backdrop") && e.target.classList.contains("active")) {
        this.closeModal(e.target.id);
      }
    });

    const btnToggleView = document.getElementById("btnToggleView");
    if (btnToggleView) {
      btnToggleView.addEventListener("click", () => {
        const isStadium = document.body.classList.toggle("force-stadium-mode");
        btnToggleView.textContent = isStadium ? "📱 모바일 뷰" : "📺 전광판 모드";
      });
    }

    const selectEl = document.getElementById("myPlayerSelect");
    if (selectEl) {
      selectEl.addEventListener("change", (e) => {
        this.selectedPlayerFilter = e.target.value;
        this.renderMyMatchesView();
      });
    }
  }

  escape(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }
}

window.TournamentApp = TournamentApp;
window.app = null;
window.addEventListener("DOMContentLoaded", () => {
  window.app = new TournamentApp();
});
/**
 * 🎾 테니스 동호회 실시간 대회 전광판 & 모바일 대시보드 (Main App Controller)
 */

class TournamentApp {
  constructor() {
    this.storageKey = "tennis_active_tournament_v1";
    this.memberManager = new MemberManager();
    this.matchmaker = new MatchmakerEngine(this.memberManager);
    this.leaderboard = new LeaderboardEngine();
    
    this.tournament = this.loadTournament();
    this.activeMobileTab = "tab-leaderboard";
    this.selectedPlayerFilter = "";
    this.audioEnabled = true;
    this.editingMatchId = null;

    this.initAudioContext();
    this.initClock();
    this.bindEvents();
    this.render();
  }

  loadTournament() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch(e) {
      console.warn("대회 데이터 로드 실패, 기본값 사용:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT));
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
        // 승리/확정 팡파레 (3음 멜로디)
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === "call") {
        // 코트 호출 차임벨 (2음 딩동)
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.15); // A5
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
    this.renderQrCode();
  }

  renderHeader() {
    const titleEl = document.getElementById("tournamentTitleDisplay");
    if (titleEl) titleEl.textContent = this.tournament.title;

    const modeBadgeEl = document.getElementById("tournamentModeBadge");
    if (modeBadgeEl) {
      const mode = this.tournament.mode || "regular_individual";
      if (mode === "event") {
        modeBadgeEl.textContent = "🎉 이벤트 게임";
        modeBadgeEl.className = "mode-pill mode-event";
      } else if (mode === "regular_group") {
        modeBadgeEl.textContent = "👥 정기전: 조별 대항전";
        modeBadgeEl.className = "mode-pill mode-group";
      } else {
        modeBadgeEl.textContent = "👤 정기전: 개인 리그전 (전 경기 복식 · 개인 승점 누적)";
        modeBadgeEl.className = "mode-pill mode-individual";
      }
    }
  }

  renderLeaderboard() {
    const tbody = document.getElementById("leaderboardBody");
    if (!tbody) return;

    const mode = this.tournament.mode || "regular_individual";

    if (mode === "regular_group") {
      // 조별 순위 렌더링
      const groupRanked = this.leaderboard.calculateGroupLeaderboard(this.tournament.matches);
      let html = "";
      groupRanked.forEach((g, idx) => {
        const rank = idx + 1;
        const rankClass = rank === 1 ? "rank-pill-1" : rank === 2 ? "rank-pill-2" : rank === 3 ? "rank-pill-3" : "rank-pill-default";
        const rowClass = rank <= 3 ? `row-rank-${rank}` : "";

        html += `
          <tr class="${rowClass}">
            <td style="text-align: center;"><span class="rank-pill ${rankClass}">${rank}</span></td>
            <td>-</td>
            <td class="player-name-cell"><b>${g.group}</b></td>
            <td>${g.played}전 ${g.wins}승 ${g.draws}무 ${g.losses}패</td>
            <td><span class="pts-badge">${g.points}</span></td>
            <td><span class="${g.diff > 0 ? "diff-positive" : g.diff < 0 ? "diff-negative" : "diff-zero"}">${g.diff > 0 ? "+" + g.diff : g.diff}</span></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
      return;
    }

    // 개인 리그전 순위 렌더링
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
      if (p.delta > 0) {
        deltaHtml = `<span class="delta-up">▲${p.delta}</span>`;
      } else if (p.delta < 0) {
        deltaHtml = `<span class="delta-down">▼${Math.abs(p.delta)}</span>`;
      }

      const diffClass = p.diff > 0 ? "diff-positive" : p.diff < 0 ? "diff-negative" : "diff-zero";
      const diffStr = p.diff > 0 ? `+${p.diff}` : `${p.diff}`;

      html += `
        <tr class="${rowClass}">
          <td style="text-align: center;"><span class="rank-pill ${rankClass}">${p.rank}</span></td>
          <td>${deltaHtml}</td>
          <td class="player-name-cell">${p.name}</td>
          <td>${p.record}</td>
          <td><span class="pts-badge">${p.points}</span></td>
          <td><span class="${diffClass}">${diffStr}</span></td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
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

    const courts = this.tournament.courts || ["1번", "2번", "3번"];
    const timeSlots = this.tournament.timeSlots || [];

    // 1. 헤더 (코트 + 시간 슬롯)
    let thHtml = `<th class="th-court">코트</th>`;
    timeSlots.forEach(ts => {
      thHtml += `<th class="th-time">${ts.start} - ${ts.end}</th>`;
    });
    thead.innerHTML = thHtml;

    // 2. 바디 (코트별 행)
    let rowsHtml = "";
    courts.forEach(courtName => {
      rowsHtml += `<tr>`;
      rowsHtml += `<td class="court-label-cell">${courtName}</td>`;

      timeSlots.forEach((ts, tIdx) => {
        // 해당 코트 & 시간 슬롯 경기 검색
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

    // 선수 선택 드롭다운 옵션 채우기
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
    let html = "";
    members.forEach((m, idx) => {
      const statusBadge = m.status === "active" 
        ? `<span class="status-pill-active">출전중</span>`
        : m.status === "inactive" 
          ? `<span class="status-pill-inactive">불참</span>` 
          : `<span class="status-pill-withdrawn">탈퇴</span>`;

      html += `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><b>${m.name}</b></td>
          <td><span class="level-badge">NTRP ${m.level}</span></td>
          <td>${m.group}</td>
          <td>${m.role || "회원"}</td>
          <td>${statusBadge}</td>
          <td style="text-align:center;">
            <button class="btn-xs" onclick="app.editMemberModal('${m.id}')">수정</button>
            <button class="btn-xs btn-danger-xs" onclick="app.toggleMemberStatus('${m.id}')">${m.status === "active" ? "불참처리" : "출전전환"}</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  renderQrCode() {
    const qrImg = document.getElementById("mobileQrImg");
    if (!qrImg) return;
    // Current URL or safe fallback encoded into QR via quick SVG / image API
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

    // 경기 속보 등록
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
    
    // 선수 옵션
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

  // 4대 대진 생성 모달 액션
  openMatchmakerModal() {
    this.showModal("matchmakerModal");
  }

  executeAutoMatchmaker(mode) {
    const active = this.memberManager.getActiveMembers();
    const courts = this.tournament.courts;
    const timeSlots = this.tournament.timeSlots;

    if (mode === "level_balanced") {
      const generated = this.matchmaker.generateLevelBalancedMatches(active, courts, timeSlots);
      this.tournament.matches = generated;
      this.tournament.mode = "regular_individual";
      alert(`✅ 레벨 밸런스 기반 ${generated.length}개 대진이 자동 생성되었습니다!`);
    } else if (mode === "group_matches") {
      const byGroup = {};
      active.forEach(m => {
        if (!byGroup[m.group]) byGroup[m.group] = [];
        byGroup[m.group].push(m);
      });
      const generated = this.matchmaker.generateGroupMatches(byGroup, courts, timeSlots);
      this.tournament.matches = generated;
      this.tournament.mode = "regular_group";
      alert(`✅ A~D 4개조 조별 대항전 ${generated.length}개 대진이 자동 생성되었습니다!`);
    } else if (mode === "event_random") {
      const generated = this.matchmaker.generateLevelBalancedMatches(active, courts, timeSlots);
      this.tournament.matches = generated;
      this.tournament.mode = "event";
      alert(`✅ 이벤트 게임 ${generated.length}개 대진이 생성되었습니다!`);
    }

    this.saveTournament();
    this.closeModal("matchmakerModal");
    this.render();
  }

  // 회원 관리 모달 액션
  openRosterModal() {
    this.renderRosterTable();
    this.showModal("rosterModal");
  }

  addNewMember() {
    const name = document.getElementById("addMemberName").value.trim();
    const level = parseFloat(document.getElementById("addMemberLevel").value) || 3.0;
    const group = document.getElementById("addMemberGroup").value;
    const role = document.getElementById("addMemberRole").value;

    if (!name) {
      alert("선수 이름을 입력해주세요.");
      return;
    }

    this.memberManager.addMember({ name, level, group, role, status: "active" });
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
    // 현재 대회 순위 스냅샷을 시즌에 저장
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

  // 대회 설정 모달
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

  resetTournamentData() {
    if (!confirm("현재 대회 데이터를 레퍼런스 초기 샘플 데이터로 복원하시겠습니까?")) return;
    this.tournament = JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT));
    this.saveTournament();
    this.closeModal("settingsModal");
    this.render();
    alert("초기 데이터로 복원되었습니다.");
  }

  // 모달 헬퍼
  showModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
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
    // 뷰 모드 토글 (모바일 탭 뷰 ↔ 대형 전광판 뷰)
    const btnToggleView = document.getElementById("btnToggleView");
    if (btnToggleView) {
      btnToggleView.addEventListener("click", () => {
        const isStadium = document.body.classList.toggle("force-stadium-mode");
        btnToggleView.textContent = isStadium ? "📱 모바일 뷰" : "📺 전광판 모드";
      });
    }

    // 내 경기 필터 변경 이벤트
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

// 전역 싱글톤 인스턴스
window.app = null;
window.addEventListener("DOMContentLoaded", () => {
  window.app = new TournamentApp();
});
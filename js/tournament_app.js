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
    this.storageKey = "tennis_active_tournament_v9";
    this.memberManager = new MemberManager();
    this.matchmaker = new MatchmakerEngine(this.memberManager);
    this.leaderboard = new LeaderboardEngine();
    
    // 🛡️ 보안 강화: 평문 PIN 제거 및 SHA-256 해시 인증
    this.defaultPinHash = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
    this.staffPinHash = localStorage.getItem("tennis_staff_pin_hash") || this.defaultPinHash;
    localStorage.removeItem("tennis_staff_pin");

    // ☁️ Google Apps Script 클라우드 DB 동기화 (라이브 엔드포인트 영구 내장)
    this.defaultGasUrl = "https://script.google.com/macros/s/AKfycbz4kNhi6_JkN8l8iOuYltZk-99tRIPcTBm5jU86RPvWav-KweYtsMPX1hzMCuo1WqZk/exec";
    this.gasUrl = localStorage.getItem("tennis_gas_url") || this.defaultGasUrl;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.cloudSyncTimer = null;

    // 🛡️ 개인정보 보호 마스킹 모드 (기본값 활성화)
    this.maskingEnabled = localStorage.getItem("tennis_privacy_masking") !== "false";

    this.tournament = this.loadTournament();
    this.activeMobileTab = "tab-courts";
    this.selectedBookingMonth = new Date().toISOString().slice(0, 7);
    this.leaderboardViewMode = "monthly"; // monthly (개인리그전) vs annual (연간 종합 랭킹)
    this.selectedPlayerFilter = localStorage.getItem("tennis_my_player_name") || "";
    this.appMode = localStorage.getItem("tennis_app_mode") || "member";
    this.audioEnabled = true;
    this.editingMatchId = null;
    this.builderMatches = [];
    this.modalStack = [];
    this.isProgrammaticBack = false;
    this.tickerRotationIndex = 0;
    this.tickerInterval = null;

    this.initAudioContext();
    this.initClock();
    this.initCloudSync();
    this.bindEvents();
    this.applyAppModeUi();
    this.updateCloudStatusBadge();
    this.render();
  }

  loadTournament() {
    try {
      localStorage.removeItem("tennis_active_tournament_v1");
      localStorage.removeItem("tennis_active_tournament_v2");
      localStorage.removeItem("tennis_active_tournament_v3");
      localStorage.removeItem("tennis_active_tournament_v4");
      localStorage.removeItem("tennis_active_tournament_v5");
      localStorage.removeItem("tennis_active_tournament_v6");
      localStorage.removeItem("tennis_active_tournament_v7");
      localStorage.removeItem("tennis_active_tournament_v8");

      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          // 🛡️ 기존 로컬 데이터 자동 마스킹 위생 처리
          if (Array.isArray(parsed.players)) {
            parsed.players.forEach(p => {
              if (p && p.name && window.maskName) p.name = window.maskName(p.name);
            });
          }
          if (Array.isArray(parsed.matches)) {
            parsed.matches.forEach(m => {
              if (m.teamA && window.maskName) m.teamA = m.teamA.map(n => window.maskName(n));
              if (m.teamB && window.maskName) m.teamB = m.teamB.map(n => window.maskName(n));
            });
          }
          if (parsed.isMasterReset || (Array.isArray(parsed.matches) && parsed.matches.length === 0)) {
            return parsed;
          }
          return parsed;
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
      // ☁️ 백그라운드 클라우드 자동 동기화
      this.pushToCloud(true);
    } catch(e) {
      console.error("대회 데이터 저장 실패:", e);
    }
  }

  // 🛡️ 개인정보 보호: 이름 마스킹 포맷터
  formatPlayerName(name) {
    if (!name) return "";
    if (this.maskingEnabled && window.maskName) {
      return window.maskName(name);
    }
    return name;
  }

  formatPairNames(pairStr) {
    if (!pairStr) return "";
    if (this.maskingEnabled && window.maskPairNames) {
      return window.maskPairNames(pairStr);
    }
    return pairStr;
  }

  getTeamWithGroupBadge(players = []) {
    if (!players || players.length === 0) return `<span style="color:var(--text-muted);">미정</span>`;
    const active = this.memberManager.getActiveMembers();
    const memberGroupMap = new Map();
    active.forEach(m => {
      memberGroupMap.set(m.name, m.group || "A조");
      if (m.rawName) memberGroupMap.set(m.rawName, m.group || "A조");
    });

    const groups = players.map(n => memberGroupMap.get(n)).filter(Boolean);
    const set = new Set(groups);
    const namesStr = players.map(n => this.formatPlayerName(n)).join(", ");

    if (set.size === 1) {
      const g = Array.from(set)[0];
      const gLetter = g.replace("조", "");
      return `<span class="badge-group-pill badge-group-${gLetter}" style="font-size:10px; padding:2px 6px; margin-right:4px;">${g}</span><span style="color:#fff;">${this.escape(namesStr)}</span>`;
    } else {
      return `<span style="color:#fff;">${this.escape(namesStr)}</span>`;
    }
  }

  // 🛡️ 보안 강화: SHA-256 단방향 암호화 해시 및 PIN 검증
  async hashPin(pin) {
    if (!pin) return "";
    try {
      const msgUint8 = new TextEncoder().encode(pin.trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch(e) {
      let h = 0;
      for (let i = 0; i < pin.length; i++) {
        h = ((h << 5) - h) + pin.charCodeAt(i);
        h |= 0;
      }
      return String(h);
    }
  }

  async verifyPin(inputPin) {
    if (!inputPin) return false;
    const inputHash = await this.hashPin(inputPin);
    return inputHash === this.staffPinHash;
  }

  async changeStaffPin() {
    const currentPin = prompt("🔐 현재 관리자 PIN 비밀번호를 입력하세요:");
    if (currentPin === null) return;
    if (!(await this.verifyPin(currentPin))) {
      alert("❌ 현재 PIN 비밀번호가 일치하지 않습니다.");
      return;
    }
    const newPin = prompt("🔑 새로 설정할 4자리 이상 관리자 PIN 비밀번호를 입력하세요:");
    if (!newPin || newPin.trim().length < 4) {
      alert("⚠️ PIN 비밀번호는 4자리 이상이어야 합니다.");
      return;
    }
    const confirmPin = prompt("🔑 새 PIN 비밀번호를 한 번 더 입력하세요:");
    if (newPin !== confirmPin) {
      alert("❌ 새 비밀번호가 일치하지 않습니다.");
      return;
    }
    const newHash = await this.hashPin(newPin);
    this.staffPinHash = newHash;
    localStorage.setItem("tennis_staff_pin_hash", newHash);
    alert("✅ 관리자 PIN 비밀번호가 안전하게 변경되었습니다!");
  }

  // ☁️ Google Apps Script 클라우드 DB 동기화 메소드
  initCloudSync() {
    if (this.cloudSyncTimer) clearInterval(this.cloudSyncTimer);
    this.cloudSyncTimer = setInterval(() => {
      if (this.gasUrl && !this.isSyncing) {
        this.syncFromCloud(true);
      }
    }, 30000);

    setTimeout(() => {
      if (this.gasUrl) {
        this.syncFromCloud(true);
      }
    }, 1500);
  }

  async syncFromCloud(silent = false) {
    if (!this.gasUrl) {
      if (!silent) this.openCloudSettingsModal();
      return;
    }
    this.isSyncing = true;
    // 사용자가 직접 클릭했을 때만 1초간 회전 피드백 제공, 백그라운드 폴링 시에는 구름 아이콘 유지
    if (!silent) {
      this.updateCloudStatusBadge("syncing");
    }

    // 4초 강제 타임아웃 컨트롤러
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 4000);

    try {
      const url = `${this.gasUrl}${this.gasUrl.includes("?") ? "&" : "?"}action=get_tournament&_t=${Date.now()}`;
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutTimer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result && result.status === "ok" && result.data) {
        const remoteData = result.data;
        // 🛡️ 신규 생성된 로컬 대회가 클라우드의 이전 구버전 데이터로 덮어씌워지는 현상 방지
        const localCreatedTime = parseInt((this.tournament?.id || "").replace("tourney_", "") || "0");
        const remoteCreatedTime = parseInt((remoteData?.id || "").replace("tourney_", "") || "0");
        if (localCreatedTime && remoteCreatedTime && localCreatedTime > remoteCreatedTime) {
          console.log("로컬 새 대회가 클라우드 데이터보다 최신이므로 덮어쓰기 건너뜀");
          this.pushToCloud(true);
          return;
        }

        this.tournament = remoteData;
        localStorage.setItem(this.storageKey, JSON.stringify(this.tournament));
        this.lastSyncTime = new Date();
        this.updateCloudStatusBadge("connected");
        this.render();
        if (!silent) alert("✅ 클라우드에서 최신 데이터를 불러왔습니다!");
      } else {
        this.updateCloudStatusBadge("connected");
      }
    } catch(err) {
      clearTimeout(timeoutTimer);
      console.warn("클라우드 동기화 예외 (로컬 데이터 유지):", err.message);
      // 타임아웃이나 오류 시에도 '동기화 중'으로 멈춰있지 않고 정상 클라우드 상태로 즉시 복귀
      this.updateCloudStatusBadge("connected");
      if (!silent && err.name !== "AbortError") {
        alert("ℹ️ 동기화 응답 지연 (로컬 데이터로 정상 작동 중입니다)");
      }
    } finally {
      this.isSyncing = false;
      this.updateCloudStatusBadge("connected");
    }
  }

  async pushToCloud(silent = true) {
    if (!this.gasUrl) return;
    try {
      // 백그라운드 전송이므로 사용자 화면을 방해하지 않고 조용히 전송
      await fetch(this.gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "save_tournament",
          tournament: this.tournament
        })
      });
      this.lastSyncTime = new Date();
    } catch(err) {
      console.warn("클라우드 백그라운드 업로드 지연 (로컬 보존):", err.message);
    }
  }

  async pushMatchToCloud(match) {
    if (!this.gasUrl || !match || !match.id) return;
    try {
      await fetch(this.gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "update_match",
          match: match
        })
      });
      this.lastSyncTime = new Date();
    } catch(err) {
      console.warn("개별 경기 클라우드 동기화 지연:", err.message);
    }
  }

  openCloudSettingsModal() {
    const inputEl = document.getElementById("inputGasUrl");
    if (inputEl) {
      inputEl.value = this.gasUrl || "";
      this.showModal("cloudSettingsModal");
    } else {
      const curUrl = this.gasUrl || "";
      const input = prompt(
        "☁️ [Google Apps Script 클라우드 동기화 설정]\n\n" +
        "배포하신 Google Apps Script 웹 앱 URL을 입력하세요:\n" +
        "(비워둘 경우 로컬 단독 모드로 작동합니다)",
        curUrl
      );
      if (input === null) return;
      this.gasUrl = input.trim();
      try {
        localStorage.setItem("tennis_gas_url", this.gasUrl);
      } catch(e) {}
      this.updateCloudStatusBadge();
      if (this.gasUrl) {
        alert("✅ 클라우드 URL이 저장되었습니다. 즉시 동기화를 시도합니다.");
        this.syncFromCloud(false);
      } else {
        alert("ℹ️ 클라우드 연동이 해제되었으며 로컬 단독 모드로 작동합니다.");
      }
    }
  }

  async testGasConnection() {
    const url = (document.getElementById("inputGasUrl")?.value || this.gasUrl || "").trim();
    if (!url) {
      alert("⚠️ 먼저 웹 앱 URL을 입력해 주세요.");
      return;
    }
    try {
      const pingUrl = `${url}${url.includes("?") ? "&" : "?"}action=ping&_t=${Date.now()}`;
      const res = await fetch(pingUrl);
      const json = await res.json();
      if (json && json.status === "ok") {
        alert("✅ 연결 성공!\n\nGoogle Apps Script 백엔드가 정상 응답합니다:\n" + json.message);
      } else {
        alert("⚠️ 응답을 받았으나 데이터 형식이 올바르지 않습니다:\n" + JSON.stringify(json));
      }
    } catch(e) {
      alert("❌ 연결 실패:\n" + e.message + "\n\n(Apps Script 배포 시 '액세스 권한: 모든 사용자/Anyone'으로 설정되었는지 확인하세요)");
    }
  }

  saveCloudUrlFromModal() {
    const url = document.getElementById("inputGasUrl")?.value.trim() || "";
    this.gasUrl = url;
    try {
      localStorage.setItem("tennis_gas_url", this.gasUrl);
    } catch(e) {}
    this.updateCloudStatusBadge();
    this.closeModal("cloudSettingsModal");
    if (this.gasUrl) {
      alert("✅ 클라우드 URL이 저장되었습니다. Google Sheets 동기화를 시작합니다.");
      this.syncFromCloud(false);
    } else {
      alert("ℹ️ 클라우드 연동이 해제되어 로컬 단독 모드로 전환되었습니다.");
    }
  }

  updateCloudStatusBadge(state) {
    const badge = document.getElementById("cloudSyncBadge");
    const mobBadge = document.getElementById("mobCloudSyncBadge");
    if (!badge && !mobBadge) return;

    let icon = "💾"; // 로컬 단독 아이콘
    let cls = "badge-cloud-local";
    let title = "💾 로컬 단독 모드 (클릭하여 클라우드 설정)";

    if (this.gasUrl) {
      if (state === "syncing" || this.isSyncing) {
        icon = "🔄";
        cls = "badge-cloud-syncing";
        title = "🔄 Google Sheets 실시간 동기화 중...";
      } else if (state === "error") {
        icon = "⚠️";
        cls = "badge-cloud-error";
        title = "⚠️ 동기화 오류 (클릭하여 재시도)";
      } else {
        icon = "☁️";
        cls = "badge-cloud-connected";
        title = `☁️ 클라우드 연결됨 (최근: ${this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString() : '방금'})`;
      }
    }

    [badge, mobBadge].forEach(el => {
      if (el) {
        el.className = `cloud-status-badge ${cls}`;
        el.innerHTML = icon;
        el.title = title;
      }
    });
  }

  initClock() {
    let tickCount = 0;
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const clockEl = document.getElementById("liveClock");
      if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;

      // 10초마다 슬롯 만료 시점(다음 슬롯 시작 + 3분) 체크 및 배너 모드 자동 전환
      tickCount++;
      if (tickCount % 10 === 0) {
        this.renderBreakingBanner();
      }
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
    this.applyAppModeUi();
    this.renderHeader();
    this.renderLeaderboard();
    this.renderNewsTicker();
    this.renderTimeline();
    this.renderBreakingBanner();
    this.renderMyMatchesView();
    this.renderMyNextMatchBanner();
    this.renderMobileCourts();
    this.renderRosterTable();
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
      const isLeague = this.tournament.isLeagueMatch !== false;

      if (!isLeague) {
        modeBadgeEl.textContent = "🎉 친선 / 이벤트전 (개인 리그 순위 미반영)";
        modeBadgeEl.className = "mode-pill mode-event";
      } else if (mode === "event") {
        modeBadgeEl.textContent = "🎉 이벤트 게임 (조별 랜덤 복식 · 리그 반영)";
        modeBadgeEl.className = "mode-pill mode-event";
      } else if (mode === "regular_group") {
        modeBadgeEl.textContent = "👥 정기전: 조별 대항전 (A~D 4개조 · 리그 반영)";
        modeBadgeEl.className = "mode-pill mode-group";
      } else {
        modeBadgeEl.textContent = "👤 정기전: 개인 리그전 (리그 순위 반영 · 다승/득실 누적)";
        modeBadgeEl.className = "mode-pill mode-individual";
      }
    }
  }

  renderLeaderboard() {
    const monthlyTbody = document.getElementById("monthlyLeaderboardBody");
    const annualTbody = document.getElementById("annualLeaderboardBody");
    const legacyTbody = document.getElementById("leaderboardBody");
    const mobTbody = document.getElementById("mobileLeaderboardBody");
    const dtThead = document.getElementById("leaderboardThead");
    const mobThead = document.getElementById("mobileLeaderboardThead");
    const modeBadgeEl = document.getElementById("leaderboardCurrentModeText");
    const resetBtn = document.getElementById("btnResetLeagueUi");
    const mobModeText = document.getElementById("mobLeaderboardModeText");
    const mobResetBtn = document.getElementById("mobBtnResetLeague");
    const bannerEl = document.getElementById("leaderboardBannerNotice");
    const mobBannerEl = document.getElementById("mobLeaderboardBannerNotice");

    // 1. Sync Mobile Tab Button Active Styles
    const mobTabMonthlyBtn = document.getElementById("mobTabBtnMonthlyLeague");
    const mobTabAnnualBtn = document.getElementById("mobTabBtnAnnualSeason");
    if (mobTabMonthlyBtn && mobTabAnnualBtn) {
      mobTabMonthlyBtn.classList.toggle("active", this.leaderboardViewMode === "monthly");
      mobTabAnnualBtn.classList.toggle("active", this.leaderboardViewMode === "annual");
    }

    // 2. Calculate Cumulative League Rankings
    const activePlayers = this.memberManager.getActiveMembers();
    const isLeague = this.tournament.isLeagueMatch !== false;
    const isCommitted = !!this.tournament.leagueCommitted;
    const ranked = this.leaderboard.calculateIndividualLeaderboard(
      this.tournament.matches, 
      activePlayers, 
      isLeague,
      isCommitted,
      { win: this.tournament.pointsWin || 3, draw: this.tournament.pointsDraw || 1, loss: this.tournament.pointsLoss || 0 }
    );

    // Update Subtitles regarding cumulative status
    const deskSubtitle = document.getElementById("desktopLeaderboardSubtitle");
    if (deskSubtitle) {
      deskSubtitle.textContent = isLeague 
        ? (this.tournament.status === "completed" ? "운영진 리셋 전까지 지속 누적 (대회 완료 커밋됨)" : "운영진 리셋 전까지 지속 누적 (현재 경기 실시간 합산 중)")
        : "운영진 리셋 전까지 지속 누적 (현재 대회 미반영 · 이전 누적 유지)";
    }
    if (mobModeText) {
      mobModeText.textContent = isLeague 
        ? (this.tournament.status === "completed" ? "👤 리그전 누적 순위 (대회 완료 커밋됨 · 운영진 리셋 전까지 누적)" : "👤 리그전 반영 대회 진행 중 (실시간 합산 · 운영진 리셋 전까지 누적)")
        : "👤 친선/이벤트전 (현재 경기 미반영 · 기존 누적 순위 유지)";
    }

    let monthlyHtml = "";
    let mobMonthlyHtml = "";
    ranked.forEach(p => {
      const rankClass = p.rank === 1 ? "rank-pill-1" : p.rank === 2 ? "rank-pill-2" : p.rank === 3 ? "rank-pill-3" : "rank-pill-default";
      const rowClass = p.rank <= 3 ? `row-rank-${p.rank}` : "";

      let deltaHtml = `<span class="delta-same">-</span>`;
      if (p.delta > 0) deltaHtml = `<span class="delta-up">▲${p.delta}</span>`;
      else if (p.delta < 0) deltaHtml = `<span class="delta-down">▼${Math.abs(p.delta)}</span>`;

      const diffClass = p.diff > 0 ? "diff-positive" : p.diff < 0 ? "diff-negative" : "diff-zero";
      const diffStr = p.diff > 0 ? `+${p.diff}` : `${p.diff}`;

      monthlyHtml += `
        <tr class="${rowClass}">
          <td style="text-align: center;"><span class="rank-pill ${rankClass}">${p.rank}</span></td>
          <td style="text-align: center;">${deltaHtml}</td>
          <td class="player-name-cell"><b>${this.formatPlayerName(p.name)}</b></td>
          <td>${p.record}</td>
          <td style="text-align: center;"><span class="${diffClass}">${diffStr}</span></td>
        </tr>
      `;

      mobMonthlyHtml += `
        <tr class="${rowClass}">
          <td style="text-align: center;"><span class="rank-pill ${rankClass}">${p.rank}</span></td>
          <td style="text-align: center;">${deltaHtml}</td>
          <td class="player-name-cell"><b>${this.formatPlayerName(p.name)}</b></td>
          <td style="font-size: 11px;">${p.record}</td>
          <td style="text-align: center;"><span class="${diffClass}">${diffStr}</span></td>
        </tr>
      `;
    });

    // 3. Calculate Annual Cumulative Season Rankings
    const cumulative = this.leaderboard.getSeasonCumulativeLeaderboard();
    let annualHtml = "";
    let mobAnnualHtml = "";
    cumulative.forEach((c, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? "rank-pill-1" : rank === 2 ? "rank-pill-2" : rank === 3 ? "rank-pill-3" : "rank-pill-default";
      const rowClass = rank <= 3 ? `row-rank-${rank}` : "";
      const annDiffClass = c.totalDiff > 0 ? "diff-positive" : c.totalDiff < 0 ? "diff-negative" : "diff-zero";
      const annDiffStr = c.totalDiff > 0 ? `+${c.totalDiff}` : `${c.totalDiff}`;

      annualHtml += `
        <tr class="${rowClass}">
          <td style="text-align: center;"><span class="rank-pill ${rankClass}">${rank}</span></td>
          <td style="text-align: center;"><span class="diff-tag diff-${c.trend || 'same'}">${c.trend === 'up' ? '▲' : c.trend === 'down' ? '▼' : '-'}</span></td>
          <td class="player-name-cell"><b>${this.formatPlayerName(c.name)}</b></td>
          <td style="text-align: center;">${c.totalWins}승 ${c.totalDraws}무 ${c.totalLosses}패</td>
          <td style="text-align: center;"><span class="${annDiffClass}">${annDiffStr}</span></td>
          <td style="text-align: center; font-weight:800; color:#fbbf24;">🥇 ${c.championships}회 / 🥈 ${c.runnerUps}회</td>
          <td style="text-align: center; color:var(--text-muted); font-size:11px;">${c.tournamentsCount}개 대회</td>
        </tr>
      `;

      mobAnnualHtml += `
        <tr class="${rowClass}">
          <td style="text-align: center;"><span class="rank-pill ${rankClass}">${rank}</span></td>
          <td class="player-name-cell"><b>${this.formatPlayerName(c.name)}</b></td>
          <td style="text-align: center; font-size:11px;">${c.totalWins}승 ${c.totalLosses}패</td>
          <td style="text-align: center;"><span class="${annDiffClass}">${annDiffStr}</span></td>
          <td style="text-align: center; font-size:11px; font-weight:800; color:#fbbf24;">🥇${c.championships} 🥈${c.runnerUps}</td>
        </tr>
      `;
    });

    // 4. Populate Desktop Dual Leaderboards (Both rendered simultaneously)
    if (monthlyTbody) monthlyTbody.innerHTML = monthlyHtml;
    if (annualTbody) annualTbody.innerHTML = annualHtml;

    // 5. Populate Mobile Dual Leaderboards (Both rendered simultaneously without tabs)
    const mobAnnualTbody = document.getElementById("mobileAnnualLeaderboardBody");
    if (mobTbody) mobTbody.innerHTML = mobMonthlyHtml;
    if (mobAnnualTbody) mobAnnualTbody.innerHTML = mobAnnualHtml;
    if (legacyTbody) legacyTbody.innerHTML = monthlyHtml;

    // 6. Real-time Group Event (A~D조 대항전) Leaderboard calculation & rendering
    this.renderGroupEventLeaderboard();
  }

  switchLeaderboardSubTab(tab) {
    this.currentLeaderboardSubTab = tab || "league";

    // 1. Mobile Buttons & Sections
    const btnMobLeague = document.getElementById("btnMobTabLeague");
    const btnMobGroup = document.getElementById("btnMobTabGroupEvent");
    const btnMobAnnual = document.getElementById("btnMobTabAnnual");
    const secMobLeague = document.getElementById("secPersonalLeagueMobile");
    const secMobGroup = document.getElementById("secGroupEventMobile");
    const secMobAnnual = document.getElementById("secAnnualRankMobile");

    if (btnMobLeague) btnMobLeague.classList.toggle("active", this.currentLeaderboardSubTab === "league");
    if (btnMobGroup) btnMobGroup.classList.toggle("active", this.currentLeaderboardSubTab === "group_event");
    if (btnMobAnnual) btnMobAnnual.classList.toggle("active", this.currentLeaderboardSubTab === "annual");

    if (secMobLeague) secMobLeague.style.display = (this.currentLeaderboardSubTab === "league") ? "block" : "none";
    if (secMobGroup) secMobGroup.style.display = (this.currentLeaderboardSubTab === "group_event") ? "block" : "none";
    if (secMobAnnual) secMobAnnual.style.display = (this.currentLeaderboardSubTab === "annual") ? "block" : "none";

    // 2. PC Buttons & Sections
    const btnPcLeague = document.getElementById("btnPcTabLeague");
    const btnPcGroup = document.getElementById("btnPcTabGroupEvent");
    const secPcLeague = document.getElementById("secPersonalLeaguePc");
    const secPcGroup = document.getElementById("secGroupEventPc");

    if (btnPcLeague) btnPcLeague.classList.toggle("active", this.currentLeaderboardSubTab === "league");
    if (btnPcGroup) btnPcGroup.classList.toggle("active", this.currentLeaderboardSubTab === "group_event");

    if (secPcLeague) secPcLeague.style.display = (this.currentLeaderboardSubTab === "league") ? "block" : "none";
    if (secPcGroup) secPcGroup.style.display = (this.currentLeaderboardSubTab === "group_event") ? "block" : "none";

    if (this.currentLeaderboardSubTab === "group_event") {
      this.renderGroupEventLeaderboard();
    }
  }

  renderGroupEventLeaderboard() {
    const matches = (this.tournament && this.tournament.matches) || [];
    const members = this.memberManager.getActiveMembers();

    const groupRanked = this.leaderboard.calculateGroupEventLeaderboard(matches, members, {
      win: this.tournament.pointsWin || 3,
      draw: this.tournament.pointsDraw || 1,
      loss: this.tournament.pointsLoss || 0
    });

    const individualRanked = this.leaderboard.calculateEventIndividualLeaderboard(matches, members, {
      win: this.tournament.pointsWin || 3,
      draw: this.tournament.pointsDraw || 1,
      loss: this.tournament.pointsLoss || 0
    });

    // 1. Render Group Cards (A, B, C, D)
    let groupCardsHtml = "";
    groupRanked.forEach((g, idx) => {
      const gLetter = g.group.replace("조", "");
      const isChamp = g.isChampion;
      const isRunner = g.isRunnerUp;
      const cardClass = isChamp ? "champion-group" : (isRunner ? "runnerup-group" : "");
      const trophyIcon = isChamp ? "🥇 1위 (우승)" : (isRunner ? "🥈 2위" : `${idx + 1}위`);

      groupCardsHtml += `
        <div class="group-rank-card ${cardClass}">
          <div class="group-card-header">
            <div class="group-badge-title">
              <span class="badge-group-pill badge-group-${gLetter}">${g.group}</span>
              <span style="font-size: 13px; font-weight:800; color: ${isChamp ? '#fbbf24' : '#f8fafc'};">${trophyIcon}</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: var(--neon-cyan);">${g.played}경기 치름</span>
          </div>
          <div class="group-card-stats-row">
            <div>
              <div class="stat-box-val" style="color:#38bdf8;">${g.record}</div>
              <div class="stat-box-lbl">전적 (매치 승패)</div>
            </div>
            <div>
              <div class="stat-box-val" style="color:${g.diff > 0 ? '#34d399' : (g.diff < 0 ? '#f87171' : '#94a3b8')};">
                ${g.diff > 0 ? '+' + g.diff : g.diff}
              </div>
              <div class="stat-box-lbl">게임 득실차 (${g.gamesWon}:${g.gamesLost})</div>
            </div>
          </div>
          <div class="group-card-roster">
            <span style="color:#64748b; font-size:10px; align-self:center;">조원:</span>
            ${g.members.length === 0 ? '<span style="color:#64748b;">배정 선수 없음</span>' : g.members.map(m => `
              <span class="roster-pill">${this.formatPlayerName(m)}</span>
            `).join("")}
          </div>
        </div>
      `;
    });

    const mobCardsGrid = document.getElementById("mobileGroupCardsGrid");
    const pcCardsGrid = document.getElementById("pcGroupCardsGrid");
    if (mobCardsGrid) mobCardsGrid.innerHTML = groupCardsHtml;
    if (pcCardsGrid) pcCardsGrid.innerHTML = groupCardsHtml;

    // 2. Render Individual MVP Leaderboard
    let individualHtml = "";
    if (individualRanked.length === 0) {
      individualHtml = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">아직 완료된 경기 스코어가 없습니다.</td></tr>`;
    } else {
      individualRanked.forEach((p, idx) => {
        const gLetter = (p.group || "A조").replace("조", "");
        const rankBadge = idx === 0 
          ? `<span style="color:#fbbf24; font-weight:800;">🥇 1위</span>`
          : (idx === 1 ? `<span style="color:#cbd5e1; font-weight:800;">🥈 2위</span>` : `${idx + 1}`);

        individualHtml += `
          <tr style="${idx === 0 ? 'background:rgba(245,158,11,0.08);' : ''}">
            <td style="text-align:center; font-weight:800;">${rankBadge}</td>
            <td style="text-align:center;"><span class="badge-group-pill badge-group-${gLetter}" style="font-size:10px; padding:2px 5px;">${p.group}</span></td>
            <td><b>${this.formatPlayerName(p.name)}</b> ${idx === 0 ? '<span style="font-size:10px; color:#fbbf24; margin-left:4px;">[MVP]</span>' : ''}</td>
            <td style="text-align:center; font-family:var(--font-mono);">${p.record}</td>
            <td style="text-align:center; font-family:var(--font-mono); color:${p.diff > 0 ? '#34d399' : (p.diff < 0 ? '#f87171' : '#94a3b8')};">
              ${p.diff > 0 ? '+' + p.diff : p.diff}
            </td>
          </tr>
        `;
      });
    }

    const mobIndBody = document.getElementById("mobileGroupIndividualBody");
    const pcIndBody = document.getElementById("pcGroupIndividualBody");
    if (mobIndBody) mobIndBody.innerHTML = individualHtml;
    if (pcIndBody) pcIndBody.innerHTML = individualHtml;
  }

  openAwardCeremonyModal() {
    this.renderAwardCeremonyModal();
    this.showModal("awardCeremonyModal");
  }

  renderAwardCeremonyModal() {
    const container = document.getElementById("awardCeremonyModalBody");
    if (!container) return;

    const matches = (this.tournament && this.tournament.matches) || [];
    const members = this.memberManager.getActiveMembers();

    const groupRanked = this.leaderboard.calculateGroupEventLeaderboard(matches, members);
    const individualRanked = this.leaderboard.calculateEventIndividualLeaderboard(matches, members);

    const champGroup = groupRanked[0] || { group: "A조", record: "0승 0패", points: 0, diff: 0, members: [] };
    const runnerGroup = groupRanked[1] || { group: "B조", record: "0승 0패", points: 0, diff: 0, members: [] };
    const mvpPlayer = individualRanked[0] || null;

    let html = `
      <div style="text-align:center; margin-bottom:14px;">
        <div style="font-size:20px; font-weight:900; color:#fbbf24;">🎉 ${this.escape(this.tournament.title || "유니콘 테니스 대회")} 시상대</div>
        <div style="font-size:12px; color:#94a3b8; margin-top:4px;">A·B·C·D 조별 대항전 최종 성적 및 개인 MVP 수상자 명단</div>
      </div>

      <!-- 🥇 1위 우승 조 시상 카드 -->
      <div class="award-podium-card award-gold">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:4px;">
          <div style="font-size:17px; font-weight:900; color:#fbbf24;">🥇 [우승] ${champGroup.group}</div>
          <span style="font-size:12px; font-weight:800; color:#fff; background:#d97706; padding:3px 8px; border-radius:6px;">
            ${champGroup.record} (득실 ${champGroup.diff > 0 ? '+' + champGroup.diff : champGroup.diff})
          </span>
        </div>
        <div style="font-size:12px; color:#f8fafc; margin-top:6px; line-height:1.4;">
          <b>🏆 우승 조원:</b> ${champGroup.members.length > 0 ? champGroup.members.map(n => this.formatPlayerName(n)).join(", ") : "미배정"}
        </div>
      </div>

      <!-- 🥈 2위 준우승 조 시상 카드 -->
      <div class="award-podium-card award-silver">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:4px;">
          <div style="font-size:15px; font-weight:800; color:#e2e8f0;">🥈 [준우승] ${runnerGroup.group}</div>
          <span style="font-size:11px; font-weight:800; color:#e2e8f0; background:#475569; padding:3px 8px; border-radius:6px;">
            ${runnerGroup.record} (득실 ${runnerGroup.diff > 0 ? '+' + runnerGroup.diff : runnerGroup.diff})
          </span>
        </div>
        <div style="font-size:11px; color:#cbd5e1; margin-top:6px; line-height:1.4;">
          <b>🥈 준우승 조원:</b> ${runnerGroup.members.length > 0 ? runnerGroup.members.map(n => this.formatPlayerName(n)).join(", ") : "미배정"}
        </div>
      </div>

      <!-- 🎖️ 개인 MVP 시상 카드 -->
      <div class="award-podium-card award-mvp">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:4px;">
          <div style="font-size:16px; font-weight:900; color:#38bdf8;">🎖️ [대회 MVP / 개인 최우수 선수]</div>
          <span style="font-size:11px; font-weight:800; color:#0284c7; background:rgba(56,189,248,0.2); padding:3px 8px; border-radius:6px; border:1px solid #38bdf8;">
            최다승 &amp; 최고 득실차
          </span>
        </div>
        ${mvpPlayer ? `
          <div style="font-size:14px; font-weight:800; color:#fff;">
            👤 <span style="color:#fbbf24;">${this.formatPlayerName(mvpPlayer.name)}</span> (${mvpPlayer.group})
          </div>
          <div style="font-size:12px; color:#94a3b8; margin-top:4px;">
            기록: ${mvpPlayer.played}전 ${mvpPlayer.record} (게임 득실차 ${mvpPlayer.diff > 0 ? '+' + mvpPlayer.diff : mvpPlayer.diff})
          </div>
        ` : `<div style="font-size:12px; color:#94a3b8;">아직 완료된 경기 기록이 없습니다.</div>`}
      </div>
    `;

    container.innerHTML = html;
  }

  copyAwardSummaryToClipboard() {
    const matches = (this.tournament && this.tournament.matches) || [];
    const members = this.memberManager.getActiveMembers();

    const groupRanked = this.leaderboard.calculateGroupEventLeaderboard(matches, members);
    const individualRanked = this.leaderboard.calculateEventIndividualLeaderboard(matches, members);

    const champGroup = groupRanked[0] || { group: "A조", record: "0승 0패", points: 0, diff: 0, members: [] };
    const runnerGroup = groupRanked[1] || { group: "B조", record: "0승 0패", points: 0, diff: 0, members: [] };
    const mvpPlayer = individualRanked[0] || null;

    let text = `[🏆 ${this.tournament.title || "유니콘 테니스 대회"} 조별 대항전 공식 결과]\n\n`;
    text += `🥇 [우승] ${champGroup.group} (${champGroup.record} · 득실 ${champGroup.diff > 0 ? '+' + champGroup.diff : champGroup.diff})\n`;
    text += `   - 조원: ${champGroup.members.map(n => this.formatPlayerName(n)).join(", ")}\n\n`;
    text += `🥈 [준우승] ${runnerGroup.group} (${runnerGroup.record} · 득실 ${runnerGroup.diff > 0 ? '+' + runnerGroup.diff : runnerGroup.diff})\n`;
    text += `   - 조원: ${runnerGroup.members.map(n => this.formatPlayerName(n)).join(", ")}\n\n`;
    if (mvpPlayer) {
      text += `🎖️ [대회 MVP] ${this.formatPlayerName(mvpPlayer.name)} (${mvpPlayer.group})\n`;
      text += `   - 기록: ${mvpPlayer.played}전 ${mvpPlayer.record} (게임 득실차 ${mvpPlayer.diff > 0 ? '+' + mvpPlayer.diff : mvpPlayer.diff})\n\n`;
    }
    text += `모든 회원님들 수고 많으셨습니다! 🎾✨`;

    navigator.clipboard.writeText(text).then(() => {
      alert("📋 대회 결과 및 시상 요약 문구가 클립보드에 복사되었습니다!\n단톡방에 바로 붙여넣기(Ctrl+V) 하세요.");
    }).catch(() => {
      prompt("아래 텍스트를 복사하세요:", text);
    });
  }

  setLeaderboardMode(mode) {
    this.leaderboardViewMode = mode;
    this.renderLeaderboard();
  }

  /**
   * 🔄 개인 리그전 순위 리셋
   * - 운영진 전용 (암호화 PIN 검증)
   * - 운영진 리셋 전까지 누적된 리그전 전체 데이터(승점/전적)를 0으로 초기화
   * - 연간 누적 랭킹 및 대회 내역 보관함은 안전하게 보존
   */
  async resetCurrentLeague() {
    if (this.appMode !== "staff") {
      const pin = prompt("🔐 개인 리그전 순위를 리셋하려면 경기이사/운영진 PIN 비밀번호(4자리)를 입력하세요:");
      if (pin === null) return;
      if (!(await this.verifyPin(pin))) {
        alert("❌ PIN 비밀번호가 일치하지 않습니다.");
        return;
      }
      this.appMode = "staff";
      try {
        localStorage.setItem("tennis_app_mode", this.appMode);
      } catch(e) {}
      this.applyAppModeUi();
    }

    if (!confirm("⚠️ [개인 리그전 순위 리셋]\n\n운영진 리셋 전까지 누적된 개인 리그전 전체 전적과 득실을 초기화하시겠습니까?\n\n(※ 연간 종합 랭킹과 보관된 대회 내역은 안전하게 보존됩니다)")) {
      return;
    }

    // 1. 누적 리그전 저장소 완전 리셋
    this.leaderboard.resetLeagueCumulativeStats();
    this.leaderboard.resetIndividualRanks();

    // 2. 현재 대회 경기 스코어도 대기 상태로 초기화
    (this.tournament.matches || []).forEach(m => {
      m.scoreA = null;
      m.scoreB = null;
      m.tieBreak = null;
      m.status = "waiting";
    });
    this.tournament.leagueCommitted = false;

    this.tournament.breakingNews = "운영진에 의해 개인 리그전 누적 순위가 리셋되었습니다. 1경기부터 새롭게 시작합니다.";
    this.saveTournament();
    this.render();
    alert("✅ 개인 리그전 누적 순위가 성공적으로 리셋되었습니다!");
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

    const slotCount = timeSlots.length || 1;
    let thHtml = `<th class="th-court" style="width: 68px;">코트</th>`;
    timeSlots.forEach(ts => {
      thHtml += `<th class="th-time" style="width: calc((100% - 68px) / ${slotCount});">${ts.start} - ${ts.end}</th>`;
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
          const teamAHtml = this.getTeamWithGroupBadge(match.teamA);
          const teamBHtml = this.getTeamWithGroupBadge(match.teamB);
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
                    <div class="team-line">${teamAHtml}</div>
                    <div style="font-size: 9px; color: var(--text-muted);">vs</div>
                    <div class="team-line">${teamBHtml}</div>
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
          const isMember = this.appMode === "member";
          const emptyText = isMember ? "대기 코트" : "+ 경기 배정";
          const onclickHandler = isMember 
            ? "app.onMemberEmptyCardClick()" 
            : `app.openNewMatchModal('${courtName}', ${tIdx})`;
          rowsHtml += `
            <td>
              <div class="match-card-empty ${isMember ? 'empty-readonly' : ''}" onclick="${onclickHandler}">
                ${emptyText}
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

  renderMobileCourts() {
    const mobCourts = document.getElementById("mobileCourtsContainer");
    if (!mobCourts) return;

    const matches = (this.tournament && this.tournament.matches) || [];
    if (matches.length === 0) {
      mobCourts.innerHTML = `
        <div style="text-align:center; padding:36px 16px; background:#0e1726; border-radius:8px; border:1px dashed #1e3358;">
          <div style="font-size:36px; margin-bottom:10px;">🎾</div>
          <div style="font-weight:800; font-size:15px; color:#fff;">현재 진행 중인 경기가 없습니다</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:6px;">상단 <b>[⚙️ 대진 편성]</b> 버튼을 터치하여 새 대진표를 생성하세요.</div>
        </div>
      `;
      return;
    }

    let html = "";
    matches.forEach(m => {
      const slot = (this.tournament.timeSlots || [])[m.timeSlotIndex] || { start: "-", end: "-" };
      const statusText = this.getStatusText(m.status);
      const teamAHtml = this.getTeamWithGroupBadge(m.teamA);
      const teamBHtml = this.getTeamWithGroupBadge(m.teamB);
      const scoreStr = m.scoreA !== null && m.scoreB !== null ? `${m.scoreA} : ${m.scoreB}` : "- : -";
      const tieBreakStr = m.tieBreak ? `(${m.tieBreak})` : "";

      html += `
        <div class="match-card" style="margin-bottom: 8px;" onclick="app.openScoreModal('${m.id}')">
          <div class="match-card-top">
            <span class="match-no" style="color:var(--neon-cyan);">${m.court} 코트 #${m.matchNo} (${slot.start}~${slot.end})</span>
            <span class="match-status-badge status-${m.status}">${statusText}</span>
          </div>
          <div class="match-players" style="font-size: 13px; margin: 6px 0; display:flex; flex-direction:column; gap:4px;">
            <div>${teamAHtml}</div>
            <div style="color:var(--text-muted); font-size:10px; text-align:center;">vs</div>
            <div>${teamBHtml}</div>
          </div>
          <div class="match-score-row">
            <span class="score-label">스코어</span>
            <div class="score-box">${scoreStr} <span class="tiebreak-tag">${tieBreakStr}</span></div>
          </div>
        </div>
      `;
    });
    mobCourts.innerHTML = html;
  }

  getSubjectJosa(word) {
    if (!word) return "이";
    const lastChar = word.charCodeAt(word.length - 1);
    if (lastChar < 0xac00 || lastChar > 0xd7a3) return "이";
    return (lastChar - 0xac00) % 28 > 0 ? "이" : "가";
  }

  getActiveScoreNews() {
    const matches = (this.tournament && this.tournament.matches) || [];
    const finishedMatches = matches.filter(m => m.status === "finished" || m.status === "completed");
    if (finishedMatches.length === 0) return [];

    const timeSlots = this.tournament.timeSlots || [];
    const now = new Date();
    const tourneyDateStr = this.tournament.date || now.toISOString().slice(0, 10);
    const isTodayTourney = now.toISOString().slice(0, 10) === tourneyDateStr;

    // 슬롯별 완료 경기 그룹화
    const slotMap = {};
    finishedMatches.forEach(m => {
      const sIdx = typeof m.timeSlotIndex === "number" ? m.timeSlotIndex : 0;
      if (!slotMap[sIdx]) slotMap[sIdx] = [];
      slotMap[sIdx].push(m);
    });

    const slotIndices = Object.keys(slotMap).map(Number).sort((a, b) => b - a); // 최신 슬롯 우선

    for (const sIdx of slotIndices) {
      const slotMatches = slotMap[sIdx];
      const curSlot = timeSlots[sIdx];
      const nextSlot = timeSlots[sIdx + 1];

      // 만료 기준 시각: 다음 슬롯 시작 시간 + 3분 (다음 슬롯 없으면 현재 슬롯 종료 시간 + 3분)
      const nextStartTime = nextSlot ? nextSlot.start : (curSlot ? curSlot.end : "23:59");
      const [nH, nM] = nextStartTime.split(":").map(Number);

      const cutoffDate = new Date(`${tourneyDateStr}T00:00:00`);
      cutoffDate.setHours(nH, nM + 3, 0, 0);

      let isValid = false;
      if (isTodayTourney) {
        // 대회 당일 실시간 운영: 현재 시각이 다음 슬롯 시작 + 3분 이내여야 함
        isValid = now.getTime() <= cutoffDate.getTime();
      } else {
        // 테스트/시뮬레이션 환경: 경기 기록 후 45분 이내이거나 가장 최신 슬롯
        isValid = slotMatches.some(m => !m.finishedAt || (now.getTime() - m.finishedAt <= 45 * 60 * 1000));
      }

      if (isValid) {
        return slotMatches.map(m => {
          const sA = m.scoreA ?? 0;
          const sB = m.scoreB ?? 0;
          const tieStr = m.tieBreak ? ` (${m.tieBreak})` : "";
          const teamANames = (m.teamA || []).map(n => this.formatPlayerName(n)).join("·");
          const teamBNames = (m.teamB || []).map(n => this.formatPlayerName(n)).join("·");
          const winner = sA > sB 
            ? `🏆 ${teamANames} 승` 
            : (sB > sA ? `🏆 ${teamBNames} 승` : "무승부");

          return {
            court: m.court,
            matchNo: m.matchNo,
            timeSlotIndex: sIdx,
            text: `[속보] ${m.court} #${m.matchNo}경기 [${sA} : ${sB}${tieStr}] 확정! (${winner})`
          };
        });
      }
    }

    return [];
  }

  renderBreakingBanner() {
    const bannerText = document.getElementById("breakingNewsText");
    if (!bannerText) return;

    // 1. 최우선 순위: 선수 호출(calling) 상태의 경기가 있는가? -> 부드럽게 흐르는 Marquee 애니메이션
    const callingMatch = (this.tournament.matches || []).find(m => m.status === "calling");
    if (callingMatch) {
      if (this.tickerInterval) {
        clearInterval(this.tickerInterval);
        this.tickerInterval = null;
      }
      const teamANames = (callingMatch.teamA || []).map(n => this.formatPlayerName(n)).join(", ");
      const teamBNames = (callingMatch.teamB || []).map(n => this.formatPlayerName(n)).join(", ");
      bannerText.className = "ticker-text ticker-marquee";
      bannerText.textContent = `📢 [선수 호출] ${callingMatch.court} #${callingMatch.matchNo}경기: ${teamANames} vs ${teamBNames} 선수 코트 입장 바랍니다!`;
      return;
    }

    // 2. 같은 시간대 슬롯의 유효한 확정 스코어가 있는가? (다음 슬롯 시작 + 3분 이내) -> 번갈아가며 전환
    const activeScores = this.getActiveScoreNews();
    if (activeScores.length > 0) {
      const showScoreItem = (idx) => {
        const item = activeScores[idx % activeScores.length];
        bannerText.className = "ticker-text ticker-rotating";
        const countBadge = activeScores.length > 1 ? ` (${(idx % activeScores.length) + 1}/${activeScores.length})` : "";
        bannerText.textContent = `🎾 ${item.text}${countBadge}`;
      };

      showScoreItem(this.tickerRotationIndex || 0);

      if (activeScores.length > 1) {
        if (!this.tickerInterval) {
          this.tickerInterval = setInterval(() => {
            this.tickerRotationIndex = ((this.tickerRotationIndex || 0) + 1) % activeScores.length;
            showScoreItem(this.tickerRotationIndex);
          }, 3800);
        }
      } else {
        if (this.tickerInterval) {
          clearInterval(this.tickerInterval);
          this.tickerInterval = null;
        }
      }
      return;
    }

    // 3. 스코어나 호출이 없는 대기 상태: 대회 공식 공지를 흐르는(Marquee) 애니메이션으로 노출!
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }

    const isLeague = this.tournament.isLeagueMatch !== false;
    const josa = this.getSubjectJosa(this.tournament.title);
    const defaultNotice = `[공식 개막] ${this.tournament.title}${josa} 공식 개막되었습니다! (${isLeague ? "🏆 개인 리그전 전적/득실 누적" : "✕ 친선/이벤트전 - 리그 미반영"})`;
    const noticeText = this.tournament.breakingNews && !this.tournament.breakingNews.startsWith("[속보]") && !this.tournament.breakingNews.startsWith("[호출]")
      ? this.tournament.breakingNews
      : defaultNotice;

    bannerText.className = "ticker-text ticker-marquee";
    bannerText.textContent = noticeText;
  }

  renderMyMatchesView() {
    const selectEl = document.getElementById("myPlayerSelect");
    const containerEl = document.getElementById("myMatchesContainer");
    if (!selectEl || !containerEl) return;

    const members = [...this.memberManager.getActiveMembers()].sort((a, b) => (a.name || "").localeCompare(b.name || "", 'ko'));
    let optHtml = `<option value="">-- 내 이름 선택 (출전 경기 모아보기) --</option>`;
    members.forEach(m => {
      const selected = m.name === this.selectedPlayerFilter ? "selected" : "";
      optHtml += `<option value="${m.name}" ${selected}>${this.formatPlayerName(m.name)} (NTRP ${m.level || '-'})</option>`;
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
      containerEl.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-muted);">[${this.formatPlayerName(myName)}] 님의 배정된 경기가 없습니다.</div>`;
      return;
    }

    let cardsHtml = "";
    myMatches.forEach(m => {
      const slot = (this.tournament.timeSlots || [])[m.timeSlotIndex] || { start: "-", end: "-" };
      const statusText = this.getStatusText(m.status);
      const isTeamA = (m.teamA || []).includes(myName);
      const partnerRaw = isTeamA ? (m.teamA || []).filter(p => p !== myName) : (m.teamB || []).filter(p => p !== myName);
      const partner = partnerRaw.map(p => this.formatPlayerName(p)).join(", ");
      const opponentsRaw = isTeamA ? (m.teamB || []) : (m.teamA || []);
      const opponents = opponentsRaw.map(p => this.formatPlayerName(p)).join(", ");
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
        : `<span style="color:var(--text-muted); font-size:11px; cursor:pointer;" onclick="app.editMemberModal('${m.id}')">미입력</span>`;

      const curLevel = m.clubLevel || "U3";
      const levelSelectHtml = `
        <select class="form-select-xs" onchange="app.updateMemberClubLevel('${m.id}', this.value)" style="padding:2px 4px; font-size:11px; font-weight:800; border-radius:4px; background:#0d182e; color:#38bdf8; border:1px solid #233c6e;">
          <option value="U1" ${curLevel === "U1" || curLevel === 1 ? "selected" : ""}>U1</option>
          <option value="U2" ${curLevel === "U2" || curLevel === 2 ? "selected" : ""}>U2</option>
          <option value="U3" ${curLevel === "U3" || curLevel === 3 ? "selected" : ""}>U3</option>
        </select>
      `;

      html += `
        <tr>
          <td style="text-align:center; font-family:var(--font-mono); font-size:11px; color:#94a3b8;">${m.no || idx + 1}</td>
          <td><b>${this.formatPlayerName(m.name)}</b></td>
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
    const mobRoster = document.getElementById("mobileRosterTableBody");
    if (mobRoster) mobRoster.innerHTML = html;
  }

  updateMemberClubLevel(id, newLevel) {
    this.memberManager.updateMember(id, { clubLevel: newLevel });
    this.renderRosterTable();
  }

  editMemberModal(id) {
    const m = this.memberManager.getMemberById(id);
    if (!m) return;
    this.editingMemberId = id;
    document.getElementById("editMemName").value = m.name || "";
    document.getElementById("editMemJoinDate").value = m.joinDate || "";
    document.getElementById("editMemNtrp").value = m.level && parseFloat(m.level) > 0 ? m.level : "";
    document.getElementById("editMemLevel").value = m.clubLevel || "U3";
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
    const clubLevel = document.getElementById("editMemLevel").value || "U3";
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
    alert(`[${name}] 선수의 U-리그 등급 및 정보가 정상 수정되었습니다.`);
  }

  /**
   * ☕ 6) 월별 코트 예약 순위표 렌더링 (커피 쿠폰 1위:3매, 2위:2매, 3위:1매)
   */
  renderBookingTable() {
    const tbody = document.getElementById("courtBookingLeaderboardBody");
    const summaryCards = document.getElementById("coffeeCouponPodium");
    const bookings = this.tournament.courtBookings || [];
    const curMonth = this.selectedBookingMonth || new Date().toISOString().slice(0, 7);
    const ranked = this.leaderboard.calculateCourtBookingLeaderboard(bookings, curMonth);

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

  openCourtBookingModal() {
    // 64명 공식 회원 명단 셀렉트 옵션 바인딩
    const select = document.getElementById("bookerNameSelect");
    if (select) {
      const members = this.memberManager.getAllMembers();
      select.innerHTML = `<option value="">-- 회원 명단에서 선택 또는 직접 입력 --</option>` +
        members.map(m => `<option value="${m.name}">${m.name} (${m.role || '회원'})</option>`).join("");
    }
    const dateInput = document.getElementById("bookingDateInput");
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
    this.renderBookingModalList();
    this.showModal("courtBookingModal");
  }

  renderBookingModalList() {
    const container = document.getElementById("modalBookingListContainer");
    const countText = document.getElementById("modalBookingCountText");
    const bookings = this.tournament.courtBookings || [];

    if (countText) {
      countText.textContent = `총 ${bookings.length}건`;
    }

    if (container) {
      if (bookings.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">등록된 예약 내역이 없습니다.</div>`;
        return;
      }
      let html = "";
      bookings.slice().reverse().forEach((b, rIdx) => {
        const actualIdx = bookings.length - 1 - rIdx;
        html += `
          <div class="booking-modal-item">
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:6px;">
                <b style="color:#fff; font-size:13px;">${b.booker}</b>
                <span style="font-size:11px; color:#38bdf8; background:rgba(56,189,248,0.15); padding:1px 6px; border-radius:4px;">${b.court}</span>
                <span style="font-size:11px; color:var(--neon-gold); font-weight:700;">${b.hours}시간</span>
              </div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">
                <span>📅 ${b.date || '-'}</span>
                ${b.note ? ` · <span>${b.note}</span>` : ''}
              </div>
            </div>
            <button type="button" class="btn-delete-booking" onclick="app.deleteCourtBooking('${b.id || actualIdx}')">🗑️ 삭제</button>
          </div>
        `;
      });
      container.innerHTML = html;
    }
  }

  addCourtBooking() {
    const booker = document.getElementById("bookerNameInput").value.trim();
    const court = document.getElementById("bookingCourtInput").value.trim() || "15번";
    const date = document.getElementById("bookingDateInput").value || new Date().toISOString().slice(0, 10);
    const hours = parseFloat(document.getElementById("bookingHoursInput").value) || 2;
    const note = document.getElementById("bookingNoteInput").value.trim();

    if (!booker) {
      alert("예약자 이름을 입력하거나 선택해주세요.");
      return;
    }

    if (!this.tournament.courtBookings) this.tournament.courtBookings = [];
    this.tournament.courtBookings.push({
      id: "bk_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      booker,
      court,
      date,
      hours,
      note
    });

    this.saveTournament();
    this.renderBookingTable();
    this.renderBookingModalList();
    document.getElementById("bookerNameInput").value = "";
    document.getElementById("bookingNoteInput").value = "";
    alert(`✅ [${booker}] 님의 ${court} (${hours}시간) 예약 기록이 추가되었습니다!`);
  }

  deleteCourtBooking(bookingId) {
    if (!confirm("해당 코트 예약 기록을 삭제하시겠습니까?")) return;
    if (!this.tournament.courtBookings) return;

    this.tournament.courtBookings = this.tournament.courtBookings.filter(b => b.id !== bookingId && String(b.id) !== String(bookingId));
    this.saveTournament();
    this.renderBookingTable();
    this.renderBookingModalList();
  }


  // ==============================================================================
  // 🏁 대회 종료 & 대회 내역 요약 관리 (#3)
  // ==============================================================================
  async finishCurrentTournament() {
    // 1. 경기이사 / 운영진 권한 체크 (암호화 PIN)
    if (this.appMode !== "staff") {
      const pin = prompt("🔐 대회를 공식 종료하려면 경기이사/운영진 PIN 비밀번호를 입력하세요:");
      if (pin === null) return;
      if (!(await this.verifyPin(pin))) {
        alert("❌ PIN 비밀번호가 일치하지 않습니다.");
        return;
      }
      this.appMode = "staff";
      try {
        localStorage.setItem("tennis_app_mode", this.appMode);
      } catch(e) {}
      this.applyAppModeUi();
    }

    // 2. 이미 종료된 대회인지 확인
    if (this.tournament.status === "completed") {
      alert(`ℹ️ 현재 대회 [${this.tournament.title}]는 이미 공식 종료되어 [대회 내역]에 안전하게 보관된 상태입니다.\n\n새로운 대회를 시작하시려면 상단 [➕ 새 대회] 버튼을 눌러주세요.`);
      return;
    }

    const matches = this.tournament.matches || [];
    const finishedMatches = matches.filter(m => m.status === "finished");
    const unfinMatches = matches.filter(m => m.status !== "finished");

    if (unfinMatches.length > 0) {
      const proceed = confirm(`⚠️ 아직 결과가 입력되지 않은 경기(${unfinMatches.length}개)가 남아있습니다.\n대회를 종료하면 현재 입력된 경기 결과까지만 반영됩니다.\n\n정말로 대회를 공식 종료하시겠습니까?`);
      if (!proceed) return;
    }

    // 1. 개인 순위 계산하여 상위 1~3위 파악
    const activePlayers = this.memberManager.getActiveMembers();
    const isLeague = this.tournament.isLeagueMatch !== false;
    const isCommitted = !!this.tournament.leagueCommitted;
    const ranked = this.leaderboard.calculateIndividualLeaderboard(
      matches, 
      activePlayers, 
      isLeague,
      isCommitted,
      { win: this.tournament.pointsWin || 3, draw: this.tournament.pointsDraw || 1, loss: this.tournament.pointsLoss || 0 }
    );

    const top1 = ranked[0] ? `${this.formatPlayerName(ranked[0].name)}(${ranked[0].points}점)` : "없음";
    const top2 = ranked[1] ? `${this.formatPlayerName(ranked[1].name)}(${ranked[1].points}점)` : "없음";
    const top3 = ranked[2] ? `${this.formatPlayerName(ranked[2].name)}(${ranked[2].points}점)` : "없음";

    // 2. 리그전 점수 누적 커밋 (개인 리그 순위 누적 영구 반영)
    if (isLeague && !this.tournament.leagueCommitted) {
      this.leaderboard.commitTournamentToLeague(matches, isLeague);
      this.tournament.leagueCommitted = true;
    }

    // 3. 연간 종합 랭킹에 대회 우승/준우승 및 경기 전적 누적 반영
    this.leaderboard.recordTournamentSummary(this.tournament, ranked);

    this.tournament.status = "completed";
    const josa = this.getSubjectJosa(this.tournament.title);
    this.tournament.breakingNews = `[대회 공식 종료] ${this.tournament.title}${josa} 성황리에 종료되었습니다! 🥇 우승: ${top1}`;

    // 🔄 조별 배치 초기화: 대회가 종료되면 조 배치를 자동으로 리셋 (사용자 핵심 요구사항)
    if (this.memberManager && typeof this.memberManager.resetAllGroups === "function") {
      this.memberManager.resetAllGroups();
    }

    this.saveTournament();
    this.render();
    this.renderHistoryTab();

    alert(`🎉 [${this.tournament.title}] 대회가 성공적으로 종료되었습니다!\n\n🥇 1위: ${top1}\n🥈 2위: ${top2}\n🥉 3위: ${top3}\n\n결과가 [대회 내역] 탭 및 연간 랭킹에 영구 보관되었습니다.\n다음 정기대회를 개막하시려면 [➕ 새 대회] 버튼을 눌러주세요.`);
  }

  async startNewTournamentPrompt() {
    // 1. 경기이사 / 운영진 권한 체크 (암호화 PIN 검증)
    if (this.appMode !== "staff") {
      const pin = prompt("🔐 새로운 대회를 생성하려면 경기이사/운영진 PIN 비밀번호를 입력하세요:");
      if (pin === null) return;
      if (!(await this.verifyPin(pin))) {
        alert("❌ PIN 비밀번호가 일치하지 않습니다.");
        return;
      }
      this.appMode = "staff";
      try {
        localStorage.setItem("tennis_app_mode", this.appMode);
      } catch(e) {}
      this.applyAppModeUi();
    }

    // 2. 현재 진행 중인 미종료 대회 엄격 보호: 반드시 [대회 종료] 완료 후 새 대회 생성 가능
    if (this.tournament && this.tournament.status !== "completed" && Array.isArray(this.tournament.matches) && this.tournament.matches.length > 0) {
      alert(
        `⚠️ [대회 종료 필수 안내]\n\n` +
        `현재 진행 중인 대회 [${this.tournament.title}](${this.tournament.matches.length}경기)가 아직 공식 종료되지 않았습니다.\n\n` +
        `경기 기록과 개인 순위를 [대회 내역]과 [연간 종합 랭킹]에 안전하게 영구 보관하기 위해,\n` +
        `먼저 [🏁 대회 종료] 버튼을 눌러 대회를 공식 완료한 후에 새로운 대회를 개막해 주세요.`
      );
      return;
    }

    // 3. 새 대회 전용 모달 열기 및 기본값 세팅
    const now = new Date();
    const defaultTitle = `${now.getFullYear()}년 ${now.getMonth() + 1}월 정기대회`;
    const titleInput = document.getElementById("newTourneyTitleInput");
    const dateInput = document.getElementById("newTourneyDateInput");
    const timeInput = document.getElementById("newTourneyStartTimeInput");
    const radYes = document.getElementById("radNewTourneyLeagueYes");
    const radNo = document.getElementById("radNewTourneyLeagueNo");

    if (titleInput) {
      titleInput.value = "";
      titleInput.placeholder = defaultTitle;
    }
    if (dateInput) dateInput.value = now.toISOString().slice(0, 10);
    if (timeInput) timeInput.value = "08:00";
    if (radYes) radYes.checked = true;
    if (radNo) radNo.checked = false;

    this.showModal("newTournamentModal");
  }

  confirmCreateNewTournament() {
    const titleInput = document.getElementById("newTourneyTitleInput");
    const dateInput = document.getElementById("newTourneyDateInput");
    const timeInput = document.getElementById("newTourneyStartTimeInput");
    const modeSelect = document.getElementById("newTourneyModeSelect");
    const radYes = document.getElementById("radNewTourneyLeagueYes");

    const now = new Date();
    const defaultTitle = `${now.getFullYear()}년 ${now.getMonth() + 1}월 정기대회`;
    const newTitle = (titleInput && titleInput.value.trim()) || defaultTitle;
    const newDate = (dateInput && dateInput.value) || now.toISOString().slice(0, 10);
    const newStartTime = (timeInput && timeInput.value) || "08:00";
    const isLeague = radYes ? radYes.checked : true;
    const selectedMode = (modeSelect && modeSelect.value) || "regular_individual";

    // 설정 모달의 입력창도 즉시 동기화
    const setTitleEl = document.getElementById("setTourneyTitle");
    if (setTitleEl) setTitleEl.value = newTitle;

    // 새 대회 객체 초기화 (데이터 무결성 보장: 역대 대회 history 보존, 누적 리그 기록 보존)
    const existingHistory = (this.tournament && this.tournament.history) || [];
    this.tournament = {
      id: "tourney_" + Date.now(),
      title: newTitle,
      date: newDate,
      startTime: newStartTime,
      gameDuration: 40,
      courts: ["15번", "16번", "17번", "18번"],
      status: "ongoing",
      mode: selectedMode,
      isLeagueMatch: isLeague,
      leagueCommitted: false,
      timeSlots: this.matchmaker.generateTimeSlots(newStartTime, 40, 5),
      matches: [],
      history: existingHistory,
      isMasterReset: true,
      breakingNews: `[공식 개막] ${newTitle}${this.getSubjectJosa(newTitle)} 공식 개막되었습니다! (${isLeague ? "🏆 개인 리그전 전적/득실 누적" : "✕ 친선/이벤트전 - 리그 미반영"})`
    };

    // 🔄 조별 배치 초기화: 새 대회가 시작되면 이전 대회의 조편성을 깨끗이 초기화 (사용자 핵심 요구사항)
    if (this.memberManager && typeof this.memberManager.resetAllGroups === "function") {
      this.memberManager.resetAllGroups();
    }

    // 개인 순위 변동 캐시만 정리 (누적 전적/득실은 LeaderboardEngine에 안전 보존)
    if (this.leaderboard && typeof this.leaderboard.resetIndividualRanks === "function") {
      this.leaderboard.resetIndividualRanks();
    }

    // 개인 필터 초기화
    this.selectedPlayerFilter = "";

    // 로컬스토리지 영구 저장 및 모달 정리
    this.saveTournament();
    this.closeModal("newTournamentModal");
    this.closeModal("historyModal");

    // 전체 UI 뷰 안전 리렌더링
    this.render();
    this.renderHistoryTab();
    this.renderTimeline();

    // 완료 안내 메시지
    alert(
      `🎾 새로운 대회 [${this.tournament.title}]가 성공적으로 시작되었습니다!\n\n` +
      `• 리그전 반영: ${isLeague ? "🏆 개인 리그전 순위표 반영 (다승/득실 누적)" : "✕ 친선/이벤트전 (개인 리그 순위 미반영)"}\n` +
      `• 코트 배정: 타임라인 코트의 [+ 배정] 칸을 터치하거나 상단 [⚙️ 대진 편성] 버튼을 눌러 새 대진표를 작성하세요.`
    );
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
                    <tr><th>순위</th><th>선수명</th><th>전적</th><th>득실</th></tr>
                  </thead>
                  <tbody>
                    ${topRanks.map(r => `
                      <tr>
                        <td style="text-align:center;">${r.rank}</td>
                        <td><b>${r.name}</b></td>
                        <td>${r.record || (r.wins + "-" + r.draws + "-" + r.losses)}</td>
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
      match.finishedAt = Date.now();
      this.tickerRotationIndex = 0;
      const newsItem = {
        text: `${match.court} #${match.matchNo}경기 결과 (${sA} : ${sB}${tie ? " " + tie : ""})`,
        sub: `${match.court} 스코어 [${sA} : ${sB}] 확정.`,
        timeAgo: "방금 전"
      };
      this.tournament.newsTicker = [newsItem, ...(this.tournament.newsTicker || [])].slice(0, 15);
      this.tournament.breakingNews = `[속보] ${match.court} #${match.matchNo}경기 [${sA} : ${sB}] 확정!`;
      this.playChime("score");
    } else if (status === "calling") {
      if (this.tickerInterval) {
        clearInterval(this.tickerInterval);
        this.tickerInterval = null;
      }
      const teamANames = (match.teamA || []).map(n => this.formatPlayerName(n)).join(", ");
      const teamBNames = (match.teamB || []).map(n => this.formatPlayerName(n)).join(", ");
      this.tournament.breakingNews = `[호출] ${match.court} #${match.matchNo}경기: ${teamANames} vs ${teamBNames} 선수 코트 입장 바랍니다!`;
      this.playChime("call");
    }

    this.pushMatchToCloud(match);
    this.saveTournament();
    this.closeModal("scoreModal");
    this.render();
  }

  openNewMatchModal(courtName, timeSlotIndex) {
    document.getElementById("newMatchCourt").value = courtName;
    document.getElementById("newMatchSlot").value = timeSlotIndex;

    const slots = ["newTeamA1", "newTeamA2", "newTeamB1", "newTeamB2"];
    
    // Clear slot search inputs
    slots.forEach(id => {
      const searchEl = document.getElementById("search_" + id);
      if (searchEl) searchEl.value = "";
    });

    const members = this.memberManager.getActiveMembers().filter(m => m.group !== "미참석");
    const pool = members.length >= 4 ? members : this.memberManager.getActiveMembers();

    const isGroupEvent = this.tournament && this.tournament.mode === "regular_group";

    const populateSlot = (id, defaultIdx = 0) => {
      const el = document.getElementById(id);
      if (!el) return;
      let opts = `<option value="">-- 선수 선택 --</option>`;
      const sortedPool = [...pool].sort((a, b) => (a.name || "").localeCompare(b.name || "", 'ko'));
      sortedPool.forEach((m, idx) => {
        const isSel = idx === defaultIdx ? "selected" : "";
        const groupBadge = (isGroupEvent && m.group) ? `[${m.group}] ` : "";
        opts += `<option value="${m.name}" ${isSel}>${groupBadge}${m.name} (${m.clubLevel || 2}등 / NTRP ${m.level || 3.0})</option>`;
      });
      el.innerHTML = opts;
    };

    populateSlot("newTeamA1", 0);
    populateSlot("newTeamA2", 1 % pool.length);
    populateSlot("newTeamB1", 2 % pool.length);
    populateSlot("newTeamB2", 3 % pool.length);

    this.showModal("newMatchModal");
  }

  filterSlotSelect(slotId, query) {
    const el = document.getElementById(slotId);
    if (!el) return;

    const isGroupEvent = this.tournament && this.tournament.mode === "regular_group";
    const members = this.memberManager.getActiveMembers().filter(m => m.group !== "미참석");
    const pool = members.length >= 4 ? members : this.memberManager.getActiveMembers();
    const currentVal = el.value;

    const q = (query || "").trim();
    const matches = q ? pool.filter(m => MemberManager.isMatch(m, q)) : pool;
    const sortedMatches = [...matches].sort((a, b) => (a.name || "").localeCompare(b.name || "", 'ko'));

    let opts = `<option value="">-- 선수 선택 --</option>`;
    if (sortedMatches.length === 0) {
      opts += `<option value="" disabled style="color:#ef4444;">✕ '${q}' 일치 선수 없음</option>`;
    } else {
      sortedMatches.forEach(m => {
        const isSel = (sortedMatches.length === 1 || m.name === currentVal) ? "selected" : "";
        const groupBadge = (isGroupEvent && m.group) ? `[${m.group}] ` : "";
        opts += `<option value="${m.name}" ${isSel}>${groupBadge}${m.name} (${m.clubLevel || 2}등 / NTRP ${m.level || 3.0})</option>`;
      });
    }

    el.innerHTML = opts;
    if (matches.length === 1) {
      el.value = matches[0].name;
    }
  }

  clearSlotSearch(slotId) {
    const searchEl = document.getElementById("search_" + slotId);
    if (searchEl) searchEl.value = "";
    this.filterSlotSelect(slotId, "");
  }

  saveNewMatch() {
    const court = document.getElementById("newMatchCourt").value;
    const tIdx = parseInt(document.getElementById("newMatchSlot").value) || 0;
    const a1 = document.getElementById("newTeamA1").value;
    const a2 = document.getElementById("newTeamA2").value;
    const b1 = document.getElementById("newTeamB1").value;
    const b2 = document.getElementById("newTeamB2").value;

    const teamA = [a1, a2].filter(Boolean);
    const teamB = [b1, b2].filter(Boolean);

    if (teamA.length === 0 && teamB.length === 0) {
      alert("최소 1명 이상의 선수를 선택해주세요.");
      return;
    }

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
    const isGroupEvent = this.tournament && this.tournament.mode === "regular_group";
    if (headerInfo) {
      if (!isGroupEvent) {
        headerInfo.innerHTML = `<span style="color:#fbbf24; font-weight:800;">ℹ️ 현재 대회는 '개인 리그전' 모드입니다.</span> 조편성은 '조별 대항전' 모드에서만 적용되며, 대회가 종료되면 조 배치가 자동 리셋됩니다.`;
      } else {
        headerInfo.innerHTML = `총 <b>${active.length}명</b> 중 당일 참석: <b style="color:#38bdf8;">${attending.length}명</b> / <span style="color:#94a3b8;">불참: ${absent.length}명</span> (대회 종료 시 자동 리셋)`;
      }
    }

    // 2. Member assignment table
    const tbody = document.getElementById("groupAssignmentTableBody");
    if (tbody) {
      let html = "";
      active.forEach((m, idx) => {
        const curGroup = m.group || "";
        const isAbsent = curGroup === "미참석";
        html += `
          <tr style="${isAbsent ? 'opacity:0.55; background:rgba(15,23,42,0.4);' : ''}">
            <td style="text-align:center; font-family:var(--font-mono);">${m.no || idx + 1}</td>
            <td><b>${m.name}</b> ${isAbsent ? '<span style="font-size:10px; color:#ef4444; font-weight:800; margin-left:4px;">[불참]</span>' : ''}</td>
            <td style="text-align:center;"><span class="level-badge">${m.clubLevel || 2}등급</span></td>
            <td style="text-align:center;">
              <select class="form-select form-select-xs" onchange="app.changeMemberGroup('${m.id}', this.value)" style="width:115px; padding:3px 6px; font-weight:800; background:#0e1726; color:${isAbsent ? '#ef4444' : curGroup ? '#38bdf8' : '#94a3b8'}; border:1px solid ${isAbsent ? '#ef4444' : '#1e3358'};">
                <option value="" ${!curGroup ? "selected" : ""} style="color:#94a3b8;">-- 미지정 --</option>
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
   * 코트/시간표 설정을 적용합니다.
   * (기존 대진표는 코트/슬롯 범위 내에서 안전하게 보존됩니다!)
   */
  applyCourtScheduleSettings(openBuilderAfter = false) {
    const dateInput = document.getElementById("mmTournamentDate");
    if (dateInput && dateInput.value) {
      this.tournament.date = dateInput.value;
    }
    const startTime = document.getElementById("mmStartTime").value || "08:00";
    const duration = parseInt(document.getElementById("mmDuration").value) || 40;
    const rawCourts = document.getElementById("mmCourtNames").value;
    const courts = rawCourts.split(",").map(c => c.trim()).filter(Boolean);

    if (courts.length === 0) {
      alert("최소 1개 이상의 코트 번호를 입력해주세요.");
      return;
    }

    const newTimeSlots = this.matchmaker.generateTimeSlots(startTime, duration, 5);

    // 기존 매치 안전 보존 (새 코트 목록 및 슬롯 인덱스 범위 내 경기 유지)
    const courtSet = new Set(courts);
    const existingMatches = Array.isArray(this.tournament.matches) ? this.tournament.matches : [];
    const preservedMatches = existingMatches.filter(m => 
      courtSet.has(m.court) && (m.timeSlotIndex === undefined || m.timeSlotIndex < newTimeSlots.length)
    );

    this.tournament.courts = courts;
    this.tournament.timeSlots = newTimeSlots;
    this.tournament.gameDurationMinutes = duration;
    this.tournament.startTime = startTime;
    this.tournament.matches = preservedMatches;

    this.saveTournament();
    this.render();

    if (openBuilderAfter) {
      this.closeModal("matchmakerModal", false);
      this.openManualMatchBuilderModal();
    } else {
      this.closeModal("matchmakerModal", true);
      alert(`✅ 코트/시간표 설정이 적용되었습니다!\n(기존 배정 경기 ${preservedMatches.length}건 안전하게 보존됨)`);
    }
  }

  // ==============================================================================
  // 📝 대진표 수동 배정 마법사 (Manual Match Builder)
  // ==============================================================================
  openManualMatchBuilderModal() {
    this.closeModal("matchmakerModal", false);
    const courts = this.tournament.courts || ["15번", "16번", "17번", "18번"];
    const timeSlots = this.tournament.timeSlots || [];

    const currentMatches = Array.isArray(this.tournament.matches) ? this.tournament.matches : [];
    const matchMap = new Map();
    currentMatches.forEach(m => {
      matchMap.set(`${m.court}_${m.timeSlotIndex}`, JSON.parse(JSON.stringify(m)));
    });

    this.builderMatches = [];
    let matchCounter = 1;
    timeSlots.forEach((ts, tIdx) => {
      courts.forEach(courtName => {
        const key = `${courtName}_${tIdx}`;
        if (matchMap.has(key)) {
          const m = matchMap.get(key);
          this.builderMatches.push(m);
          if (m.matchNo >= matchCounter) matchCounter = m.matchNo + 1;
        } else {
          this.builderMatches.push(this.matchmaker.createManualMatch({
            court: courtName,
            matchNo: matchCounter++,
            timeSlotIndex: tIdx,
            teamA: [],
            teamB: [],
            status: "waiting"
          }));
        }
      });
    });

    this.builderSearchQuery = "";
    const bInput = document.getElementById("builderPlayerSearchInput");
    if (bInput) bInput.value = "";
    const matchCountBadge = document.getElementById("builderSearchMatchCount");
    if (matchCountBadge) matchCountBadge.textContent = "";

    this.renderManualMatchBuilder();
    this.showModal("manualMatchBuilderModal");
  }

  filterBuilderPlayers(query) {
    this.builderSearchQuery = query;
    this.renderManualMatchBuilder();
    const input = document.getElementById("builderPlayerSearchInput");
    if (input && input.value !== query) {
      input.value = query;
    }
  }

  clearBuilderPlayerFilter() {
    this.builderSearchQuery = "";
    const input = document.getElementById("builderPlayerSearchInput");
    if (input) input.value = "";
    this.renderManualMatchBuilder();
  }

  renderManualMatchBuilder() {
    const container = document.getElementById("manualBuilderBody");
    const activeCountEl = document.getElementById("builderActiveCount");
    const matchCountEl = document.getElementById("builderMatchCount");
    if (!container) return;

    const activeMembers = this.memberManager.getActiveMembers().filter(m => m.group !== "미참석");
    const pool = activeMembers.length >= 4 ? activeMembers : this.memberManager.getActiveMembers();
    if (activeCountEl) activeCountEl.textContent = `${pool.length}명`;

    const filterQuery = (this.builderSearchQuery || "").trim();
    const filterPool = filterQuery ? pool.filter(m => MemberManager.isMatch(m, filterQuery)) : pool;
    // 🌟 대진표 작성 시 선수를 빠르게 찾을 수 있도록 이름 가나다 순(오름차순)으로 정렬 (회원명단 원본 가입순서는 엄격 보존)
    const sortedFilterPool = [...filterPool].sort((a, b) => (a.name || "").localeCompare(b.name || "", 'ko'));

    const matchCountBadge = document.getElementById("builderSearchMatchCount");
    if (matchCountBadge) {
      if (filterQuery) {
        matchCountBadge.textContent = `🔍 '${this.builderSearchQuery}' 색인: ${filterPool.length}명 일치`;
      } else {
        matchCountBadge.textContent = "";
      }
    }

    const courts = this.tournament.courts || ["15번", "16번", "17번", "18번"];
    const timeSlots = this.tournament.timeSlots || [];

    const filledMatches = (this.builderMatches || []).filter(m => (m.teamA?.length > 0 || m.teamB?.length > 0));
    if (matchCountEl) matchCountEl.textContent = `${filledMatches.length}경기`;

    const collisions = this.matchmaker.checkTimeSlotCollisions(this.builderMatches || []);
    const collisionSet = new Set(collisions.map(c => `${c.timeSlotIndex}_${c.player}`));

    const noticeEl = document.getElementById("builderCollisionNotice");
    if (noticeEl) {
      if (collisions.length > 0) {
        const desc = collisions.map(c => `[슬롯${c.timeSlotIndex + 1}: ${c.player}님]`).join(", ");
        noticeEl.innerHTML = `<span style="color:#ef4444;">⚠️ <b>동일 시간대 중복 배정</b>: ${desc}</span>`;
      } else {
        noticeEl.innerHTML = `<span style="color:#10b981;">✅ 동일 시간대 중복 출전 선수가 없습니다.</span>`;
      }
    }

    let html = "";
    timeSlots.forEach((slot, tIdx) => {
      html += `
        <div class="builder-slot-section">
          <div class="builder-slot-header">
            <div class="builder-slot-title">
              <span>⏰</span>
              <span>제 ${tIdx + 1} 슬롯 (${slot.start} ~ ${slot.end})</span>
            </div>
            <span class="builder-slot-badge">${courts.length}개 코트 동시 진행</span>
          </div>
          <div class="builder-courts-grid">
      `;

      courts.forEach(courtName => {
        const match = (this.builderMatches || []).find(m => m.court === courtName && m.timeSlotIndex === tIdx) || {
          court: courtName,
          timeSlotIndex: tIdx,
          matchNo: 1,
          teamA: [],
          teamB: []
        };

        const a1 = match.teamA?.[0] || "";
        const a2 = match.teamA?.[1] || "";
        const b1 = match.teamB?.[0] || "";
        const b2 = match.teamB?.[1] || "";

        const hasCollision = (name) => name && collisionSet.has(`${tIdx}_${name}`);

        const generateOptions = (selectedName) => {
          let opts = `<option value="">-- 선수 선택 --</option>`;
          const isGroupEvent = this.tournament && this.tournament.mode === "regular_group";
          // If selected player is not in filtered list, preserve it at top so match lineup is not broken
          if (selectedName && !sortedFilterPool.some(m => m.name === selectedName)) {
            const curM = pool.find(p => p.name === selectedName);
            const groupBadge = (isGroupEvent && curM?.group) ? `[${curM.group}] ` : "";
            const isColl = hasCollision(selectedName);
            const collBadge = isColl ? " ⚠️[중복]" : "";
            opts += `<option value="${selectedName}" selected style="color:#f59e0b;">${groupBadge}${selectedName} (선택 유지)${collBadge}</option>`;
          }
          sortedFilterPool.forEach(m => {
            const isSel = m.name === selectedName ? "selected" : "";
            const isColl = hasCollision(m.name);
            const collBadge = isColl ? " ⚠️[중복]" : "";
            const groupBadge = (isGroupEvent && m.group) ? `[${m.group}] ` : "";
            opts += `<option value="${m.name}" ${isSel}>${groupBadge}${m.name} (${m.clubLevel || 2}등 / NTRP ${m.level || 3.0})${collBadge}</option>`;
          });
          return opts;
        };

        const getLvl = (name) => {
          const m = pool.find(p => p.name === name);
          return m ? (m.clubLevel || 2) : 2;
        };

        const countA = (a1 ? 1 : 0) + (a2 ? 1 : 0);
        const countB = (b1 ? 1 : 0) + (b2 ? 1 : 0);
        const avgA = countA > 0 ? ((getLvl(a1) + getLvl(a2)) / countA).toFixed(1) : "-";
        const avgB = countB > 0 ? ((getLvl(b1) + getLvl(b2)) / countB).toFixed(1) : "-";

        html += `
          <div class="builder-court-card">
            <div class="builder-card-top">
              <span class="builder-court-pill">${courtName}</span>
              <span class="builder-match-num">#${match.matchNo} 경기</span>
              <button type="button" class="btn-clear-court-slot" onclick="app.clearBuilderSlot('${courtName}', ${tIdx})">비우기</button>
            </div>

            <div class="builder-teams-grid">
              <div class="builder-team-box">
                <div class="team-tag team-a-tag">
                  <span>Team A (2명)</span>
                  <span class="team-avg">평균: ${avgA}등급</span>
                </div>
                <select class="form-select builder-select ${hasCollision(a1) ? 'collision-alert' : ''}"
                  onchange="app.updateBuilderPlayer('${courtName}', ${tIdx}, 'teamA', 0, this.value)">
                  ${generateOptions(a1)}
                </select>
                <select class="form-select builder-select ${hasCollision(a2) ? 'collision-alert' : ''}"
                  onchange="app.updateBuilderPlayer('${courtName}', ${tIdx}, 'teamA', 1, this.value)">
                  ${generateOptions(a2)}
                </select>
              </div>

              <div class="builder-vs-center">VS</div>

              <div class="builder-team-box">
                <div class="team-tag team-b-tag">
                  <span>Team B (2명)</span>
                  <span class="team-avg">평균: ${avgB}등급</span>
                </div>
                <select class="form-select builder-select ${hasCollision(b1) ? 'collision-alert' : ''}"
                  onchange="app.updateBuilderPlayer('${courtName}', ${tIdx}, 'teamB', 0, this.value)">
                  ${generateOptions(b1)}
                </select>
                <select class="form-select builder-select ${hasCollision(b2) ? 'collision-alert' : ''}"
                  onchange="app.updateBuilderPlayer('${courtName}', ${tIdx}, 'teamB', 1, this.value)">
                  ${generateOptions(b2)}
                </select>
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  updateBuilderPlayer(court, tIdx, teamKey, playerIndex, playerName) {
    const match = (this.builderMatches || []).find(m => m.court === court && m.timeSlotIndex === tIdx);
    if (!match) return;
    if (!Array.isArray(match[teamKey])) match[teamKey] = [];
    match[teamKey][playerIndex] = playerName;
    this.renderManualMatchBuilder();
  }

  clearBuilderSlot(court, tIdx) {
    const match = (this.builderMatches || []).find(m => m.court === court && m.timeSlotIndex === tIdx);
    if (match) {
      match.teamA = [];
      match.teamB = [];
      this.renderManualMatchBuilder();
    }
  }

  clearAllMatchesPrompt() {
    if (!confirm("정말 모든 슬롯의 선수를 비우시겠습니까?")) return;
    (this.builderMatches || []).forEach(m => {
      m.teamA = [];
      m.teamB = [];
    });
    this.renderManualMatchBuilder();
  }

  autoFillManualDraft() {
    const activeMembers = this.memberManager.getActiveMembers().filter(m => m.group !== "미참석");
    const pool = activeMembers.length >= 4 ? activeMembers : this.memberManager.getActiveMembers();
    if (pool.length < 4) {
      alert("출전 가능한 선수가 최소 4명 이상이어야 합니다.");
      return;
    }

    const courts = this.tournament.courts || ["15번", "16번", "17번", "18번"];
    const timeSlots = this.tournament.timeSlots || [];

    this.builderMatches = this.matchmaker.generateBalancedDraft({
      courts,
      timeSlots,
      members: pool,
      preserveExisting: true,
      currentMatches: this.builderMatches
    });

    this.renderManualMatchBuilder();
    alert("⚡ 출전 선수의 경기 수와 레벨 밸런스를 고려해 빈 슬롯에 1차 초안이 자동 추천되었습니다! 원하는 매치업은 드롭다운으로 직접 수정하세요.");
  }

  saveManualMatches() {
    const collisions = this.matchmaker.checkTimeSlotCollisions(this.builderMatches || []);
    if (collisions.length > 0) {
      const summary = collisions.map(c => `[슬롯${c.timeSlotIndex + 1}: ${c.player}]`).join(", ");
      if (!confirm(`⚠️ 동일 시간대에 중복 배정된 선수가 있습니다:\n${summary}\n\n그래도 전광판에 저장하시겠습니까?`)) {
        return;
      }
    }

    const validMatches = (this.builderMatches || [])
      .map(m => ({
        ...m,
        teamA: (m.teamA || []).filter(Boolean),
        teamB: (m.teamB || []).filter(Boolean)
      }))
      .filter(m => m.teamA.length > 0 || m.teamB.length > 0);
    this.tournament.matches = validMatches;
    this.saveTournament();
    this.closeModal("manualMatchBuilderModal");
    this.render();
    alert(`✅ 대진표가 성공적으로 저장되어 전광판에 반영되었습니다! (총 ${validMatches.length}경기)`);
  }

  async toggleAppMode() {
    if (this.appMode === "member") {
      const inputPin = prompt("🔐 경기이사/운영진 관리 모드 PIN 비밀번호를 입력하세요:");
      if (inputPin === null) return; // 취소 누름
      if (!(await this.verifyPin(inputPin))) {
        alert("❌ PIN 비밀번호가 일치하지 않습니다.");
        return;
      }
      this.appMode = "staff";
    } else {
      this.appMode = "member";
    }

    try {
      localStorage.setItem("tennis_app_mode", this.appMode);
    } catch(e) {}
    this.applyAppModeUi();
    this.renderTimeline();
    const modeName = this.appMode === "staff" ? "🛠️ 경기이사(운영진) 모드" : "👤 일반 회원 모드";
    alert(`[${modeName}]로 전환되었습니다.`);
  }

  applyAppModeUi() {
    const isStaff = this.appMode === "staff";
    document.body.classList.toggle("mode-staff", isStaff);
    document.body.classList.toggle("mode-member", !isStaff);

    const btnDesktop = document.getElementById("btnAppModeToggle");
    if (btnDesktop) {
      if (isStaff) {
        btnDesktop.innerHTML = `<span>🛠️</span><span class="btn-text" style="color:var(--neon-gold); font-weight:800;">운영진 모드</span>`;
        btnDesktop.style.borderColor = "var(--neon-gold)";
        btnDesktop.title = "클릭 시 일반 회원 모드로 전환합니다";
      } else {
        btnDesktop.innerHTML = `<span>👤</span><span class="btn-text">회원 모드</span>`;
        btnDesktop.style.borderColor = "#1e3358";
        btnDesktop.title = "클릭 시 경기이사/운영진 모드로 전환합니다";
      }
    }

    const btnMore = document.getElementById("btnMoreModeToggle");
    if (btnMore) {
      btnMore.textContent = isStaff ? "👤 일반 회원 모드로 전환" : "🛠️ 경기이사/운영진 모드로 전환";
    }
  }

  renderMyNextMatchBanner() {
    const container = document.getElementById("myNextMatchBannerMobile");
    if (!container) return;

    const myName = this.selectedPlayerFilter;
    if (!myName) {
      container.innerHTML = `
        <div class="my-next-match-card" onclick="app.switchMobileTab('tab-mymatches')" style="background:rgba(56,189,248,0.1); border-color:rgba(56,189,248,0.3);">
          <div>
            <div class="my-next-badge" style="color:#38bdf8;">💡 나의 경기 알림 설정</div>
            <div class="my-next-details" style="font-size:12px; color:#cbd5e1;">터치하여 본인 이름을 선택하면 나의 다음 경기 일정을 바로 볼 수 있습니다.</div>
          </div>
          <span class="my-next-arrow">선택 &gt;</span>
        </div>
      `;
      return;
    }

    const myMatches = (this.tournament.matches || []).filter(m => 
      (m.teamA || []).includes(myName) || (m.teamB || []).includes(myName)
    );

    if (myMatches.length === 0) {
      container.innerHTML = `
        <div class="my-next-match-card" onclick="app.switchMobileTab('tab-mymatches')">
          <div>
            <div class="my-next-badge">🎾 [${myName}] 님</div>
            <div class="my-next-details" style="font-size:12px;">현재 배정된 경기 일정이 없습니다.</div>
          </div>
          <span class="my-next-arrow">일정 &gt;</span>
        </div>
      `;
      return;
    }

    const playingMatch = myMatches.find(m => m.status === "playing");
    const nextMatch = playingMatch || myMatches.find(m => m.status === "waiting" || m.status === "calling");

    if (nextMatch) {
      const timeSlots = this.tournament.timeSlots || [];
      const slot = timeSlots[nextMatch.timeSlotIndex];
      const timeText = slot ? `${slot.start}` : "";
      const isTeamA = (nextMatch.teamA || []).includes(myName);
      const partner = (isTeamA ? nextMatch.teamA : nextMatch.teamB).filter(n => n !== myName).join(", ");
      const opponents = (isTeamA ? nextMatch.teamB : nextMatch.teamA).join(", ");
      const statusPrefix = nextMatch.status === "playing" ? "🔥 [진행 중] " : "⏳ [다음 경기] ";

      container.innerHTML = `
        <div class="my-next-match-card" onclick="app.switchMobileTab('tab-mymatches')">
          <div>
            <div class="my-next-badge">${statusPrefix}${nextMatch.court} (${timeText})</div>
            <div class="my-next-details">
              <b>${myName}</b>${partner ? ` &amp; ${partner}` : ''} <span class="my-next-vs">vs ${opponents || '대기'}</span>
            </div>
          </div>
          <span class="my-next-arrow">내 경기 &gt;</span>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="my-next-match-card" onclick="app.switchMobileTab('tab-mymatches')" style="border-color:#10b981;">
          <div>
            <div class="my-next-badge" style="color:#10b981;">🎉 경기 완료</div>
            <div class="my-next-details"><b>${myName}</b> 님의 오늘 모든 대진 경기가 완료되었습니다!</div>
          </div>
          <span class="my-next-arrow">결과 &gt;</span>
        </div>
      `;
    }
  }

  onMemberEmptyCardClick() {
    alert("💡 현재 비어있는 대기 코트입니다. 대진표 추가는 상단 [회원 모드] 버튼을 눌러 [운영진 모드]로 전환 후 진행하세요.");
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


  openSettingsModal() {
    document.getElementById("setTourneyTitle").value = this.tournament.title;
    document.getElementById("setTourneyDate").value = this.tournament.date || "";
    document.getElementById("setTourneyMode").value = this.tournament.mode || "regular_individual";
    const leagueSelect = document.getElementById("setTourneyIsLeague");
    if (leagueSelect) {
      leagueSelect.value = this.tournament.isLeagueMatch !== false ? "true" : "false";
    }
    this.showModal("settingsModal");
  }

  saveSettings() {
    this.tournament.title = document.getElementById("setTourneyTitle").value.trim() || "월례회 대회";
    this.tournament.date = document.getElementById("setTourneyDate").value;
    this.tournament.mode = document.getElementById("setTourneyMode").value;
    const leagueSelect = document.getElementById("setTourneyIsLeague");
    if (leagueSelect) {
      this.tournament.isLeagueMatch = leagueSelect.value === "true";
    }

    // 📢 환경설정에서 대회 명칭이나 리그 설정 변경 시 하단 속보 티커 즉시 동기화
    const hasCompletedMatches = (this.tournament.matches || []).some(m => m.status === "completed");
    if (!hasCompletedMatches || (this.tournament.breakingNews && this.tournament.breakingNews.startsWith("[공식 개막]"))) {
      const isLeague = this.tournament.isLeagueMatch !== false;
      const josa = this.getSubjectJosa(this.tournament.title);
      this.tournament.breakingNews = `[공식 개막] ${this.tournament.title}${josa} 공식 개막되었습니다! (${isLeague ? "🏆 개인 리그전 전적/득실 누적" : "✕ 친선/이벤트전 - 리그 미반영"})`;
    }

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
      isLeagueMatch: true,
      leagueCommitted: false,
      isMasterReset: true
    };

    if (this.leaderboard && typeof this.leaderboard.resetLeagueCumulativeStats === "function") {
      this.leaderboard.resetLeagueCumulativeStats();
    }

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

    if (!Array.isArray(this.modalStack)) this.modalStack = [];
    
    // Remove if already in stack, then push to top
    this.modalStack = this.modalStack.filter(mId => mId !== id);
    this.modalStack.push(id);

    // Dynamic z-index layering so stacked/child modals overlay parent modals
    el.style.zIndex = (100 + this.modalStack.length * 10).toString();
    el.classList.add("active");

    // Mobile native Back button support
    try {
      if (!history.state || history.state.modalId !== id) {
        history.pushState({ modalId: id, stackDepth: this.modalStack.length }, "");
      }
    } catch(e) {}
  }

  closeModal(id, popHistory = true) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("active");
      el.style.zIndex = "";
    }
    if (Array.isArray(this.modalStack)) {
      this.modalStack = this.modalStack.filter(mId => mId !== id);
    }

    // Pop history state if closing programmatically without triggering popstate modal wipe
    if (popHistory) {
      try {
        if (history.state && history.state.modalId === id) {
          this.programmaticBackCount = (this.programmaticBackCount || 0) + 1;
          this.isProgrammaticBack = true;
          history.back();
        }
      } catch(e) {}
    }
  }

  closeAllActiveModals() {
    if (Array.isArray(this.modalStack)) {
      this.modalStack.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove("active");
          el.style.zIndex = "";
        }
      });
    }
    document.querySelectorAll(".modal-backdrop.active").forEach(m => {
      m.classList.remove("active");
      m.style.zIndex = "";
    });
    this.modalStack = [];
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
      // If triggered programmatically by closeModal(), ignore to preserve parent modals
      if (this.programmaticBackCount > 0) {
        this.programmaticBackCount--;
        this.isProgrammaticBack = false;
        return;
      }
      if (this.isProgrammaticBack) {
        this.isProgrammaticBack = false;
        return;
      }

      // If user pressed mobile hardware Back button:
      // Close ONLY the topmost active modal, keeping parent modals intact!
      if (Array.isArray(this.modalStack) && this.modalStack.length > 0) {
        const topModalId = this.modalStack.pop();
        const topEl = document.getElementById(topModalId);
        if (topEl) {
          topEl.classList.remove("active");
          topEl.style.zIndex = "";
        }
      } else {
        const activeModals = document.querySelectorAll(".modal-backdrop.active");
        if (activeModals.length > 0) {
          activeModals.forEach(m => {
            m.classList.remove("active");
            m.style.zIndex = "";
          });
        }
      }
    });

    // 2. Click outside (backdrop tap) to close ONLY the topmost active modal
    document.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("modal-backdrop") && e.target.classList.contains("active")) {
        const topModalId = Array.isArray(this.modalStack) && this.modalStack.length > 0
          ? this.modalStack[this.modalStack.length - 1]
          : e.target.id;
        if (topModalId && e.target.id === topModalId) {
          this.closeModal(topModalId);
        } else {
          this.closeModal(e.target.id);
        }
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
        try {
          if (this.selectedPlayerFilter) {
            localStorage.setItem("tennis_my_player_name", this.selectedPlayerFilter);
          } else {
            localStorage.removeItem("tennis_my_player_name");
          }
        } catch(err) {}
        this.renderMyMatchesView();
        this.renderMyNextMatchBanner();
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
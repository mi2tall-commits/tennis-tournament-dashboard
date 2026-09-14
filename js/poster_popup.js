/**
 * 🦄 유니콘 테니스 정기전 안내 팝업 포스터 렌더러 (웹 디자이너 프로페셔널 버전)
 * - [디자인 1] 세로 비율 최적화 (324px x 460px 앙증맞고 컴팩트한 모바일 뷰)
 * - [디자인 2] 타이틀 상단 아래로 안정적 배치 & 큼직한 딥 포레스트 그린(#0d5528)
 * - [디자인 3] 일시/장소/코트 각각 1줄 배치, 폰트 밸런스 튜닝, 테니스공/라켓과 40px 이상 안전 간격 유지
 * - [디자인 4] 잔디 100% 무결점 정돈 & 화이트 볼드 타이포그래피
 * - [디자인 5] '오늘은 더 이상 열지 않습니다' & 세련된 모달 컨트롤 탑재
 */
(function() {
  function initPosterPopup() {
    const config = window.UNICORN_POSTER_CONFIG;
    if (!config || !config.enabled) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const storageKey = 'hide_unicorn_poster_' + (config.posterId || 'default');

    if (localStorage.getItem(storageKey) === todayStr) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      #unicornPosterOverlay {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(3, 7, 18, 0.78);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        opacity: 0;
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #unicornPosterOverlay.show {
        opacity: 1;
      }
      .unicorn-poster-card {
        width: 100%;
        max-width: 320px;
        background: #f4e4d4;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.25);
        display: flex;
        flex-direction: column;
        transform: scale(0.92);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: 'Pretendard', -apple-system, sans-serif;
      }
      #unicornPosterOverlay.show .unicorn-poster-card {
        transform: scale(1);
      }
      .poster-visual-wrapper {
        position: relative;
        width: 100%;
        aspect-ratio: 332 / 460;
        background-image: url('poster_bg_perfect.png');
        background-size: 100% 100%;
        background-position: center;
        background-repeat: no-repeat;
        user-select: none;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .poster-top-close-btn {
        position: absolute;
        top: 10px;
        right: 12px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(30, 20, 15, 0.12);
        color: #1e293b;
        border: none;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 10;
      }
      .poster-top-close-btn:hover {
        background: rgba(30, 20, 15, 0.25);
        transform: rotate(90deg);
      }
      /* [디자인 1] 제목: 상단 아래로 안정적 배치 & 큼직하고 찐한 딥 포레스트 그린 */
      .poster-title-row {
        margin-top: 36px;
        text-align: center;
        padding: 0 8px;
      }
      .poster-title-text {
        font-size: 25px;
        font-weight: 900;
        color: #0d5528; /* 찐하고 고급스러운 딥 포레스트 그린 */
        letter-spacing: -0.8px;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.95), 0 2px 4px rgba(13, 85, 40, 0.1);
        line-height: 1.1;
      }
      /* [디자인 2] 중간 상세 내용: 네모창 전면 제거, 좌측 슬림 악센트 바 & 각각 1줄 정돈 */
      .poster-mid-details {
        position: absolute;
        top: 25%;
        left: 20px;
        width: 46%;
        max-width: 148px;
        display: flex;
        flex-direction: column;
        gap: 6.5px;
        z-index: 5;
        border-left: 2.5px solid #166534;
        padding-left: 8px;
      }
      .detail-one-line {
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .detail-label-tag {
        font-size: 10.5px;
        font-weight: 800;
        color: #166534;
        letter-spacing: -0.2px;
        flex-shrink: 0;
      }
      .detail-divider {
        color: rgba(22, 101, 52, 0.35);
        font-size: 9px;
        flex-shrink: 0;
      }
      .detail-value-text {
        font-size: 11.5px;
        font-weight: 900;
        color: #0f172a;
        letter-spacing: -0.4px;
        text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
      }
      .detail-accent-date {
        color: #b91c1c; /* 일시는 선명한 딥 레드 포인트 */
      }
      .detail-league-line {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #c2410c;
        font-size: 10.5px;
        font-weight: 900;
        margin-top: 1px;
        white-space: nowrap;
        letter-spacing: -0.4px;
        text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
      }
      /* [디자인 3] 하단부 신청 문구: 깨끗한 잔디 위 화이트 볼드 타이포그래피 */
      .poster-bot-line {
        position: absolute;
        bottom: 3.5%;
        left: 8px;
        width: 58%;
        text-align: center;
        z-index: 5;
      }
      .poster-bot-text {
        color: #ffffff;
        font-size: 11px;
        font-weight: 900;
        white-space: nowrap;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        letter-spacing: -0.3px;
      }
      /* [디자인 4] 하단 컨트롤 바: 포스터와 자연스럽게 연결되는 웜 다크 바 */
      .poster-modal-footer {
        background: #0f172a;
        border-top: 1px solid #1e293b;
        padding: 9px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .poster-checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #cbd5e1;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        user-select: none;
      }
      .poster-checkbox-label input {
        accent-color: #10b981;
        width: 15px;
        height: 15px;
        cursor: pointer;
      }
      .poster-footer-close-btn {
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .poster-footer-close-btn:hover {
        background: #334155;
        color: #ffffff;
      }
    `;
    document.head.appendChild(styleEl);

    // 팝업 DOM 생성
    const overlay = document.createElement('div');
    overlay.id = 'unicornPosterOverlay';
    overlay.innerHTML = `
      <div class="unicorn-poster-card">
        <div class="poster-visual-wrapper">
          <button type="button" class="poster-top-close-btn" id="posterBtnTopClose" title="닫기">&times;</button>
          
          <!-- 1. 제목 (상단 아래로 여백 확보 + 큼직한 찐한 녹색) -->
          <div class="poster-title-row">
            <h2 class="poster-title-text">${config.title || '26년 9월 유니콘 정기전'}</h2>
          </div>

          <!-- 2. 중간 상세 내용 (좌측 악센트 바 + 각각 1줄 표시 + 이미지 겹침 방지) -->
          <div class="poster-mid-details">
            <div class="detail-one-line">
              <span class="detail-label-tag">일시</span>
              <span class="detail-divider">|</span>
              <span class="detail-value-text detail-accent-date">${config.date || '9.20 (일) 08-11시'}</span>
            </div>

            <div class="detail-one-line">
              <span class="detail-label-tag">장소</span>
              <span class="detail-divider">|</span>
              <span class="detail-value-text">${config.venue || '문수테니스장'}</span>
            </div>

            <div class="detail-one-line">
              <span class="detail-label-tag">코트</span>
              <span class="detail-divider">|</span>
              <span class="detail-value-text">${config.courts || '16~19번, 21~22번'}</span>
            </div>

            ${config.leagueNote ? `
              <div class="detail-league-line">
                <span>⚡ ${config.leagueNote}</span>
              </div>
            ` : ''}
          </div>

          <!-- 3. 하단부 문구 (티끌 없이 깨끗한 잔디 위 화이트 볼드) -->
          <div class="poster-bot-line">
            <span class="poster-bot-text">${config.bottomMessage || '모두 함께 테니스! 지금 신청하세요!'}</span>
          </div>
        </div>

        <!-- 하단 컨트롤 바: 오늘은 더 이상 열지 않습니다 & 닫기 -->
        <div class="poster-modal-footer">
          <label class="poster-checkbox-label">
            <input type="checkbox" id="posterHideTodayCheck">
            <span>오늘은 더 이상 열지 않습니다</span>
          </label>
          <button type="button" class="poster-footer-close-btn" id="posterBtnFooterClose">닫기</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      setTimeout(() => {
        overlay.classList.add('show');
      }, 50);
    });

    function closePoster() {
      const hideCheck = document.getElementById('posterHideTodayCheck');
      if (hideCheck && hideCheck.checked) {
        localStorage.setItem(storageKey, todayStr);
      }
      overlay.classList.remove('show');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 250);
    }

    document.getElementById('posterBtnTopClose').addEventListener('click', closePoster);
    document.getElementById('posterBtnFooterClose').addEventListener('click', closePoster);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePoster();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPosterPopup);
  } else {
    initPosterPopup();
  }
})();

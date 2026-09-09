// 테니스 동호회 정기대회 샘플 데이터셋 (레퍼런스 이미지 기반 & 8대 운영 요구사항 반영)
const DEFAULT_TOURNAMENT = {
  id: "tourney_202610",
  title: "2026년 10월 정기대회",
  date: "2026-10-18",
  rule: "승점 > 득실차 > 다득점",
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  gameDurationMinutes: 40, // 40분 단위 경기 기본 진행
  startTime: "10:00",
  courts: ["15번", "16번", "17번", "18번"], // 코트 번호 개별 입력 지원
  timeSlots: [
    { start: "10:00", end: "10:40" },
    { start: "10:40", end: "11:20" },
    { start: "11:20", end: "12:00" },
    { start: "12:00", end: "12:40" },
    { start: "12:40", end: "13:20" }
  ],
  players: [
    { id: "p1", name: "정다운" },
    { id: "p2", name: "송영수" },
    { id: "p3", name: "김명중" },
    { id: "p4", name: "정민석" },
    { id: "p5", name: "안정환" },
    { id: "p6", name: "이동기" },
    { id: "p7", name: "대니얼" },
    { id: "p8", name: "양용빈" },
    { id: "p9", name: "김은빈" },
    { id: "p10", name: "최경승" },
    { id: "p11", name: "정지우" },
    { id: "p12", name: "이지연" },
    { id: "p13", name: "전동훈" }
  ],
  matches: [
    // 15번 코트
    { id: "m1", court: "15번", matchNo: 1, timeSlotIndex: 0, teamA: ["이동기", "대니얼"], teamB: ["송영수", "김명중"], scoreA: 6, scoreB: 3, tieBreak: null, status: "finished" },
    { id: "m4", court: "15번", matchNo: 4, timeSlotIndex: 1, teamA: ["김명중", "전동훈"], teamB: ["양용빈", "정다운"], scoreA: 6, scoreB: 4, tieBreak: null, status: "finished" },
    { id: "m7", court: "15번", matchNo: 7, timeSlotIndex: 2, teamA: ["최경승", "송영수"], teamB: ["전동훈", "정지우"], scoreA: 6, scoreB: 2, tieBreak: null, status: "finished" },
    { id: "m10", court: "15번", matchNo: 10, timeSlotIndex: 3, teamA: ["전동훈", "양용빈"], teamB: ["송영수", "정다운"], scoreA: 0, scoreB: 6, tieBreak: null, status: "finished" },
    { id: "m13", court: "15번", matchNo: 13, timeSlotIndex: 4, teamA: ["이동기", "전동훈"], teamB: ["양용빈", "송영수"], scoreA: 3, scoreB: 6, tieBreak: null, status: "finished" },

    // 16번 코트
    { id: "m2", court: "16번", matchNo: 2, timeSlotIndex: 0, teamA: ["정다운", "정지우"], teamB: ["최경승", "김은빈"], scoreA: 6, scoreB: 2, tieBreak: null, status: "finished" },
    { id: "m5", court: "16번", matchNo: 5, timeSlotIndex: 1, teamA: ["정민석", "안정환"], teamB: ["정지우", "이지연"], scoreA: 6, scoreB: 3, tieBreak: null, status: "finished" },
    { id: "m8", court: "16번", matchNo: 8, timeSlotIndex: 2, teamA: ["김명중", "김은빈"], teamB: ["정민석", "이동기"], scoreA: 6, scoreB: 4, tieBreak: null, status: "finished" },
    { id: "m11", court: "16번", matchNo: 11, timeSlotIndex: 3, teamA: ["김명중", "대니얼"], teamB: ["김은빈", "정민석"], scoreA: 6, scoreB: 4, tieBreak: null, status: "finished" },

    // 17번 코트
    { id: "m3", court: "17번", matchNo: 3, timeSlotIndex: 0, teamA: ["안정환", "이지연"], teamB: ["정민석", "양용빈"], scoreA: 2, scoreB: 6, tieBreak: null, status: "finished" },
    { id: "m6", court: "17번", matchNo: 6, timeSlotIndex: 1, teamA: ["최경승", "대니얼"], teamB: ["이동기", "김은빈"], scoreA: 4, scoreB: 6, tieBreak: null, status: "finished" },
    { id: "m9", court: "17번", matchNo: 9, timeSlotIndex: 2, teamA: ["정다운", "안정환"], teamB: ["이지연", "대니얼"], scoreA: 6, scoreB: 3, tieBreak: null, status: "finished" },
    { id: "m12", court: "17번", matchNo: 12, timeSlotIndex: 3, teamA: ["안정환", "정지우"], teamB: ["최경승", "이지연"], scoreA: 5, scoreB: 5, tieBreak: "7:5", status: "finished" },

    // 18번 코트
    { id: "m14", court: "18번", matchNo: 14, timeSlotIndex: 0, teamA: ["김은빈", "전동훈"], teamB: ["대니얼", "정지우"], scoreA: 6, scoreB: 4, tieBreak: null, status: "finished" },
    { id: "m15", court: "18번", matchNo: 15, timeSlotIndex: 1, teamA: ["정다운", "최경승"], teamB: ["이동기", "안정환"], scoreA: 6, scoreB: 5, tieBreak: "7:3", status: "finished" }
  ],
  // 월별 코트 예약 커피쿠폰 지급 관리 내역 (1위 3매, 2위 2매, 3위 1매)
  courtBookings: [
    { id: "bk_1", booker: "김명중", date: "2026-10-04", court: "15번", hours: 2, note: "새벽 타임 정기 대관" },
    { id: "bk_2", booker: "송영수", date: "2026-10-11", court: "16번", hours: 2, note: "정기전 코트 1 예약" },
    { id: "bk_3", booker: "김명중", date: "2026-10-11", court: "17번", hours: 2, note: "정기전 코트 2 예약" },
    { id: "bk_4", booker: "이동기", date: "2026-10-18", court: "15번", hours: 2, note: "월례회 대회 코트 15번" },
    { id: "bk_5", booker: "최경승", date: "2026-10-18", court: "16번", hours: 2, note: "월례회 대회 코트 16번" },
    { id: "bk_6", booker: "김명중", date: "2026-10-18", court: "17번", hours: 2, note: "월례회 대회 코트 17번" },
    { id: "bk_7", booker: "송영수", date: "2026-10-25", court: "18번", hours: 2, note: "월말 연습경기 코트" },
    { id: "bk_8", booker: "정다운", date: "2026-10-28", court: "15번", hours: 2, note: "주중 야간 라이트 코트" }
  ],
  newsTicker: [
    { text: "15번 코트 #7경기 결과 (6 : 2)", sub: "15번 코트 스코어 [6 : 2] 확정.", timeAgo: "방금 전" },
    { text: "16번 코트 #5경기 결과 (6 : 3)", sub: "16번 코트 스코어 [6 : 3] 확정.", timeAgo: "방금 전" },
    { text: "15번 코트 #1경기 결과 (6 : 3)", sub: "15번 코트 스코어 [6 : 3] 확정.", timeAgo: "방금 전" },
    { text: "17번 코트 #3경기 결과 (2 : 6)", sub: "17번 코트 스코어 [2 : 6] 확정.", timeAgo: "방금 전" },
    { text: "15번 코트 #4경기 결과 (6 : 4)", sub: "15번 코트 스코어 [6 : 4] 확정.", timeAgo: "방금 전" },
    { text: "18번 코트 #15경기 결과 (6 : 5)", sub: "18번 코트 스코어 [6 : 5] 확정.", timeAgo: "방금 전" }
  ],
  breakingNews: "[속보] 15번 코트 스코어 [6 : 2] 확정."
};
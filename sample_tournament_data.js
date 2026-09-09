// 테니스 동호회 정기대회 샘플 데이터셋 (64명 공식 회원 명부 연동)
const DEFAULT_TOURNAMENT = {
  "id": "tourney_202610",
  "title": "2026년 10월 정기대회",
  "date": "2026-10-18",
  "rule": "승점 > 득실차 > 다득점",
  "pointsWin": 3,
  "pointsDraw": 1,
  "pointsLoss": 0,
  "gameDurationMinutes": 40,
  "startTime": "10:00",
  "courts": [
    "15번",
    "16번",
    "17번",
    "18번"
  ],
  "timeSlots": [
    {
      "start": "10:00",
      "end": "10:40"
    },
    {
      "start": "10:40",
      "end": "11:20"
    },
    {
      "start": "11:20",
      "end": "12:00"
    },
    {
      "start": "12:00",
      "end": "12:40"
    },
    {
      "start": "12:40",
      "end": "13:20"
    }
  ],
  "players": [
    {
      "id": "mem_1",
      "name": "전현덕"
    },
    {
      "id": "mem_2",
      "name": "박현숙"
    },
    {
      "id": "mem_3",
      "name": "강현지"
    },
    {
      "id": "mem_4",
      "name": "임준혁"
    },
    {
      "id": "mem_5",
      "name": "설수환"
    },
    {
      "id": "mem_6",
      "name": "허혜진"
    },
    {
      "id": "mem_7",
      "name": "김성윤(26)"
    },
    {
      "id": "mem_8",
      "name": "강선균"
    },
    {
      "id": "mem_9",
      "name": "김인혜"
    },
    {
      "id": "mem_10",
      "name": "장경찬"
    },
    {
      "id": "mem_11",
      "name": "한성호"
    },
    {
      "id": "mem_12",
      "name": "김지은"
    },
    {
      "id": "mem_13",
      "name": "손정철"
    },
    {
      "id": "mem_14",
      "name": "박상현"
    },
    {
      "id": "mem_15",
      "name": "임재성"
    },
    {
      "id": "mem_16",
      "name": "안은정"
    },
    {
      "id": "mem_17",
      "name": "이민우"
    },
    {
      "id": "mem_18",
      "name": "김형섭"
    },
    {
      "id": "mem_19",
      "name": "이정건"
    },
    {
      "id": "mem_20",
      "name": "이동현"
    },
    {
      "id": "mem_21",
      "name": "서지원"
    },
    {
      "id": "mem_22",
      "name": "이정향"
    },
    {
      "id": "mem_23",
      "name": "이영"
    },
    {
      "id": "mem_24",
      "name": "이은주"
    },
    {
      "id": "mem_25",
      "name": "고다희"
    },
    {
      "id": "mem_26",
      "name": "신정기"
    },
    {
      "id": "mem_27",
      "name": "안재현"
    },
    {
      "id": "mem_28",
      "name": "정우근"
    },
    {
      "id": "mem_29",
      "name": "이윤서"
    },
    {
      "id": "mem_30",
      "name": "이상헌"
    },
    {
      "id": "mem_31",
      "name": "조진호"
    },
    {
      "id": "mem_32",
      "name": "권기환"
    },
    {
      "id": "mem_33",
      "name": "이효일"
    },
    {
      "id": "mem_34",
      "name": "남승민"
    },
    {
      "id": "mem_35",
      "name": "이정윤"
    },
    {
      "id": "mem_36",
      "name": "송영태"
    },
    {
      "id": "mem_37",
      "name": "김형준"
    },
    {
      "id": "mem_38",
      "name": "임영자"
    },
    {
      "id": "mem_39",
      "name": "김종철"
    },
    {
      "id": "mem_40",
      "name": "채상엽"
    },
    {
      "id": "mem_41",
      "name": "최미정"
    },
    {
      "id": "mem_42",
      "name": "심지후"
    },
    {
      "id": "mem_43",
      "name": "심정석"
    },
    {
      "id": "mem_44",
      "name": "차흥철"
    },
    {
      "id": "mem_45",
      "name": "박순원"
    },
    {
      "id": "mem_46",
      "name": "강수정"
    },
    {
      "id": "mem_47",
      "name": "하기영"
    },
    {
      "id": "mem_48",
      "name": "김병재"
    },
    {
      "id": "mem_49",
      "name": "김선미"
    },
    {
      "id": "mem_50",
      "name": "이종대"
    },
    {
      "id": "mem_51",
      "name": "정승원"
    },
    {
      "id": "mem_52",
      "name": "이상민"
    },
    {
      "id": "mem_53",
      "name": "김규연"
    },
    {
      "id": "mem_54",
      "name": "이윤재"
    },
    {
      "id": "mem_55",
      "name": "소재업"
    },
    {
      "id": "mem_56",
      "name": "서동원"
    },
    {
      "id": "mem_57",
      "name": "김현제"
    },
    {
      "id": "mem_58",
      "name": "김동진"
    },
    {
      "id": "mem_59",
      "name": "김미진"
    },
    {
      "id": "mem_60",
      "name": "송미라"
    },
    {
      "id": "mem_61",
      "name": "김성윤(회장)"
    },
    {
      "id": "mem_62",
      "name": "엄재용"
    },
    {
      "id": "mem_63",
      "name": "윤상화"
    },
    {
      "id": "mem_64",
      "name": "김동관"
    }
  ],
  "matches": [
    {
      "id": "m1",
      "court": "15번",
      "matchNo": 1,
      "timeSlotIndex": 0,
      "teamA": [
        "서동원",
        "전현덕"
      ],
      "teamB": [
        "김현제",
        "박현숙"
      ],
      "scoreA": 6,
      "scoreB": 3,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m4",
      "court": "15번",
      "matchNo": 4,
      "timeSlotIndex": 1,
      "teamA": [
        "김성윤(회장)",
        "강현지"
      ],
      "teamB": [
        "이정윤",
        "임준혁"
      ],
      "scoreA": 6,
      "scoreB": 4,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m7",
      "court": "15번",
      "matchNo": 7,
      "timeSlotIndex": 2,
      "teamA": [
        "정우근",
        "설수환"
      ],
      "teamB": [
        "허혜진",
        "김성윤(26)"
      ],
      "scoreA": 6,
      "scoreB": 2,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m10",
      "court": "15번",
      "matchNo": 10,
      "timeSlotIndex": 3,
      "teamA": [
        "강선균",
        "김인혜"
      ],
      "teamB": [
        "장경찬",
        "한성호"
      ],
      "scoreA": 0,
      "scoreB": 6,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m13",
      "court": "15번",
      "matchNo": 13,
      "timeSlotIndex": 4,
      "teamA": [
        "김지은",
        "손정철"
      ],
      "teamB": [
        "박상현",
        "임재성"
      ],
      "scoreA": 3,
      "scoreB": 6,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m2",
      "court": "16번",
      "matchNo": 2,
      "timeSlotIndex": 0,
      "teamA": [
        "안은정",
        "이민우"
      ],
      "teamB": [
        "김형섭",
        "이정건"
      ],
      "scoreA": 6,
      "scoreB": 2,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m5",
      "court": "16번",
      "matchNo": 5,
      "timeSlotIndex": 1,
      "teamA": [
        "이동현",
        "서지원"
      ],
      "teamB": [
        "이정향",
        "이영"
      ],
      "scoreA": 6,
      "scoreB": 3,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m8",
      "court": "16번",
      "matchNo": 8,
      "timeSlotIndex": 2,
      "teamA": [
        "이은주",
        "고다희"
      ],
      "teamB": [
        "신정기",
        "안재현"
      ],
      "scoreA": 6,
      "scoreB": 4,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m11",
      "court": "16번",
      "matchNo": 11,
      "timeSlotIndex": 3,
      "teamA": [
        "이윤서",
        "이상헌"
      ],
      "teamB": [
        "조진호",
        "권기환"
      ],
      "scoreA": 6,
      "scoreB": 4,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m3",
      "court": "17번",
      "matchNo": 3,
      "timeSlotIndex": 0,
      "teamA": [
        "이효일",
        "남승민"
      ],
      "teamB": [
        "송영태",
        "김형준"
      ],
      "scoreA": 2,
      "scoreB": 6,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m6",
      "court": "17번",
      "matchNo": 6,
      "timeSlotIndex": 1,
      "teamA": [
        "임영자",
        "김종철"
      ],
      "teamB": [
        "채상엽",
        "최미정"
      ],
      "scoreA": 4,
      "scoreB": 6,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m9",
      "court": "17번",
      "matchNo": 9,
      "timeSlotIndex": 2,
      "teamA": [
        "심지후",
        "심정석"
      ],
      "teamB": [
        "차흥철",
        "박순원"
      ],
      "scoreA": 6,
      "scoreB": 3,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m12",
      "court": "17번",
      "matchNo": 12,
      "timeSlotIndex": 3,
      "teamA": [
        "강수정",
        "하기영"
      ],
      "teamB": [
        "김병재",
        "김선미"
      ],
      "scoreA": 5,
      "scoreB": 5,
      "tieBreak": "7:5",
      "status": "finished"
    },
    {
      "id": "m14",
      "court": "18번",
      "matchNo": 14,
      "timeSlotIndex": 0,
      "teamA": [
        "이종대",
        "정승원"
      ],
      "teamB": [
        "이상민",
        "김규연"
      ],
      "scoreA": 6,
      "scoreB": 4,
      "tieBreak": null,
      "status": "finished"
    },
    {
      "id": "m15",
      "court": "18번",
      "matchNo": 15,
      "timeSlotIndex": 1,
      "teamA": [
        "이윤재",
        "소재업"
      ],
      "teamB": [
        "김동진",
        "김미진"
      ],
      "scoreA": 6,
      "scoreB": 5,
      "tieBreak": "7:3",
      "status": "finished"
    }
  ],
  "courtBookings": [
    {
      "id": "bk_1",
      "booker": "서동원",
      "date": "2026-10-04",
      "court": "15번",
      "hours": 2,
      "note": "새벽 정기 대관"
    },
    {
      "id": "bk_2",
      "booker": "김현제",
      "date": "2026-10-11",
      "court": "16번",
      "hours": 2,
      "note": "정기전 코트 예약"
    },
    {
      "id": "bk_3",
      "booker": "서동원",
      "date": "2026-10-11",
      "court": "17번",
      "hours": 2,
      "note": "정기전 코트 2"
    },
    {
      "id": "bk_4",
      "booker": "전현덕",
      "date": "2026-10-18",
      "court": "15번",
      "hours": 2,
      "note": "대회 메인 코트"
    },
    {
      "id": "bk_5",
      "booker": "박현숙",
      "date": "2026-10-18",
      "court": "16번",
      "hours": 2,
      "note": "대회 메인 코트"
    },
    {
      "id": "bk_6",
      "booker": "김성윤(회장)",
      "date": "2026-10-18",
      "court": "17번",
      "hours": 2,
      "note": "대회 예비 코트"
    },
    {
      "id": "bk_7",
      "booker": "이정윤",
      "date": "2026-10-25",
      "court": "18번",
      "hours": 2,
      "note": "연습경기 코트"
    },
    {
      "id": "bk_8",
      "booker": "정우근",
      "date": "2026-10-28",
      "court": "15번",
      "hours": 2,
      "note": "야간 라이트 코트"
    }
  ],
  "newsTicker": [
    {
      "text": "15번 코트 #1경기 결과 (6 : 3)",
      "sub": "서동원·전현덕 조 승리 확정.",
      "timeAgo": "방금 전"
    },
    {
      "text": "15번 코트 #4경기 결과 (6 : 4)",
      "sub": "김성윤(회장)·강현지 조 승리 확정.",
      "timeAgo": "방금 전"
    },
    {
      "text": "16번 코트 #2경기 결과 (6 : 2)",
      "sub": "안은정·이민우 조 승리 확정.",
      "timeAgo": "방금 전"
    },
    {
      "text": "17번 코트 #3경기 결과 (2 : 6)",
      "sub": "송영태·김형준 조 승리 확정.",
      "timeAgo": "방금 전"
    },
    {
      "text": "18번 코트 #14경기 결과 (6 : 4)",
      "sub": "이종대·정승원 조 승리 확정.",
      "timeAgo": "방금 전"
    }
  ],
  "breakingNews": "[속보] 15번 코트 #1경기 [서동원·전현덕 6 : 3 김현제·박현숙] 확정!"
};

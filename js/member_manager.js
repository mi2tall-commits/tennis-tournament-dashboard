/**
 * 👥 회원 명단 관리 모듈 (Member Manager Engine)
 * - 64명 공식 회원 명부 연동
 * - 6대 공식 역할 표준화: 회장, 부회장, 경기이사, 재무이사, 총무이사, 회원
 * - LEVEL: 1~4등급
 * - A~D조 직접 선택 및 편성 관리 지원
 */

const STANDARD_ROLES = ["회장", "부회장", "경기이사", "재무이사", "총무이사", "회원"];

const DEFAULT_MEMBERS = [
  {
    "id": "mem_1",
    "no": 1,
    "name": "전*덕",
    "rawName": "전*덕",
    "joinDate": "2026-05-26",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2001",
    "notes": "2026-05-26 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_2",
    "no": 2,
    "name": "박*숙",
    "rawName": "박*숙",
    "joinDate": "2026-04-20",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2002",
    "notes": "2026-04-20 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_3",
    "no": 3,
    "name": "강*지",
    "rawName": "강*지",
    "joinDate": "2026-04-20",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2003",
    "notes": "2026-04-20 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_4",
    "no": 4,
    "name": "임*혁",
    "rawName": "임*혁",
    "joinDate": "2026-02-24",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2004",
    "notes": "2026-02-24 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_5",
    "no": 5,
    "name": "설*환",
    "rawName": "설*환",
    "joinDate": "2026-01-29",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2005",
    "notes": "2026-01-29 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_6",
    "no": 6,
    "name": "허*진",
    "rawName": "허*진",
    "joinDate": "2026-01-29",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2006",
    "notes": "2026-01-29 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_7",
    "no": 7,
    "name": "김*윤(26)",
    "rawName": "김*윤",
    "joinDate": "2026-01-20",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2007",
    "notes": "2026-01-20 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_8",
    "no": 8,
    "name": "강*균",
    "rawName": "강*균",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2008",
    "notes": "2026-01-12 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_9",
    "no": 9,
    "name": "김*혜",
    "rawName": "김*혜",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2009",
    "notes": "2026-01-12 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_10",
    "no": 10,
    "name": "장*찬",
    "rawName": "장*찬",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2010",
    "notes": "2026-01-12 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_11",
    "no": 11,
    "name": "한*호",
    "rawName": "한*호",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2011",
    "notes": "2026-01-12 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_12",
    "no": 12,
    "name": "김*은",
    "rawName": "김*은",
    "joinDate": "2025-11-15",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2012",
    "notes": "2025-11-15 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_13",
    "no": 13,
    "name": "손*철",
    "rawName": "손*철",
    "joinDate": "2025-06-14",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2013",
    "notes": "2025-06-14 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_14",
    "no": 14,
    "name": "박*현",
    "rawName": "박*현",
    "joinDate": "2025-03-14",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2014",
    "notes": "2025-03-14 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_15",
    "no": 15,
    "name": "임*성",
    "rawName": "임*성",
    "joinDate": "2025-02-15",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2015",
    "notes": "2025-02-15 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_16",
    "no": 16,
    "name": "안*정",
    "rawName": "안*정",
    "joinDate": "2025-02-02",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2016",
    "notes": "2025-02-02 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_17",
    "no": 17,
    "name": "이*우",
    "rawName": "이*우",
    "joinDate": "2025-01-25",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2017",
    "notes": "2025-01-25 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_18",
    "no": 18,
    "name": "김*섭",
    "rawName": "김*섭",
    "joinDate": "2024-11-04",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2018",
    "notes": "2024-11-04 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_19",
    "no": 19,
    "name": "이*건",
    "rawName": "이*건",
    "joinDate": "2024-11-04",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2019",
    "notes": "2024-11-04 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_20",
    "no": 20,
    "name": "이*현",
    "rawName": "이*현",
    "joinDate": "2024-11-04",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2020",
    "notes": "2024-11-04 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_21",
    "no": 21,
    "name": "서*원",
    "rawName": "서*원",
    "joinDate": "2024-10-17",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2021",
    "notes": "2024-10-17 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_22",
    "no": 22,
    "name": "이*향",
    "rawName": "이*향",
    "joinDate": "2024-09-10",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2022",
    "notes": "2024-09-10 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_23",
    "no": 23,
    "name": "이*",
    "rawName": "이*",
    "joinDate": "2024-08-24",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2023",
    "notes": "2024-08-24 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_24",
    "no": 24,
    "name": "이*주",
    "rawName": "이*주",
    "joinDate": "2024-08-12",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2024",
    "notes": "2024-08-12 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_25",
    "no": 25,
    "name": "고*희",
    "rawName": "고*희",
    "joinDate": "2024-07-07",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2025",
    "notes": "2024-07-07 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_26",
    "no": 26,
    "name": "신*기",
    "rawName": "신*기",
    "joinDate": "2024-06-25",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2026",
    "notes": "2024-06-25 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_27",
    "no": 27,
    "name": "안*현",
    "rawName": "안*현",
    "joinDate": "2024-06-25",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2027",
    "notes": "2024-06-25 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_28",
    "no": 28,
    "name": "정*근",
    "rawName": "정*근",
    "joinDate": "2024-04-27",
    "level": 3.0,
    "tier": "B",
    "role": "총무이사",
    "status": "active",
    "phone": "010-****-2028",
    "notes": "2024-04-27 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_29",
    "no": 29,
    "name": "이*서",
    "rawName": "이*서",
    "joinDate": "2024-02-18",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2029",
    "notes": "2024-02-18 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_30",
    "no": 30,
    "name": "이*헌",
    "rawName": "이*헌",
    "joinDate": "2024-02-05",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2030",
    "notes": "2024-02-05 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_31",
    "no": 31,
    "name": "조*호",
    "rawName": "조*호",
    "joinDate": "2023-12-31",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2031",
    "notes": "2023-12-31 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_32",
    "no": 32,
    "name": "권*환",
    "rawName": "권*환",
    "joinDate": "2023-09-02",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2032",
    "notes": "2023-09-02 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_33",
    "no": 33,
    "name": "이*일",
    "rawName": "이*일",
    "joinDate": "2023-08-12",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2033",
    "notes": "2023-08-12 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_34",
    "no": 34,
    "name": "남*민",
    "rawName": "남*민",
    "joinDate": "2023-06-08",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2034",
    "notes": "2023-06-08 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_35",
    "no": 35,
    "name": "이*윤",
    "rawName": "이*윤",
    "joinDate": "2023-06-06",
    "level": 3.0,
    "tier": "B",
    "role": "재무이사",
    "status": "active",
    "phone": "010-****-2035",
    "notes": "2023-06-06 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_36",
    "no": 36,
    "name": "송*태",
    "rawName": "송*태",
    "joinDate": "2023-05-27",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2036",
    "notes": "2023-05-27 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_37",
    "no": 37,
    "name": "김*준",
    "rawName": "김*준",
    "joinDate": "2023-05-21",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2037",
    "notes": "2023-05-21 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_38",
    "no": 38,
    "name": "임*자",
    "rawName": "임*자",
    "joinDate": "2023-05-01",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2038",
    "notes": "2023-05-01 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_39",
    "no": 39,
    "name": "김*철",
    "rawName": "김*철",
    "joinDate": "2023-05-01",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2039",
    "notes": "2023-05-01 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_40",
    "no": 40,
    "name": "채*엽",
    "rawName": "채*엽",
    "joinDate": "2023-04-22",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2040",
    "notes": "2023-04-22 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_41",
    "no": 41,
    "name": "최*정",
    "rawName": "최*정",
    "joinDate": "2023-03-03",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2041",
    "notes": "2023-03-03 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_42",
    "no": 42,
    "name": "심*후",
    "rawName": "심*후",
    "joinDate": "2023-02-27",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2042",
    "notes": "2023-02-27 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_43",
    "no": 43,
    "name": "심*석",
    "rawName": "심*석",
    "joinDate": "2023-02-27",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2043",
    "notes": "2023-02-27 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_44",
    "no": 44,
    "name": "차*철",
    "rawName": "차*철",
    "joinDate": "2022-12-25",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2044",
    "notes": "2022-12-25 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_45",
    "no": 45,
    "name": "박*원",
    "rawName": "박*원",
    "joinDate": "2022-09-30",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2045",
    "notes": "2022-09-30 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_46",
    "no": 46,
    "name": "강*정",
    "rawName": "강*정",
    "joinDate": "2022-09-14",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2046",
    "notes": "2022-09-14 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_47",
    "no": 47,
    "name": "하*영",
    "rawName": "하*영",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2047",
    "notes": "2022-08-22 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_48",
    "no": 48,
    "name": "김*재",
    "rawName": "김*재",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2048",
    "notes": "2022-08-22 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_49",
    "no": 49,
    "name": "김*미",
    "rawName": "김*미",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2049",
    "notes": "2022-08-22 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_50",
    "no": 50,
    "name": "이*대",
    "rawName": "이*대",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2050",
    "notes": "2022-08-22 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_51",
    "no": 51,
    "name": "정*원",
    "rawName": "정*원",
    "joinDate": "2022-07-03",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2051",
    "notes": "2022-07-03 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_52",
    "no": 52,
    "name": "이*민",
    "rawName": "이*민",
    "joinDate": "2022-04-10",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2052",
    "notes": "2022-04-10 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_53",
    "no": 53,
    "name": "김*연",
    "rawName": "김*연",
    "joinDate": "2022-03-15",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2053",
    "notes": "2022-03-15 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "A조"
  },
  {
    "id": "mem_54",
    "no": 54,
    "name": "이*재",
    "rawName": "이*재",
    "joinDate": "2022-03-04",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2054",
    "notes": "2022-03-04 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_55",
    "no": 55,
    "name": "소*업",
    "rawName": "소*업",
    "joinDate": "2021-11-17",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2055",
    "notes": "2021-11-17 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_56",
    "no": 56,
    "name": "서*원",
    "rawName": "서*원",
    "joinDate": "2021-11-06",
    "level": 3.5,
    "tier": "A",
    "role": "경기이사",
    "status": "active",
    "phone": "010-****-2056",
    "notes": "2021-11-06 가입",
    "clubLevel": 1,
    "ntrp": 3.5,
    "group": "D조"
  },
  {
    "id": "mem_57",
    "no": 57,
    "name": "김*제",
    "rawName": "김*제",
    "joinDate": "2021-10-02",
    "level": 3.5,
    "tier": "A",
    "role": "부회장",
    "status": "active",
    "phone": "010-****-2057",
    "notes": "2021-10-02 가입",
    "clubLevel": 1,
    "ntrp": 3.5,
    "group": "A조"
  },
  {
    "id": "mem_58",
    "no": 58,
    "name": "김*진",
    "rawName": "김*진",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2058",
    "notes": "2021-10-02 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_59",
    "no": 59,
    "name": "김*진",
    "rawName": "김*진",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2059",
    "notes": "2021-10-02 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_60",
    "no": 60,
    "name": "송*라",
    "rawName": "송*라",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2060",
    "notes": "2021-10-02 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  },
  {
    "id": "mem_61",
    "no": 61,
    "name": "김*윤(회장)",
    "rawName": "김*윤",
    "joinDate": "2021-10-02",
    "level": 3.5,
    "tier": "A",
    "role": "회장",
    "status": "active",
    "phone": "010-****-2061",
    "notes": "2021-10-02 가입",
    "clubLevel": 1,
    "ntrp": 3.5,
    "group": "A조"
  },
  {
    "id": "mem_62",
    "no": 62,
    "name": "엄*용",
    "rawName": "엄*용",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2062",
    "notes": "2021-10-02 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "B조"
  },
  {
    "id": "mem_63",
    "no": 63,
    "name": "윤*화",
    "rawName": "윤*화",
    "joinDate": "2021-10-01",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2063",
    "notes": "2021-10-01 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "C조"
  },
  {
    "id": "mem_64",
    "no": 64,
    "name": "김*관",
    "rawName": "김*관",
    "joinDate": "2021-10-01",
    "level": 3.0,
    "tier": "B",
    "role": "회원",
    "status": "active",
    "phone": "010-****-2064",
    "notes": "2021-10-01 가입",
    "clubLevel": 2,
    "ntrp": "",
    "group": "D조"
  }
];

const REAL_NAME_MAP = {
  "mem_1": "전현덕",
  "mem_2": "박현숙",
  "mem_3": "강현지",
  "mem_4": "임준혁",
  "mem_5": "설수환",
  "mem_6": "허혜진",
  "mem_7": "김성윤(26)",
  "mem_8": "강선균",
  "mem_9": "김인혜",
  "mem_10": "장경찬",
  "mem_11": "한성호",
  "mem_12": "김지은",
  "mem_13": "손정철",
  "mem_14": "박상현",
  "mem_15": "임재성",
  "mem_16": "안은정",
  "mem_17": "이민우",
  "mem_18": "김형섭",
  "mem_19": "이정건",
  "mem_20": "이동현",
  "mem_21": "서지원",
  "mem_22": "이정향",
  "mem_23": "이영",
  "mem_24": "이은주",
  "mem_25": "고다희",
  "mem_26": "신정기",
  "mem_27": "안재현",
  "mem_28": "정우근",
  "mem_29": "이윤서",
  "mem_30": "이상헌",
  "mem_31": "조진호",
  "mem_32": "권기환",
  "mem_33": "이효일",
  "mem_34": "남승민",
  "mem_35": "이정윤",
  "mem_36": "송영태",
  "mem_37": "김형준",
  "mem_38": "임영자",
  "mem_39": "김종철",
  "mem_40": "채상엽",
  "mem_41": "최미정",
  "mem_42": "심지후",
  "mem_43": "심정석",
  "mem_44": "차흥철",
  "mem_45": "박순원",
  "mem_46": "강수정",
  "mem_47": "하기영",
  "mem_48": "김병재",
  "mem_49": "김선미",
  "mem_50": "이종대",
  "mem_51": "정승원",
  "mem_52": "이상민",
  "mem_53": "김규연",
  "mem_54": "이윤재",
  "mem_55": "소재업",
  "mem_56": "서동원",
  "mem_57": "김현제",
  "mem_58": "김동진",
  "mem_59": "김미진",
  "mem_60": "송미라",
  "mem_61": "김성윤(회장)",
  "mem_62": "엄재용",
  "mem_63": "윤상화",
  "mem_64": "김동관"
};

class MemberManager {
  constructor() {
    this.storageKey = "tennis_club_members_v8";
    this.members = this.loadMembers();
  }

  static isMatch(member, query) {
    if (!query) return true;
    const q = (query || "").trim().toLowerCase();
    if (!q) return true;

    const name = (member.name || "").toLowerCase();
    const realName = (member.realName || REAL_NAME_MAP[member.id] || "").toLowerCase();
    const group = (member.group || "").toLowerCase();
    const role = (member.role || "").toLowerCase();
    const level = `${member.clubLevel || 2}등`;

    // 1. Direct contains check in masked name, original realName, group, role, level
    if (name.includes(q) || realName.includes(q) || group.includes(q) || role.includes(q) || level.includes(q)) {
      return true;
    }

    // 2. Compact matching without asterisks or spaces (e.g. "전덕" matches "전*덕")
    const compactName = name.replace(/[*_ ]/g, "");
    if (compactName.includes(q)) return true;

    // 3. Masked pattern fuzzy match (e.g. query "전현덕" against "전*덕")
    if (q.length === 3 && name.length >= 3 && name.includes("*")) {
      if (q[0] === name[0] && q[2] === name[2]) return true;
    }

    return false;
  }

  loadMembers() {
    try {
      localStorage.removeItem("tennis_club_members_v1");
      localStorage.removeItem("tennis_club_members_v2");
      localStorage.removeItem("tennis_club_members_v3");
      localStorage.removeItem("tennis_club_members_v4");
      localStorage.removeItem("tennis_club_members_v5");
      localStorage.removeItem("tennis_club_members_v6");

      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = json_safe_parse(saved);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_MEMBERS.length) {
          // 🛡️ 기존 로컬 데이터 자동 마스킹 위생 처리 및 원본 realName 매핑
          return parsed.map(m => ({
            ...m,
            realName: REAL_NAME_MAP[m.id] || m.realName || m.name,
            name: MemberManager.maskName(m.name),
            rawName: MemberManager.maskName(m.rawName || m.name),
            phone: MemberManager.maskPhone(m.phone || "")
          }));
        }
      }
    } catch (e) {
      console.warn("회원 로드 오류, 기본값 사용:", e);
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULT_MEMBERS)).map(m => ({
      ...m,
      realName: REAL_NAME_MAP[m.id] || m.realName || m.name
    }));
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(fresh));
    } catch(e) {}
    return fresh;
  }

  saveMembers() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.members));
    } catch (e) {
      console.error("회원 저장 오류:", e);
    }
  }

  getAllMembers() {
    return this.members;
  }

  getActiveMembers() {
    return this.members.filter(m => m.status === "active");
  }

  getMemberById(id) {
    return this.members.find(m => m.id === id) || null;
  }

  getMemberByName(name) {
    if (!name) return null;
    const clean = name.trim();
    return this.members.find(m => m.name === clean) || null;
  }

  sanitizeRole(role) {
    if (!role) return "회원";
    const clean = role.trim();
    return STANDARD_ROLES.includes(clean) ? clean : "회원";
  }

  addMember(memberData) {
    const no = this.members.length + 1;
    const id = "mem_" + no;
    const newMember = {
      id: id,
      no: no,
      name: memberData.name.trim(),
      rawName: memberData.name.trim(),
      joinDate: memberData.joinDate || new Date().toISOString().slice(0, 10),
      level: parseFloat(memberData.level) || null,
      clubLevel: parseInt(memberData.clubLevel) || 2,
      tier: "B",
      group: memberData.group || "A조",
      role: this.sanitizeRole(memberData.role),
      status: memberData.status || "active",
      phone: memberData.phone || "",
      notes: memberData.notes || ""
    };
    this.members.push(newMember);
    this.saveMembers();
    return newMember;
  }

  updateMember(id, updates) {
    const idx = this.members.findIndex(m => m.id === id);
    if (idx === -1) return null;

    if (updates.level !== undefined) {
      updates.level = updates.level ? parseFloat(updates.level) : null;
    }
    if (updates.clubLevel !== undefined) {
      updates.clubLevel = parseInt(updates.clubLevel) || 2;
    }
    if (updates.role) {
      updates.role = this.sanitizeRole(updates.role);
    }

    this.members[idx] = { ...this.members[idx], ...updates };
    this.saveMembers();
    return this.members[idx];
  }

  deleteMember(id) {
    this.members = this.members.filter(m => m.id !== id);
    this.saveMembers();
  }

  setMemberStatus(id, status) {
    return this.updateMember(id, { status: status });
  }

  setMemberGroup(id, group) {
    return this.updateMember(id, { group: group });
  }

  resetToDefault() {
    this.members = JSON.parse(JSON.stringify(DEFAULT_MEMBERS));
    this.saveMembers();
  }

  /**
   * 🛡️ 개인정보 보호: 이름 마스킹 (예: 전현덕 -> 전*덕, 강지 -> 강*, 남궁민수 -> 남**수, 김성윤(26) -> 김*윤(26))
   */
  static maskName(name) {
    if (!name || typeof name !== "string") return "";
    const trimmed = name.trim();
    if (!trimmed) return "";

    // 괄호 표기 분리 (예: "김성윤(26)" -> base: "김성윤", suffix: "(26)")
    let baseName = trimmed;
    let suffix = "";
    const parenIdx = trimmed.indexOf("(");
    if (parenIdx > 0 && trimmed.endsWith(")")) {
      baseName = trimmed.substring(0, parenIdx).trim();
      suffix = trimmed.substring(parenIdx);
    }

    let maskedBase = baseName;
    if (baseName.length <= 1) {
      maskedBase = baseName;
    } else if (baseName.length === 2) {
      maskedBase = baseName[0] + "*";
    } else if (baseName.length === 3) {
      maskedBase = baseName[0] + "*" + baseName[2];
    } else {
      maskedBase = baseName[0] + "*".repeat(baseName.length - 2) + baseName[baseName.length - 1];
    }

    return maskedBase + suffix;
  }

  /**
   * 🛡️ 개인정보 보호: 복식 팀 이름 마스킹 (예: 서동원·전현덕 -> 서*원·전*덕)
   */
  static maskPairNames(pairStr) {
    if (!pairStr || typeof pairStr !== "string") return "";
    const separators = ["·", "/", ",", "&", "+"];
    for (const sep of separators) {
      if (pairStr.includes(sep)) {
        return pairStr.split(sep).map(n => MemberManager.maskName(n)).join(sep);
      }
    }
    return MemberManager.maskName(pairStr);
  }

  /**
   * 🛡️ 개인정보 보호: 전화번호 가운데 마스킹 (예: 010-1234-5678 -> 010-****-5678)
   */
  static maskPhone(phone) {
    if (!phone || typeof phone !== "string") return "";
    return phone.replace(/(\d{2,3})-(\d{3,4})-(\d{4})/, "$1-****-$3");
  }
}

function json_safe_parse(str) {
  try { return JSON.parse(str); } catch(e) { return null; }
}

window.STANDARD_ROLES = STANDARD_ROLES;
window.MemberManager = MemberManager;
window.maskName = MemberManager.maskName;
window.maskPairNames = MemberManager.maskPairNames;
window.maskPhone = MemberManager.maskPhone;


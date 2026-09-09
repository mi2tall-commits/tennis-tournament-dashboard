/**
 * 👥 회원 명단 관리 모듈 (Member Manager Engine)
 * - 6대 공식 역할 표준화: 회장, 부회장, 경기이사, 재무이사, 총무이사, 회원
 * - 대량 텍스트/CSV 일괄 임포트 지원
 */

const STANDARD_ROLES = ["회장", "부회장", "경기이사", "재무이사", "총무이사", "회원"];

const DEFAULT_MEMBERS = [
  {
    "id": "mem_1",
    "no": 1,
    "name": "전현덕",
    "rawName": "전현덕",
    "joinDate": "2026-05-26",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1001-2001",
    "notes": "2026-05-26 가입"
  },
  {
    "id": "mem_2",
    "no": 2,
    "name": "박현숙",
    "rawName": "박현숙",
    "joinDate": "2026-04-20",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1002-2002",
    "notes": "2026-04-20 가입"
  },
  {
    "id": "mem_3",
    "no": 3,
    "name": "강현지",
    "rawName": "강현지",
    "joinDate": "2026-04-20",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1003-2003",
    "notes": "2026-04-20 가입"
  },
  {
    "id": "mem_4",
    "no": 4,
    "name": "임준혁",
    "rawName": "임준혁",
    "joinDate": "2026-02-24",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1004-2004",
    "notes": "2026-02-24 가입"
  },
  {
    "id": "mem_5",
    "no": 5,
    "name": "설수환",
    "rawName": "설수환",
    "joinDate": "2026-01-29",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1005-2005",
    "notes": "2026-01-29 가입"
  },
  {
    "id": "mem_6",
    "no": 6,
    "name": "허혜진",
    "rawName": "허혜진",
    "joinDate": "2026-01-29",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1006-2006",
    "notes": "2026-01-29 가입"
  },
  {
    "id": "mem_7",
    "no": 7,
    "name": "김성윤(26)",
    "rawName": "김성윤",
    "joinDate": "2026-01-20",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1007-2007",
    "notes": "2026-01-20 가입"
  },
  {
    "id": "mem_8",
    "no": 8,
    "name": "강선균",
    "rawName": "강선균",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1008-2008",
    "notes": "2026-01-12 가입"
  },
  {
    "id": "mem_9",
    "no": 9,
    "name": "김인혜",
    "rawName": "김인혜",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1009-2009",
    "notes": "2026-01-12 가입"
  },
  {
    "id": "mem_10",
    "no": 10,
    "name": "장경찬",
    "rawName": "장경찬",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1010-2010",
    "notes": "2026-01-12 가입"
  },
  {
    "id": "mem_11",
    "no": 11,
    "name": "한성호",
    "rawName": "한성호",
    "joinDate": "2026-01-12",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1011-2011",
    "notes": "2026-01-12 가입"
  },
  {
    "id": "mem_12",
    "no": 12,
    "name": "김지은",
    "rawName": "김지은",
    "joinDate": "2025-11-15",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1012-2012",
    "notes": "2025-11-15 가입"
  },
  {
    "id": "mem_13",
    "no": 13,
    "name": "손정철",
    "rawName": "손정철",
    "joinDate": "2025-06-14",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1013-2013",
    "notes": "2025-06-14 가입"
  },
  {
    "id": "mem_14",
    "no": 14,
    "name": "박상현",
    "rawName": "박상현",
    "joinDate": "2025-03-14",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1014-2014",
    "notes": "2025-03-14 가입"
  },
  {
    "id": "mem_15",
    "no": 15,
    "name": "임재성",
    "rawName": "임재성",
    "joinDate": "2025-02-15",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1015-2015",
    "notes": "2025-02-15 가입"
  },
  {
    "id": "mem_16",
    "no": 16,
    "name": "안은정",
    "rawName": "안은정",
    "joinDate": "2025-02-02",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1016-2016",
    "notes": "2025-02-02 가입"
  },
  {
    "id": "mem_17",
    "no": 17,
    "name": "이민우",
    "rawName": "이민우",
    "joinDate": "2025-01-25",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1017-2017",
    "notes": "2025-01-25 가입"
  },
  {
    "id": "mem_18",
    "no": 18,
    "name": "김형섭",
    "rawName": "김형섭",
    "joinDate": "2024-11-04",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1018-2018",
    "notes": "2024-11-04 가입"
  },
  {
    "id": "mem_19",
    "no": 19,
    "name": "이정건",
    "rawName": "이정건",
    "joinDate": "2024-11-04",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1019-2019",
    "notes": "2024-11-04 가입"
  },
  {
    "id": "mem_20",
    "no": 20,
    "name": "이동현",
    "rawName": "이동현",
    "joinDate": "2024-11-04",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1020-2020",
    "notes": "2024-11-04 가입"
  },
  {
    "id": "mem_21",
    "no": 21,
    "name": "서지원",
    "rawName": "서지원",
    "joinDate": "2024-10-17",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1021-2021",
    "notes": "2024-10-17 가입"
  },
  {
    "id": "mem_22",
    "no": 22,
    "name": "이정향",
    "rawName": "이정향",
    "joinDate": "2024-09-10",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1022-2022",
    "notes": "2024-09-10 가입"
  },
  {
    "id": "mem_23",
    "no": 23,
    "name": "이영",
    "rawName": "이영",
    "joinDate": "2024-08-24",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1023-2023",
    "notes": "2024-08-24 가입"
  },
  {
    "id": "mem_24",
    "no": 24,
    "name": "이은주",
    "rawName": "이은주",
    "joinDate": "2024-08-12",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1024-2024",
    "notes": "2024-08-12 가입"
  },
  {
    "id": "mem_25",
    "no": 25,
    "name": "고다희",
    "rawName": "고다희",
    "joinDate": "2024-07-07",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1025-2025",
    "notes": "2024-07-07 가입"
  },
  {
    "id": "mem_26",
    "no": 26,
    "name": "신정기",
    "rawName": "신정기",
    "joinDate": "2024-06-25",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1026-2026",
    "notes": "2024-06-25 가입"
  },
  {
    "id": "mem_27",
    "no": 27,
    "name": "안재현",
    "rawName": "안재현",
    "joinDate": "2024-06-25",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1027-2027",
    "notes": "2024-06-25 가입"
  },
  {
    "id": "mem_28",
    "no": 28,
    "name": "정우근",
    "rawName": "정우근",
    "joinDate": "2024-04-27",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "총무이사",
    "status": "active",
    "phone": "010-1028-2028",
    "notes": "2024-04-27 가입"
  },
  {
    "id": "mem_29",
    "no": 29,
    "name": "이윤서",
    "rawName": "이윤서",
    "joinDate": "2024-02-18",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1029-2029",
    "notes": "2024-02-18 가입"
  },
  {
    "id": "mem_30",
    "no": 30,
    "name": "이상헌",
    "rawName": "이상헌",
    "joinDate": "2024-02-05",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1030-2030",
    "notes": "2024-02-05 가입"
  },
  {
    "id": "mem_31",
    "no": 31,
    "name": "조진호",
    "rawName": "조진호",
    "joinDate": "2023-12-31",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1031-2031",
    "notes": "2023-12-31 가입"
  },
  {
    "id": "mem_32",
    "no": 32,
    "name": "권기환",
    "rawName": "권기환",
    "joinDate": "2023-09-02",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1032-2032",
    "notes": "2023-09-02 가입"
  },
  {
    "id": "mem_33",
    "no": 33,
    "name": "이효일",
    "rawName": "이효일",
    "joinDate": "2023-08-12",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1033-2033",
    "notes": "2023-08-12 가입"
  },
  {
    "id": "mem_34",
    "no": 34,
    "name": "남승민",
    "rawName": "남승민",
    "joinDate": "2023-06-08",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1034-2034",
    "notes": "2023-06-08 가입"
  },
  {
    "id": "mem_35",
    "no": 35,
    "name": "이정윤",
    "rawName": "이정윤",
    "joinDate": "2023-06-06",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "재무이사",
    "status": "active",
    "phone": "010-1035-2035",
    "notes": "2023-06-06 가입"
  },
  {
    "id": "mem_36",
    "no": 36,
    "name": "송영태",
    "rawName": "송영태",
    "joinDate": "2023-05-27",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1036-2036",
    "notes": "2023-05-27 가입"
  },
  {
    "id": "mem_37",
    "no": 37,
    "name": "김형준",
    "rawName": "김형준",
    "joinDate": "2023-05-21",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1037-2037",
    "notes": "2023-05-21 가입"
  },
  {
    "id": "mem_38",
    "no": 38,
    "name": "임영자",
    "rawName": "임영자",
    "joinDate": "2023-05-01",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1038-2038",
    "notes": "2023-05-01 가입"
  },
  {
    "id": "mem_39",
    "no": 39,
    "name": "김종철",
    "rawName": "김종철",
    "joinDate": "2023-05-01",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1039-2039",
    "notes": "2023-05-01 가입"
  },
  {
    "id": "mem_40",
    "no": 40,
    "name": "채상엽",
    "rawName": "채상엽",
    "joinDate": "2023-04-22",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1040-2040",
    "notes": "2023-04-22 가입"
  },
  {
    "id": "mem_41",
    "no": 41,
    "name": "최미정",
    "rawName": "최미정",
    "joinDate": "2023-03-03",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1041-2041",
    "notes": "2023-03-03 가입"
  },
  {
    "id": "mem_42",
    "no": 42,
    "name": "심지후",
    "rawName": "심지후",
    "joinDate": "2023-02-27",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1042-2042",
    "notes": "2023-02-27 가입"
  },
  {
    "id": "mem_43",
    "no": 43,
    "name": "심정석",
    "rawName": "심정석",
    "joinDate": "2023-02-27",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1043-2043",
    "notes": "2023-02-27 가입"
  },
  {
    "id": "mem_44",
    "no": 44,
    "name": "차흥철",
    "rawName": "차흥철",
    "joinDate": "2022-12-25",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1044-2044",
    "notes": "2022-12-25 가입"
  },
  {
    "id": "mem_45",
    "no": 45,
    "name": "박순원",
    "rawName": "박순원",
    "joinDate": "2022-09-30",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1045-2045",
    "notes": "2022-09-30 가입"
  },
  {
    "id": "mem_46",
    "no": 46,
    "name": "강수정",
    "rawName": "강수정",
    "joinDate": "2022-09-14",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1046-2046",
    "notes": "2022-09-14 가입"
  },
  {
    "id": "mem_47",
    "no": 47,
    "name": "하기영",
    "rawName": "하기영",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1047-2047",
    "notes": "2022-08-22 가입"
  },
  {
    "id": "mem_48",
    "no": 48,
    "name": "김병재",
    "rawName": "김병재",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1048-2048",
    "notes": "2022-08-22 가입"
  },
  {
    "id": "mem_49",
    "no": 49,
    "name": "김선미",
    "rawName": "김선미",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1049-2049",
    "notes": "2022-08-22 가입"
  },
  {
    "id": "mem_50",
    "no": 50,
    "name": "이종대",
    "rawName": "이종대",
    "joinDate": "2022-08-22",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1050-2050",
    "notes": "2022-08-22 가입"
  },
  {
    "id": "mem_51",
    "no": 51,
    "name": "정승원",
    "rawName": "정승원",
    "joinDate": "2022-07-03",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1051-2051",
    "notes": "2022-07-03 가입"
  },
  {
    "id": "mem_52",
    "no": 52,
    "name": "이상민",
    "rawName": "이상민",
    "joinDate": "2022-04-10",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1052-2052",
    "notes": "2022-04-10 가입"
  },
  {
    "id": "mem_53",
    "no": 53,
    "name": "김규연",
    "rawName": "김규연",
    "joinDate": "2022-03-15",
    "level": 3.0,
    "tier": "B",
    "group": "A조",
    "role": "회원",
    "status": "active",
    "phone": "010-1053-2053",
    "notes": "2022-03-15 가입"
  },
  {
    "id": "mem_54",
    "no": 54,
    "name": "이윤재",
    "rawName": "이윤재",
    "joinDate": "2022-03-04",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1054-2054",
    "notes": "2022-03-04 가입"
  },
  {
    "id": "mem_55",
    "no": 55,
    "name": "소재업",
    "rawName": "소재업",
    "joinDate": "2021-11-17",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1055-2055",
    "notes": "2021-11-17 가입"
  },
  {
    "id": "mem_56",
    "no": 56,
    "name": "서동원",
    "rawName": "서동원",
    "joinDate": "2021-11-06",
    "level": 3.5,
    "tier": "A",
    "group": "D조",
    "role": "경기이사",
    "status": "active",
    "phone": "010-1056-2056",
    "notes": "2021-11-06 가입"
  },
  {
    "id": "mem_57",
    "no": 57,
    "name": "김현제",
    "rawName": "김현제",
    "joinDate": "2021-10-02",
    "level": 3.5,
    "tier": "A",
    "group": "A조",
    "role": "부회장",
    "status": "active",
    "phone": "010-1057-2057",
    "notes": "2021-10-02 가입"
  },
  {
    "id": "mem_58",
    "no": 58,
    "name": "김동진",
    "rawName": "김동진",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1058-2058",
    "notes": "2021-10-02 가입"
  },
  {
    "id": "mem_59",
    "no": 59,
    "name": "김미진",
    "rawName": "김미진",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1059-2059",
    "notes": "2021-10-02 가입"
  },
  {
    "id": "mem_60",
    "no": 60,
    "name": "송미라",
    "rawName": "송미라",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1060-2060",
    "notes": "2021-10-02 가입"
  },
  {
    "id": "mem_61",
    "no": 61,
    "name": "김성윤(회장)",
    "rawName": "김성윤",
    "joinDate": "2021-10-02",
    "level": 3.5,
    "tier": "A",
    "group": "A조",
    "role": "회장",
    "status": "active",
    "phone": "010-1061-2061",
    "notes": "2021-10-02 가입"
  },
  {
    "id": "mem_62",
    "no": 62,
    "name": "엄재용",
    "rawName": "엄재용",
    "joinDate": "2021-10-02",
    "level": 3.0,
    "tier": "B",
    "group": "B조",
    "role": "회원",
    "status": "active",
    "phone": "010-1062-2062",
    "notes": "2021-10-02 가입"
  },
  {
    "id": "mem_63",
    "no": 63,
    "name": "윤상화",
    "rawName": "윤상화",
    "joinDate": "2021-10-01",
    "level": 3.0,
    "tier": "B",
    "group": "C조",
    "role": "회원",
    "status": "active",
    "phone": "010-1063-2063",
    "notes": "2021-10-01 가입"
  },
  {
    "id": "mem_64",
    "no": 64,
    "name": "김동관",
    "rawName": "김동관",
    "joinDate": "2021-10-01",
    "level": 3.0,
    "tier": "B",
    "group": "D조",
    "role": "회원",
    "status": "active",
    "phone": "010-1064-2064",
    "notes": "2021-10-01 가입"
  }
];

class MemberManager {
  constructor() {
    this.storageKey = "tennis_club_members_v4";
    this.members = this.loadMembers();
  }

  loadMembers() {
    try {
      // Clear all legacy storage keys
      localStorage.removeItem("tennis_club_members_v1");
      localStorage.removeItem("tennis_club_members_v2");
      localStorage.removeItem("tennis_club_members_v3");
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If saved data has full 64 members, keep it; otherwise refresh from DEFAULT_MEMBERS
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_MEMBERS.length) return parsed;
      }
    } catch (e) {
      console.warn("회원 로드 오류, 기본값 사용:", e);
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULT_MEMBERS));
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
    const id = "mem_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const newMember = {
      id: id,
      name: memberData.name.trim(),
      level: parseFloat(memberData.level) || 3.0,
      tier: memberData.tier || this.computeTier(parseFloat(memberData.level) || 3.0),
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

    if (updates.level) {
      updates.level = parseFloat(updates.level);
      updates.tier = this.computeTier(updates.level);
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

  computeTier(level) {
    if (level >= 4.0) return "S";
    if (level >= 3.5) return "A";
    if (level >= 3.0) return "B";
    if (level >= 2.5) return "C";
    return "D";
  }

  bulkImport(rawText) {
    if (!rawText || !rawText.trim()) return 0;
    const lines = rawText.split(/\r?\n/);
    let count = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const parts = trimmed.includes(",") 
        ? trimmed.split(",").map(p => p.trim()) 
        : trimmed.split(/\s+/);

      if (parts.length === 0 || !parts[0]) return;

      const name = parts[0];
      const level = parts.length > 1 ? (parseFloat(parts[1]) || 3.0) : 3.0;
      const group = parts.length > 2 ? parts[2] : "A조";
      const role = parts.length > 3 ? this.sanitizeRole(parts[3]) : "회원";
      const phone = parts.length > 4 ? parts[4] : "";

      const existing = this.getMemberByName(name);
      if (existing) {
        this.updateMember(existing.id, { level, group, role, phone, status: "active" });
      } else {
        this.addMember({ name, level, group, role, phone, status: "active" });
      }
      count++;
    });

    this.saveMembers();
    return count;
  }

  resetToDefault() {
    this.members = JSON.parse(JSON.stringify(DEFAULT_MEMBERS));
    this.saveMembers();
  }
}

window.STANDARD_ROLES = STANDARD_ROLES;
window.MemberManager = MemberManager;
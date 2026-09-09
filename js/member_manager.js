/**
 * 👥 회원 명단 관리 모듈 (Member Manager Engine)
 * - 동호회 회원 등록, 레벨(NTRP), 조(A~D), 활동/불참/탈퇴 상태 관리
 * - 대량 텍스트/CSV 일괄 임포트 지원
 */

const DEFAULT_MEMBERS = [
  { id: "mem_1", name: "정다운", level: 3.5, tier: "A", group: "A조", role: "회원", status: "active", phone: "010-1111-0001" },
  { id: "mem_2", name: "송영수", level: 3.5, tier: "A", group: "B조", role: "조장", status: "active", phone: "010-1111-0002" },
  { id: "mem_3", name: "김명중", level: 3.5, tier: "A", group: "A조", role: "경기이사", status: "active", phone: "010-1111-0003" },
  { id: "mem_4", name: "정민석", level: 3.0, tier: "B", group: "B조", role: "회원", status: "active", phone: "010-1111-0004" },
  { id: "mem_5", name: "안정환", level: 3.0, tier: "B", group: "C조", role: "조장", status: "active", phone: "010-1111-0005" },
  { id: "mem_6", name: "이동기", level: 3.0, tier: "B", group: "C조", role: "회원", status: "active", phone: "010-1111-0006" },
  { id: "mem_7", name: "대니얼", level: 3.0, tier: "B", group: "D조", role: "회원", status: "active", phone: "010-1111-0007" },
  { id: "mem_8", name: "양용빈", level: 2.5, tier: "C", group: "D조", role: "조장", status: "active", phone: "010-1111-0008" },
  { id: "mem_9", name: "김은빈", level: 2.5, tier: "C", group: "A조", role: "회원", status: "active", phone: "010-1111-0009" },
  { id: "mem_10", name: "최경승", level: 2.5, tier: "C", group: "B조", role: "회원", status: "active", phone: "010-1111-0010" },
  { id: "mem_11", name: "정지우", level: 2.5, tier: "C", group: "C조", role: "회원", status: "active", phone: "010-1111-0011" },
  { id: "mem_12", name: "이지연", level: 2.0, tier: "D", group: "D조", role: "회원", status: "active", phone: "010-1111-0012" },
  { id: "mem_13", name: "전동훈", level: 3.0, tier: "B", group: "A조", role: "조장", status: "active", phone: "010-1111-0013" }
];

class MemberManager {
  constructor() {
    this.storageKey = "tennis_club_members_v1";
    this.members = this.loadMembers();
  }

  loadMembers() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("회원 로드 오류, 기본값 사용:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_MEMBERS));
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

  addMember(memberData) {
    const id = "mem_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const newMember = {
      id: id,
      name: memberData.name.trim(),
      level: parseFloat(memberData.level) || 3.0,
      tier: memberData.tier || this.computeTier(parseFloat(memberData.level) || 3.0),
      group: memberData.group || "A조",
      role: memberData.role || "회원",
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

  /**
   * 텍스트 / CSV 일괄 등록 파서
   * 지원 형식:
   * 1) 홍길동 3.5 A조
   * 2) 김철수, 3.0, B조, 조장, 010-1234-5678
   * 3) 이름만 줄 단위로 나열 시 기본 레벨 3.0으로 자동 등록
   */
  bulkImport(rawText) {
    if (!rawText || !rawText.trim()) return 0;
    const lines = rawText.split(/\r?\n/);
    let count = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      // 쉼표 또는 공백/탭 분리
      const parts = trimmed.includes(",") 
        ? trimmed.split(",").map(p => p.trim()) 
        : trimmed.split(/\s+/);

      if (parts.length === 0 || !parts[0]) return;

      const name = parts[0];
      const level = parts.length > 1 ? (parseFloat(parts[1]) || 3.0) : 3.0;
      const group = parts.length > 2 ? parts[2] : "A조";
      const role = parts.length > 3 ? parts[3] : "회원";
      const phone = parts.length > 4 ? parts[4] : "";

      // 기존 회원이면 업데이트, 없으면 추가
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

window.MemberManager = MemberManager;
import { useEffect, useMemo, useState } from "react";
import apiClient from "../utils/apiClient";
import "./SchedulePanel.css";

const initialForm = {
  title: "",
  description: "",
  date: "",
  time: "19:00",
};

function toDateTimeParts(isoString) {
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16),
  };
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const canSubmit = useMemo(() => form.title.trim() && form.date && form.time, [form]);
  const upcomingCount = useMemo(
    () => schedules.filter((item) => new Date(item.scheduled_at) >= new Date()).length,
    [schedules]
  );

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/admin/schedules");
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    const { date, time } = toDateTimeParts(item.scheduled_at);
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      date,
      time,
    });
    setModalOpen(true);
  };

  const upsertSchedule = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_at: scheduledAt,
      };

      if (editingId) {
        await apiClient.put(`/admin/schedules/${editingId}`, payload);
      } else {
        await apiClient.post("/admin/schedules", payload);
      }

      closeModal();
      await fetchSchedules();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await apiClient.delete(`/admin/schedules/${id}`);
    setSchedules((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      closeModal();
    }
  };

  return (
    <section className="schedule-panel manager">
      <header className="schedule-panel-head">
        <div className="schedule-head-text">
          <h3 className="schedule-title">일정 관리</h3>
          <p className="schedule-subtitle">동아리의 일정을 관리합니다.</p>
        </div>
        <div className="schedule-head-actions">
          <div className="schedule-stats">
            <span className="schedule-stat">전체 {schedules.length}</span>
            <span className="schedule-stat">예정 {upcomingCount}</span>
          </div>
          <button className="schedule-btn schedule-create-btn" type="button" onClick={openCreateModal}>
            일정 추가
          </button>
        </div>
      </header>

      {loading ? (
        <p className="schedule-empty">일정 목록을 불러오는 중입니다.</p>
      ) : schedules.length === 0 ? (
        <p className="schedule-empty">등록된 일정이 없습니다.</p>
      ) : (
        <div className="schedule-list">
          {schedules.map((item) => (
            <article key={item.id} className={`schedule-item ${editingId === item.id ? "editing" : ""}`}>
              <div className="schedule-item-head">
                <strong className="schedule-item-title">{item.title}</strong>
                <div className="schedule-item-actions">
                  <button className="schedule-btn secondary" type="button" onClick={() => openEditModal(item)}>
                    수정
                  </button>
                  <button className="schedule-btn danger" type="button" onClick={() => handleDelete(item.id)}>
                    삭제
                  </button>
                </div>
              </div>
              <p className="schedule-datetime">{formatDateTime(item.scheduled_at)}</p>
              {item.description && <p className="schedule-desc">{item.description}</p>}
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="schedule-modal-bg" onClick={closeModal}>
          <div className="schedule-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-form-head">
              <strong>{editingId ? "일정 수정" : "일정 등록"}</strong>
            </div>
            <form className="schedule-form" onSubmit={upsertSchedule}>
              <label className="schedule-label" htmlFor="schedule-title">
                제목
              </label>
              <input
                id="schedule-title"
                className="schedule-input"
                placeholder="예: 정기 모임"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                maxLength={120}
              />

              <div className="schedule-row">
                <div>
                  <label className="schedule-label" htmlFor="schedule-date">
                    날짜
                  </label>
                  <input
                    id="schedule-date"
                    type="date"
                    className="schedule-input"
                    value={form.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="schedule-label" htmlFor="schedule-time">
                    시간
                  </label>
                  <input
                    id="schedule-time"
                    type="time"
                    className="schedule-input"
                    value={form.time}
                    onChange={(e) => handleChange("time", e.target.value)}
                  />
                </div>
              </div>

              <label className="schedule-label" htmlFor="schedule-description">
                설명
              </label>
              <textarea
                id="schedule-description"
                className="schedule-input schedule-textarea"
                placeholder="장소, 준비물 등 추가 정보"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                maxLength={500}
              />

              <div className="schedule-actions">
                <button className="schedule-btn primary" disabled={!canSubmit || saving}>
                  {saving ? "저장 중..." : editingId ? "수정 저장" : "일정 추가"}
                </button>
                <button type="button" className="schedule-btn secondary" onClick={closeModal}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ScheduleManager;

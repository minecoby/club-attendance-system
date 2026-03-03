import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import "./SchedulePanel.css";

function ScheduleViewer({ selectedClub }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!selectedClub) {
        setSchedules([]);
        return;
      }

      setLoading(true);
      try {
        const res = await apiClient.get(`/clubs/${selectedClub}/schedules`);
        setSchedules(Array.isArray(res.data) ? res.data : []);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [selectedClub]);

  return (
    <section className="schedule-panel">
      <header className="schedule-panel-head">
        <div className="schedule-head-text">
          <h3 className="schedule-title">동아리 일정</h3>
          <p className="schedule-subtitle">선택한 동아리의 예정 일정을 확인할 수 있습니다.</p>
        </div>
      </header>

      {loading ? (
        <p className="schedule-empty">일정 목록을 불러오는 중입니다.</p>
      ) : schedules.length === 0 ? (
        <p className="schedule-empty">예정된 일정이 없습니다.</p>
      ) : (
        <div className="schedule-list">
          {schedules.map((item) => (
            <article key={item.id} className="schedule-item">
              <div className="schedule-item-head">
                <strong className="schedule-item-title">{item.title}</strong>
              </div>
              <p className="schedule-datetime">
                {new Date(item.scheduled_at).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {item.description && <p className="schedule-desc">{item.description}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ScheduleViewer;

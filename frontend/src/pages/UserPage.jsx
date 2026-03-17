import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UserPage.css";
import AlertModal from "../components/AlertModal";
import apiClient from "../utils/apiClient";
import dataCache from "../utils/dataCache";
import i18n from "../i18n";

function formatScheduleDateTime(isoString) {
  const normalized = String(isoString || "").replace(" ", "T");
  const [datePart, timePartRaw = ""] = normalized.split("T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && timePartRaw.length >= 5) {
    const [yyyy, mm, dd] = datePart.split("-");
    return `${yyyy}.${mm}.${dd} ${timePartRaw.slice(0, 5)}`;
  }
  return new Date(isoString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserPage({ language }) {
  const [attendanceList, setAttendanceList] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: "info", message: "" });
  const [clubList, setClubList] = useState([]);
  const [selectedClub, setSelectedClub] = useState("");
  const [activeTab, setActiveTab] = useState("attendance");
  const navigate = useNavigate();

  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      if (window.opener) {
        window.close();
      } else {
        window.history.back();
      }
    };

    window.history.replaceState(null, null, window.location.href);
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const fetchClubInfo = async () => {
      const res = await apiClient.get("/clubs/get_club_info");
      return Array.isArray(res.data) ? res.data : [];
    };

    dataCache
      .loadDataWithCache(
        "clubList",
        fetchClubInfo,
        (data) => {
          setClubList(data);
          const savedClub = localStorage.getItem("userPage_selectedClub");
          if (savedClub && data.find((club) => club.club_code === savedClub)) {
            setSelectedClub(savedClub);
          } else if (data.length > 0) {
            setSelectedClub(data[0].club_code);
          }
        },
        1000 * 60 * 3
      )
      .catch((error) => {
        console.error("Failed to load club info:", error);
      });
  }, []);

  useEffect(() => {
    if (!selectedClub) return;

    const fetchAttendance = async () => {
      const res = await apiClient.get(`/attend/load_myattend/${selectedClub}`);
      if (Array.isArray(res.data)) {
        return res.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      return [];
    };

    dataCache
      .loadDataWithCache(
        `attendanceList_${selectedClub}`,
        fetchAttendance,
        setAttendanceList,
        1000 * 60 * 2
      )
      .catch((error) => {
        console.error("Failed to load attendance:", error);
      });
  }, [selectedClub]);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!selectedClub) {
        setScheduleList([]);
        return;
      }

      setScheduleLoading(true);
      try {
        const res = await apiClient.get(`/clubs/${selectedClub}/schedules`);
        const schedules = Array.isArray(res.data) ? res.data : [];
        schedules.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
        setScheduleList(schedules);
      } catch (error) {
        setScheduleList([]);
      } finally {
        setScheduleLoading(false);
      }
    };

    fetchSchedules();
  }, [selectedClub]);

  const handleClubChange = (e) => {
    const newClub = e.target.value;
    setSelectedClub(newClub);
    localStorage.setItem("userPage_selectedClub", newClub);
  };

  const handleStartQR = () => {
    if (!selectedClub) {
      setAlert({ show: true, type: "error", message: i18n[language].selectClubFirst });
      return;
    }

    localStorage.setItem("club_code", selectedClub);
    navigate("/qr-attendance");
  };

  const handleCloseAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="userpage-section">
      <AlertModal show={alert.show} type={alert.type} message={alert.message} onClose={handleCloseAlert} />

      <div className="club-select-section">
        <label htmlFor="club-select" className="club-select-label">
          {i18n[language]?.selectClub || "동아리 선택"}
        </label>
        <select
          id="club-select"
          value={selectedClub}
          onChange={handleClubChange}
          className="club-select-dropdown"
        >
          {clubList.map((club) => (
            <option key={club.club_code} value={club.club_code}>
              {club.club_name}
            </option>
          ))}
        </select>
        <button onClick={handleStartQR} className="startQR-button">
          {i18n[language]?.startQR || "출석하기"}
        </button>
      </div>

      <div className="user-tabs">
        <button
          className={`user-tab-btn ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => setActiveTab("attendance")}
          type="button"
        >
          {i18n[language]?.myAttendance || "내 출석부"}
        </button>
        <button
          className={`user-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
          onClick={() => setActiveTab("schedule")}
          type="button"
        >
          {i18n[language]?.scheduleTab || "동아리 일정"}
        </button>
      </div>

      <div className="user-content-grid">
        <section className={`schedule-section ${activeTab !== "schedule" ? "panel-hidden" : ""}`}>
          <h2>{i18n[language]?.scheduleTab || "동아리 일정"}</h2>
          {scheduleLoading ? (
            <p className="empty-message">{i18n[language]?.loading || "로딩 중..."}</p>
          ) : scheduleList.length === 0 ? (
            <p className="empty-message">
              {language === "en" ? "No upcoming schedules." : "예정된 일정이 없습니다."}
            </p>
          ) : (
            <div className="schedule-list">
              {scheduleList.map((item) => (
                <article key={item.id} className="schedule-card">
                  <div className="schedule-card-head">
                    <strong>{item.title}</strong>
                    <span className="schedule-date">
                      {formatScheduleDateTime(item.scheduled_at)}
                    </span>
                  </div>
                  {item.description && <p className="schedule-desc">{item.description}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={`attendance-section ${activeTab !== "attendance" ? "panel-hidden" : ""}`}>
          <h2>{i18n[language]?.myAttendance || "내 출석부"}</h2>
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>{i18n[language]?.date || "날짜"}</th>
                  <th>{i18n[language]?.attendanceStatus || "출석 상태"}</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map((item, index) => (
                  <tr key={`${item.date}-${index}`}>
                    <td>{item.date}</td>
                    <td className={`status ${item.status === true ? "present" : "absent"}`}>
                      {item.status === true
                        ? i18n[language]?.attended || "출석"
                        : i18n[language]?.absent || "결석"}
                    </td>
                  </tr>
                ))}
                {attendanceList.length === 0 && (
                  <tr>
                    <td colSpan={2} className="empty-row">
                      {i18n[language]?.noAttendance || "출석 기록이 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default UserPage;

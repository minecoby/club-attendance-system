import { useEffect, useState } from 'react';
import "../styles/LeaderPage.css";
import axios from 'axios';

function LeaderPage() {
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [today, setToday] = useState("");

    useEffect(() => {
        // 오늘 날짜 구하기 (YYYY-MM-DD)
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        setToday(todayStr);

        const fetchAttendance = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(
                    `http://localhost:8000/admin/show_attendance/${todayStr}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setAttendanceList(response.data);
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    setAttendanceList([]); // 출석기록 없음
                } else {
                    setError("출석 데이터를 불러오는 중 오류가 발생했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, []);

    const handleStartQR = () => {
        alert("QR 출석 시작 (구현 필요)");
    };

    return (
        <div className="leader-page">
            <div className="leader-header-card">
                <div className="leader-header-left">
                    <div className="leader-date-label">오늘 날짜</div>
                    <div className="leader-date-value">{today}</div>
                </div>
                <button onClick={handleStartQR} className="startQR-button leader-qr-btn">
                    출석 시작 (QR 생성)
                </button>
            </div>
            <div className="attendance-section">
                <h2 className="attendance-title">오늘 출석부</h2>
                <div className='attendance-table-wrap'>
                    {loading ? (
                        <div className="attendance-message loading">로딩 중...</div>
                    ) : error ? (
                        <div className="attendance-message error">{error}</div>
                    ) : attendanceList.length === 0 ? (
                        <div className="attendance-message empty">출석기록이 없습니다.</div>
                    ) : (
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>팀원</th>
                                    <th>출석 상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceList.map((member, index) => (
                                    <tr key={member.user_id}>
                                        <td className='index-column'>{index + 1}</td>
                                        <td>{member.name}</td>
                                        <td>
                                            <span className={`status-badge ${member.status === true ? "출석" : "결석"}`}>
                                                {member.status === true ? "출석" : "결석"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LeaderPage;
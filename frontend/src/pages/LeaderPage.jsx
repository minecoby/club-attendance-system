import { useEffect, useState } from 'react';
import "../styles/LeaderPage.css";
import axios from 'axios';

function LeaderPage() {
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [today, setToday] = useState("");
    const [dateList, setDateList] = useState([]); // 전체 날짜 목록
    const [selectedDate, setSelectedDate] = useState(""); // 선택된 날짜
    const [dropdownOpen, setDropdownOpen] = useState(false); // 드롭다운 상태
    const [qrCode, setQrCode] = useState("");
    const [ws, setWs] = useState(null);

    useEffect(() => {
        // 오늘 날짜 구하기 (YYYY-MM-DD)
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        setToday(todayStr);
        setSelectedDate(todayStr);
    }, []);

    // 날짜 목록 불러오기
    useEffect(() => {
        const fetchDateList = async () => {
            try {
                const token = localStorage.getItem("token");
                // 날짜를 지정하지 않으면 전체 출석부(날짜 목록 포함) 반환
                const response = await axios.get(
                    `http://localhost:8000/admin/show_attendance/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                // response.data: [출석데이터, 날짜리스트]
                if (Array.isArray(response.data) && response.data.length === 2) {
                    setDateList(response.data[1]);
                }
            } catch (err) {
                // 무시
            }
        };
        fetchDateList();
    }, []);

    // 출석부 불러오기
    useEffect(() => {
        if (!selectedDate) return;
        const fetchAttendance = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(
                    `http://localhost:8000/admin/show_attendance/${selectedDate}`,
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
    }, [selectedDate]);

    const handleStartQR = async () => {
        const token = localStorage.getItem("token");
        try {
            // 날짜 추가 API 호출
            await axios.post(
                "http://localhost:8000/admin/add_date",
                { date: selectedDate },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (e) {
            // 이미 있으면 무시
        }
        // 웹소켓 연결
        const socket = new window.WebSocket(`ws://localhost:8000/admin/attendance/${selectedDate}/ws`);
        socket.onopen = () => {
            socket.send("Bearer " + token);
        };
        socket.onmessage = (event) => {
            setQrCode(event.data);
        };
        setWs(socket);
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setDropdownOpen(false);
    };

    return (
        <div className="leader-page">
            <div className="leader-header-card">
                <div className="leader-header-left">
                    <div className="leader-date-label">출석 날짜</div>
                    <div className="leader-date-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {selectedDate}
                        <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}
                            onClick={() => setDropdownOpen((v) => !v)}
                            aria-label="날짜 선택 드롭다운 열기"
                        >
                            {dropdownOpen ? '▲' : '▼'}
                        </button>
                    </div>
                    {dropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            marginTop: '8px',
                            zIndex: 10,
                            minWidth: '120px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        }}>
                            {dateList.length === 0 ? (
                                <div style={{ padding: '10px', color: '#888' }}>날짜 없음</div>
                            ) : (
                                dateList.map((date) => (
                                    <div
                                        key={date}
                                        style={{ padding: '10px', cursor: 'pointer', background: selectedDate === date ? '#f0f8ff' : '#fff' }}
                                        onClick={() => handleDateClick(date)}
                                    >
                                        {date}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                <button onClick={handleStartQR} className="startQR-button leader-qr-btn">
                    출석 시작 (QR 생성)
                </button>
            </div>
            <div className="attendance-section">
                <h2 className="attendance-title">{selectedDate} 출석부</h2>
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
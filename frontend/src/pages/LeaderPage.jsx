import { useEffect, useState } from 'react';
import "../styles/LeaderPage.css";
import axios from 'axios';
import QRCode from "react-qr-code";

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
    const [showQR, setShowQR] = useState(false); // QR코드 표시 여부

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
        if (selectedDate === undefined) return;
        const fetchAttendance = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("token");
                let response;
                if (selectedDate === "") {
                    // 전체 출석부
                    response = await axios.get(
                        `http://localhost:8000/admin/show_attendance/`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    // response.data: [출석데이터, 날짜리스트]
                    setAttendanceList(response.data[0]);
                } else {
                    // 날짜별 출석부
                    response = await axios.get(
                        `http://localhost:8000/admin/show_attendance/${selectedDate}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setAttendanceList(response.data);
                }
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
            await axios.post(
                "http://localhost:8000/admin/add_date",
                { date: selectedDate },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (e) {
            // 이미 있으면 무시
        }
        const socket = new window.WebSocket(`ws://localhost:8000/admin/attendance/${selectedDate}/ws`);
        socket.onopen = () => {
            socket.send("Bearer " + token);
        };
        socket.onmessage = (event) => {
            setQrCode(event.data);
        };
        setWs(socket);
        setShowQR(true); // QR코드 표시
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setDropdownOpen(false);
    };

    // 전체 출석부 보기 버튼 클릭 핸들러
    const handleAllAttendanceClick = () => {
        setSelectedDate("");
        setDropdownOpen(false);
    };

    // 오늘로 돌아가기 핸들러
    const handleGoToday = () => {
        setSelectedDate(today);
        setDropdownOpen(false);
    };

    // 출석 데이터 새로고침 함수
    const reloadAttendance = () => {
        setSelectedDate(prev => prev); // selectedDate가 바뀌지 않아도 useEffect 트리거
    };

    // QR 모달 닫기 핸들러
    const handleCloseQR = () => {
        if (ws) {
            ws.close();
            setWs(null);
        }
        setShowQR(false);
        setQrCode("");
        reloadAttendance();
    };

    // 페이지 벗어날 때 웹소켓 종료 및 출석 데이터 새로고침
    useEffect(() => {
        return () => {
            if (ws) {
                ws.close();
            }
            reloadAttendance();
        };
    }, []);

    return (
        <div className="leader-page">
            <div className="leader-header-card">
                <div className="leader-header-left">
                    <div className="leader-date-label">출석 날짜</div>
                    <div className="leader-date-controls">
                        <div className="leader-date-value">
                            {selectedDate ? selectedDate : "전체"}
                            <button
                                className="dropdown-btn"
                                onClick={() => setDropdownOpen((v) => !v)}
                                aria-label="날짜 선택 드롭다운 열기"
                            >
                                {dropdownOpen ? '▲' : '▼'}
                            </button>
                        </div>
                        <button className="all-attendance-btn" onClick={handleAllAttendanceClick}>
                            전체 출석부
                        </button>
                        <button className="today-btn" onClick={handleGoToday} disabled={selectedDate === today}>
                            오늘로 돌아가기
                        </button>
                    </div>
                    {dropdownOpen && (
                        <div className="date-dropdown">
                            {dateList.length === 0 ? (
                                <div className="date-dropdown-empty">날짜 없음</div>
                            ) : (
                                dateList.map((date) => (
                                    <div
                                        key={date}
                                        className={`date-dropdown-item${selectedDate === date ? ' selected' : ''}`}
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
                <h2 className="attendance-title">{selectedDate ? `${selectedDate} 출석부` : "전체 출석부"}</h2>
                {/* QR코드 모달/카드 */}
                {showQR && qrCode && (
                  <div className="qr-modal-bg" onClick={handleCloseQR}>
                    <div className="qr-modal-card" onClick={e=>e.stopPropagation()}>
                      <button className="qr-close-btn" onClick={handleCloseQR}>×</button>
                      <div className="qr-label">QR코드로 출석하세요</div>
                      <QRCode value={qrCode} size={200} />
                    </div>
                  </div>
                )}
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
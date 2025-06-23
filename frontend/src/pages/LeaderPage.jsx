import { useEffect, useState } from 'react';
import "../styles/LeaderPage.css";
import axios from 'axios';
import QRCode from "react-qr-code";
import AlertModal from '../components/AlertModal';
import i18n from '../i18n';

function LeaderPage({ language, setLanguage }) {
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
    const [showCode, setShowCode] = useState(false); // 코드 출석 표시 여부
    const [fixedCode, setFixedCode] = useState(""); // 고정 코드 값
    const [modalMode, setModalMode] = useState("qr"); // 'qr' 또는 'code'
    const [alert, setAlert] = useState({ show: false, type: 'info', message: '', confirm: false, onConfirm: null });

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
                    `http://localhost:8000/admin/show_attendance/None`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                // response.data: [출석데이터, 날짜리스트]
                if (Array.isArray(response.data) && response.data.length === 2) {
                    const dates = response.data[1];
                    if (!dates.includes(today)) {
                        dates.push(today); // 오늘 날짜 추가
                    }
                    setDateList(dates);
                }
            } catch (err) {
                setError("날짜 목록을 불러오는 중 오류가 발생했습니다."); // 오류 메시지 추가
            }
        };
        if (today) {
            fetchDateList();
        }
    }, [today]);

    // 출석부 불러오기
    useEffect(() => {
        if (selectedDate === undefined || selectedDate === "") return;
        const fetchAttendance = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(
                    `http://localhost:8000/admin/show_attendance/${selectedDate}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                // 출석 상태가 없는 경우 결석으로 초기화
                const attendanceData = response.data.map(member => ({
                    ...member,
                    status: member.status !== undefined ? member.status : false
                }));
                setAttendanceList(attendanceData);
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
            if (e.response && e.response.status === 409) {
                setAlert({
                    show: true,
                    type: 'warning',
                    message: '이미 출석한 기록이 있는 날짜입니다. \n데이터를 초기화 후 출석을 시작하시겠습니까?',
                    confirm: true,
                    onConfirm: async () => {
                        try {
                            await axios.post(
                                "http://localhost:8000/admin/refresh_date",
                                { date: selectedDate },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            startWebSocket(token);
                        } catch (refreshError) {
                            setError("날짜 초기화 중 오류가 발생했습니다.");
                        }
                    }
                });
            } else {
                setError("날짜 추가 중 오류가 발생했습니다."); // 오류 메시지 추가
            }
            return;
        }
        startWebSocket(token);
    };

    const startWebSocket = (token) => {
        const socket = new window.WebSocket(`ws://localhost:8000/admin/attendance/${selectedDate}/ws`);
        socket.onopen = () => {
            socket.send("Bearer " + token);
        };
        socket.onmessage = (event) => {
            if (modalMode === "code") {
                setFixedCode(event.data);
            } else {
                setQrCode(event.data);
            }
        };
        setWs(socket);
        setShowQR(true); // 모달 표시
        setModalMode("qr");
        setShowCode(false);
        setFixedCode("");
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setDropdownOpen(false);
    };

    // 전체 출석부 보기 버튼 클릭 핸들러
    const handleAllAttendanceClick = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(
                `http://localhost:8000/admin/show_attendance/None`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // response.data: [출석데이터, 날짜리스트]
            setAttendanceList(response.data[0]);
            setDateList(response.data[1]);
        } catch (err) {
            setError("전체 출석부를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
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

    // 코드 출석 시작 핸들러 (모달 내부에서 QR→코드 전환)
    const handleStartCode = () => {
        if (ws) {
            ws.send("code_attendance_accepted");
            setModalMode("code");
        } else {
            setAlert({ show: true, type: 'error', message: 'QR 출석이 시작된 후에만 코드 출석으로 전환할 수 있습니다.', confirm: false, onConfirm: null });
        }
    };

    // QR/코드 모달 닫기 핸들러
    const handleCloseQR = () => {
        setAlert({
            show: true,
            type: 'info',
            message: '정말로 출석을 종료하시겠습니까?',
            confirm: true,
            onConfirm: () => {
                if (ws) {
                    ws.close();
                    setWs(null);
                }
                setShowQR(false);
                setQrCode("");
                setShowCode(false);
                setFixedCode("");
                setModalMode("qr");
                reloadAttendance();
            }
        });
    };

    const handleCloseAlert = () => {
        setAlert({ ...alert, show: false });
    };
    const handleConfirmAlert = () => {
        if (alert.onConfirm) alert.onConfirm();
        setAlert({ ...alert, show: false });
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

    // 코드 출석 모달을 열기 위한 useEffect
    useEffect(() => {
        if (!ws) return;
        // 코드 출석 모드로 바뀌었을 때, 다음에 오는 코드 메시지를 fixedCode로 설정
        if (modalMode === "code") {
            const handleCodeMessage = (event) => {
                setFixedCode(event.data);
            };
            ws.addEventListener("message", handleCodeMessage, { once: true });
            // cleanup
            return () => {
                ws.removeEventListener("message", handleCodeMessage);
            };
        }
    }, [modalMode, ws]);

    return (
        <div className="leader-page">
            <AlertModal
                show={alert.show}
                type={alert.type}
                message={alert.message}
                onClose={handleCloseAlert}
                confirm={alert.confirm}
                onConfirm={handleConfirmAlert}
            />
            <div className="leader-header-card">
                <div className="leader-header-left">
                    <div className="leader-date-label">{i18n[language].attendanceDate || '출석 날짜'}</div>
                    <div className="leader-date-controls">
                        <div className="leader-date-value">
                            {selectedDate ? selectedDate : (i18n[language].all || '전체')}
                            <button
                                className="dropdown-btn"
                                onClick={() => setDropdownOpen((v) => !v)}
                                aria-label={i18n[language].openDateDropdown || '날짜 선택 드롭다운 열기'}
                            >
                                {dropdownOpen ? '▲' : '▼'}
                            </button>
                        </div>
                        <button className="all-attendance-btn" onClick={handleAllAttendanceClick}>
                            {i18n[language].allAttendance || '전체 출석부'}
                        </button>
                        <button className="today-btn" onClick={handleGoToday} disabled={selectedDate === today}>
                            {i18n[language].goToday || '오늘로 돌아가기'}
                        </button>
                    </div>
                    {dropdownOpen && (
                        <div className="date-dropdown" style={{ position: 'absolute', left: 0 }}>
                            {dateList.length === 0 ? (
                                <div className="date-dropdown-empty">{i18n[language].noDate || '날짜 없음'}</div>
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
                    {i18n[language].startAttendanceQR || '출석 시작 (QR 생성)'}
                </button>
            </div>
            <div className="attendance-section">
                <h2 className="attendance-title">{selectedDate ? `${selectedDate} ${i18n[language].attendanceList || '출석부'}` : (i18n[language].allAttendance || '전체 출석부')}</h2>
                {/* QR/코드 모달 (하나의 모달에서 분기) */}
                {showQR && (
                  <div className="qr-modal-bg" onClick={handleCloseQR}>
                    <div className="qr-modal-card" onClick={e=>e.stopPropagation()}>
                      <button className="qr-close-btn" onClick={handleCloseQR}>×</button>
                      {modalMode === "qr" && qrCode && (
                        <>
                          <div className="qr-label">{i18n[language].attendWithQR || 'QR코드로 출석하세요'}</div>
                          <QRCode value={qrCode} size={200} />
                          <button onClick={handleStartCode} style={{marginTop: '24px', background: '#ff9800', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '1.1rem', cursor: 'pointer'}}>{i18n[language].attendWithCode || '코드로 출석하기'}</button>
                        </>
                      )}
                      {modalMode === "code" && fixedCode && (
                        <>
                          <div className="qr-label">{i18n[language].inputCodeToAttend || '아래 코드를 입력하여 출석하세요'}</div>
                          <div style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#ff9800', margin: '30px 0'}}>{fixedCode}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className='attendance-table-wrap' style={{ overflow: 'visible' }}>
                    {loading ? (
                        <div className="attendance-message loading">{i18n[language].loading || '로딩 중...'}</div>
                    ) : error ? (
                        <div className="attendance-message error">{i18n[language].error || error}</div>
                    ) : attendanceList.length === 0 ? (
                        <div className="attendance-message empty">{i18n[language].noAttendance || '출석기록이 없습니다.'}</div>
                    ) : selectedDate === "" ? (
                        // 전체 출석부 테이블
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th>{i18n[language].name || '이름'}</th>
                                    {dateList.map(date => (
                                        <th key={date}>{date}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceList.map(user => (
                                    <tr key={user.user_id}>
                                        <td>{user.name}</td>
                                        {dateList.map(date => (
                                            <td key={date}>
                                                <span className={`status-badge ${user[date] === true ? "출석" : "결석"}`}>
                                                    {user[date] === true ? (i18n[language].attended || '출석') : (i18n[language].absent || '결석')}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        // 날짜별 출석부 테이블
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th>{i18n[language].name || '이름'}</th>
                                    <th>{i18n[language].attendanceStatus || '출석 상태'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceList.map(user => (
                                    <tr key={user.user_id}>
                                        <td>{user.name}</td>
                                        <td>
                                            <span className={`status-badge ${user.status === true ? "출석" : "결석"}`}>
                                                {user.status === true ? (i18n[language].attended || '출석') : (i18n[language].absent || '결석')}
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
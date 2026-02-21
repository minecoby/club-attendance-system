import { useEffect, useState } from 'react';
import "../styles/LeaderPage.css";
import axios from 'axios';
import apiClient from '../utils/apiClient';
import QRCode from "react-qr-code";
import AlertModal from '../components/AlertModal';
import Calendar from '../components/Calendar';
import i18n from '../i18n';

const API = import.meta.env.VITE_BASE_URL;
const WS_API = import.meta.env.VITE_WS_URL;

function LeaderPage({ language, setLanguage }) {
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [today, setToday] = useState("");
    const [dateList, setDateList] = useState(() => {
        const saved = localStorage.getItem('leaderPage_dateList');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        return localStorage.getItem('leaderPage_selectedDate') || "";
    });
    const [dropdownOpen, setDropdownOpen] = useState(false); // 드롭다운 상태
    const [qrCode, setQrCode] = useState("");
    const [ws, setWs] = useState(null);
    const [showQR, setShowQR] = useState(false); // QR코드 표시 여부
    const [showCode, setShowCode] = useState(false); // 코드 출석 표시 여부
    const [fixedCode, setFixedCode] = useState(""); // 고정 코드 값
    const [modalMode, setModalMode] = useState("qr"); // 'qr' 또는 'code'
    const [alert, setAlert] = useState({ show: false, type: 'info', message: '', confirm: false, onConfirm: null });
    const [editMode, setEditMode] = useState(false);
    const [editAttendanceList, setEditAttendanceList] = useState([]);
    const [showInlineCalendar, setShowInlineCalendar] = useState(false);
    const [isCalendarClosing, setIsCalendarClosing] = useState(false);

    // 뒤로가기 방지
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
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('leaderPage_attendanceList', JSON.stringify(attendanceList));
    }, [attendanceList]);

    useEffect(() => {
        localStorage.setItem('leaderPage_dateList', JSON.stringify(dateList));
    }, [dateList]);

    useEffect(() => {
        localStorage.setItem('leaderPage_selectedDate', selectedDate);
    }, [selectedDate]);

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
                // apiClient 사용으로 자동 토큰 갱신
                const response = await apiClient.get(`/admin/show_attendance/None`);
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

    // 출석부 불러오기 함수 (useEffect 밖으로 분리)
    const fetchAttendance = async (date = selectedDate) => {
        setLoading(true);
        setError(null);
        try {
            // apiClient 사용으로 자동 토큰 갱신
            const response = await apiClient.get(`/admin/show_attendance/${date}`);
            
            // club_code가 응답에 있으면 저장
            if (response.data && response.data.club_code) {
                localStorage.setItem("club_code", response.data.club_code);
            } else {
                // 없으면 별도 API로 club_code 조회
                const userRes = await apiClient.get(`/users/get_mydata`);
                if (userRes.data && userRes.data.club_data && userRes.data.club_data.length > 0) {
                    // 리더는 club_data[0]이 자신의 club_code일 것
                    localStorage.setItem("club_code", userRes.data.club_data[0].club_code);
                }
            }
            // 출석 상태가 없는 경우 결석으로 초기화
            const attendanceData = response.data.map ? response.data.map(member => ({
                ...member,
                status: member.status !== undefined ? member.status : false
            })) : [];
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

    // 출석부 불러오기 useEffect
    useEffect(() => {
        if (selectedDate === undefined || selectedDate === "") return;
        fetchAttendance(selectedDate);
    }, [selectedDate]);

    const handleStartQR = async () => {
        if (selectedDate === "" || selectedDate === undefined) {
            setAlert({
                show: true,
                type: 'info',
                message: '출석할 날짜를 선택한 후 출석을 진행해주세요.',
                confirm: false,
                onConfirm: null
            });
            return;
        }

        try {
            await apiClient.post(`/admin/add_date`, { date: selectedDate });
        } catch (e) {
            if (e.response && e.response.status === 409) {
                setAlert({
                    show: true,
                    type: 'warning',
                    message: '이미 출석한 기록이 있는 날짜입니다. \n데이터를 초기화 후 출석을 시작하시겠습니까?',
                    confirm: true,
                    onConfirm: async () => {
                        try {
                            await apiClient.post(`/admin/refresh_date`, { date: selectedDate });
                            startWebSocket();
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
        startWebSocket();
    };

    const startWebSocket = () => {
        const socket = new window.WebSocket(`${WS_API}/admin/attendance/${selectedDate}/ws`);
        socket.onopen = () => {};
        socket.onmessage = (event) => {
            if (modalMode === "code") {
                setFixedCode(event.data);
            } else {
                const code = event.data;
                const clubCode = localStorage.getItem("club_code");
                
                const data = {
                    code: code,
                    club: clubCode,
                    timestamp: Date.now(),
                    random: Math.random().toString(36).substring(2, 15)
                };
                
                const jsonString = JSON.stringify(data);
                const base64 = btoa(unescape(encodeURIComponent(jsonString)));
                const obfuscated = base64
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
                
                const attendanceUrl = `https://hanssup.minecoby.com/attend/${obfuscated}`;
                setQrCode(attendanceUrl);
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
            const response = await apiClient.get(`/admin/show_attendance/None`);
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


    const handleToggleInlineCalendar = () => {
        if (showInlineCalendar) {
            setIsCalendarClosing(true);
            setTimeout(() => {
                setShowInlineCalendar(false);
                setIsCalendarClosing(false);
            }, 200); 
        } else {
            setShowInlineCalendar(true);
            setDropdownOpen(false);
        }
    };

    const handleInlineCalendarDateSelect = (date) => {
        setSelectedDate(date);
        setIsCalendarClosing(true);
        setTimeout(() => {
            setShowInlineCalendar(false);
            setIsCalendarClosing(false);
        }, 200);
        setDropdownOpen(false);
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

    // 출석부 엑셀 다운로드 함수
    const handleDownloadExcel = async () => {
        try {
            const response = await apiClient.get(
                `/admin/export_attendance`,
                {
                    responseType: 'blob', // 파일 다운로드를 위해 blob 타입으로 받기
                }
            );
            // 파일명 추출 (Content-Disposition 헤더에서)
            let filename = 'attendance.xlsx';
            const disposition = response.headers['content-disposition'];
            if (disposition) {
                const match = disposition.match(/filename\*=UTF-8''(.+)/);
                if (match && match[1]) {
                    filename = decodeURIComponent(match[1]);
                }
            }
            // blob을 이용해 파일 다운로드
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('출석부 파일 다운로드 중 오류가 발생했습니다.');
        }
    };

    // 날짜별 출석 기록 삭제 핸들러
    const handleDeleteDate = () => {
        setAlert({
            show: true,
            type: 'warning',
            message: `${selectedDate} 날짜의 출석 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            confirm: true,
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/admin/delete_date/${selectedDate}`);
                    setAlert({ show: true, type: 'success', message: '출석 기록이 삭제되었습니다.' });
                    // 날짜 목록에서 삭제된 날짜 제거
                    setDateList(prev => prev.filter(d => d !== selectedDate));
                    // 오늘 날짜로 이동
                    setSelectedDate(today);
                } catch (err) {
                    setAlert({ show: true, type: 'error', message: '삭제 중 오류가 발생했습니다.' });
                }
            }
        });
    };

    // 전체 출석 기록 삭제 핸들러
    const handleDeleteAllAttendance = () => {
        setAlert({
            show: true,
            type: 'warning',
            message: '전체 출석 기록을 삭제하시겠습니까?\n모든 날짜의 출석 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.',
            confirm: true,
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/admin/delete_all_attendance`);
                    setAlert({ show: true, type: 'success', message: '전체 출석 기록이 삭제되었습니다.' });
                    // 날짜 목록 초기화
                    setDateList([today]);
                    setAttendanceList([]);
                    setSelectedDate(today);
                } catch (err) {
                    if (err.response && err.response.status === 404) {
                        setAlert({ show: true, type: 'info', message: '삭제할 출석 기록이 없습니다.' });
                    } else {
                        setAlert({ show: true, type: 'error', message: '삭제 중 오류가 발생했습니다.' });
                    }
                }
            }
        });
    };

    // 수정모드 진입
    const handleEditClick = () => {
        setEditAttendanceList(attendanceList.map(user => ({ ...user })));
        setEditMode(true);
    };
    // 출석/결석 토글
    const handleStatusToggle = (user_id, status) => {
        setEditAttendanceList(prev =>
            prev.map(user =>
                user.user_id === user_id ? { ...user, status } : user
            )
        );
    };

    // 저장하기 버튼 클릭 시
    const handleSaveAttendance = async () => {
        try {
            const club_code = localStorage.getItem("club_code");
            if (!club_code) {
                setAlert({ show: true, type: 'error', message: 'club_code가 없습니다. 동아리를 다시 선택해주세요.' });
                return;
            }
            // 1. attendance_date_id 얻기
            const dateIdRes = await apiClient.get(`/attend/get_date_id`, {
                params: { date: selectedDate, club_code }
            });
            const attendance_date_id = dateIdRes.data.attendance_date_id || dateIdRes.data.id || dateIdRes.data;
            // 2. 출석 정보 저장
            await apiClient.put(`/attend/attendance/bulk_update`, {
                attendance_date_id,
                attendances: editAttendanceList.map(u => ({ user_id: u.user_id, status: u.status }))
            });
            setEditMode(false);
            setAlert({ show: true, type: 'success', message: '출석 정보가 저장되었습니다.' });
            fetchAttendance(selectedDate); // 저장 후 즉시 출석부 새로고침
        } catch (err) {
            setAlert({ show: true, type: 'error', message: '저장 중 오류가 발생했습니다.' });
        }
    };



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
                        <div className="date-selection-wrapper">
                            <button 
                                className="calendar-toggle-btn"
                                onClick={handleToggleInlineCalendar}
                                title={showInlineCalendar ? (i18n[language].closeCalendar || '캘린더 닫기') : (i18n[language].openCalendar || '캘린더 열기')}
                            >
                                {showInlineCalendar ? '⟫' : '⟪'}
                            </button>
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
                        </div>
                        <button className="all-attendance-btn" onClick={handleAllAttendanceClick}>
                            {i18n[language].allAttendance || '전체 출석부'}
                        </button>
                        <button className="today-btn" onClick={handleGoToday} disabled={selectedDate === today}>
                            {i18n[language].goToday || '오늘로 돌아가기'}
                        </button>
                    </div>
                    {dropdownOpen && (
                        <div className="date-dropdown">
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
                    {showInlineCalendar && (
                        <div className={`inline-calendar-container ${isCalendarClosing ? 'closing' : ''}`}>
                            <Calendar 
                                selectedDate={selectedDate}
                                onDateSelect={handleInlineCalendarDateSelect}
                                availableDates={dateList}
                                language={language}
                            />
                        </div>
                    )}
                </div>
                <button onClick={handleStartQR} className="startQR-button leader-qr-btn">
                    {i18n[language].startAttendanceQR || '출석 시작 (QR 생성)'}
                </button>
            </div>
            <div className="attendance-section">
                {/* 제목(h2)과 버튼은 아래 테이블 위 flex row에서만 렌더링 */}
                {/* QR/코드 모달 (하나의 모달에서 분기) */}
                {showQR && (
                  <div className="qr-modal-bg" onClick={handleCloseQR}>
                    <div className="qr-modal-card" onClick={e=>e.stopPropagation()}>
                      <button className="qr-close-btn" onClick={handleCloseQR}>×</button>
                      {modalMode === "qr" && qrCode && (
                        <>
                          <div className="qr-label">{i18n[language].attendWithQR || 'QR코드로 출석하세요'}</div>
                          <QRCode value={qrCode} size={200} />
                          <button onClick={handleStartCode} className="code-attendance-btn">{i18n[language].attendWithCode || '코드로 출석하기'}</button>
                        </>
                      )}
                      {modalMode === "code" && fixedCode && (
                        <>
                          <div className="qr-label">{i18n[language].inputCodeToAttend || '아래 코드를 입력하여 출석하세요'}</div>
                          <div className="fixed-attendance-code">{fixedCode}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className='attendance-table-wrap'>
                    {loading ? (
                        <div className="attendance-message loading">{i18n[language].loading || '로딩 중...'}</div>
                    ) : error ? (
                        <div className="attendance-message error">{i18n[language].error || error}</div>
                    ) : attendanceList.length === 0 ? (
                        <div className="attendance-message empty">{i18n[language].noAttendance || '출석기록이 없습니다.'}</div>
                    ) : selectedDate === "" ? (
                        // 전체 출석부 테이블 (원래 코드)
                        <>
                        <div className="attendance-topbar">
                            <h2 className="attendance-title">
                                {i18n[language].allAttendance || '전체 출석부'}
                            </h2>
                            <div className="attendance-topbar-actions">
                                <button className="download-excel-btn" onClick={handleDownloadExcel}>
                                    {i18n[language].downloadAttendance || '출석부 다운로드'}
                                </button>
                                <button className="delete-all-attendance-btn" onClick={handleDeleteAllAttendance}>
                                    {i18n[language].deleteAllAttendance || '전체 삭제'}
                                </button>
                            </div>
                        </div>
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
                        </>
                    ) : editMode ? (
                        // 수정 모드 테이블
                        <>
                        <div className="attendance-topbar">
                            <h2 className="attendance-title">
                                {selectedDate ? `${selectedDate} ${i18n[language].attendanceList || '출석부'}` : (i18n[language].allAttendance || '전체 출석부')}
                            </h2>
                            <button className="save-attendance-btn" onClick={handleSaveAttendance}>
                                {i18n[language].saveAttendance || '저장하기'}
                            </button>
                        </div>
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th>{i18n[language].name || '이름'}</th>
                                    <th>{i18n[language].attendanceStatus || '출석 상태'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {editAttendanceList.map(user => (
                                    <tr key={user.user_id}>
                                        <td>{user.name}</td>
                                        <td>
                                            <button
                                                className={`attendance-status-btn ${user.status ? 'present' : 'muted'}`}
                                                onClick={() => handleStatusToggle(user.user_id, true)}
                                            >
                                                {i18n[language].attended || '출석'}
                                            </button>
                                            <button
                                                className={`attendance-status-btn ${!user.status ? 'absent' : 'muted'}`}
                                                onClick={() => handleStatusToggle(user.user_id, false)}
                                            >
                                                {i18n[language].absent || '결석'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </>
                    ) : (
                        // 날짜별 출석부 테이블
                        <>
                        <div className="attendance-topbar">
                            <h2 className="attendance-title">
                                {selectedDate ? `${selectedDate} ${i18n[language].attendanceList || '출석부'}` : (i18n[language].allAttendance || '전체 출석부')}
                            </h2>
                            <div className="attendance-topbar-actions">
                                <button className="edit-attendance-btn" onClick={handleEditClick}>
                                    {i18n[language].editAttendance || '수정하기'}
                                </button>
                                <button className="delete-attendance-btn" onClick={handleDeleteDate}>
                                    {i18n[language].deleteDate || '삭제하기'}
                                </button>
                            </div>
                        </div>
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
                                        <td>
                                            {user.name}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${user.status === true ? "출석" : "결석"}`}>
                                                {user.status === true ? (i18n[language].attended || '출석') : (i18n[language].absent || '결석')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LeaderPage;

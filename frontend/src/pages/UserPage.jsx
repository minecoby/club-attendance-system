import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/UserPage.css";
import AlertModal from '../components/AlertModal';
import apiClient from '../utils/apiClient';
import i18n from '../i18n';

const API = process.env.BASE_URL;

function UserPage({ language, setLanguage }) {
    const [attendanceList, setAttendanceList] = useState([]); // 출석부 데이터
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [attendanceCode, setAttendanceCode] = useState("");
    const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
    const [clubList, setClubList] = useState([]); // 동아리 목록
    const [selectedClub, setSelectedClub] = useState(""); // 선택된 동아리
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        apiClient.get('/clubs/get_club_info')
        .then(res => {
            if (Array.isArray(res.data) && res.data.length > 0) {
                setClubList(res.data);
                setSelectedClub(res.data[0].club_code); 
            }
        })
        .catch(error => {
            console.error('동아리 정보 불러오기 실패:', error);
        });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || !selectedClub) return;
        
        apiClient.get(`/attend/load_myattend/${selectedClub}`)
        .then(res => {
            if (Array.isArray(res.data)) {
                const sortedData = res.data.sort((a, b) => new Date(a.date) - new Date(b.date));
                setAttendanceList(sortedData);
            }
        })
        .catch(error => {
            console.error('출석 정보 불러오기 실패:', error);
        });
    }, [selectedClub]);

    const handleClubChange = (e) => {
        setSelectedClub(e.target.value);
    };

    const handleStartQR = () => {
        if (!selectedClub) {
            setAlert({ show: true, type: 'error', message: '동아리를 선택하세요.' });
            return;
        }
        localStorage.setItem("club_code", selectedClub);
        navigate('/qr-attendance'); // QR 출석 페이지로 이동
    };

    const handleOpenCodeModal = () => {
        setShowCodeModal(true);
    };

    const handleCloseCodeModal = () => {
        setShowCodeModal(false);
        setAttendanceCode("");
    };

    const handleCodeChange = (e) => {
        setAttendanceCode(e.target.value);
    };

    const handleSubmitCode = (e) => {
        e.preventDefault();
        setAlert({ show: true, type: 'info', message: `입력한 코드: ${attendanceCode}` });
        handleCloseCodeModal();
    };

    const handleCloseAlert = () => {
        setAlert({ ...alert, show: false });
    };

    return (
        <div className="userpage-section">
            <AlertModal show={alert.show} type={alert.type} message={alert.message} onClose={handleCloseAlert} />
            <div className="QR-section">
                {/* 동아리 선택 카드형 섹션 */}
                <div className="club-select-section">
                    <label htmlFor="club-select" className="club-select-label">{i18n[language].selectClub || '동아리 선택:'}</label>
                    <select id="club-select" value={selectedClub} onChange={handleClubChange} className="club-select-dropdown">
                        {clubList.map(club => (
                            <option key={club.club_code} value={club.club_code}>
                                {club.club_name}
                            </option>
                        ))}
                    </select>
                    <button onClick={handleStartQR} className="startQR-button">
                        {i18n[language].startQR || 'QR로 출석하기'}
                    </button>
                </div>
            </div>

            {showCodeModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{i18n[language].inputAttendCode || '출석 코드 입력'}</h3>
                        <form onSubmit={handleSubmitCode}>
                            <input
                                type="text"
                                value={attendanceCode}
                                onChange={handleCodeChange}
                                placeholder={i18n[language].inputAttendCodePlaceholder || '출석 코드를 입력하세요'}
                                required
                            />
                            <div style={{marginTop: '10px'}}>
                                <button type="submit">{i18n[language].attend || '출석하기'}</button>
                                <button type="button" onClick={handleCloseCodeModal} style={{marginLeft: '10px'}}>{i18n[language].cancel || '취소'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="attendance-section">
                <h2>{i18n[language].myAttendance || '내 출석부'}</h2>
                <div className='attendance-table-wrapper'>
                <table className="attendance-table">
                    <thead>
                        <tr>
                            <th>{i18n[language].clubName || '팀 이름'}</th>
                            <th>{i18n[language].date || '날짜'}</th>
                            <th>{i18n[language].attendanceStatus || '출석 상태'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceList.map((item, index) => {
                            const clubName = clubList.find(club => club.club_code === selectedClub)?.club_name || selectedClub;
                            return (
                                <tr key={index}>
                                    <td>{clubName}</td>
                                    <td>{item.date}</td>
                                    <td className={`status ${item.status === true ? '출석' : '결석'}`}>{item.status === true ? (i18n[language].attended || '출석') : (i18n[language].absent || '결석')}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}

export default UserPage;
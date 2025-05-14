import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/UserPage.css";
import Navbar from '../components/Navbar';
import AlertModal from '../components/AlertModal';

function UserPage() {
    const [attendanceList] = useState([
        { id: 1, team: "팀이름", date: "2025-03-21", status: "출석" },
        { id: 2, team: "팀이름", date: "2025-03-20", status: "결석" },
        { id: 3, team: "팀이름", date: "2025-03-19", status: "결석" },
    ]);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [attendanceCode, setAttendanceCode] = useState("");
    const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
    const navigate = useNavigate();

    useEffect(() => {
        // club_code를 미리 받아서 localStorage에 저장
        const token = localStorage.getItem("token");
        if (!token) return;
        fetch("http://localhost:8000/users/get_mydata", {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.club_data && data.club_data.length > 0) {
                localStorage.setItem("club_code", data.club_data[0].club_code);
            }
        });
    }, []);

    const handleStartQR = () => {
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
        // TODO: 백엔드 출석 API 호출
        setAlert({ show: true, type: 'info', message: `입력한 코드: ${attendanceCode}` });
        handleCloseCodeModal();
    };

    const handleCloseAlert = () => {
        setAlert({ ...alert, show: false });
    };

    return (
        <div className="userpage-section">
            <AlertModal show={alert.show} type={alert.type} message={alert.message} onClose={handleCloseAlert} />
            <div className='nav'>
                  <Navbar />
            </div>
            <div className="QR-section">
                <h2>출석 레츠끼끼</h2>
                <button onClick={handleStartQR} className="startQR-button">
                    QR로 출석하기
                </button>
            </div>

            {showCodeModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>출석 코드 입력</h3>
                        <form onSubmit={handleSubmitCode}>
                            <input
                                type="text"
                                value={attendanceCode}
                                onChange={handleCodeChange}
                                placeholder="출석 코드를 입력하세요"
                                required
                            />
                            <div style={{marginTop: '10px'}}>
                                <button type="submit">출석하기</button>
                                <button type="button" onClick={handleCloseCodeModal} style={{marginLeft: '10px'}}>취소</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="attendance-section">
                <h2>내 출석부</h2>
                <div className='attendance-table-wrapper'>
                <table className="attendance-table">
                    <thead>
                        <tr>
                            <th>팀 이름</th>
                            <th>날짜</th>
                            <th>출석 상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceList.map((item) => (
                            <tr key={item.id}>
                                <td>{item.team}</td>
                                <td>{item.date}</td>
                                <td className={`status ${item.status}`}>{item.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}

export default UserPage;

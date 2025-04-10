import { useState } from 'react';
import "../styles/UserPage.css";
import Navbar from '../components/Navbar';


function UserPage() {
    const [attendanceList] = useState([
        { id: 1, team: "팀이름", date: "2025-03-21", status: "출석" },
        { id: 2, team: "팀이름", date: "2025-03-20", status: "결석" },
        { id: 3, team: "팀이름", date: "2025-03-19", status: "결석" },
    ]);

    const handleStartQR = () => {
        alert("QR");
    };

    return (
        <div className="userpage-section">
            <div className='nav'>
                  <Navbar />
            </div>
            <div className="QR-section">
                <h2>출석 레츠끼끼</h2>
                <button onClick={handleStartQR} className="startQR-button">
                    QR로 출석하기
                </button>
            </div>

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

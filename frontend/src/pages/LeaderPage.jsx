import { useState } from 'react';
import "../styles/LeaderPage.css";

function LeaderPage() {
    const [attendanceList, setAttendanceList] = useState([
        { id: 1, name: "000", status: "출석"},
        { id: 2, name: "aaa", status: "출석"},
        { id: 3, name: "rrr", status: "결석" },
    ]);

    const handleStartQR = () => {
        alert("QR 출석 시작");
    };

    return (
        <div className="leaderpage-section">
            <div className="leaderpage-box">
                <div className="attendance-section">
                    <button onClick={handleStartQR} className="startQR-button">
                        출석 시작 (QR 생성)
                    </button>
                </div>

                <div className="listOfAttendance">
                    <h2>출석부</h2>
                    <ul className="attendance-list">
                        {attendanceList.map(member => (
                            <li key={member.id} className="attendance-item">
                                <span className="name">{member.name}</span>
                                <span className={`status ${member.status}`}>{member.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default LeaderPage;
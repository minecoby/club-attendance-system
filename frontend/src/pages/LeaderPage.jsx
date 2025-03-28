import { useState } from 'react';
import "../styles/LeaderPage.css";

function LeaderPage() {
    const [attendanceList, setAttendanceList] = useState([
        { id: 1, name: "030", status: "출석"},
        { id: 2, name: "aba", status: "출석"},
        { id: 3, name: "rwr", status: "결석" },
        { id: 4, name: "0ㄱ0", status: "출석"},
        { id: 5, name: "aaa", status: "출석"},
        { id: 6, name: "ror", status: "결석" },
        { id: 7, name: "000", status: "출석"},
        { id: 8, name: "aaa", status: "출석"},
        { id: 9, name: "rxt", status: "결석" },
        { id: 1, name: "030", status: "출석"},
        { id: 2, name: "aba", status: "출석"},
        { id: 3, name: "rwr", status: "결석" },
        { id: 4, name: "0ㄱ0", status: "출석"},
        { id: 5, name: "aaa", status: "출석"},
        { id: 6, name: "ror", status: "결석" },
        { id: 7, name: "000", status: "출석"},
        { id: 8, name: "aaa", status: "출석"},
        { id: 9, name: "rxt", status: "결석" },
    ]);

    const statusPriority ={
        "결석": 0,
        "출석": 1,
    };

    const handleStartQR = () => {
        alert("QR 출석 시작");
    };

    const sortedAttendance = [...attendanceList].sort((a, b) => {
        const priorityA = statusPriority[a.status];
        const priorityB = statusPriority[b.status];
    
        if (priorityA !== priorityB) {
            return priorityA - priorityB; // 1차 기준: 상태 우선순위
        } else {
            return a.name.localeCompare(b.name); // 2차 기준: 이름 알파벳순
        }
    });
    
    return (
        <div className="leader-page">
            <div className='QR-section'>
                <h2>QR코드로 출석하기</h2>
                <button onClick={handleStartQR} className="startQR-button">
                        출석 시작 (QR 생성)
                </button>
            </div>
            <div className="attendance-section">
                <h2>ooo 동아리 출석부</h2>
                <div className='attendance-table-wrap'>
                <table className="attendance-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>팀원</th>
                            <th>출석 상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAttendance.map((member, index) => (
                            <tr key={member.id}>
                                <td className='index-column'>{index + 1}</td>
                                <td>{member.name}</td>
                                <td>
                                    <span className={`status-badge ${member.status}`}>
                                        {member.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table> 
                </div>
            </div>
        </div>
    );
}

export default LeaderPage;
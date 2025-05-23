import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Settings.css';
import AlertModal from '../components/AlertModal';

function Settings() {
    // 사용자 정보 상태
    const [userInfo, setUserInfo] = useState({
        user_id: '',
        name: '',
        is_leader: false,
    });
    const [newName, setNewName] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    // 동아리 코드 등록 상태
    const [clubCode, setClubCode] = useState('');
    const [joinedClubs, setJoinedClubs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });

    // 사용자 정보 불러오기
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:8000/users/get_mydata', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserInfo({
                    user_id: res.data.user_data.id,
                    name: res.data.user_data.name,
                    is_leader: res.data.user_data.is_leader,
                });
                setNewName(res.data.user_data.name);
                if (res.data.club_data && res.data.club_data.length > 0) {
                    setJoinedClubs(res.data.club_data);
                } else {
                    setJoinedClubs([]);
                }
            } catch (err) {
                setAlert({ show: true, type: 'error', message: '사용자 정보를 불러오지 못했습니다.' });
            }
        };
        fetchUser();
    }, []);

    // 이름 변경
    const handleUpdateUser = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:8000/users/update', { name: newName }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserInfo(prev => ({ ...prev, name: newName }));
            setAlert({ show: true, type: 'success', message: '이름이 변경되었습니다.' });
        } catch (err) {
            setAlert({ show: true, type: 'error', message: '이름 변경 실패' });
        } finally {
            setLoading(false);
        }
    };

    // 비밀번호 변경
    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            setAlert({ show: true, type: 'error', message: '기존 비밀번호와 새 비밀번호를 모두 입력하세요.' });
            return;
        }
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:8000/users/change_password', {
                old_password: oldPassword,
                new_password: newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOldPassword('');
            setNewPassword('');
            setShowPasswordForm(false);
            setAlert({ show: true, type: 'success', message: '비밀번호가 변경되었습니다.' });
        } catch (err) {
            setAlert({ show: true, type: 'error', message: '비밀번호 변경 실패: ' + (err.response?.data?.detail || '') });
        } finally {
            setLoading(false);
        }
    };

    // 동아리 코드 등록
    const handleRegisterClub = async () => {
        if (!clubCode) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:8000/clubs/join_club', { club_code: clubCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // 가입 후, 최신 동아리 목록을 다시 불러와서 setJoinedClubs에 반영
            const res = await axios.get('http://localhost:8000/users/get_mydata', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.club_data && res.data.club_data.length > 0) {
                setJoinedClubs(res.data.club_data);
            }
            setAlert({ show: true, type: 'success', message: '동아리에 성공적으로 가입되었습니다!' });
            setClubCode('');
        } catch (err) {
            setAlert({ show: true, type: 'error', message: '동아리 코드 등록 실패: ' + (err.response?.data?.detail || '') });
        } finally {
            setLoading(false);
        }
    };

    // 동아리 탈퇴
    const handleQuitClub = async (club_code) => {
        if (!window.confirm("정말로 이 동아리에서 탈퇴하시겠습니까?")) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:8000/clubs/quit_club', { club_code }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlert({ show: true, type: 'success', message: '동아리에서 탈퇴되었습니다.' });
            setJoinedClubs(prev => prev.filter(c => c.club_code !== club_code));
        } catch (err) {
            setAlert({ show: true, type: 'error', message: '동아리 탈퇴 실패: ' + (err.response?.data?.detail || '') });
        } finally {
            setLoading(false);
        }
    };

    // 로그아웃
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usertype');
        window.location.href = '/login';
    };

    // 회원탈퇴(추가 구현 필요)
    const handleWithdraw = () => {
        setAlert({ show: true, type: 'info', message: '회원탈퇴 기능은 추후 구현 예정입니다.' });
    };

    const handleCloseAlert = () => {
        setAlert({ ...alert, show: false });
    };

    return (
        <div className="setting-section">
            <AlertModal show={alert.show} type={alert.type} message={alert.message} onClose={handleCloseAlert} />
            {/* 사용자 정보 관리 */}
            <section className="setting-block">
                <h3>사용자 정보 관리</h3>
                <div>
                    <label>아이디: </label>
                    <input type="text" value={userInfo.user_id} disabled />
                </div>
                <div>
                    <label>이름: </label>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} />
                    <button className="setting-btn" onClick={handleUpdateUser} disabled={loading}>이름 저장</button>

                    <button className="setting-btn" onClick={() => setShowPasswordForm(v => !v)}>
                        비밀번호 변경
                    </button>
                </div>
                {showPasswordForm && (
                    <div className="password-change-form">
                        <div>
                            <label>기존 비밀번호: </label>
                            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                        </div>
                        <div>
                            <label>새 비밀번호: </label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                            <button className="setting-btn" onClick={handleChangePassword} disabled={loading}>비밀번호 변경</button>
                        </div>
                    </div>
                )}
            </section>

            {/* 계정 관리 */}
            <section className="setting-block">
                <h3>계정 관리</h3>
                <button className="setting-btn" onClick={handleLogout}>로그아웃</button>
                <button className="setting-btn" onClick={handleWithdraw} disabled={userInfo.is_leader}>
                    회원탈퇴
                </button>
                {userInfo.is_leader && (
                    <div style={{color:'#e74c3c', marginTop:'8px', fontSize:'0.97em'}}>리더 계정은 회원탈퇴를 할 수 없습니다.</div>
                )}
            </section>

            {/* 동아리 관리 */}
            <section className="setting-block club-manage-card">
                <div className="club-manage-title">동아리 관리</div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <input type="text" value={clubCode} onChange={e => setClubCode(e.target.value)} placeholder="동아리 코드 입력" className="club-manage-input" disabled={userInfo.is_leader} />
                    <button className="club-manage-btn" onClick={handleRegisterClub} disabled={loading || userInfo.is_leader}>가입</button>
                </div>
                {userInfo.is_leader && (
                    <div style={{color:'#e74c3c', marginTop:'8px', fontSize:'0.97em'}}>리더 계정은 동아리 가입을 할 수 없습니다.</div>
                )}
                <div className="club-list-wrap">
                    <h4 style={{marginBottom: 10, color:'#2563eb'}}>가입된 동아리 목록</h4>
                    {joinedClubs.length === 0 && <div style={{color:'#888'}}>가입된 동아리가 없습니다.</div>}
                    <ul className="club-list-ul">
                        {joinedClubs.map(club => (
                            <li key={club.club_code} className="club-list-li">
                                <span className="club-name">{club.club_name}</span>
                                <span className="club-code">({club.club_code})</span>
                                <button className="club-leave-btn" onClick={() => handleQuitClub(club.club_code)} disabled={loading || userInfo.is_leader}>
                                    탈퇴
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}

export default Settings;
import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Settings.css';

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
    const [registeredClub, setRegisteredClub] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);

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
                    setRegisteredClub(res.data.club_data.map(c => c.club_code).join(', '));
                }
            } catch (err) {
                alert('사용자 정보를 불러오지 못했습니다.');
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
            alert('이름이 변경되었습니다.');
        } catch (err) {
            alert('이름 변경 실패');
        } finally {
            setLoading(false);
        }
    };

    // 비밀번호 변경
    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            alert('기존 비밀번호와 새 비밀번호를 모두 입력하세요.');
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
            alert('비밀번호가 변경되었습니다.');
        } catch (err) {
            alert('비밀번호 변경 실패: ' + (err.response?.data?.detail || ''));
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
            setRegisteredClub(clubCode);
            setClubCode('');
            alert('동아리 코드가 등록되었습니다.');
        } catch (err) {
            alert('동아리 코드 등록 실패: ' + (err.response?.data?.detail || ''));
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
        alert('회원탈퇴 기능은 추후 구현 예정입니다.');
    };

    return (
        <div className="setting-section">
            <h2>설정</h2>
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
                </div>
                <div>
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

            {/* 동아리 코드 등록 */}
            <section className="setting-block">
                <h3>동아리 코드 등록</h3>
                <div>
                    <input type="text" value={clubCode} onChange={e => setClubCode(e.target.value)} placeholder="동아리 코드 입력" disabled={userInfo.is_leader} />
                    <button className="setting-btn" onClick={handleRegisterClub} disabled={loading || userInfo.is_leader}>등록</button>
                </div>
                {userInfo.is_leader && (
                    <div style={{color:'#e74c3c', marginTop:'8px', fontSize:'0.97em'}}>리더 계정은 동아리 코드 등록을 할 수 없습니다.</div>
                )}
                {registeredClub && <div>등록된 동아리 코드: {registeredClub}</div>}
            </section>
        </div>
    );
}

export default Settings;
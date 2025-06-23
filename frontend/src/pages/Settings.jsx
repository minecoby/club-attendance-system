import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Settings.css';
import AlertModal from '../components/AlertModal';
import i18n from '../i18n';

const API = import.meta.env.VITE_API_BASE_URL;

function Settings({ theme, setTheme, language, setLanguage }) {
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
    // 추가 설정 상태
    const [notification, setNotification] = useState(true);
    const [profileImg, setProfileImg] = useState(null);
    const [profileImgUrl, setProfileImgUrl] = useState('');
    // 탈퇴 모달 상태
    const [showQuitModal, setShowQuitModal] = useState(false);
    const [quitTargetClub, setQuitTargetClub] = useState(null);

    // 사용자 정보 불러오기
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API}/users/get_mydata`, {
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

    // 프로필 이미지 미리보기
    const handleProfileImgChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImg(file);
            setProfileImgUrl(URL.createObjectURL(file));
        }
    };

    // 테마 토글
    const handleThemeToggle = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    // 알림 토글
    const handleNotificationToggle = () => {
        setNotification((prev) => !prev);
    };

    // 언어 변경
    const handleLanguageChange = (e) => {
        setLanguage(e.target.value);
    };

    // 이름 변경
    const handleUpdateUser = async () => {
        if (!newName) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.put(`${API}/users/update`, { name: newName }, {
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
            await axios.put(`${API}/users/change_password`, {
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
            await axios.post(`${API}/clubs/join_club`, { club_code: clubCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // 가입 후, 최신 동아리 목록을 다시 불러와서 setJoinedClubs에 반영
            const res = await axios.get(`${API}/users/get_mydata`, {
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
        setShowQuitModal(true);
        setQuitTargetClub(club_code);
    };

    // 진짜 탈퇴 실행
    const handleConfirmQuit = async () => {
        if (!quitTargetClub) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post(`${API}/clubs/quit_club`, { club_code: quitTargetClub }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlert({ show: true, type: 'success', message: '동아리에서 탈퇴되었습니다.' });
            setJoinedClubs(prev => prev.filter(c => c.club_code !== quitTargetClub));
        } catch (err) {
            setAlert({ show: true, type: 'error', message: '동아리 탈퇴 실패: ' + (err.response?.data?.detail || '') });
        } finally {
            setLoading(false);
            setShowQuitModal(false);
            setQuitTargetClub(null);
        }
    };

    const handleCancelQuit = () => {
        setShowQuitModal(false);
        setQuitTargetClub(null);
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
        <div className="settings-root">
            <AlertModal show={alert.show} type={alert.type} message={alert.message} onClose={handleCloseAlert} />
            {/* 탈퇴 확인 모달 */}
            <AlertModal
                show={showQuitModal}
                type="info"
                message="정말로 이 동아리에서 탈퇴하시겠습니까?"
                confirm={true}
                onConfirm={handleConfirmQuit}
                onClose={handleCancelQuit}
            />
            <div className="settings-container">
                {/* 사용자 정보 카드 */}
                <div className="settings-card">
                    <div className="settings-card-title">{i18n[language].userInfo}</div>
                    <div className="settings-card-content">
                        <div className="settings-row">
                            <label>{i18n[language].userId}</label>
                            <input type="text" value={userInfo.user_id} disabled className="settings-input" />
                        </div>
                        <div className="settings-row">
                            <label>{i18n[language].name}</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="settings-input" />
                        </div>
                        <div className="settings-row">
                            <button className="settings-btn" onClick={() => setShowPasswordForm(v => !v)}>
                                {i18n[language].changePassword}
                            </button>
                            <button className="settings-btn primary" onClick={handleUpdateUser} disabled={loading}>{i18n[language].saveName}</button>
                        </div>
                        {showPasswordForm && (
                            <div className="settings-password-form">
                                <div className="settings-row">
                                    <label>{i18n[language].oldPassword}</label>
                                    <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="settings-input" />
                                </div>
                                <div className="settings-row">
                                    <label>{i18n[language].newPassword}</label>
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="settings-input" />
                                    <button className="settings-btn primary" onClick={handleChangePassword} disabled={loading}>{i18n[language].changePassword}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 동아리 관리 카드 */}
                <div className="settings-card">
                    <div className="settings-card-title">{i18n[language].clubManage}</div>
                    <div className="settings-card-content">
                        <div className="settings-row club-register-row">
                            <input type="text" value={clubCode} onChange={e => setClubCode(e.target.value)} placeholder={i18n[language].inputClubCode} className="settings-input" disabled={userInfo.is_leader} />
                            <button className="settings-btn primary" onClick={handleRegisterClub} disabled={loading || userInfo.is_leader}>{i18n[language].join}</button>
                        </div>
                        {userInfo.is_leader && (
                            <div className="settings-warning">{i18n[language].leaderNoJoin}</div>
                        )}
                        <div className="settings-club-list">
                            <div className="settings-club-list-title">{i18n[language].joinedClubs}</div>
                            {joinedClubs.length === 0 && <div className="settings-empty">{i18n[language].noJoinedClub}</div>}
                            <ul className="settings-club-ul">
                                {joinedClubs.map(club => (
                                    <li key={club.club_code} className="settings-club-li">
                                        <span className="club-name">{club.club_name}</span>
                                        <span className="club-code">({club.club_code})</span>
                                        <button className="settings-btn danger small" onClick={() => handleQuitClub(club.club_code)} disabled={loading || userInfo.is_leader}>
                                            {i18n[language].quit}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 계정 관리 카드 */}
                <div className="settings-card">
                    <div className="settings-card-title">{i18n[language].accountManage}</div>
                    <div className="settings-card-content">
                        <div className="settings-row">
                            <button className="settings-btn" onClick={handleLogout}>{i18n[language].logout}</button>
                            <button className="settings-btn danger" onClick={handleWithdraw} disabled={userInfo.is_leader}>
                                {i18n[language].withdraw}
                            </button>
                        </div>
                        {userInfo.is_leader && (
                            <div className="settings-warning">{i18n[language].leaderNoWithdraw}</div>
                        )}
                    </div>
                </div>

                {/* 환경 설정 카드 */}
                <div className="settings-card">
                    <div className="settings-card-title">{i18n[language].envSettings}</div>
                    <div className="settings-card-content">
                        <div className="settings-row">
                            <label>{i18n[language].theme}</label>
                            <button className="settings-btn" onClick={handleThemeToggle}>
                                {theme === 'light' ? i18n[language].light : i18n[language].dark} {i18n[language].mode}
                            </button>
                        </div>
                        <div className="settings-row">
                            <label>{i18n[language].language}</label>
                            <select value={language} onChange={handleLanguageChange} className="settings-input" style={{maxWidth:120}}>
                                <option value="ko">한국어</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;
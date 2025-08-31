import { useState, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../utils/apiClient';
import '../styles/Settings.css';
import AlertModal from '../components/AlertModal';
import i18n from '../i18n';

const API = import.meta.env.VITE_BASE_URL;

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
    // 유저목록 관련 상태
    const [members, setMembers] = useState([]);
    // 탈퇴 모달 상태
    const [showQuitModal, setShowQuitModal] = useState(false);
    const [quitTargetClub, setQuitTargetClub] = useState(null);
    // 강퇴 모달 상태
    const [showKickModal, setShowKickModal] = useState(false);
    const [kickTargetUser, setKickTargetUser] = useState(null);

    // 사용자 정보 불러오기
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiClient.get(`/users/get_mydata`);
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
                
                // 리더인 경우 멤버 목록도 불러오기
                if (res.data.user_data.is_leader) {
                    await fetchMembers();
                }
            } catch (err) {
                setAlert({ show: true, type: 'error', message: '사용자 정보를 불러오지 못했습니다.' });
            }
        };
        fetchUser();
    }, []);

    // 멤버 목록 불러오기
    const fetchMembers = async () => {
        try {
            const res = await apiClient.get(`/clubs/get_members`);
            setMembers(res.data);
        } catch (err) {
            console.error('멤버 목록 불러오기 실패:', err);
        }
    };


    // 테마 토글
    const handleThemeToggle = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
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
            await apiClient.put(`/users/update`, { name: newName });
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
            await apiClient.put(`/users/change_password`, {
                old_password: oldPassword,
                new_password: newPassword
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
            await apiClient.post(`/clubs/join_club`, { club_code: clubCode });
            // 가입 후, 최신 동아리 목록을 다시 불러와서 setJoinedClubs에 반영
            const res = await apiClient.get(`/users/get_mydata`);
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
            await apiClient.post(`/clubs/quit_club`, { club_code: quitTargetClub });
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
    const handleLogout = async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                // 백엔드에 리프레시 토큰 무효화 요청
                await axios.post(`${API}/users/logout`, {
                    refresh_token: refreshToken
                });
            }
        } catch (error) {
            console.error('로그아웃 요청 실패:', error);
            // 실패해도 로컬 토큰은 제거
        } finally {
            // 로컬 스토리지에서 모든 토큰 제거
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('usertype');
            window.location.href = '/login';
        }
    };

    // 회원탈퇴(추가 구현 필요)
    const handleWithdraw = () => {
        setAlert({ show: true, type: 'info', message: '회원탈퇴 기능은 추후 구현 예정입니다.' });
    };

    // 강퇴 모달 열기
    const handleKickUser = (user_id, userName) => {
        setShowKickModal(true);
        setKickTargetUser({ user_id, name: userName });
    };

    // 진짜 강퇴 실행
    const handleConfirmKick = async () => {
        if (!kickTargetUser) return;
        try {
            setLoading(true);
            await apiClient.delete(`/admin/kick_user`, {
                data: { user_id: kickTargetUser.user_id }
            });
            setAlert({ show: true, type: 'success', message: '강퇴가 완료되었습니다.' });
            // 멤버 목록 새로고침
            await fetchMembers();
        } catch (err) {
            setAlert({ show: true, type: 'error', message: '강퇴에 실패했습니다.' });
        } finally {
            setLoading(false);
            setShowKickModal(false);
            setKickTargetUser(null);
        }
    };

    const handleCancelKick = () => {
        setShowKickModal(false);
        setKickTargetUser(null);
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
            {/* 강퇴 확인 모달 */}
            <AlertModal
                show={showKickModal}
                type="warning"
                message={kickTargetUser ? `정말로 "${kickTargetUser.name}"님을 강퇴하시겠습니까?` : "강퇴하시겠습니까?"}
                confirm={true}
                onConfirm={handleConfirmKick}
                onClose={handleCancelKick}
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

                {/* 유저 목록 관리 카드 (리더만 표시) */}
                {userInfo.is_leader && (
                    <div className="settings-card wide-card">
                        <div className="settings-card-title">유저 목록 관리</div>
                        <div className="settings-card-content">
                            <div className="settings-club-list">
                                <div className="settings-club-list-title">동아리 멤버 목록</div>
                                {members.length === 0 && <div className="settings-empty">멤버가 없습니다.</div>}
                                <div className="members-grid">
                                    {members.map(member => (
                                        <div key={member.user_id} className="member-card">
                                            <div className="member-info">
                                                <span className="member-name">{member.name}</span>
                                                <span className="member-id">({member.user_id})</span>
                                            </div>
                                            <button 
                                                className="settings-btn danger small" 
                                                onClick={() => handleKickUser(member.user_id, member.name)}
                                                disabled={loading}
                                            >
                                                강퇴
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Settings;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import apiClient from '../utils/apiClient';
import { getCurrentPosition } from '../utils/geolocation';
import dataCache from '../utils/dataCache';
import '../styles/Settings.css';
import AlertModal from '../components/AlertModal';
import LocationMapModal from '../components/LocationMapModal';
import i18n from '../i18n';

const API = import.meta.env.VITE_BASE_URL;

function Settings({ theme, setTheme, language, setLanguage }) {
    const navigate = useNavigate();
    
    // 사용자 정보 상태
    const [userInfo, setUserInfo] = useState({
        user_id: '',
        gmail: '',
        name: '',
        is_leader: false,
    });
    const [newName, setNewName] = useState('');
    // 동아리 코드 등록 상태
    const [clubCode, setClubCode] = useState('');
    const [joinedClubs, setJoinedClubs] = useState([]);
    const [loading, setLoading] = useState(false);
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
    // 회원탈퇴 모달 상태
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    // 위치 설정 상태
    const [locationSettings, setLocationSettings] = useState({
        location_enabled: false,
        latitude: null,
        longitude: null,
        radius_km: 0.1
    });
    const [locationLoading, setLocationLoading] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);


    // 사용자 정보 불러오기
    useEffect(() => {
        const fetchUserData = async () => {
            const res = await apiClient.get(`/users/get_mydata`);
            const userData = {
                user_id: res.data.user_data.user_id,
                gmail: res.data.user_data.gmail,
                name: res.data.user_data.name,
                is_leader: res.data.user_data.is_leader,
            };
            const clubData = res.data.club_data && res.data.club_data.length > 0 ? res.data.club_data : [];
            
            return { userData, clubData, isLeader: userData.is_leader };
        };

        dataCache.loadDataWithCache(
            'userSettings',
            fetchUserData,
            (data) => {
                setUserInfo(data.userData);
                setNewName(data.userData.name);
                setJoinedClubs(data.clubData);

                if (data.isLeader) {
                    loadMembersWithCache();
                    loadLocationSettings();
                }
            },
            1000 * 60 * 5
        ).catch(err => {
            setAlert({ show: true, type: 'error', message: '사용자 정보를 불러오지 못했습니다.' });
        });
    }, []);

    // 멤버 목록 불러오기
    const loadMembersWithCache = () => {
        const fetchMembers = async () => {
            const res = await apiClient.get(`/clubs/get_members`);
            return res.data;
        };

        dataCache.loadDataWithCache(
            'members',
            fetchMembers,
            setMembers,
            1000 * 60 * 2
        ).catch(err => {
            console.error('멤버 목록 불러오기 실패:', err);
        });
    };

    // 위치 설정 불러오기
    const loadLocationSettings = async () => {
        try {
            const res = await apiClient.get('/admin/location_settings');
            setLocationSettings(res.data);
        } catch (err) {
            console.error('위치 설정 불러오기 실패:', err);
        }
    };

    // 위치 설정 저장
    const handleSaveLocationSettings = async () => {
        try {
            setLocationLoading(true);
            await apiClient.put('/admin/location_settings', locationSettings);
            setAlert({ show: true, type: 'success', message: i18n[language].locationSettingsSaved || '위치 설정이 저장되었습니다.' });
        } catch (err) {
            setAlert({ show: true, type: 'error', message: i18n[language].locationSettingsFailed || '위치 설정 저장 실패' });
        } finally {
            setLocationLoading(false);
        }
    };

    // 현재 위치 사용
    const handleUseCurrentLocation = async () => {
        try {
            setLocationLoading(true);
            const position = await getCurrentPosition();
            setLocationSettings(prev => ({
                ...prev,
                latitude: position.latitude,
                longitude: position.longitude
            }));
            setAlert({ show: true, type: 'success', message: i18n[language].currentLocationSet || '현재 위치가 설정되었습니다.' });
        } catch (err) {
            setAlert({ show: true, type: 'error', message: err.message });
        } finally {
            setLocationLoading(false);
        }
    };

    // 지도에서 위치 선택
    const handleMapSelect = (lat, lng) => {
        setLocationSettings(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
        }));
        setAlert({ show: true, type: 'success', message: i18n[language].locationSelectedFromMap || '지도에서 위치가 선택되었습니다.' });
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


    // 동아리 코드 등록
    const handleRegisterClub = async () => {
        if (!clubCode) return;
        try {
            setLoading(true);
            await apiClient.post(`/clubs/join_club`, { club_code: clubCode });
            // 가입 후, 캐시를 무효화하고 최신 동아리 목록을 다시 불러옴
            dataCache.clearCache('userSettings');
            const res = await apiClient.get(`/users/get_mydata`);
            const clubData = res.data.club_data && res.data.club_data.length > 0 ? res.data.club_data : [];
            setJoinedClubs(clubData);
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
            const token = localStorage.getItem('token');
            if (token) {
                await axios.post(`${API}/users/logout`, {}, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('로그아웃 요청 실패:', error);
            // 실패해도 로컬 토큰은 제거
        } finally {
            // 로컬 스토리지에서 모든 토큰 제거
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            navigate('/');
        }
    };

    // 회원탈퇴
    const handleDeleteAccount = async () => {
        try {
            setLoading(true);
            await apiClient.delete('/users/delete_account');
            
            localStorage.clear();
            
            setAlert({ 
                show: true, 
                type: 'success', 
                message: '회원탈퇴가 완료되었습니다.' 
            });
            
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            
        } catch (error) {
            console.error('회원탈퇴 실패:', error);
            setAlert({ 
                show: true, 
                type: 'error', 
                message: '회원탈퇴 중 오류가 발생했습니다.' 
            });
        } finally {
            setLoading(false);
            setShowDeleteAccountModal(false);
        }
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
            dataCache.clearCache('members');
            loadMembersWithCache();
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
            {/* 회원탈퇴 확인 모달 */}
            <AlertModal
                show={showDeleteAccountModal}
                type="warning"
                message="정말로 회원탈퇴를 하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다."
                confirm={true}
                onConfirm={handleDeleteAccount}
                onClose={() => setShowDeleteAccountModal(false)}
            />
            {/* 위치 지도 선택 모달 */}
            <LocationMapModal
                show={showMapModal}
                onClose={() => setShowMapModal(false)}
                onSelect={handleMapSelect}
                initialLat={locationSettings.latitude}
                initialLng={locationSettings.longitude}
                language={language}
            />
            <div className="settings-container">
                {/* 사용자 정보 카드 */}
                <div className="settings-card">
                    <div className="settings-card-title">{i18n[language].userInfo}</div>
                    <div className="settings-card-content">
                        <div className="settings-row">
                            <label>이메일</label>
                            <input type="text" value={userInfo.gmail || ''} disabled className="settings-input" />
                        </div>
                        <div className="settings-row">
                            <label>{i18n[language].name}</label>
                            <input 
                                type="text" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)} 
                                className="settings-input" 
                                maxLength={10}
                            />
                        </div>
                        <div className="settings-row">
                            <button className="settings-btn primary" onClick={handleUpdateUser} disabled={loading}>{i18n[language].saveName}</button>
                        </div>
                    </div>
                </div>

                {/* 동아리 관리 카드 */}
                <div className="settings-card">
                    <div className="settings-card-title">{i18n[language].clubManage}</div>
                    <div className="settings-card-content">
                        <div className="settings-row club-register-row">
                            <input type="text" value={clubCode} onChange={e => setClubCode(e.target.value)} placeholder={i18n[language].inputClubCode} className="settings-input" disabled={userInfo.is_leader} maxLength={10} />
                            <button className="settings-btn primary" onClick={handleRegisterClub} disabled={loading || userInfo.is_leader}>
                                {loading ? '가입 중...' : i18n[language].join}
                            </button>
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
                                            {loading ? '탈퇴 중...' : i18n[language].quit}
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
                            <button className="settings-btn danger" onClick={() => setShowDeleteAccountModal(true)}>
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

                {/* 위치 설정 카드 (리더만 표시) */}
                {userInfo.is_leader && (
                    <div className="settings-card">
                        <div className="settings-card-title">{i18n[language].locationSettings || '위치 설정'}</div>
                        <div className="settings-card-content">
                            <div className="settings-row">
                                <label>{i18n[language].locationVerification || '위치 검증'}</label>
                                <button
                                    className={`settings-btn ${locationSettings.location_enabled ? 'primary' : ''}`}
                                    onClick={() => setLocationSettings(prev => ({ ...prev, location_enabled: !prev.location_enabled }))}
                                >
                                    {locationSettings.location_enabled ? (i18n[language].enabled || '활성화') : (i18n[language].disabled || '비활성화')}
                                </button>
                            </div>
                            <div className="settings-row">
                                <label>{i18n[language].latitude || '위도'}</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={locationSettings.latitude || ''}
                                    onChange={(e) => setLocationSettings(prev => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                                    className="settings-input"
                                    placeholder="37.5665"
                                />
                            </div>
                            <div className="settings-row">
                                <label>{i18n[language].longitude || '경도'}</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={locationSettings.longitude || ''}
                                    onChange={(e) => setLocationSettings(prev => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                                    className="settings-input"
                                    placeholder="126.9780"
                                />
                            </div>
                            <div className="settings-row">
                                <label>{i18n[language].radius || '반경'} (km)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={locationSettings.radius_km || 0.1}
                                    onChange={(e) => setLocationSettings(prev => ({ ...prev, radius_km: parseFloat(e.target.value) || 0.1 }))}
                                    className="settings-input"
                                    placeholder="0.1"
                                />
                            </div>
                            <div className="settings-row">
                                <button className="settings-btn" onClick={() => setShowMapModal(true)} disabled={locationLoading}>
                                    {i18n[language].selectFromMap || '지도에서 선택'}
                                </button>
                                <button className="settings-btn" onClick={handleUseCurrentLocation} disabled={locationLoading}>
                                    {i18n[language].useCurrentLocation || '현재 위치 사용'}
                                </button>
                            </div>
                            <div className="settings-row">
                                <button className="settings-btn primary" onClick={handleSaveLocationSettings} disabled={locationLoading}>
                                    {locationLoading ? (i18n[language].saving || '저장 중...') : (i18n[language].save || '저장')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                                {loading ? '강퇴 중...' : '강퇴'}
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
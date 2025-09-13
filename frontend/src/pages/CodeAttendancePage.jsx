import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import AlertModal from '../components/AlertModal';
import i18n from '../i18n';

function CodeAttendancePage({ language, setLanguage }) {
    const [attendanceCode, setAttendanceCode] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [attendanceCompleted, setAttendanceCompleted] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    
    const navigate = useNavigate();

    // 윈도우 리사이즈 감지
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 코드 출석 처리
    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        try {
            let clubCode = localStorage.getItem("club_code");
            if (!clubCode) {
                const userRes = await apiClient.get('/users/get_mydata');
                if (userRes.data?.club_data?.[0]?.club_code) {
                    clubCode = userRes.data.club_data[0].club_code;
                    localStorage.setItem("club_code", clubCode);
                } else {
                    throw new Error('동아리 정보를 찾을 수 없습니다.');
                }
            }

            await apiClient.post('/attend/check', {
                club_code: clubCode,
                code: attendanceCode
            });

            setAttendanceCompleted(true);
            setMessage('✅ 출석이 완료되었습니다!');
            setMessageType('success');
            setShowAlert(true);
            setAttendanceCode("");
            
        } catch (err) {
            let errorMsg = '출석 실패: ';
            if (err.response?.data?.detail) {
                errorMsg += err.response.data.detail;
            } else if (err.response?.data?.message) {
                errorMsg += err.response.data.message;
            } else {
                errorMsg += '알 수 없는 오류';
            }
            setMessage('❌ ' + errorMsg);
            setMessageType('error');
            setShowAlert(true);
        }
    };

    const handleAlertClose = () => {
        setShowAlert(false);
        setMessage("");
        setMessageType("");
        
        if (attendanceCompleted) {
            navigate('/userpage');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'var(--bg)',
            padding: '10px',
            boxSizing: 'border-box'
        }}>
            <AlertModal 
                show={showAlert} 
                type={messageType} 
                message={message} 
                onClose={handleAlertClose} 
            />
            
            <h2 style={{ 
                marginBottom: '20px', 
                fontWeight: 700, 
                fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', 
                color: 'var(--primary)',
                textAlign: 'center',
                width: '100%'
            }}>
                {i18n[language].attendance || '출석'}
            </h2>

            <div style={{
                background: 'var(--card-bg)',
                borderRadius: '15px',
                boxShadow: '0 4px 20px var(--shadow)',
                padding: 'clamp(15px, 5vw, 30px)',
                width: '100%',
                maxWidth: '90vw',
                minWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxSizing: 'border-box'
            }}>
                <h3 style={{ 
                    marginBottom: '15px', 
                    color: 'var(--primary)', 
                    fontWeight: 700,
                    fontSize: 'clamp(1.2rem, 4vw, 1.4rem)',
                    textAlign: 'center'
                }}>
                    {i18n[language].inputAttendCode || '출석 코드 입력'}
                </h3>
                
                <form onSubmit={handleCodeSubmit} style={{ width: '100%' }}>
                    <input
                        type="text"
                        value={attendanceCode}
                        maxLength={8}
                        onChange={(e) => setAttendanceCode(e.target.value)}
                        placeholder={i18n[language].inputAttendCodePlaceholder || '출석 코드를 입력하세요'}
                        required
                        style={{
                            width: '100%',
                            padding: 'clamp(12px, 4vw, 18px)',
                            marginBottom: '15px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: 'clamp(1rem, 4vw, 1.2rem)',
                            textAlign: 'center',
                            boxSizing: 'border-box',
                            minHeight: '50px'
                        }}
                    />
                    
                    <div style={{
                        display: 'flex',
                        flexDirection: windowWidth < 400 ? 'column' : 'row',
                        gap: '10px',
                        width: '100%'
                    }}>
                        <button 
                            type="submit"
                            style={{
                                flex: 1,
                                padding: 'clamp(12px, 4vw, 16px)',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#4CAF50',
                                color: 'white',
                                fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                minHeight: '50px',
                                textAlign: 'center'
                            }}
                        >
                            {i18n[language].attend || '출석하기'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => navigate(-1)}
                            style={{
                                flex: 1,
                                padding: 'clamp(12px, 4vw, 16px)',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#6c757d',
                                color: 'white',
                                fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                minHeight: '50px',
                                textAlign: 'center'
                            }}
                        >
                            {i18n[language].back || '뒤로가기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CodeAttendancePage;
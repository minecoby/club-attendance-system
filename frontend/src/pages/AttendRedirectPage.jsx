import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { getCurrentPosition } from '../utils/geolocation';
import AlertModal from '../components/AlertModal';
import i18n from '../i18n';

function AttendRedirectPage({ language = 'ko' }) {
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState('info');
    const [showAlert, setShowAlert] = useState(false);
    const [processing, setProcessing] = useState(true);

    const location = useLocation();
    const navigate = useNavigate();
    const { token: urlToken } = useParams();

    useEffect(() => {
        const processAttendance = async () => {
            let code;
            let club;
            try {
                if (urlToken) {
                    try {
                        const base64 = urlToken.replace(/-/g, '+').replace(/_/g, '/');
                        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
                        const completeBase64 = base64 + padding;
                        const jsonString = decodeURIComponent(escape(atob(completeBase64)));
                        const data = JSON.parse(jsonString);
                        code = data.code;
                        club = data.club;
                    } catch {
                        throw new Error('잘못된 출석 링크입니다.');
                    }
                } else {
                    const searchParams = new URLSearchParams(location.search);
                    code = searchParams.get('code');
                    club = searchParams.get('club');
                }

                if (!code || !club) {
                    throw new Error('잘못된 출석 링크입니다.');
                }

                let locationData = {};
                try {
                    const position = await getCurrentPosition();
                    locationData = {
                        latitude: position.latitude,
                        longitude: position.longitude,
                    };
                } catch (locationError) {
                    console.log('위치 정보 없이 출석 시도:', locationError.message);
                }

                await apiClient.post('/attend/check_qr', {
                    qr_code: code,
                    ...locationData,
                });

                setMessage('출석이 완료되었습니다.');
                setMessageType('success');
                setShowAlert(true);
                setProcessing(false);
            } catch (error) {
                if (error.response?.status === 401) {
                    if (code && club) {
                        localStorage.setItem('pendingAttendance', JSON.stringify({ code, club }));
                    }
                    localStorage.removeItem('usertype');
                    setMessage('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                    setMessageType('info');
                    setShowAlert(true);
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                    return;
                }

                const detail = error.response?.data?.detail || error.message || '출석 처리 중 오류가 발생했습니다.';
                setMessage(`오류: ${detail}`);
                setMessageType('error');
                setShowAlert(true);
                setProcessing(false);
            }
        };

        processAttendance();
    }, [location, urlToken]);

    const handleAlertClose = () => {
        setShowAlert(false);
        setMessage('');
        setMessageType('');
        navigate('/userpage');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <AlertModal
                show={showAlert}
                type={messageType}
                message={message}
                onClose={handleAlertClose}
            />

            <div style={{
                background: 'var(--card-bg)',
                borderRadius: '15px',
                boxShadow: '0 4px 20px var(--shadow)',
                padding: '40px',
                width: '100%',
                maxWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxSizing: 'border-box'
            }}>
                {processing ? (
                    <>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            border: '4px solid var(--primary)',
                            borderTop: '4px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '20px'
                        }} />
                        <h2 style={{
                            color: 'var(--primary)',
                            textAlign: 'center',
                            margin: 0,
                            fontSize: '1.2rem'
                        }}>
                            {i18n[language]?.processing || '출석 처리 중...'}
                        </h2>
                    </>
                ) : (
                    <h2 style={{
                        color: 'var(--primary)',
                        textAlign: 'center',
                        margin: 0,
                        fontSize: '1.2rem'
                    }}>
                        {i18n[language]?.attendanceComplete || '출석 처리 완료'}
                    </h2>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default AttendRedirectPage;

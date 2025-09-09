import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import apiClient from '../utils/apiClient';
import AlertModal from '../components/AlertModal';
import i18n from '../i18n';

function QRAttendancePage({ language, setLanguage }) {
    const [mode, setMode] = useState('qr'); // 'qr' 또는 'code'
    const [attendanceCode, setAttendanceCode] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState(''); // success, error, info
    const [showAlert, setShowAlert] = useState(false);
    const [qrScanned, setQrScanned] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [attendanceCompleted, setAttendanceCompleted] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    
    const qrRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const isStartingRef = useRef(false);
    const navigate = useNavigate();

    // QR 스캔 성공 시 출석 처리
    const handleQRSuccess = async (decodedText) => {
        if (qrScanned || attendanceCompleted) return;
        setQrScanned(true);
        
        // QR 인식 즉시 카메라 중지
        await stopCamera();
        
        try {
            // club_code 가져오기
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

            // 출석 처리
            await apiClient.post('/attend/check', {
                club_code: clubCode,
                code: decodedText
            });

            // 출석 성공
            setAttendanceCompleted(true);
            setMessage('✅ 출석이 완료되었습니다!');
            setMessageType('success');
            setShowAlert(true);
            
        } catch (err) {
            let errorMsg = '출석 실패: ';
            if (err.response?.data?.detail) {
                errorMsg += err.response.data.detail;
            } else if (err.response?.data?.message) {
                errorMsg += err.response.data.message;
            } else if (err.message) {
                errorMsg += err.message;
            } else {
                errorMsg += '알 수 없는 오류';
            }
            setMessage('❌ ' + errorMsg);
            setMessageType('error');
            setShowAlert(true);
            
            // 실패 시 카메라 다시 시작
            setTimeout(() => {
                setQrScanned(false);
                startCamera();
            }, 2000);
        }
    };

    // 카메라 시작
    const startCamera = async () => {
        if (isStartingRef.current || html5QrCodeRef.current) {
            return;
        }
        
        try {
            isStartingRef.current = true;
            
            const allVideos = document.querySelectorAll('video');
            allVideos.forEach(video => video.remove());
            
            await new Promise(resolve => setTimeout(resolve, 500));

            const qrId = 'qr-reader';
            const qrContainer = document.getElementById(qrId);
            
            if (!qrContainer) {
                console.error('QR 컨테이너를 찾을 수 없습니다');
                return;
            }

            // 컨테이너 완전히 정리
            qrContainer.innerHTML = '';

            const html5QrCode = new Html5Qrcode(qrId);
            html5QrCodeRef.current = html5QrCode;

            // 후면 카메라 우선 선택
            const devices = await Html5Qrcode.getCameras();
            let cameraId = devices[0]?.id;
            
            // 후면 카메라 찾기
            for (const device of devices) {
                const label = device.label.toLowerCase();
                if (label.includes('back') || label.includes('rear') || 
                    label.includes('environment') || label.includes('후면')) {
                    cameraId = device.id;
                    break;
                }
            }

            await html5QrCode.start(
                cameraId,
                {
                    fps: 15,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                handleQRSuccess,
                (errorMessage) => {
                }
            );

            setCameraActive(true);
            
        } catch (error) {
            console.error('카메라 시작 실패:', error);
        } finally {
            isStartingRef.current = false;
        }
    };

    // 카메라 중지
    const stopCamera = async () => {
        try {
            if (html5QrCodeRef.current) {
                try {
                    const state = html5QrCodeRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || 
                        state === Html5QrcodeScannerState.PAUSED) {
                        await html5QrCodeRef.current.stop();
                    }
                } catch (stopError) {
                    console.log('Stop error:', stopError);
                }
                
                try {
                    await html5QrCodeRef.current.clear();
                } catch (clearError) {
                    console.log('Clear error:', clearError);
                }
                
                html5QrCodeRef.current = null;
            }
            
            if (qrRef.current) {
                qrRef.current.innerHTML = '';
                const videos = qrRef.current.querySelectorAll('video');
                videos.forEach(video => video.remove());
            }
            
            setCameraActive(false);
        } catch (error) {
            console.error('카메라 중지 오류:', error);
        } finally {
            isStartingRef.current = false;
        }
    };

    // QR 모드 시작
    useEffect(() => {
        let timeoutId;
        
        if (mode === 'qr') {
            timeoutId = setTimeout(() => {
                startCamera();
            }, 100);
        } else {
            stopCamera();
        }
        
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            stopCamera();
        };
    }, [mode]);

    // 윈도우 리사이즈 감지
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 페이지 언마운트 시 카메라 정리
    useEffect(() => {
        return () => {
            stopCamera();
        };
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
        
        // 출석 완료 후 모달을 닫으면 userpage로 이동
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
                {mode === 'qr' ? (
                    <>
                        <div 
                            ref={qrRef}
                            id="qr-reader"
                            style={{
                                width: 'min(280px, 80vw)',
                                height: 'min(280px, 80vw)',
                                borderRadius: '12px',
                                background: '#000',
                                marginBottom: '15px',
                                position: 'relative',
                                border: '2px solid #ddd',
                                overflow: 'hidden',
                                maxWidth: '320px',
                                maxHeight: '320px'
                            }}
                        />

                        <div style={{
                            display: 'flex',
                            flexDirection: windowWidth < 400 ? 'column' : 'row',
                            gap: '10px',
                            width: '100%',
                            justifyContent: 'center'
                        }}>
                            <button 
                                onClick={() => setMode('code')}
                                style={{
                                    padding: 'clamp(10px, 3vw, 15px) clamp(15px, 4vw, 25px)',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#007AFF',
                                    color: 'white',
                                    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    flex: windowWidth < 400 ? '1' : 'auto',
                                    minHeight: '44px',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center'
                                }}
                            >
                                {i18n[language].attendWithCode || '코드로 출석'}
                            </button>
                            <button 
                                onClick={() => navigate(-1)}
                                style={{
                                    padding: 'clamp(10px, 3vw, 15px) clamp(15px, 4vw, 25px)',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#6c757d',
                                    color: 'white',
                                    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    flex: windowWidth < 400 ? '1' : 'auto',
                                    minHeight: '44px',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center'
                                }}
                            >
                                {i18n[language].back || '뒤로가기'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
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
                                    onClick={() => setMode('qr')}
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
                                    {i18n[language].attendWithQR || 'QR로 출석'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default QRAttendancePage; 
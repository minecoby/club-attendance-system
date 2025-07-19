import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import apiClient from '../utils/apiClient';
import '../styles/UserPage.css'; // 모달 스타일 재사용
import i18n from '../i18n';

const API = import.meta.env.VITE_API_BASE_URL;

function QRAttendancePage({ language, setLanguage }) {
    const [mode, setMode] = useState('qr'); // 'qr' 또는 'code'
    const [attendanceCode, setAttendanceCode] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState(''); // success, error, info
    const [showAlert, setShowAlert] = useState(false);
    const [qrScanned, setQrScanned] = useState(false);
    const [qrActive, setQrActive] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState({ min: 1, max: 1, step: 0.1 });
    const [currentStream, setCurrentStream] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [lastTouchDistance, setLastTouchDistance] = useState(0);
    const [zoomSupported, setZoomSupported] = useState(false);
    const qrRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // 실제 카메라 줌 조절 함수
    const adjustCameraZoom = async (newZoomLevel) => {
        if (!currentStream || !currentStream.getVideoTracks().length || !zoomSupported) return;
        
        const videoTrack = currentStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();
        
        if (capabilities.zoom) {
            const clampedZoom = Math.max(
                capabilities.zoom.min, 
                Math.min(capabilities.zoom.max, newZoomLevel)
            );
            
            try {
                await videoTrack.applyConstraints({
                    advanced: [{ zoom: clampedZoom }]
                });
                setZoomLevel(clampedZoom);
            } catch (error) {
                console.error('카메라 줌 조절 실패:', error);
            }
        }
    };

    // 터치 거리 계산 함수
    const getTouchDistance = (touches) => {
        if (touches.length < 2) return 0;
        const touch1 = touches[0];
        const touch2 = touches[1];
        return Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
    };

    // 터치 시작 이벤트
    const handleTouchStart = (e) => {
        if (e.touches.length === 2 && zoomSupported) {
            e.preventDefault();
            const distance = getTouchDistance(e.touches);
            setLastTouchDistance(distance);
            setIsDragging(true);
        }
    };

    // 터치 이동 이벤트 (핀치 줌)
    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && isDragging && zoomSupported) {
            e.preventDefault();
            const distance = getTouchDistance(e.touches);
            
            if (lastTouchDistance > 0) {
                const scale = distance / lastTouchDistance;
                const currentZoom = zoomLevel;
                const newZoom = Math.max(
                    zoomCapabilities.min, 
                    Math.min(zoomCapabilities.max, currentZoom * scale)
                );
                adjustCameraZoom(newZoom);
            }
            setLastTouchDistance(distance);
        }
    };

    // 터치 끝 이벤트
    const handleTouchEnd = (e) => {
        if (e.touches.length < 2) {
            setIsDragging(false);
            setLastTouchDistance(0);
        }
    };


    const handleWheel = (e) => {
        if (!zoomSupported) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newZoom = Math.max(
            zoomCapabilities.min, 
            Math.min(zoomCapabilities.max, zoomLevel * delta)
        );
        adjustCameraZoom(newZoom);
    };

    // 카메라 안전종료 함수
    const stopCamera = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (e) {}
            try {
                await html5QrCodeRef.current.clear();
            } catch (e) {}
            html5QrCodeRef.current = null;
        }
        // MediaStream 직접 해제 (혹시 남아있을 경우)
        if (qrRef.current) {
            const videos = qrRef.current.getElementsByTagName('video');
            if (videos.length > 0) {
                const stream = videos[0].srcObject;
                if (stream && typeof stream.getTracks === 'function') {
                    stream.getTracks().forEach(track => track.stop());
                }
            }
            qrRef.current.innerHTML = '';
        }
        setCurrentStream(null);
        setQrActive(false);
        setZoomLevel(1);
        setZoomSupported(false);
    };

    // 페이지 이동 시 카메라 종료
    const handleBack = async () => {
        await stopCamera();
        navigate(-1);
    };

    // 페이지 이동 감지: 경로가 바뀌면 카메라 종료
    useEffect(() => {
        stopCamera();
    }, [location.pathname]);

    // beforeunload(새로고침/탭 닫기)에도 카메라 종료
    useEffect(() => {
        window.addEventListener('beforeunload', stopCamera);
        return () => {
            window.removeEventListener('beforeunload', stopCamera);
        };
    }, []);

    useEffect(() => {
        if (mode !== 'qr') {
            stopCamera();
            return;
        }
        if (html5QrCodeRef.current) return; // 이미 실행 중이면 재시작 금지
        let isMounted = true;
        if (qrRef.current) qrRef.current.innerHTML = '';
        const qrId = 'qr-reader-box';
        if (qrRef.current) qrRef.current.id = qrId;
        const html5QrCode = new Html5Qrcode(qrId);
        html5QrCodeRef.current = html5QrCode;
        setQrActive(true);
        
        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText, decodedResult) => {
                if (!isMounted || qrScanned) return;
                setQrScanned(true);
                try {
                    const token = localStorage.getItem("token");
                    const clubCode = localStorage.getItem("club_code");
                    await apiClient.post('/attend/check',
                        {
                            club_code: clubCode,
                            code: decodedText
                        }
                    );
                    setMessage('출석이 완료되었습니다!');
                    setMessageType('success');
                    setShowAlert(true);
                } catch (err) {
                    setMessage('출석 실패: ' + (err.response?.data?.message || '오류'));
                    setMessageType('error');
                    setShowAlert(true);
                }
                setTimeout(() => setQrScanned(false), 2000);
            },
            (errorMessage) => {
                if (!isMounted) return;
                if (errorMessage && errorMessage.toLowerCase().includes('permission')) {
                    setMessage('카메라 권한이 필요합니다. 브라우저 설정을 확인하세요.');
                    setMessageType('error');
                    setShowAlert(true);
                }
            }
        ).then(() => {
            // 카메라 시작 후 stream 정보와 줌 capabilities 확인
            setTimeout(() => {
                const video = qrRef.current?.querySelector('video');
                if (video && video.srcObject) {
                    setCurrentStream(video.srcObject);
                    
                    const videoTrack = video.srcObject.getVideoTracks()[0];
                    if (videoTrack) {
                        const capabilities = videoTrack.getCapabilities();
                        if (capabilities.zoom) {
                            setZoomCapabilities({
                                min: capabilities.zoom.min,
                                max: capabilities.zoom.max,
                                step: Math.max(0.1, (capabilities.zoom.max - capabilities.zoom.min) / 20)
                            });
                            setZoomLevel(capabilities.zoom.min);
                            setZoomSupported(true);
                        }
                    }
                }
            }, 1000); // 카메라 완전히 시작된 후 확인
        }).catch(err => {
            setMessage('카메라 오류: ' + err);
            setMessageType('error');
            setShowAlert(true);
        });
        
        return () => {
            isMounted = false;
            stopCamera();
        };
    }, [mode]);


    useEffect(() => {
        if (mode === 'qr' && qrRef.current) {
            const observer = new MutationObserver(() => {
                const video = qrRef.current.querySelector('video');
                if (video) {
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'cover';
                    video.style.borderRadius = '12px';
                }
            });
            observer.observe(qrRef.current, { childList: true, subtree: true });
            return () => observer.disconnect();
        }
    }, [mode]);

    // 코드 출석 관련
    const handleOpenCodeMode = async () => {
        await stopCamera();
        setMode('code');
        setMessage("");
        setAttendanceCode("");
    };
    const handleBackToQR = async () => {
        await stopCamera();
        setMode('qr');
        setMessage("");
        setAttendanceCode("");
    };
    const handleClose = async () => {
        await stopCamera();
        navigate(-1);
    };
    const handleCodeChange = (e) => {
        setAttendanceCode(e.target.value);
    };
    const handleSubmitCode = async (e) => {
        e.preventDefault();
        try {
            const clubCode = localStorage.getItem("club_code");
            await apiClient.post('/attend/check',
                {
                    club_code: clubCode,
                    code: attendanceCode
                }
            );
            setMessage('출석 성공!');
            setMessageType('success');
            setShowAlert(true);
        } catch (err) {
            setMessage('출석 실패: ' + (err.response?.data?.detail || '오류'));
            setMessageType('error');
            setShowAlert(true);
        }
        setAttendanceCode("");
    };

    const handleAlertClose = () => {
        setShowAlert(false);
        setMessage("");
        setMessageType("");
    };

    return (
        <div className="userpage-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', background: 'var(--bg)' }}>
            <h2 style={{ marginTop: 30, marginBottom: 18, fontWeight: 700, fontSize: '1.7rem', color: 'var(--primary)' }}>{i18n[language].attendance || '출석'}</h2>
            <div className="qr-card" style={{ background: 'var(--card-bg)', borderRadius: 18, boxShadow: '0 4px 16px var(--shadow)', padding: 32, marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 340, minHeight: 380, justifyContent: 'center' }}>
                {mode === 'qr' && (
                    <>
                        <div 
                            style={{ 
                                position: 'relative', 
                                width: 300, 
                                height: 300, 
                                maxWidth: '100%', 
                                marginBottom: 18,
                                touchAction: 'none',
                                overflow: 'hidden',
                                borderRadius: 12
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onWheel={handleWheel}
                        >
                            <div 
                                ref={qrRef} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    borderRadius: 12, 
                                    background: '#222', 
                                    position: 'relative'
                                }} 
                            />
                            {/* 줌 기능 지원 여부에 따른 UI */}
                            {zoomSupported ? (
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    background: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    padding: '6px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    zIndex: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}>
                                    <div>{(zoomLevel).toFixed(1)}x</div>
                                    <div style={{ fontSize: '0.6rem', marginTop: '2px', opacity: 0.8 }}>

                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    zIndex: 10,
                                    opacity: 0.8
                                }}>
                                    줌 기능 미지원
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: 18, display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
                            <button onClick={handleOpenCodeMode} className="startQR-button" style={{ minWidth: 120 }}>
                                {i18n[language].attendWithCode || '코드로 출석하기'}
                            </button>
                            <button onClick={handleClose} className="startQR-button" style={{ background: '#6c757d', minWidth: 100 }}>
                                {i18n[language].back || '뒤로가기'}
                            </button>
                        </div>
                    </>
                )}
                {mode === 'code' && (
                    <>
                        <form onSubmit={handleSubmitCode} style={{ width: 260, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h3 style={{ marginBottom: 18, color: 'var(--primary)', fontWeight: 700 }}>{i18n[language].inputAttendCode || '출석 코드 입력'}</h3>
                            <input
                                type="text"
                                value={attendanceCode}
                                onChange={handleCodeChange}
                                placeholder={i18n[language].inputAttendCodePlaceholder || '출석 코드를 입력하세요'}
                                required
                                style={{ fontSize: 18, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', width: '100%', marginBottom: 16 }}
                            />
                            <button type="submit" className="startQR-button" style={{ width: '100%', marginBottom: 10 }}>{i18n[language].attend || '출석하기'}</button>
                            <button type="button" onClick={handleBackToQR} className="startQR-button" style={{ background: '#6c757d', width: '100%' }}>{i18n[language].attendWithQR || 'QR로 출석하기'}</button>
                        </form>
                    </>
                )}
            </div>
            {showAlert && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ maxWidth: 320, textAlign: 'center', background: 'var(--card-bg)', borderRadius: 16, boxShadow: '0 4px 24px var(--shadow)', padding: '36px 24px' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 16, color: messageType === 'success' ? 'var(--success)' : 'var(--absent)' }}>{messageType === 'success' ? (i18n[language].attendSuccess || '출석 성공') : (i18n[language].attendFail || '출석 실패')}</div>
                        <div style={{ marginBottom: 18, color: 'var(--text)', fontSize: '1.05rem' }}>{message}</div>
                        <button onClick={handleAlertClose} className="startQR-button" style={{ width: '100%' }}>{i18n[language].ok || '확인'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default QRAttendancePage; 
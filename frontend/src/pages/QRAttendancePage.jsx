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
            { 
                facingMode: 'environment',
                advanced: [
                    { width: { min: 1280 } },
                    { height: { min: 720 } }
                ]
            },
            { 
                fps: 20,
                qrbox: function(viewfinderWidth, viewfinderHeight) {
                    let minEdgePercentage = 0.7;
                    let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                    return {
                        width: qrboxSize,
                        height: qrboxSize
                    };
                },
                aspectRatio: 1.0,
                disableFlip: false,
                rememberLastUsedCamera: true
            },
            async (decodedText, decodedResult) => {
                if (!isMounted || qrScanned) return;
                setQrScanned(true);
                
                // QR 스캔 성공 시각적 피드백
                setMessage('QR 코드 인식 완료! 출석 처리 중...');
                setMessageType('info');
                setShowAlert(true);
                
                try {
                    const token = localStorage.getItem("token");
                    const clubCode = localStorage.getItem("club_code");
                    
                    // club_code가 없으면 사용자 데이터에서 가져오기
                    if (!clubCode) {
                        const userRes = await apiClient.get('/users/get_mydata');
                        if (userRes.data && userRes.data.club_data && userRes.data.club_data.length > 0) {
                            const newClubCode = userRes.data.club_data[0].club_code;
                            localStorage.setItem("club_code", newClubCode);
                        } else {
                            throw new Error('동아리 정보를 찾을 수 없습니다.');
                        }
                    }
                    
                    const finalClubCode = localStorage.getItem("club_code");
                    console.log('QR 스캔:', decodedText, '/ Club:', finalClubCode);
                    
                    const response = await apiClient.post('/attend/check',
                        {
                            club_code: finalClubCode,
                            code: decodedText
                        }
                    );
                    
                    console.log('✅ 출석 성공');
                    setMessage('✅ 출석이 완료되었습니다!');
                    setMessageType('success');
                    setShowAlert(true);
                    
                    // 성공 후 카메라 즉시 재활성화 (다음 사용자가 바로 스캔 가능)
                    setTimeout(() => {
                        setQrScanned(false);
                    }, 1000);
                    
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
                    
                    console.log('❌', errorMsg);
                    
                    setMessage('❌ ' + errorMsg);
                    setMessageType('error');
                    setShowAlert(true);
                    
                    // 실패 시 빠르게 다시 스캔 가능하도록
                    setTimeout(() => setQrScanned(false), 1500);
                }
            },
            (errorMessage) => {
                if (!isMounted) return;
                // 권한 관련 오류는 표시하지 않음 (너무 빈번함)
                if (errorMessage && errorMessage.toLowerCase().includes('permission')) {
                    console.warn('카메라 권한 오류:', errorMessage);
                } else if (errorMessage && !errorMessage.includes('NotFoundException')) {
                    // 실제 오류만 로그에 기록
                    console.warn('QR 스캔 오류:', errorMessage);
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
                            const minZoom = capabilities.zoom.min || 1;
                            const maxZoom = capabilities.zoom.max || 3;
                            setZoomCapabilities({
                                min: minZoom,
                                max: maxZoom,
                                step: 0.2
                            });
                            setZoomLevel(minZoom);
                            setZoomSupported(true);
                            console.log('📷 줌 지원:', minZoom + 'x ~', maxZoom + 'x');
                        } else {
                            setZoomSupported(false);
                        }
                    }
                }
            }, 500); // 더 빠른 초기화
        }).catch(err => {
            console.error('카메라 시작 실패:', err);
            let errorMsg = '카메라를 시작할 수 없습니다.';
            
            if (err.message && err.message.includes('Permission')) {
                errorMsg = '📱 카메라 권한을 허용해주세요.\n브라우저 설정에서 카메라 접근을 허용하고 페이지를 새로고침하세요.';
            } else if (err.message && err.message.includes('NotFound')) {
                errorMsg = '📷 카메라를 찾을 수 없습니다.\n다른 앱에서 카메라를 사용 중이거나 카메라가 연결되지 않았습니다.';
            } else if (err.message && err.message.includes('NotAllowed')) {
                errorMsg = '🚫 카메라 접근이 차단되었습니다.\n브라우저 주소창의 카메라 아이콘을 클릭하여 허용해주세요.';
            } else if (err.message && err.message.includes('NotReadable')) {
                errorMsg = '⚠️ 카메라가 다른 앱에서 사용 중입니다.\n다른 카메라 앱을 종료하고 다시 시도해주세요.';
            }
            
            setMessage(errorMsg);
            setMessageType('error');
            setShowAlert(true);
            setQrActive(false);
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
                                width: '350px', 
                                height: '350px', 
                                maxWidth: '90vw',
                                maxHeight: '90vw',
                                marginBottom: 18,
                                touchAction: 'none',
                                overflow: 'hidden',
                                borderRadius: 8,
                                border: qrScanned ? '3px solid #4CAF50' : 'none',
                                background: '#000'
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
                                    borderRadius: 8, 
                                    background: '#000', 
                                    position: 'relative'
                                }} 
                            />
                            
                            {/* 간단한 QR 스캔 성공 표시 */}
                            {qrScanned && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'rgba(76, 175, 80, 0.9)',
                                    color: 'white',
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    zIndex: 15
                                }}>
                                    ✅ 인식됨
                                </div>
                            )}
                        </div>
                        
                        {/* 줌 컨트롤 (줌 지원 시에만) */}
                        {zoomSupported && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                marginBottom: 16,
                                padding: '10px 20px',
                                background: 'rgba(255,255,255,0.9)',
                                borderRadius: '25px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                            }}>
                                <button 
                                    onClick={() => adjustCameraZoom(Math.max(zoomCapabilities.min, zoomLevel - 0.3))}
                                    disabled={zoomLevel <= zoomCapabilities.min}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: zoomLevel <= zoomCapabilities.min ? '#ccc' : '#007AFF',
                                        color: 'white',
                                        fontSize: '1.3rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: zoomLevel <= zoomCapabilities.min ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    −
                                </button>
                                <span style={{ 
                                    fontSize: '1rem', 
                                    fontWeight: 'bold', 
                                    minWidth: '50px', 
                                    textAlign: 'center',
                                    color: '#333'
                                }}>
                                    {zoomLevel.toFixed(1)}x
                                </span>
                                <button 
                                    onClick={() => adjustCameraZoom(Math.min(zoomCapabilities.max, zoomLevel + 0.3))}
                                    disabled={zoomLevel >= zoomCapabilities.max}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: zoomLevel >= zoomCapabilities.max ? '#ccc' : '#007AFF',
                                        color: 'white',
                                        fontSize: '1.3rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: zoomLevel >= zoomCapabilities.max ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        )}

                        
                        <div style={{ marginTop: 6, display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
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
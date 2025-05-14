import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import '../styles/UserPage.css'; // 모달 스타일 재사용

function QRAttendancePage() {
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [attendanceCode, setAttendanceCode] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState(''); // success, error, info
    const [qrScanned, setQrScanned] = useState(false);
    const qrRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        if (!qrRef.current) return;
        const html5QrCode = new Html5Qrcode(qrRef.current.id);
        html5QrCodeRef.current = html5QrCode;
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            async (decodedText, decodedResult) => {
                if (!isMounted || qrScanned) return;
                setQrScanned(true);
                try {
                    await axios.post('/api/attendance/qr', { qr: decodedText });
                    setMessage('출석 성공!');
                    setMessageType('success');
                } catch (err) {
                    setMessage('출석 실패: ' + (err.response?.data?.message || '오류'));
                    setMessageType('error');
                }
                setTimeout(() => setQrScanned(false), 2000);
            },
            (errorMessage) => {
                if (!isMounted) return;
                if (errorMessage && errorMessage.toLowerCase().includes('permission')) {
                    setMessage('카메라 권한이 필요합니다. 브라우저 설정을 확인하세요.');
                    setMessageType('error');
                }
            }
        ).catch(err => {
            setMessage('카메라 오류: ' + err);
            setMessageType('error');
        });
        return () => {
            isMounted = false;
            if (html5QrCodeRef.current) {
                html5QrCodeRef.current.stop().catch(() => {});
                html5QrCodeRef.current.clear().catch(() => {});
            }
        };
    }, []);

    // 코드 출석 관련
    const handleOpenCodeModal = () => {
        setShowCodeModal(true);
    };
    const handleCloseCodeModal = () => {
        setShowCodeModal(false);
        setAttendanceCode("");
    };
    const handleCodeChange = (e) => {
        setAttendanceCode(e.target.value);
    };
    const handleSubmitCode = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const clubCode = localStorage.getItem("club_code");
            await axios.post(
                "http://localhost:8000/attend/attendance/check",
                {
                    club_code: clubCode,
                    code: attendanceCode
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setMessage('출석 성공!');
            setMessageType('success');
        } catch (err) {
            setMessage('출석 실패: ' + (err.response?.data?.detail || '오류'));
            setMessageType('error');
        }
        handleCloseCodeModal();
    };

    return (
        <div className="userpage-section">
            <h2>QR 출석</h2>
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
                <div id="qr-reader" ref={qrRef} style={{ width: 300, height: 300, margin: '0 auto' }} />
            </div>
            <div style={{ marginTop: 20 }}>
                <button onClick={handleOpenCodeModal} className="startQR-button">
                    코드로 출석하기
                </button>
                <button onClick={() => navigate(-1)} className="startQR-button" style={{ marginLeft: 10 }}>
                    뒤로가기
                </button>
            </div>
            {message && (
                <div style={{ marginTop: 20, color: messageType === 'success' ? 'green' : messageType === 'error' ? 'red' : 'blue' }}>
                    {message}
                </div>
            )}

            {showCodeModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>출석 코드 입력</h3>
                        <form onSubmit={handleSubmitCode}>
                            <input
                                type="text"
                                value={attendanceCode}
                                onChange={handleCodeChange}
                                placeholder="출석 코드를 입력하세요"
                                required
                            />
                            <div style={{ marginTop: '10px' }}>
                                <button type="submit">출석하기</button>
                                <button type="button" onClick={handleCloseCodeModal} style={{ marginLeft: '10px' }}>취소</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default QRAttendancePage; 
import React, { useEffect, useRef, useState } from 'react';
import './LocationMapModal.css';

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

function LocationMapModal({ show, onClose, onSelect, initialLat, initialLng, language }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [selectedPosition, setSelectedPosition] = useState({
        lat: initialLat || 37.5665,
        lng: initialLng || 126.9780
    });
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [sdkError, setSdkError] = useState(null);

    // Kakao Maps SDK 동적 로드
    useEffect(() => {
        if (!show) return;

        if (window.kakao && window.kakao.maps) {
            setSdkLoaded(true);
            return;
        }

        console.log('VITE_KAKAO_MAP_KEY:', KAKAO_MAP_KEY ? `${KAKAO_MAP_KEY.substring(0, 8)}...` : 'undefined');

        if (!KAKAO_MAP_KEY) {
            setSdkError('Kakao Map API 키가 설정되지 않았습니다. .env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
            return;
        }

        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;
        script.async = true;

        script.onload = () => {
            console.log('Kakao SDK script loaded');
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                    console.log('Kakao Maps initialized');
                    setSdkLoaded(true);
                });
            } else {
                console.error('window.kakao.maps not available after script load');
                setSdkError('Kakao Maps 객체를 찾을 수 없습니다. API 키를 확인해주세요.');
            }
        };

        script.onerror = (e) => {
            console.error('Kakao Maps SDK load error:', e);
            setSdkError(`Kakao Maps SDK 로드 실패. 콘솔(F12)에서 상세 에러를 확인하세요. API 키: ${KAKAO_MAP_KEY ? '설정됨' : '없음'}`);
        };

        document.head.appendChild(script);

        return () => {
            // 스크립트는 제거하지 않음 (재사용을 위해)
        };
    }, [show]);

    // 지도 초기화
    useEffect(() => {
        if (!show || !sdkLoaded || !mapContainerRef.current) return;

        const kakao = window.kakao;

        const options = {
            center: new kakao.maps.LatLng(selectedPosition.lat, selectedPosition.lng),
            level: 3
        };

        const map = new kakao.maps.Map(mapContainerRef.current, options);
        mapRef.current = map;

        // 마커 생성
        const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(selectedPosition.lat, selectedPosition.lng),
            map: map
        });
        markerRef.current = marker;

        // 지도 클릭 이벤트
        kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
            const latlng = mouseEvent.latLng;
            const newLat = latlng.getLat();
            const newLng = latlng.getLng();

            marker.setPosition(latlng);
            setSelectedPosition({ lat: newLat, lng: newLng });
        });

        // 지도 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

        return () => {
            // 정리
        };
    }, [show, sdkLoaded]);

    // 초기 위치가 변경되면 업데이트
    useEffect(() => {
        if (initialLat && initialLng) {
            setSelectedPosition({ lat: initialLat, lng: initialLng });
        }
    }, [initialLat, initialLng]);

    const handleConfirm = () => {
        onSelect(selectedPosition.lat, selectedPosition.lng);
        onClose();
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                setSelectedPosition({ lat, lng });

                if (mapRef.current && markerRef.current && window.kakao) {
                    const newLatLng = new window.kakao.maps.LatLng(lat, lng);
                    mapRef.current.setCenter(newLatLng);
                    markerRef.current.setPosition(newLatLng);
                }
            },
            (error) => {
                alert('위치를 가져오는데 실패했습니다: ' + error.message);
            },
            { enableHighAccuracy: true }
        );
    };

    if (!show) return null;

    return (
        <div className="location-map-modal-bg">
            <div className="location-map-modal-card">
                <div className="location-map-modal-header">
                    <h3>{language === 'en' ? 'Select Location on Map' : '지도에서 위치 선택'}</h3>
                    <button className="location-map-modal-close-btn" onClick={onClose}>×</button>
                </div>

                {sdkError ? (
                    <div className="location-map-error">{sdkError}</div>
                ) : !sdkLoaded ? (
                    <div className="location-map-loading">
                        {language === 'en' ? 'Loading map...' : '지도 로딩 중...'}
                    </div>
                ) : (
                    <>
                        <div
                            ref={mapContainerRef}
                            className="location-map-container"
                        />
                        <div className="location-map-info">
                            <span>{language === 'en' ? 'Latitude' : '위도'}: {selectedPosition.lat.toFixed(6)}</span>
                            <span>{language === 'en' ? 'Longitude' : '경도'}: {selectedPosition.lng.toFixed(6)}</span>
                        </div>
                    </>
                )}

                <div className="location-map-modal-buttons">
                    <button
                        className="location-map-btn secondary"
                        onClick={handleCurrentLocation}
                        disabled={!sdkLoaded}
                    >
                        {language === 'en' ? 'My Location' : '내 위치'}
                    </button>
                    <button
                        className="location-map-btn primary"
                        onClick={handleConfirm}
                        disabled={!sdkLoaded}
                    >
                        {language === 'en' ? 'Confirm' : '확인'}
                    </button>
                    <button
                        className="location-map-btn"
                        onClick={onClose}
                    >
                        {language === 'en' ? 'Cancel' : '취소'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LocationMapModal;

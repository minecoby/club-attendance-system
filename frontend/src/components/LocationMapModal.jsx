import React, { useEffect, useRef, useState } from 'react';
import './LocationMapModal.css';

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

function LocationMapModal({ show, onClose, onSelect, initialLat, initialLng, language }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const placesRef = useRef(null);
    const [selectedPosition, setSelectedPosition] = useState({
        lat: initialLat || 37.5665,
        lng: initialLng || 126.9780
    });
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [sdkError, setSdkError] = useState(null);

    // 검색 관련 상태
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Kakao Maps SDK 동적 로드
    useEffect(() => {
        if (!show) return;

        if (window.kakao && window.kakao.maps) {
            setSdkLoaded(true);
            return;
        }

        if (!KAKAO_MAP_KEY) {
            setSdkError('Kakao Map API 키가 설정되지 않았습니다. .env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
            return;
        }

        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;
        script.async = true;

        script.onload = () => {
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                    setSdkLoaded(true);
                });
            } else {
                setSdkError('Kakao Maps 객체를 찾을 수 없습니다. API 키를 확인해주세요.');
            }
        };

        script.onerror = () => {
            setSdkError('Kakao Maps SDK 로드 실패. API 키를 확인해주세요.');
        };

        document.head.appendChild(script);
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

        // Places 서비스 초기화
        placesRef.current = new kakao.maps.services.Places();

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
            setShowResults(false);
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

    // 장소 검색
    const handleSearch = () => {
        if (!searchKeyword.trim() || !placesRef.current) return;

        setIsSearching(true);
        setShowResults(true);

        placesRef.current.keywordSearch(searchKeyword, (data, status) => {
            setIsSearching(false);

            if (status === window.kakao.maps.services.Status.OK) {
                setSearchResults(data.slice(0, 5)); // 최대 5개 결과
            } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                setSearchResults([]);
            } else {
                setSearchResults([]);
            }
        });
    };

    // 검색 결과 선택
    const handleSelectResult = (place) => {
        const lat = parseFloat(place.y);
        const lng = parseFloat(place.x);

        setSelectedPosition({ lat, lng });
        setSearchResults([]);
        setShowResults(false);
        setSearchKeyword(place.place_name);

        if (mapRef.current && markerRef.current && window.kakao) {
            const newLatLng = new window.kakao.maps.LatLng(lat, lng);
            mapRef.current.setCenter(newLatLng);
            markerRef.current.setPosition(newLatLng);
        }
    };

    // 엔터키로 검색
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

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
                        {/* 검색 영역 */}
                        <div className="location-map-search">
                            <div className="location-map-search-input-wrapper">
                                <input
                                    type="text"
                                    className="location-map-search-input"
                                    placeholder={language === 'en' ? 'Search location...' : '장소 검색...'}
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <button
                                    className="location-map-search-btn"
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                >
                                    {isSearching ? '...' : (language === 'en' ? 'Search' : '검색')}
                                </button>
                            </div>

                            {/* 검색 결과 */}
                            {showResults && (
                                <div className="location-map-search-results">
                                    {isSearching ? (
                                        <div className="location-map-search-loading">
                                            {language === 'en' ? 'Searching...' : '검색 중...'}
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((place, index) => (
                                            <div
                                                key={index}
                                                className="location-map-search-result-item"
                                                onClick={() => handleSelectResult(place)}
                                            >
                                                <div className="result-place-name">{place.place_name}</div>
                                                <div className="result-address">{place.address_name}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="location-map-search-no-result">
                                            {language === 'en' ? 'No results found' : '검색 결과가 없습니다'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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

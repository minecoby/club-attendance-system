/**
 * Geolocation API를 사용하여 현재 위치를 가져옵니다.
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('이 브라우저에서는 위치 서비스를 지원하지 않습니다.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('위치 권한이 거부되었습니다.'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('위치 정보를 사용할 수 없습니다.'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('위치 요청 시간이 초과되었습니다.'));
                        break;
                    default:
                        reject(new Error('위치를 가져오는 중 오류가 발생했습니다.'));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};

/**
 * 위치 권한 상태를 확인합니다.
 * @returns {Promise<string>} 'granted' | 'denied' | 'prompt' | 'unsupported'
 */
export const checkLocationPermission = async () => {
    if (!navigator.permissions) {
        return 'unsupported';
    }

    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
    } catch (error) {
        return 'unsupported';
    }
};

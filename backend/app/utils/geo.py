import math

EARTH_RADIUS_KM = 6371.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    두 좌표 사이의 거리를 계산합니다 (Haversine 공식).

    Args:
        lat1, lon1: 첫 번째 좌표 (위도, 경도)
        lat2, lon2: 두 번째 좌표 (위도, 경도)

    Returns:
        두 좌표 사이의 거리 (km)
    """
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def is_within_radius(
    user_lat: float,
    user_lon: float,
    target_lat: float,
    target_lon: float,
    radius_km: float
) -> bool:
    """
    사용자 위치가 목표 위치의 반경 내에 있는지 확인합니다.

    Args:
        user_lat, user_lon: 사용자 위치 (위도, 경도)
        target_lat, target_lon: 목표 위치 (위도, 경도)
        radius_km: 허용 반경 (km)

    Returns:
        반경 내 여부 (True/False)
    """
    distance = haversine_distance(user_lat, user_lon, target_lat, target_lon)
    return distance <= radius_km

import math
from typing import Tuple

EARTH_RADIUS_METERS = 6371000.0  # WGS84 mean earth radius in meters

# Bounding box for Bengaluru Metropolitan Area (approximate reference filter)
BENGALURU_BBOX = {
    "min_lat": 12.60,
    "max_lat": 13.45,
    "min_lng": 77.20,
    "max_lng": 77.95,
}

def is_valid_lat_lng(lat: float, lng: float) -> bool:
    """Validates physical WGS84 range."""
    return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0

def is_within_bengaluru_region(lat: float, lng: float) -> bool:
    """Checks whether coordinates lie within the broader Bengaluru urban region."""
    return (
        BENGALURU_BBOX["min_lat"] <= lat <= BENGALURU_BBOX["max_lat"]
        and BENGALURU_BBOX["min_lng"] <= lng <= BENGALURU_BBOX["max_lng"]
    )

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two points in meters using the Haversine formula.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c

def get_bounding_box(lat: float, lon: float, radius_meters: float) -> Tuple[float, float, float, float]:
    """
    Returns (min_lat, max_lat, min_lon, max_lon) for quick spatial pre-filtering before haversine.
    """
    lat_delta = (radius_meters / EARTH_RADIUS_METERS) * (180.0 / math.pi)
    # Adjust for latitude cosine
    cos_lat = math.cos(math.radians(lat))
    if cos_lat == 0:
        lon_delta = 180.0
    else:
        lon_delta = (radius_meters / (EARTH_RADIUS_METERS * abs(cos_lat))) * (180.0 / math.pi)

    return (
        lat - lat_delta,
        lat + lat_delta,
        lon - lon_delta,
        lon + lon_delta,
    )


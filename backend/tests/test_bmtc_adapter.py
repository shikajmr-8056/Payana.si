import pytest
from app.data.bmtc_adapter import BMTCAdapter
from app.schemas.common import DataStatus, TransportMode

def test_bmtc_load_real_data(data_dir):
    adapter = BMTCAdapter(data_dir)
    adapter.load_data()

    assert adapter.is_loaded is True
    assert len(adapter.stops) > 8000, f"Expected >8000 stops, got {len(adapter.stops)}"
    assert len(adapter.routes) > 2000, f"Expected >2000 services, got {len(adapter.routes)}"

def test_bmtc_stop_search(data_dir):
    adapter = BMTCAdapter(data_dir)
    adapter.load_data()

    results = adapter.search_stops("Banashankari", limit=10)
    assert len(results) > 0
    assert any("Banashankari" in s.name for s in results)
    for s in results:
        assert s.mode == TransportMode.BUS
        assert s.data_status == DataStatus.STATIC

def test_bmtc_nearby_stops(data_dir):
    adapter = BMTCAdapter(data_dir)
    adapter.load_data()

    # Coordinates near Majestic / Kempegowda Bus Station (approx 12.977, 77.571)
    nearby = adapter.find_nearby_stops(lat=12.9778, lng=77.5713, radius_meters=800.0, limit=10)
    assert len(nearby) > 0
    for stop in nearby:
        assert stop.distance_meters is not None
        assert stop.distance_meters <= 800.0

def test_bmtc_invalid_coordinates(data_dir):
    adapter = BMTCAdapter(data_dir)
    adapter.load_data()

    # Invalid latitude 999.0
    res = adapter.find_nearby_stops(lat=999.0, lng=77.5, radius_meters=1000.0)
    assert res == []


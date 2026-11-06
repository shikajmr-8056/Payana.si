import pytest
from app.schemas.common import DataStatus, TransportMode

def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["data_loaded"] is True
    assert data["bmtc_stops_count"] > 8000
    assert data["metro_stations_count"] >= 80

def test_transit_catalog_endpoint(client):
    res = client.get("/transit/catalog")
    assert res.status_code == 200
    data = res.json()
    assert data["total_sources"] >= 5
    assert len(data["sources"]) >= 5
    # Verify no fabricated data
    for src in data["sources"]:
        assert src["data_status"] in ["STATIC", "SCHEDULED", "LIVE", "PREDICTED", "UNAVAILABLE"]

def test_stops_search_endpoint(client):
    res = client.get("/transit/stops/search?q=Kengeri")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0
    assert any("Kengeri" in s["name"] for s in data["results"])

def test_stops_nearby_endpoint(client):
    # Majestic coordinates
    res = client.get("/transit/stops/nearby?lat=12.9778&lng=77.5713&radius_meters=1000")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0
    stops = data["stops"]
    assert len(stops) > 0
    # Stops should be ordered by distance
    distances = [s["distance_meters"] for s in stops if s["distance_meters"] is not None]
    assert distances == sorted(distances)

def test_routes_list_endpoint(client):
    res = client.get("/transit/routes?q=510")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0
    route = data["routes"][0]
    assert "510" in route["short_name"]
    assert len(route["patterns"]) > 0

def test_invalid_nearby_coordinates(client):
    res = client.get("/transit/stops/nearby?lat=999&lng=77.5")
    assert res.status_code == 422 # Pydantic lat range validation


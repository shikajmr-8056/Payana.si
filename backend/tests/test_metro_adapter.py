import pytest
from app.data.metro_adapter import MetroAdapter
from app.schemas.common import DataStatus, TransportMode

def test_metro_load_rail_data(data_dir):
    adapter = MetroAdapter(data_dir)
    adapter.load_data()

    assert adapter.is_loaded is True
    assert len(adapter.stations) >= 80, f"Expected >=80 stations, got {len(adapter.stations)}"
    assert len(adapter.routes) >= 2, f"Expected at least Purple and Green lines"

def test_metro_station_interchanges(data_dir):
    adapter = MetroAdapter(data_dir)
    adapter.load_data()

    # Find Majestic station
    majestic_matches = adapter.search_stations("Majestic")
    assert len(majestic_matches) > 0
    majestic = majestic_matches[0]
    assert "Purple Line" in majestic.lines
    assert "Green Line" in majestic.lines

def test_metro_fare_calculation(data_dir):
    adapter = MetroAdapter(data_dir)
    # 1.5 km should be 10
    assert adapter.calculate_metro_fare(1500) == 10
    # 5 km should be 20
    assert adapter.calculate_metro_fare(5000) == 20
    # 25 km should be 60
    assert adapter.calculate_metro_fare(25000) == 60


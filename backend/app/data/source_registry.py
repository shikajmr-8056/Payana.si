from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict
import os

from ..schemas.common import DataStatus
from ..schemas.sources import DataSourceDetail, DataCatalogResponse

def get_data_sources_registry(data_dir: Path) -> List[DataSourceDetail]:
    """
    Returns registered datasets with verified provenance, disk status, and truth-in-advertising caveats.
    """
    sources: List[DataSourceDetail] = []
    
    # 1. BMTC Stops
    stops_file = data_dir / "stops.min.json"
    stops_size = stops_file.stat().st_size if stops_file.exists() else 0
    stops_mtime = (
        datetime.fromtimestamp(stops_file.stat().st_mtime, tz=timezone.utc).isoformat()
        if stops_file.exists() else "Unknown"
    )
    sources.append(
        DataSourceDetail(
            id="bmtc-stops-static",
            name="BMTC Bus Stops Catalog",
            provider="Bengaluru Metropolitan Transport Corporation / TransitRouter (Vonter)",
            source_url="https://github.com/Vonter/transitrouter",
            format="JSON [lng, lat, name, direction, landmrk]",
            local_path="public/data/transit/stops.min.json",
            license="Open Database License (ODbL)",
            data_status=DataStatus.STATIC,
            coverage_scope="Bengaluru Urban and Rural BMTC service zones",
            record_count=8812 if stops_file.exists() else 0,
            file_size_bytes=stops_size,
            last_updated=stops_mtime,
            known_limitations=[
                "Static stop positions; does not verify temporary stop relocations or roadwork diversions.",
                "Coordinates are WGS84 approximations for physical bus shelters or pole flags."
            ]
        )
    )

    # 2. BMTC Services
    services_file = data_dir / "services.min.json"
    services_size = services_file.stat().st_size if services_file.exists() else 0
    services_mtime = (
        datetime.fromtimestamp(services_file.stat().st_mtime, tz=timezone.utc).isoformat()
        if services_file.exists() else "Unknown"
    )
    sources.append(
        DataSourceDetail(
            id="bmtc-services-patterns",
            name="BMTC Bus Service Patterns & Stop Sequences",
            provider="BMTC / TransitRouter",
            source_url="https://github.com/Vonter/transitrouter",
            format="JSON {service_id: {name, direction_stop_ids}}",
            local_path="public/data/transit/services.min.json",
            license="Open Database License (ODbL)",
            data_status=DataStatus.STATIC,
            coverage_scope="2,487 BMTC ordinary, Vajra, and feeder routes",
            record_count=2487 if services_file.exists() else 0,
            file_size_bytes=services_size,
            last_updated=services_mtime,
            known_limitations=[
                "Represents scheduled stop sequences; occasional peak-hour short-loop runs may differ.",
                "Direction IDs correspond to outward and return patterns."
            ]
        )
    )

    # 3. BMTC First/Last Bus Timings
    fl_file = data_dir / "firstlast.min.json"
    fl_size = fl_file.stat().st_size if fl_file.exists() else 0
    fl_mtime = (
        datetime.fromtimestamp(fl_file.stat().st_mtime, tz=timezone.utc).isoformat()
        if fl_file.exists() else "Unknown"
    )
    sources.append(
        DataSourceDetail(
            id="bmtc-firstlast-schedules",
            name="BMTC First & Last Bus Operating Intervals",
            provider="BMTC Scheduled Timetable Feed",
            source_url="https://github.com/Vonter/transitrouter",
            format="JSON {stop_id: [route_first_last_strings]}",
            local_path="public/data/transit/firstlast.min.json",
            license="Open Database License (ODbL)",
            data_status=DataStatus.SCHEDULED,
            coverage_scope="Operating windows across 8,812 stops",
            record_count=8812 if fl_file.exists() else 0,
            file_size_bytes=fl_size,
            last_updated=fl_mtime,
            known_limitations=[
                "Scheduled nominal departure times only; not live vehicle GPS arrival timestamps.",
                "Does not reflect traffic jams, mechanical breakdowns, or trip cancellations."
            ]
        )
    )

    # 4. Namma Metro Rail GeoJSON
    rail_file = data_dir / "rail.json"
    rail_size = rail_file.stat().st_size if rail_file.exists() else 0
    rail_mtime = (
        datetime.fromtimestamp(rail_file.stat().st_mtime, tz=timezone.utc).isoformat()
        if rail_file.exists() else "Unknown"
    )
    sources.append(
        DataSourceDetail(
            id="bmrcl-namma-metro-network",
            name="Namma Metro Stations & Corridors",
            provider="BMRCL (Bangalore Metro Rail Corp Ltd) / OpenStreetMap transit community",
            source_url="https://github.com/Vonter/bmrcl-gtfs",
            format="GeoJSON FeatureCollection (Point stations & LineString alignments)",
            local_path="public/data/transit/rail.json",
            license="ODbL & CC-BY-SA",
            data_status=DataStatus.STATIC,
            coverage_scope="Purple Line (Challaghatta - Whitefield), Green Line (Madavara - Silk Institute), Yellow Line (RV Road - Bommasandra)",
            record_count=83 if rail_file.exists() else 0,
            file_size_bytes=rail_size,
            last_updated=rail_mtime,
            known_limitations=[
                "Contains station locations and line alignments; does not include sub-second dwell times.",
                "Yellow line is represented for infrastructure preview; operations undergo phased rollouts.",
                "Fares follow official BMRCL distance slab rules (Rs 10 to Rs 60 standard card/token)."
            ]
        )
    )

    # 5. Candidate Metro GTFS Feed
    sources.append(
        DataSourceDetail(
            id="bmrcl-gtfs-candidate",
            name="Candidate Namma Metro GTFS Timetable Feed",
            provider="Vonter/bmrcl-gtfs (Unofficial Community Specification)",
            source_url="https://github.com/Vonter/bmrcl-gtfs",
            format="GTFS ZIP (routes.txt, trips.txt, stop_times.txt, stops.txt, calendar.txt)",
            local_path=None,
            license="MIT (code) / Open Database License (data)",
            data_status=DataStatus.SCHEDULED,
            coverage_scope="Namma Metro network published timetables",
            record_count=None,
            file_size_bytes=None,
            last_updated="Evaluated 2026",
            known_limitations=[
                "Intermediate station timings in stop_times.txt are mathematically approximated from terminal departures and average line speeds.",
                "Does not stream live train GPS or signal interlocking status.",
                "Short-loop or holiday special schedules are omitted in base feed."
            ]
        )
    )

    # 6. BMTC Live Vehicle Tracking
    sources.append(
        DataSourceDetail(
            id="bmtc-live-gtfs-rt",
            name="BMTC Live Vehicle Telemetry (GTFS-RT)",
            provider="BMTC Intelligent Transport System (ITS)",
            source_url="https://bmtc.karnataka.gov.in",
            format="GTFS-Realtime Protocol Buffers (VehiclePositions / TripUpdates)",
            local_path=None,
            license="Restricted / Government Authorized API",
            data_status=DataStatus.UNAVAILABLE,
            coverage_scope="Active bus fleet GPS coordinates",
            record_count=0,
            file_size_bytes=0,
            last_updated="Not connected",
            known_limitations=[
                "No open unauthenticated live GTFS-RT feed is published.",
                "Live positions in frontend currently run in simulation / preview mode."
            ]
        )
    )

    # 7. Passenger Occupancy & Crowding
    sources.append(
        DataSourceDetail(
            id="transit-passenger-occupancy",
            name="Transit Passenger Density & Seat Availability Telemetry",
            provider="Automated Passenger Counters (APC) / Ticketing Validator Sensors",
            source_url=None,
            format="Live Sensor Telemetry",
            local_path=None,
            license="Not Available",
            data_status=DataStatus.UNAVAILABLE,
            coverage_scope="Vehicle internal passenger counts",
            record_count=0,
            file_size_bytes=0,
            last_updated="Not connected",
            known_limitations=[
                "Seat occupancy data is strictly flagged as UNKNOWN.",
                "Zero fabrication rule: No synthetic crowd numbers are presented as live sensor reality."
            ]
        )
    )

    return sources


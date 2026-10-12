"""Bounded climate telemetry for the UNO/DHT22 adapter. No I/O on import."""
from dataclasses import dataclass
import math
import re


@dataclass(frozen=True)
class ClimateSample:
    sequence: int
    temperature_c: float
    relative_humidity_air: float


def parse_climate(line: bytes) -> ClimateSample:
    if not isinstance(line, bytes) or len(line) > 96:
        raise ValueError("Invalid frame size")
    try:
        text = line.decode("ascii").rstrip("\r\n")
    except UnicodeDecodeError as error:
        raise ValueError("Invalid frame encoding") from error
    parts = text.split(",")
    if len(parts) != 5 or parts[:2] != ["VC1", "CLIMA"]:
        raise ValueError("Unexpected protocol frame")
    if not re.fullmatch(r"[1-9][0-9]{0,9}", parts[2]):
        raise ValueError("Invalid sequence")
    sequence = int(parts[2])
    if sequence > 0xFFFFFFFF:
        raise ValueError("Sequence outside UNO counter range")
    for value in parts[3:]:
        if not re.fullmatch(r"-?[0-9]{1,3}(?:\.[0-9]{1,2})?", value):
            raise ValueError("Invalid numeric payload")
    temperature, humidity = map(float, parts[3:])
    if not math.isfinite(temperature) or not -40 <= temperature <= 80:
        raise ValueError("Temperature outside DHT22 range")
    if not math.isfinite(humidity) or not 0 <= humidity <= 100:
        raise ValueError("Air humidity outside DHT22 range")
    return ClimateSample(sequence, temperature, humidity)

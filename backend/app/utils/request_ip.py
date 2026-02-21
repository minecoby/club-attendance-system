from ipaddress import ip_address
from typing import Optional

from fastapi import Request


def _normalize_ip(raw_value: str) -> Optional[str]:
    if not raw_value:
        return None

    value = raw_value.strip().strip('"').strip("'")
    if not value or value.lower() == "unknown":
        return None

    if value.startswith("for="):
        value = value[4:].strip()

    if value.startswith("[") and "]" in value:
        value = value[1:value.index("]")]
    elif "." in value and ":" in value:
        host, _, port = value.rpartition(":")
        if port.isdigit():
            value = host

    try:
        ip_address(value)
        return value
    except ValueError:
        return None


def get_client_ip(request: Request) -> Optional[str]:
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        for candidate in x_forwarded_for.split(","):
            parsed = _normalize_ip(candidate)
            if parsed:
                return parsed

    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        parsed = _normalize_ip(x_real_ip)
        if parsed:
            return parsed

    forwarded = request.headers.get("forwarded")
    if forwarded:
        for segment in forwarded.split(","):
            for part in segment.split(";"):
                parsed = _normalize_ip(part.strip())
                if parsed:
                    return parsed

    if request.client and request.client.host:
        parsed = _normalize_ip(request.client.host)
        if parsed:
            return parsed
        return request.client.host

    return None

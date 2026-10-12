"""UNO climate gateway: durable queue, explicit endpoint, no serial I/O on import."""
from datetime import datetime, timezone
import json
import hashlib
import os
from pathlib import Path
import re
import sqlite3
import threading
import urllib.error
import urllib.parse
import urllib.request
import uuid

from serial_protocol import ClimateSample, parse_climate


def payload_for(sample: ClimateSample, captured_at=None):
    stamp = captured_at or datetime.now(timezone.utc)
    if stamp.tzinfo is None or stamp.utcoffset().total_seconds() != 0:
        raise ValueError("Capture time must be UTC")
    return {
        "lectura_uuid": str(uuid.uuid4()), "secuencia_uno": sample.sequence,
        "capturada_en": stamp.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "temperatura_c": sample.temperature_c, "humedad_aire_pct": sample.relative_humidity_air,
    }


class QueueFull(Exception):
    pass


class DurableQueue:
    def __init__(self, path, limit=2000, identity=None):
        self.connection = sqlite3.connect(path, check_same_thread=False)
        self.connection.execute("PRAGMA journal_mode=DELETE")
        self.connection.execute("PRAGMA synchronous=FULL")
        self.connection.execute("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,payload TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('queued','rejected')),reason TEXT)")
        self.connection.execute("CREATE TABLE IF NOT EXISTS device_binding (binding TEXT NOT NULL)")
        bound = self.connection.execute("SELECT binding FROM device_binding LIMIT 1").fetchone()
        if bound and bound[0] != identity:
            self.connection.close()
            raise ValueError("Queue belongs to another endpoint or credential; use a separate queue")
        if identity is not None and bound is None:
            if self.connection.execute("SELECT 1 FROM messages LIMIT 1").fetchone():
                self.connection.close()
                raise ValueError("Cannot assign an existing unbound queue to a device")
            self.connection.execute("INSERT INTO device_binding(binding) VALUES (?)", (identity,))
        self.connection.commit()
        self.limit = limit
        self.lock = threading.Lock()

    def enqueue(self, payload):
        encoded = json.dumps(payload, allow_nan=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > 1024:
            raise ValueError("Payload too large")
        with self.lock, self.connection:
            self.connection.execute("BEGIN IMMEDIATE")
            count = self.connection.execute("SELECT COUNT(*) FROM messages WHERE status='queued'").fetchone()[0]
            if count >= self.limit:
                raise QueueFull("Queue full; stop acquisition rather than overwrite unsent readings")
            self.connection.execute("INSERT INTO messages(id,payload,status) VALUES (?,?,'queued')", (payload["lectura_uuid"], encoded))

    def next(self):
        with self.lock:
            row = self.connection.execute("SELECT payload FROM messages WHERE status='queued' ORDER BY rowid LIMIT 1").fetchone()
            return json.loads(row[0]) if row else None

    def acknowledge(self, identity):
        with self.lock, self.connection:
            self.connection.execute("DELETE FROM messages WHERE id=? AND status='queued'", (identity,))

    def reject(self, identity, reason):
        with self.lock, self.connection:
            self.connection.execute("UPDATE messages SET status='rejected',reason=? WHERE id=?", (reason, identity))
            self.connection.execute("DELETE FROM messages WHERE status='rejected' AND rowid NOT IN (SELECT rowid FROM messages WHERE status='rejected' ORDER BY rowid DESC LIMIT 100)")

    def close(self):
        with self.lock:
            self.connection.close()


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def endpoint(base, allow_local_http=False):
    url = urllib.parse.urlsplit(base)
    if url.username or url.password or url.query or url.fragment or not url.hostname or url.path.rstrip("/") != "/api":
        raise ValueError("Expected explicit API origin and /api path, without credentials")
    if url.scheme != "https":
        if not (allow_local_http and url.scheme == "http" and url.hostname in ("127.0.0.1", "::1")):
            raise ValueError("HTTPS is required; HTTP is only allowed explicitly on loopback")
    if url.port is not None and not 1 <= url.port <= 65535:
        raise ValueError("Invalid endpoint port")
    return base.rstrip("/") + "/iot/lecturas"


class Transport:
    def __init__(self, base, token, allow_local_http=False):
        if not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
            raise ValueError("Invalid gateway credential format")
        self.url = endpoint(base, allow_local_http)
        self.token = token
        # No inherited proxy settings and no forwarding credentials through redirects.
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirects())

    def send(self, payload):
        request = urllib.request.Request(self.url, method="POST", data=json.dumps(payload, allow_nan=False).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + self.token})
        with self.opener.open(request, timeout=10) as response:
            if response.status not in (200,201):
                raise ValueError("Reading not synchronously confirmed")
            data = response.read(4097)
            if len(data) > 4096:
                raise ValueError("Response too large")
            result = json.loads(data)
            if not isinstance(result,dict) or result.get("ok") is not True or result.get("lectura_uuid") != payload["lectura_uuid"]:
                raise ValueError("Unconfirmed reading identity")


def upload_one(queue, transport):
    payload = queue.next()
    if payload is None:
        return "empty"
    try:
        transport.send(payload)
    except urllib.error.HTTPError as error:
        if error.code in (400, 409):
            queue.reject(payload["lectura_uuid"], "HTTP_" + str(error.code))
            return "rejected"
        return "retry"  # Includes revoked credentials and rate limits; preserves the queue.
    except (OSError, ValueError, urllib.error.URLError):
        return "retry"
    queue.acknowledge(payload["lectura_uuid"])
    return "sent"


def main():
    import serial  # Existing pyserial is required only for actual acquisition.
    transport = Transport(os.environ["VINO_API_BASE"], os.environ["VINO_GATEWAY_TOKEN"], os.environ.get("VINO_ALLOW_LOCAL_HTTP") == "1")
    path = Path(os.environ["VINO_QUEUE_PATH"])
    if not path.is_absolute():
        raise ValueError("Queue path must be absolute")
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    identity = hashlib.sha256((transport.url + "\0" + transport.token).encode("utf-8")).hexdigest()
    queue = DurableQueue(path, identity=identity)
    stop = threading.Event()

    def uploader():
        while not stop.is_set():
            try:
                status = upload_one(queue, transport)
            except sqlite3.Error:
                print("Error local de la cola; adquisición detenida.", flush=True)
                stop.set()
                return
            if status in ("retry", "rejected"):
                print("Envío no confirmado. Revisa conectividad, credencial o fecha; no se muestran secretos.", flush=True)
            stop.wait(5 if status in ("empty", "retry") else 0.05)

    port = serial.Serial()
    port.port = os.environ["VINO_SERIAL_PORT"]
    port.baudrate = 9600
    port.timeout = 1
    port.dtr = False
    port.rts = False
    worker = threading.Thread(target=uploader, daemon=True)
    try:
        port.open()
        worker.start()
        last_sequence = 0
        while not stop.is_set():
            frame = port.readline(97)
            if frame.rstrip(b"\r\n") == b"VC1,READY,UNO,DHT22":
                last_sequence = 0
                continue
            try:
                sample = parse_climate(frame)
            except ValueError:
                continue
            if sample.sequence <= last_sequence:
                continue
            queue.enqueue(payload_for(sample))
            last_sequence = sample.sequence
    except (KeyboardInterrupt, QueueFull, serial.SerialException, sqlite3.Error):
        print("Adquisición detenida. La cola conserva las lecturas pendientes.", flush=True)
    finally:
        stop.set()
        if port.is_open:
            port.close()
        if worker.is_alive():
            worker.join(12)
        if not worker.is_alive():
            queue.close()


if __name__ == "__main__":
    try:
        main()
    except (KeyError, ValueError, ImportError, OSError, sqlite3.Error):
        print("Gateway no iniciado: verifica configuración, pyserial y permisos sin compartir credenciales.", flush=True)
        raise SystemExit(1)

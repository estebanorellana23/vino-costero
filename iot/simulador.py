"""Simulador de sensores para demostraciones.

Envia lecturas de temperatura, humedad del aire y humedad del suelo a la API por la misma
puerta que usa un gateway real, pero marcadas siempre como origen "simulado". No hace falta
ningun equipo fisico. No sustituye mediciones reales ni demuestra el control de riego.

Variables de entorno (las mismas que gateway.py):
  VINO_API_BASE          https://dominio/api  (http://127.0.0.1:PUERTO/api solo con VINO_ALLOW_LOCAL_HTTP=1)
  VINO_GATEWAY_TOKEN     credencial del gateway, mostrada una sola vez al registrarlo en la pantalla Clima
  VINO_ALLOW_LOCAL_HTTP  1 para permitir HTTP en loopback
"""
import argparse
import math
import os
import random
import sys
import time
import urllib.error
import uuid
from datetime import datetime, timedelta, timezone

from gateway import Transport

MAX_HISTORIAL_MIN = 23 * 60  # la API solo acepta capturas de las ultimas 24 horas


class Modelo:
    """Genera lecturas plausibles: ciclo diario de temperatura, aire inverso y un suelo que se
    seca de a poco y se recupera cuando una "lluvia o riego" simulado lo moja."""

    def __init__(self, semilla=None, desfase_horas=0.0):
        self.rng = random.Random(semilla)
        self.desfase = desfase_horas
        self.suelo = 38.0

    def lectura(self, cuando):
        hora = (cuando.hour + cuando.minute / 60 + self.desfase) % 24
        temperatura = 18 + 7 * math.sin(2 * math.pi * (hora - 9) / 24) + self.rng.gauss(0, 0.4)
        aire = min(98.0, max(25.0, 78 - 1.9 * (temperatura - 18) + self.rng.gauss(0, 1.5)))
        self.suelo -= 0.12 + 0.02 * max(0.0, temperatura - 15) + abs(self.rng.gauss(0, 0.05))
        if self.suelo < 24:
            self.suelo += self.rng.uniform(14, 20)
        self.suelo = min(60.0, max(8.0, self.suelo))
        return round(temperatura, 2), round(aire, 2), round(self.suelo, 2)


def payload(modelo, secuencia, cuando):
    if cuando.tzinfo is None:
        raise ValueError("La fecha debe incluir zona horaria")
    temperatura, aire, suelo = modelo.lectura(cuando)
    return {
        "lectura_uuid": str(uuid.uuid4()),
        "secuencia_uno": secuencia,
        "capturada_en": cuando.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "temperatura_c": temperatura,
        "humedad_aire_pct": aire,
        "humedad_suelo_pct": suelo,
        "origen": "simulado",
    }


def historial(modelo, cantidad, paso_min, ahora):
    """Lecturas pasadas en orden cronologico, la ultima en 'ahora'."""
    if cantidad < 1 or paso_min < 1 or (cantidad - 1) * paso_min > MAX_HISTORIAL_MIN:
        raise ValueError("El historial debe caber en las ultimas 23 horas")
    inicio = ahora - timedelta(minutes=paso_min * (cantidad - 1))
    return [payload(modelo, i + 1, inicio + timedelta(minutes=paso_min * i)) for i in range(cantidad)]


def main(argv=None):
    ap = argparse.ArgumentParser(description="Simulador de sensores (datos marcados como simulados)")
    ap.add_argument("--intervalo", type=float, default=10, help="segundos entre lecturas en vivo (minimo 1)")
    ap.add_argument("--cantidad", type=int, default=0, help="lecturas en vivo a enviar; 0 = hasta Ctrl+C")
    ap.add_argument("--historial", type=int, default=0, help="lecturas pasadas a cargar antes de empezar")
    ap.add_argument("--paso-historial", type=int, default=10, help="minutos entre lecturas del historial")
    ap.add_argument("--semilla", type=int, default=None, help="semilla para resultados repetibles")
    args = ap.parse_args(argv)
    if args.intervalo < 1 or args.cantidad < 0 or args.historial < 0:
        ap.error("intervalo >= 1; cantidad e historial >= 0")

    transport = Transport(os.environ["VINO_API_BASE"], os.environ["VINO_GATEWAY_TOKEN"],
                          os.environ.get("VINO_ALLOW_LOCAL_HTTP") == "1")
    desfase = (datetime.now().astimezone().utcoffset() or timedelta(0)).total_seconds() / 3600
    modelo = Modelo(args.semilla, desfase)
    ahora = datetime.now(timezone.utc)
    pendientes = historial(modelo, args.historial, args.paso_historial, ahora) if args.historial else []
    enviadas = fallos = 0
    secuencia = len(pendientes)

    def enviar(carga):
        nonlocal enviadas, fallos
        try:
            transport.send(carga)
            enviadas += 1
            fallos = 0
            print(f"[{carga['capturada_en']}] aire {carga['temperatura_c']} C / {carga['humedad_aire_pct']} %"
                  f" · suelo {carga['humedad_suelo_pct']} % · simulado", flush=True)
        except urllib.error.HTTPError as error:
            fallos += 1
            print(f"La API rechazo la lectura (HTTP {error.code}). Revisa credencial, parcela activa y hora.", flush=True)
        except (OSError, ValueError, urllib.error.URLError):
            fallos += 1
            print("No se pudo confirmar el envio. Revisa conectividad y VINO_API_BASE.", flush=True)
        if fallos >= 5:
            print("Demasiados fallos seguidos; se detiene el simulador.", flush=True)
            sys.exit(1)

    for carga in pendientes:
        enviar(carga)
        time.sleep(0.6)  # la API limita a 120 lecturas por minuto
    try:
        restantes = args.cantidad
        while args.cantidad == 0 or restantes > 0:
            secuencia += 1
            enviar(payload(modelo, secuencia, datetime.now(timezone.utc)))
            restantes -= 1
            if args.cantidad == 0 or restantes > 0:
                time.sleep(args.intervalo)
    except KeyboardInterrupt:
        pass
    print(f"Listo: {enviadas} lecturas simuladas confirmadas.", flush=True)


if __name__ == "__main__":
    main()

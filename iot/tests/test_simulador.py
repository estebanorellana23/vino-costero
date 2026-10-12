from datetime import datetime, timedelta, timezone
import re
import unittest

from simulador import Modelo, historial, payload

UUID4 = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
STAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")
AHORA = datetime(2026, 10, 11, 18, 0, tzinfo=timezone.utc)


class SimuladorTests(unittest.TestCase):
    def test_payload_has_exact_fields_and_is_always_marked_as_simulated(self):
        carga = payload(Modelo(1), 1, AHORA)
        self.assertEqual(set(carga), {"lectura_uuid", "secuencia_uno", "capturada_en", "temperatura_c",
                                      "humedad_aire_pct", "humedad_suelo_pct", "origen"})
        self.assertEqual(carga["origen"], "simulado")
        self.assertRegex(carga["lectura_uuid"], UUID4)
        self.assertRegex(carga["capturada_en"], STAMP)
        with self.assertRaises(ValueError):
            payload(Modelo(1), 1, datetime(2026, 10, 11))

    def test_values_stay_in_api_ranges_with_at_most_two_decimals(self):
        modelo = Modelo(7)
        for i in range(2000):
            carga = payload(modelo, i + 1, AHORA + timedelta(minutes=10 * i))
            self.assertTrue(-40 <= carga["temperatura_c"] <= 80)
            self.assertTrue(0 <= carga["humedad_aire_pct"] <= 100)
            self.assertTrue(0 <= carga["humedad_suelo_pct"] <= 100)
            for clave in ("temperatura_c", "humedad_aire_pct", "humedad_suelo_pct"):
                self.assertAlmostEqual(carga[clave] * 100, round(carga[clave] * 100), places=6)

    def test_soil_dries_slowly_and_is_recovered_by_simulated_watering(self):
        modelo = Modelo(3)
        valores = [payload(modelo, i + 1, AHORA + timedelta(minutes=10 * i))["humedad_suelo_pct"] for i in range(600)]
        bajadas = sum(1 for a, b in zip(valores, valores[1:]) if b < a)
        subidas = sum(1 for a, b in zip(valores, valores[1:]) if b > a + 5)
        self.assertGreater(bajadas, 400)
        self.assertGreaterEqual(subidas, 2)
        self.assertGreaterEqual(min(valores), 8)

    def test_same_seed_repeats_values_and_different_seeds_differ(self):
        def serie(semilla):
            m = Modelo(semilla)
            return [(c["temperatura_c"], c["humedad_suelo_pct"]) for c in (payload(m, i + 1, AHORA) for i in range(20))]
        self.assertEqual(serie(5), serie(5))
        self.assertNotEqual(serie(5), serie(6))

    def test_history_is_chronological_ends_now_and_stays_inside_the_accepted_window(self):
        cargas = historial(Modelo(2), 12, 10, AHORA)
        fechas = [c["capturada_en"] for c in cargas]
        self.assertEqual(fechas, sorted(fechas))
        self.assertEqual(fechas[-1], "2026-10-11T18:00:00.000Z")
        self.assertEqual(len({c["lectura_uuid"] for c in cargas}), 12)
        for malo in [(0, 10), (5, 0), (200, 10)]:
            with self.assertRaises(ValueError):
                historial(Modelo(2), malo[0], malo[1], AHORA)


if __name__ == "__main__":
    unittest.main()

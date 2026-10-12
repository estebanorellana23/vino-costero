from datetime import datetime, timezone
import tempfile
import unittest
import urllib.error
from gateway import DurableQueue, QueueFull, endpoint, payload_for, upload_one, NoRedirects, Transport
import json
from serial_protocol import parse_climate


class GatewayTests(unittest.TestCase):
    def test_payload_names_air_humidity_and_has_persistent_uuid(self):
        sample = parse_climate(b"VC1,CLIMA,1,27.70,68.90")
        result = payload_for(sample, datetime(2026, 10, 11, 12, 0, tzinfo=timezone.utc))
        self.assertEqual(result["humedad_aire_pct"], 68.9)
        self.assertEqual(result["capturada_en"], "2026-10-11T12:00:00.000Z")
        self.assertNotIn("humedad_suelo", result)
        with self.assertRaises(ValueError):
            payload_for(sample, datetime(2026, 10, 11))

    def test_endpoint_rejects_credentials_remote_http_and_query(self):
        self.assertEqual(endpoint("https://fixture.example/api"), "https://fixture.example/api/iot/lecturas")
        self.assertEqual(endpoint("http://127.0.0.1:4000/api", True), "http://127.0.0.1:4000/api/iot/lecturas")
        for value in ["http://fixture.example/api", "https://user:password@fixture.example/api", "https://fixture.example/api?token=test", "https://fixture.example/not-api"]:
            with self.assertRaises(ValueError):
                endpoint(value, True)
        self.assertIsNone(NoRedirects().redirect_request(None, None, 307, "Redirect", {}, "https://other.example/"))

    def test_retry_reopen_and_ack_use_the_same_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            path = directory + "/queue.sqlite"
            queue = DurableQueue(path, limit=1)
            payload = payload_for(parse_climate(b"VC1,CLIMA,1,27.70,68.90"))
            queue.enqueue(payload)
            with self.assertRaises(QueueFull):
                queue.enqueue(payload_for(parse_climate(b"VC1,CLIMA,2,27.71,68.91")))
            class Broken:
                def send(self, _payload):
                    raise OSError("fixture disconnected")
            self.assertEqual(upload_one(queue, Broken()), "retry")
            queue.close()
            queue = DurableQueue(path)
            self.assertEqual(queue.next(), payload)
            observed = []
            class Accepted:
                def send(self, value):
                    observed.append(value["lectura_uuid"])
            self.assertEqual(upload_one(queue, Accepted()), "sent")
            self.assertEqual(observed, [payload["lectura_uuid"]])
            self.assertIsNone(queue.next())
            queue.close()

    def test_permanent_rejection_does_not_block_the_next_reading(self):
        with tempfile.TemporaryDirectory() as directory:
            queue = DurableQueue(directory + "/queue.sqlite")
            first = payload_for(parse_climate(b"VC1,CLIMA,1,27.70,68.90"))
            second = payload_for(parse_climate(b"VC1,CLIMA,2,27.71,68.91"))
            queue.enqueue(first)
            queue.enqueue(second)
            class Rejected:
                def send(self, _payload):
                    raise urllib.error.HTTPError("https://fixture.example", 400, "fixture", {}, None)
            self.assertEqual(upload_one(queue, Rejected()), "rejected")
            self.assertEqual(queue.next(), second)
            queue.close()

    def test_queue_cannot_silently_move_to_another_gateway(self):
        with tempfile.TemporaryDirectory() as directory:
            path=directory + '/queue.sqlite'
            queue=DurableQueue(path,identity='fixture-device-a')
            payload=payload_for(parse_climate(b'VC1,CLIMA,1,27.70,68.90'))
            queue.enqueue(payload)
            queue.close()
            with self.assertRaises(ValueError):
                DurableQueue(path,identity='fixture-device-b')
            queue=DurableQueue(path,identity='fixture-device-a')
            self.assertEqual(queue.next(),payload)
            queue.close()

    def test_transport_requires_confirmation_of_the_same_reading(self):
        with tempfile.TemporaryDirectory() as directory:
            queue=DurableQueue(directory + '/queue.sqlite')
            payload=payload_for(parse_climate(b'VC1,CLIMA,1,27.70,68.90'))
            queue.enqueue(payload)
            transport=Transport('https://fixture.example/api','x'*43)
            class Response:
                status=200
                def __init__(self,result):self.result=result
                def __enter__(self):return self
                def __exit__(self,*args):return False
                def read(self,_size):return json.dumps(self.result).encode('utf-8')
            class Opener:
                def __init__(self,result):self.result=result
                def open(self,_request,timeout):return Response(self.result)
            for bad in [[],{'ok':True,'lectura_uuid':'other-reading'},{'ok':False,'lectura_uuid':payload['lectura_uuid']}]:
                transport.opener=Opener(bad)
                self.assertEqual(upload_one(queue,transport),'retry')
                self.assertEqual(queue.next(),payload)
            transport.opener=Opener({'ok':True,'lectura_uuid':payload['lectura_uuid']})
            self.assertEqual(upload_one(queue,transport),'sent')
            self.assertIsNone(queue.next())
            queue.close()


if __name__ == "__main__":
    unittest.main()

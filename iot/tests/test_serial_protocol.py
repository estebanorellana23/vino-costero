import unittest
from serial_protocol import parse_climate


class ClimateProtocolTests(unittest.TestCase):
    def test_real_serial_shape_and_zero_humidity(self):
        sample = parse_climate(b"VC1,CLIMA,1,27.70,68.90\r\n")
        self.assertEqual(sample.sequence, 1)
        self.assertEqual(sample.temperature_c, 27.7)
        self.assertEqual(sample.relative_humidity_air, 68.9)
        self.assertEqual(parse_climate(b"VC1,CLIMA,2,-40.00,0.00\n").relative_humidity_air, 0)

    def test_rejects_ambiguous_malformed_and_out_of_range_frames(self):
        for frame in [
            b"TEMP,27.70,68.90",  # Legacy data is not silently relabeled.
            b"VC1,CLIMA,1,NaN,50", b"VC1,CLIMA,1,Inf,50",
            b"VC1,CLIMA,1,27.7,101", b"VC1,CLIMA,1,81,50",
            b"VC1,CLIMA,1,27.7,-1", b"VC1,CLIMA,0,27.7,50",
            b"VC1,CLIMA,4294967296,27.7,50", b"VC1,CLIMA,1,27.7,50,extra",
            b"VC1,CLIMA,1,27.7,50\nVC1,CLIMA,2,28,51", b"\xff",
            b"x" * 97,
        ]:
            with self.subTest(frame=frame):
                with self.assertRaises(ValueError):
                    parse_climate(frame)


if __name__ == "__main__":
    unittest.main()

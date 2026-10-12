// Separate monitoring firmware for the documented UNO + DHT22 in D2.
// Does not configure or actuate the relay in D6. Pump integration is a separate gate.
#include <DHT.h>
#include <math.h>

const uint8_t DHT_PIN = 2;
const unsigned long SAMPLE_MS = 5000UL;
DHT dht(DHT_PIN, DHT22);
unsigned long lastSample = 0;
uint32_t sequence = 0;

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println(F("VC1,READY,UNO,DHT22"));
}

void loop() {
  const unsigned long now = millis();
  if (now - lastSample < SAMPLE_MS) return;
  lastSample = now;
  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  if (isnan(temperature) || isnan(humidity) || temperature < -40 || temperature > 80 || humidity < 0 || humidity > 100) {
    Serial.println(F("VC1,ERROR,DHT22"));
    return;
  }
  if (sequence == UINT32_MAX) {
    Serial.println(F("VC1,ERROR,SEQUENCE_EXHAUSTED"));
    return;
  }
  sequence++;
  Serial.print(F("VC1,CLIMA,"));
  Serial.print(sequence);
  Serial.print(',');
  Serial.print(temperature, 2);
  Serial.print(',');
  Serial.println(humidity, 2);
}

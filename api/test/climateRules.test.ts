import test from 'node:test';
import assert from 'node:assert/strict';
import { climateInput, temperatureAlert } from '../src/climateRules.js';

const now=Date.parse('2026-10-11T12:00:00.000Z');
const valid={lectura_uuid:'82c88c1e-f868-4b61-939e-6a9353c5d6a0',secuencia_uno:1,capturada_en:'2026-10-11T12:00:00.000Z',temperatura_c:27.7,humedad_aire_pct:68.9};
test('temperature alerts respect explicitly configured limits and do not invent missing thresholds',()=>{
  assert.equal(temperatureAlert(-1,0,35),'helada');
  assert.equal(temperatureAlert(36,0,35),'calor');
  assert.equal(temperatureAlert(0,0,35),null);
  assert.equal(temperatureAlert(35,0,35),null);
  assert.equal(temperatureAlert(27,null,null),null);
});
test('climate preserves measured air humidity and an explicit UTC capture time',()=>{
  const result=climateInput(valid,now);
  assert.equal(result.airHumidity,68.9);
  assert.equal(result.timestamp,'2026-10-11 12:00:00.000');
  assert.equal(climateInput({...valid,humedad_aire_pct:0},now).airHumidity,0);
});
test('unknown routing fields, invalid sensor values and invalid clock windows are rejected',()=>{
  for(const change of [{id_parcela:2},{temperatura_c:Infinity},{humedad_aire_pct:101},{temperatura_c:'27.7'},{humedad_aire_pct:12.345},{secuencia_uno:0},{lectura_uuid:'not-uuid'},{capturada_en:'2026-02-30T12:00:00.000Z'},{capturada_en:'2026-10-11T12:02:00.000Z'},{capturada_en:'2026-10-09T12:00:00.000Z'}]) {
    assert.throws(()=>climateInput({...valid,...change},now));
  }
});

test('soil moisture is optional, bounded, two decimals at most and must declare its origin',()=>{
  const plain=climateInput(valid,now);
  assert.equal(plain.soilHumidity,null);
  assert.equal(plain.origin,'sensor');
  const simulated=climateInput({...valid,humedad_suelo_pct:31.25,origen:'simulado'},now);
  assert.equal(simulated.soilHumidity,31.25);
  assert.equal(simulated.origin,'simulado');
  assert.equal(climateInput({...valid,humedad_suelo_pct:0,origen:'sensor'},now).soilHumidity,0);
  for(const change of [{humedad_suelo_pct:70},{humedad_suelo_pct:70,origen:'dht22'},{humedad_suelo_pct:101,origen:'sensor'},{humedad_suelo_pct:-1,origen:'sensor'},{humedad_suelo_pct:'70',origen:'sensor'},{humedad_suelo_pct:null,origen:'sensor'},{humedad_suelo_pct:12.345,origen:'sensor'},{origen:'otro'}]) {
    assert.throws(()=>climateInput({...valid,...change},now),`debe rechazarse: ${JSON.stringify(change)}`);
  }
});

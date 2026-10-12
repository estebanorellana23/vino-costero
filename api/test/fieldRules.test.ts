import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFields, resources, harvestReady } from '../src/fieldRules.js';

test('harvest requires sugar, good health, and an active cycle',()=>{
  assert.equal(harvestReady(23.8,23.5,'Bueno',true),true);
  for(const [brix,target,health,active] of [
    [23.8,23.5,null,true],[23.8,23.5,'Malo',true],[23.8,23.5,'Regular',true],
    [20,23.5,'Bueno',true],[null,23.5,'Bueno',true],[23.8,null,'Bueno',true],[23.8,23.5,'Bueno',false]
  ] as [number|null,number|null,string|null,boolean][]) assert.equal(harvestReady(brix,target,health,active),false);
});

test('soil and dimensions accept bounded inputs and reject malformed values',()=>{
  const soil={id_parcela:'1',fecha:'2026-10-10',ph:'7.2',humedad:'0'};
  assert.equal(parseFields(resources.tierra.fields,soil).humedad,0);
  for(const change of [{ph:15},{humedad:101},{fecha:'2026-02-30'},{id_parcela:1.5},{ph:true},{table:'usuario'}]) {
    assert.throws(()=>parseFields(resources.tierra.fields,{...soil,...change}));
  }
  assert.throws(()=>parseFields(resources.dimensiones.fields,{id_parcela:1,fecha:'2026-10-10',superficie_ha:0,hileras:10,cant_plantas:100}));
});

test('disease requires symptoms and treatment; sanitary rating is a closed enum',()=>{
  assert.throws(()=>parseFields(resources.enfermedades.fields,{nombre:'Fixture',sintomas:'Fixture'}));
  assert.throws(()=>parseFields(resources.sanidad.fields,{id_siembra:1,fecha:'2026-10-10',calificacion:'Excelente',pct_afectado:0}));
  assert.equal(parseFields(resources.sanidad.fields,{id_siembra:1,fecha:'2026-10-10',calificacion:'Bueno',pct_afectado:0}).pct_afectado,0);
});

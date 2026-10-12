import test from 'node:test';
import assert from 'node:assert/strict';
import { validNewPassword, validUsername } from '../src/passwordPolicy.js';

test('password boundary is UTF-8 bytes, including bcrypt truncation limit',()=>{
  assert.equal(validNewPassword('admin123'),false);
  assert.equal(validNewPassword('x'.repeat(15)),false);
  assert.equal(validNewPassword('x'.repeat(16)),true);
  assert.equal(validNewPassword('x'.repeat(72)),true);
  assert.equal(validNewPassword('x'.repeat(73)),false);
  assert.equal(validNewPassword('é'.repeat(36)),true);
  assert.equal(validNewPassword('é'.repeat(37)),false);
  assert.equal(validNewPassword(' '.repeat(20)),false);
  assert.equal(validNewPassword({password:'x'.repeat(20)}),false);
});

test('usernames have a bounded, unambiguous alphabet',()=>{
  assert.equal(validUsername('agronomo.leyda'),true);
  assert.equal(validUsername('x'),false);
  assert.equal(validUsername('user name'),false);
  assert.equal(validUsername('a'.repeat(51)),false);
  assert.equal(validUsername('Administrador'),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { dbSsl, trustProxyHops } from '../src/deployConfig.js';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----';

test('trust proxy is off by default and accepts only a small number of hops', () => {
  assert.equal(trustProxyHops(undefined), false);
  assert.equal(trustProxyHops(''), false);
  assert.equal(trustProxyHops('1'), 1);
  assert.equal(trustProxyHops('5'), 5);
  for (const bad of ['0', '6', 'true', '-1', '1.5', ' 1']) assert.throws(() => trustProxyHops(bad), bad);
});

test('database TLS verifies certificates and reads the CA from text or from a file', () => {
  const fromText = dbSsl({ DB_SSL_CA: PEM.replace(/\n/g, '\\n') } as any);
  assert.equal(fromText?.rejectUnauthorized, true);
  assert.equal(fromText?.ca, PEM);
  assert.equal(fromText?.minVersion, 'TLSv1.2');
  const fromFile = dbSsl({ DB_SSL_CA_FILE: '/etc/secrets/ca.pem' } as any, (path) => { assert.equal(path, '/etc/secrets/ca.pem'); return PEM + '\n'; });
  assert.equal(fromFile?.ca, PEM);
  assert.throws(() => dbSsl({ DB_SSL_CA: 'not a certificate' } as any));
});

test('a remote database in production must use TLS, while local development may skip it', () => {
  assert.throws(() => dbSsl({ NODE_ENV: 'production', DB_HOST: 'mysql-example.aivencloud.com' } as any));
  assert.equal(dbSsl({ NODE_ENV: 'production', DB_HOST: '127.0.0.1' } as any), undefined);
  assert.equal(dbSsl({ NODE_ENV: 'development', DB_HOST: 'localhost' } as any), undefined);
  assert.equal(dbSsl({ NODE_ENV: 'development', DB_HOST: 'db.example.com' } as any), undefined);
});

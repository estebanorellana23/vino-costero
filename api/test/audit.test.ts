import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db.js';
import { auditedQuery } from '../src/audit.js';

test('business write and audit commit together; audit failure rolls the write back',async()=>{
  const original=pool.getConnection;
  try {
    for(const failAudit of [false,true]){
      const steps:string[]=[];
      (pool as any).getConnection=async()=>({
        beginTransaction:async()=>{steps.push('begin');},
        query:async(sql:string)=>{
          if(sql.startsWith('INSERT INTO bitacora')){steps.push('audit');if(failAudit)throw new Error('fixture-audit-failure');return [{affectedRows:1}];}
          steps.push('write');return [{affectedRows:1,insertId:7}];
        },
        commit:async()=>{steps.push('commit');},rollback:async()=>{steps.push('rollback');},release:()=>{steps.push('release');},
      });
      const req:any={user:{id:1,rol:'Agronomo',nombre:'Fixture'},method:'POST',params:{}};
      if(failAudit)await assert.rejects(()=>auditedQuery(req,'Campo','INSERT INTO fixture VALUES (?)',[1]));
      else await auditedQuery(req,'Campo','INSERT INTO fixture VALUES (?)',[1]);
      assert.deepEqual(steps,['begin','write','audit',failAudit?'rollback':'commit','release']);
    }
  } finally{pool.getConnection=original;}
});

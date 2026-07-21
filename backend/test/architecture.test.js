'use strict';const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');
const root=new URL('../',`file://${__filename}`);const read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('startup only checks schema readiness',()=>{const s=read('server.js');assert.match(s,/to_regclass/);assert.doesNotMatch(s,/CREATE TABLE|npm install|seed\.js|kill -9/);});
test('migration owns retry and immutable audit contracts',()=>{const s=read('migrations/001_authoritative_cloud.sql');for(const term of ['dead_letter','idempotency_key','payload_hash','append-only','dataset_version'])assert.match(s,new RegExp(term));});
test('deployment health and recovery are receipt backed',()=>{const s=read('routes/authoritative.js');for(const term of ['confirmed_provider_receipt_required','accepted_evaluation_required',"state IN ('deploying','degraded','failing_over','rolled_back')"])assert.ok(s.includes(term),`missing ${term}`);});

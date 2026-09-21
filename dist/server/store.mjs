import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const dir=resolve(process.env.DATA_DIR||'data');mkdirSync(dir,{recursive:true});
const sqlite=new DatabaseSync(resolve(dir,'portal.sqlite'));
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
// Single versioned migration; schema changes must append later migrations.
const version=sqlite.prepare('PRAGMA user_version').get().user_version;
if(version===0){sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));sqlite.exec('PRAGMA user_version=1; COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}
export const DB={prepare(sql){const stmt=sqlite.prepare(sql);let args=[];const q={bind(...a){args=a;return q;},first(){return stmt.get(...args)||null;},all(){return {results:stmt.all(...args)};},run(){return stmt.run(...args);}};return q;},batch(queries){sqlite.exec('BEGIN');try{const result=queries.map(q=>q.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
export function closeDatabase(){sqlite.close();}

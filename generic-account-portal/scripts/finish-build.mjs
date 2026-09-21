import {copyFileSync} from 'node:fs';
copyFileSync('server/store.mjs','dist/server/store.mjs');
copyFileSync('server/schema.sql','dist/server/schema.sql');

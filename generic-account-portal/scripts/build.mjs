import {build} from 'vite';
await build();
await build({configFile:false,publicDir:false,build:{ssr:'server/api.ts',outDir:'dist/server',emptyOutDir:true,rollupOptions:{external:['./store.mjs'],output:{entryFileNames:'api.mjs'}}},ssr:{noExternal:['zod']}});
console.log('Built frontend and bundled backend. npm start requires no installed packages.');
await import('./finish-build.mjs');

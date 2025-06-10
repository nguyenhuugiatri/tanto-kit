import resolve from '@rollup/plugin-node-resolve';
import { defineConfig } from 'rollup';
import typescript from 'rollup-plugin-typescript2';

const config = defineConfig({
  input: ['src/index.ts'],
  output: [
    {
      dir: 'dist/mjs',
      format: 'esm',
      preserveModulesRoot: 'src',
      preserveModules: true,
      compact: true,
      minifyInternalExports: true,
      entryFileNames: '[name].mjs',
    },
    {
      dir: 'dist/cjs',
      format: 'cjs',
      preserveModulesRoot: 'src',
      preserveModules: true,
      exports: 'named',
      entryFileNames: '[name].cjs',
    },
  ],
  external: ['uuid', 'eventemitter2'],
  plugins: [
    typescript({
      useTsconfigDeclarationDir: true,
      clean: true,
    }),
    resolve({
      preferBuiltins: true,
      browser: true,
      dedupe: ['react', 'react-dom'],
    }),
  ],
});

export default config;

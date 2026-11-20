import { defineConfig } from 'vite';
import { Compiler } from 'inkjs/full';
import { readFileSync } from 'node:fs';

// Compiles .ink files at build time, so the game ships only the small Ink runtime.
// `import story from '../content/ink/tataka.ink'` gives the compiled JSON string.
const ink = () => ({
  name: 'ink',
  transform(_code, id) {
    if (!id.endsWith('.ink')) return null;
    const compiler = new Compiler(readFileSync(id, 'utf8'));
    const story = compiler.Compile();
    if (compiler.errors.length) this.error(`${id}\n${compiler.errors.join('\n')}`);
    for (const w of compiler.warnings) this.warn(w);
    return { code: `export default ${JSON.stringify(story.ToJson())};`, map: null };
  },
});

export default defineConfig({
  base: './',
  plugins: [ink()],
  build: { chunkSizeWarningLimit: 2000 },
  server: { host: true },
});

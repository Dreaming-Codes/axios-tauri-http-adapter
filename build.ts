import dts from 'bun-plugin-dts'

await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    minify: true,
    target: 'node',
    format: 'esm',
    sourcemap: "external",
    external: ["@tauri-apps/api", "axios", "http-status-codes"],
    plugins: [dts()]
})

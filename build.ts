import dts from 'bun-plugin-dts'

await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    minify: true,
    target: 'node',
    external: ["@tauri-apps/api", "axios", "http-status-codes"],
    plugins: [dts()]
})

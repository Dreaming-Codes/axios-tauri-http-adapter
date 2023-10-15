# axios-tauri-http-adapter

This is an adapter for the tauri plugin http v2. This requires tauri 2.

To install this adapter, run:

```bash
# with pnpm
pnpm install axios-tauri-http-adapter
# with npm
npm install axios-tauri-http-adapter
# with yarn
yarn add axios-tauri-http-adapter
# with bun
bun add axios-tauri-http-adapter
```

Then add the official plugin to your cargo dependencies:

```toml
# src-tauri/Cargo.toml
[dependencies]
# ...
tauri-plugin-http = { git = "https://github.com/tauri-apps/plugins-workspace", branch = "v2" }
```

Then add the plugin to your tauri config:

```json5
// src-tauri/tauri.conf.json
{
  // ...
  "plugins": {
    "http": {
      // Customize the scope as needed, this will allow all http requests
      "scope": [
        "http://**",
        "https://**"
      ]
    }
  }
}
```

Then initialize the plugin in your tauri app:

```rust
// src-tauri/src/lib.rs or src-tauri/src/main.rs (it may differ depending on how you set up your tauri app)
pub fn run() {
    tauri::Builder::default()
        // ...
        .plugin(tauri_plugin_http::init())
        // ...
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Then add the adapter to your axios instance:

```js
import axiosAdapter from "axios-tauri-http-adapter";

const axiosClient = axios.create({
    adapter: axiosAdapter()
})
```

Enjoy blazingly fast http requests in your tauri app with axios without having to worry about CORS and other browser limitations.

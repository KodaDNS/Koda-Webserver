# 🚀 Koda Webserver

Koda Webserver is a high-performance, minimalist engine built from the ground up using Node.js raw networking (`net` and `tls`). Engineered for maximum throughput and minimal overhead, Koda brings enterprise-grade caching, proxying, and security to your infrastructure.

---
## ✨ Features

- **High Performance Core**: Built with raw `net` and `tls` modules for maximum speed and low overhead.
- **Static File Serving**: Lightning-fast delivery of static assets with smart caching.
- **Reverse Proxy**: Powerful built-in reverse proxy with full caching support.
- **Dual Caching System**: Normal LRU Cache + HyperCache for both static files and proxied responses.
- **HyperCache Technology**: Automatically detects and optimizes hot routes under high load.
- **WebSocket Support**: Full WebSocket proxying capability.
- **Advanced Security**: Configurable security headers, XSS protection, and iframe policies.
- **DDoS Mitigation**: Per-connection rate limiting and packet size protection.
- **TLS/SSL Ready**: Easy HTTPS configuration.
- **Multi-Host Support**: Run multiple sites on different ports/domains.
- **Web Admin Panel**: Built-in administration dashboard via `webadmin.yaml`.
- **Lightweight & Scalable**: Designed for high concurrency with minimal resource usage.

---
## ⚙️ Configuration Guide (`koda.yaml`)

Define your infrastructure in `koda.yaml`. Note: **`@index`** represents the current working directory of the application.

| Setting | Description |
| :--- | :--- |
| **host** | The domain name to listen for (use `*` for wildcard). |
| **ip / port** | The local IP address and port the server binds to. |
| **root_dir** | The directory where your website files are stored (e.g., `@index/content/`). |

### 🔄 Proxy Host Configuration

* **proxy_host**: Reverse proxy settings to forward requests to another server.
    * `enabled`: Set to `true` to enable proxy mode.
    * `dest_host`: Destination backend hostname or IP address.
    * `dest_port`: Destination backend port.
    * `websockets`: Allow WebSocket proxying (`true`/`false`).
    * `cache`: Enable normal caching of destination responses (same system as static files).
    * `hypercache`: Enable HyperCache for proxied responses under high load.

> **Important**: When `proxy_host.cache: true` and `proxy_host.hypercache: true`, proxied responses are cached using the exact same `cache_settings` and `hypercache` rules as static files.

### ⚡ Caching & Performance

* **cache_settings**: Configures the in-memory `LRUCache`.
    * `max_objects`: Maximum files held in RAM.
    * `min_file_size` / `max_file_size`: Cache boundaries (in bytes).
    * `ttl_seconds`: Time-to-live for cached objects.
* **hypercache**: Intelligent request tracking to prevent I/O bottlenecks.
    * `enabled`: Enable/disable automated high-load caching.
    * `update_interval_ms`: Evaluation frequency.
    * `min_requests_per_interval`: Threshold to trigger an auto-refresh.
    * `detection_frame_ms`: Time frame for tracking high-traffic bursts.

### 🛡️ Security

* **security**: Granular control over HTTP security headers.
    * `xss_headers` & `security_headers`: Choose your policy level (`low`, `medium`, `high`).
    * `allow_iframes`: Toggle for `X-Frame-Options`.
* **ssl**: HTTPS configuration.
    * `enabled`: Toggle for TLS support.
    * `cert` / `key`: Paths to your credentials (e.g., `@index/certs/cert.pem`).

### ⏱️ Connection Management

* **timeouts**: Protect against resource exhaustion and slow-loris attacks.
    * `connection`: Max time for initial connection.
    * `request_read`: Max time for receiving request body.
    * `keep_alive`: Timeout for idle persistent connections.

### 🛡️ DDoS / Flood Mitigation

* **ddos**: Basic protection against connection floods and large packets.
    * `max_connection_requests_frame`: Max requests allowed in time window **per connection**.
    * `max_connection_requests_frame_ms`: Time window for request limiting (ms) **per connection**.
    * `max_packet_size`: Max bytes allowed in time window **per connection**.
    * `max_packet_size_frame_ms`: Time window for packet size limiting (ms) **per connection**.

---
## 🛠️ Customization

* **Host Management**: Add or remove hosts directly in `koda.yaml`.
* **MIME Types**: Customize file mappings at `/json/mime.json`.
* **Security Policies**: Update headers at `/json/security_policies.json`.
* **Web Admin**: Configure admin panel in `webadmin.yaml`.

---
## 🐛 Issues & Support

* Found a bug or have a feature request? Please help us improve by opening a report in the **[GitHub Issues](https://github.com/KodaDNS/Koda-Webserver/issues)** tracker.
* Need custom help or solutions? contact kodadns@proton.me

# 🚀 Koda Webserver

Koda Webserver is a high-performance, minimalist engine built from the ground up using Node.js raw networking (`net` and `tls`). Engineered for maximum throughput and minimal overhead, Koda brings enterprise-grade caching and security to your infrastructure.

---

## ⚙️ Configuration Guide (`koda.yaml`)

Define your infrastructure in `koda.yaml`. Note: **`@index`** represents the current working directory of the application.

| Setting | Description |
| :--- | :--- |
| **host** | The domain name to listen for (use `*` for wildcard). |
| **ip / port** | The local IP address and port the server binds to. |
| **root_dir** | The directory where your website files are stored (e.g., `@index/content/`). |

### ⚡ Caching & Performance
* **cache_settings**: Configures the in-memory `LRUCache`.
    * `max_objects`: Maximum files held in RAM.
    * `min_file_size` / `max_file_size`: Cache boundaries (in bytes).
    * `ttl_seconds`: Time-to-live for cached objects.
* **hypercache**: Intelligent request tracking to prevent I/O bottlenecks.
    * `update_interval_ms`: Evaluation frequency.
    * `min_requests_per_interval`: Threshold to trigger an auto-refresh.
    * `detection_window_ms`: Time frame for tracking high-traffic bursts.

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

---

## 🛠️ Customization

* **Host Management**: Add or remove hosts directly in `koda.yaml`.
* **MIME Types**: Customize file mappings at `/json/mime.json`.
* **Security Policies**: Update headers at `/json/security_policies.json`.

---

## 🐛 Issues & Support

Found a bug or have a feature request? Please help us improve by opening a report in the **[GitHub Issues](https://github.com/KodaDNS/Koda-Webserver/issues)** tracker.

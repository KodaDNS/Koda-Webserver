# Koda Webserver

Koda Webserver is a high-performance, lightweight web server built from the ground up using Node.js raw networking (net and tls). It is designed for scalability, featuring custom caching and granular security controls.

## Configuration Guide (koda.yaml)

You can define multiple hosts in your koda.yaml file. Here is a breakdown of the available settings for each host:

- host: The domain name to listen for (use * for wildcard/all).
- ip / port: The local IP address and port the server binds to.
- root_dir: The directory where your website files are stored.

### Caching & Performance

- cache_settings: Configures the in-memory LRUCache.
    - max_objects: Maximum number of files stored in RAM.
    - min_file_size / max_file_size: Limits for caching based on file size (in bytes).
    - ttl_seconds: How long a file stays in cache before expiring.

- hypercache: Enables high-frequency request tracking.
    - update_interval_ms: Frequency at which cache stats are evaluated.
    - min_requests_per_interval: Threshold of hits required to trigger an automatic cache refresh.
    - detection_window_ms: The time frame for tracking request bursts.

### Security

- security: Manages HTTP security headers.
    - xss_headers & security_headers: Policy level (e.g., low, medium, high).
    - allow_iframes: When true, prevents X-Frame-Options from blocking your site in iframes.

- ssl: Configure HTTPS settings.
    - enabled: Toggle for TLS/SSL.
    - cert / key: Paths to your certificate and private key files.

### Connection Management

- timeouts: Prevents resource exhaustion by closing stale connections.
    - connection: Max time to hold an initial connection open.
    - request_read: Max time allowed to receive the HTTP request body.
    - keep_alive: Timeout for idle connections.

---

## Customization

### Adding, Modifying, or Removing Hosts
Simply edit the koda.yaml file. You can add as many host entries as needed.

### Modifying MIME types
Update the mappings for file extensions to Content-Types at:
/json/mime.json

### Modifying Security Policies
Define the headers sent with each request at:
/json/security_policies.json

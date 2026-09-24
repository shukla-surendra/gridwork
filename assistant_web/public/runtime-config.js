// Runtime (not build-time) settings. In the Docker image nginx serves a generated
// version of this file from env vars (see nginx.conf.template); this empty default
// is what `next dev` and static hosting (e.g. Azure Storage) get, in which case
// src/config.json's API_BASE_URL is used instead.
window.__RUNTIME_CONFIG__ = window.__RUNTIME_CONFIG__ || {};

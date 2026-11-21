// Quill Firefox - Firefox already exposes the promise-based `browser.*` namespace
// used by the Thunderbird core; this shim only covers unusual contexts.
if (typeof globalThis.browser === "undefined") globalThis.browser = globalThis.chrome;

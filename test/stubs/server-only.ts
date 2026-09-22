// Stub for the "server-only" package in tests: the real package throws
// unconditionally unless resolved under Next.js's "react-server" bundler
// condition, which Vitest doesn't set up. Tests run in a trusted Node
// environment anyway, so this guard is meaningless there.
export {};

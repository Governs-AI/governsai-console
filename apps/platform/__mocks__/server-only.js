// Mock for 'server-only' package in Jest (Node.js test environment).
// The real package throws when imported from a Client Component context;
// in Jest we are always in Node context so no check is needed.
module.exports = {};

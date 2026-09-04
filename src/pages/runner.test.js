/**
 * PrivSecure India — Relational DB & Multi-Tenant Core Test Runner
 * Sets up jsdom simulation environment and executes Mocha test suites.
 */

import { JSDOM } from 'jsdom';

// 1. Initialize DOM environments for browser APIs in Node process
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});
global.window = dom.window;
global.document = dom.window.document;

// 2. Define localStorage / sessionStorage browser storage mocks
class StorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}
global.localStorage = new StorageMock();
global.sessionStorage = new StorageMock();

// 3. Execute testing suites
await import('./dbStore.test.js');

// Buffer polyfill — jpeg-js needs Buffer even with useTArray:true in some
// Hermes builds. Guard the assignment so we don't stomp a native polyfill.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer: Buf } = require("buffer") as { Buffer: typeof Buffer };
  if (typeof global.Buffer === "undefined") (global as typeof globalThis & { Buffer: unknown }).Buffer = Buf;
} catch {}

import { registerRootComponent } from 'expo';

import App from './app/App';

registerRootComponent(App);

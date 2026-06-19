/**
 * Postinstall patch for onnxruntime-react-native 1.24.3.
 *
 * OnnxruntimeModule.java install() calls getCatalystInstance() which returns
 * null in React Native 0.81 Bridgeless (New Architecture), causing a silent
 * NPE so OrtApi is never injected and InferenceSession is undefined at runtime.
 *
 * The fix: call getJSCallInvokerHolder() directly on ReactApplicationContext
 * (available since RN 0.71, works in both Old and New Architecture).
 *
 * This runs via "postinstall" in package.json — no extra npm packages needed.
 */

const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '../node_modules/onnxruntime-react-native/android/src/main/java/ai/onnxruntime/reactnative/OnnxruntimeModule.java'
);

const BROKEN  = 'getReactApplicationContext().getCatalystInstance().getJSCallInvokerHolder()';
const FIXED   = 'getReactApplicationContext().getJSCallInvokerHolder()';

try {
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes(BROKEN)) {
    fs.writeFileSync(file, src.replace(BROKEN, FIXED));
    console.log('[patch] onnxruntime-react-native: patched OnnxruntimeModule.java for RN 0.81 Bridgeless');
  } else if (src.includes(FIXED)) {
    console.log('[patch] onnxruntime-react-native: already patched');
  } else {
    console.warn('[patch] onnxruntime-react-native: WARNING — expected pattern not found in OnnxruntimeModule.java');
  }
} catch (e) {
  console.error('[patch] onnxruntime-react-native: patch failed —', e.message);
}

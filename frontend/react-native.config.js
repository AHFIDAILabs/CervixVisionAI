// Tells React Native autolinking about onnxruntime-react-native, which has no
// react-native.config.js of its own and no expo-module.config.json — so it is
// invisible to both RN autolinking and Expo autolinking without this override.
//
// This causes expo prebuild to:
//   1. Add `include ':onnxruntime-react-native'` to android/settings.gradle
//   2. Add OnnxruntimePackage to the generated PackageList.java
//
// The app.json plugin still adds the Gradle `implementation` dependency separately.
module.exports = {
  dependencies: {
    'onnxruntime-react-native': {
      platforms: {
        android: {
          packageImportPath: 'import ai.onnxruntime.reactnative.OnnxruntimePackage;',
          packageInstance: 'new OnnxruntimePackage()',
        },
      },
    },
  },
};

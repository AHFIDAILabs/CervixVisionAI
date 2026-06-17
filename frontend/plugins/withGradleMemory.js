const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter(
      (item) => !(item.type === "property" && item.key === "org.gradle.jvmargs")
    );
    mod.modResults.push({
      type: "property",
      key: "org.gradle.jvmargs",
      value: "-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError",
    });
    return mod;
  });
};

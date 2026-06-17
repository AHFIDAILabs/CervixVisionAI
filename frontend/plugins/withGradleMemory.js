const { withAndroidGradleProperties } = require("@expo/config-plugins");

module.exports = function withGradleMemory(config) {
  return withAndroidGradleProperties(config, (props) => {
    const filtered = props.filter(
      (item) => !(item.type === "property" && item.key === "org.gradle.jvmargs")
    );
    filtered.push({
      type: "property",
      key: "org.gradle.jvmargs",
      value: "-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError",
    });
    return filtered;
  });
};

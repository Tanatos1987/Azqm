// More heap for Gradle. With 1.4.0 (expo-notifications) packaging the AAB on CI ran out of the default 2 GB
// ("Java heap space" in :app:packageReleaseBundle). Prebuild writes gradle.properties, so set it here.
const { withGradleProperties } = require('expo/config-plugins');

const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'));
    cfg.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    return cfg;
  });
};

const fs = require('fs');
const path = require('path');

const metroPackagePath = path.join(__dirname, 'node_modules', 'metro', 'package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(metroPackagePath, 'utf8'));
  
  // Add missing exports
  pkg.exports = {
    ".": "./src/index.js",
    "./package.json": "./package.json",
    "./src/lib/TerminalReporter": "./src/lib/TerminalReporter.js",
    "./src/lib/getGraphId": "./src/lib/getGraphId.js",
    "./src/lib/parseCustomTransformOptions": "./src/lib/parseCustomTransformOptions.js",
    "./src/lib/reporting": "./src/lib/reporting.js",
    "./src/shared/output/bundle": "./src/shared/output/bundle.js",
    "./src/shared/output/RamBundle": "./src/shared/output/RamBundle.js",
    "./src/IncrementalBundler": "./src/IncrementalBundler.js",
    "./src/DeltaBundler/Serializers/baseJSBundle": "./src/DeltaBundler/Serializers/baseJSBundle.js",
    "./src/DeltaBundler/Serializers/getAssets": "./src/DeltaBundler/Serializers/getAssets.js",
    "./src/DeltaBundler/Serializers/sourceMapString": "./src/DeltaBundler/Serializers/sourceMapString.js",
    "./src/DeltaBundler/Serializers/sourceMapObject": "./src/DeltaBundler/Serializers/sourceMapObject.js",
    "./src/DeltaBundler/Serializers/helpers/getSourceMapInfo": "./src/DeltaBundler/Serializers/helpers/getSourceMapInfo.js"
  };
  
  fs.writeFileSync(metroPackagePath, JSON.stringify(pkg, null, 2));
  console.log('✅ Fixed Metro exports');
} catch (error) {
  console.error('❌ Error fixing Metro:', error.message);
}
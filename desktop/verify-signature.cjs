const { execFileSync } = require('node:child_process');
const path = require('node:path');
module.exports = async context => {
  const bundle = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app');
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', bundle], { stdio: 'inherit' });
  console.log('PASS: complete app bundle has a valid signature:', bundle);
};

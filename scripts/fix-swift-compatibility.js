const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getSwiftVersion() {
  try {
    const output = execSync('swift -version', { encoding: 'utf8' });
    const match = output.match(/Apple Swift version ([0-9]+\.[0-9]+)/);
    if (match) {
      return match[1];
    }
  } catch (e) {
    // Fallback if swift command is not available in local environment
  }
  return '6.0';
}

const targetSwiftVer = getSwiftVersion();
console.log(`Running Swift compatibility patch (Swift Version Target: ${targetSwiftVer})...`);

function walkAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git') {
        walkAndPatch(fullPath);
      }
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.swift')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (/weak\s+let\b/.test(content)) {
          console.log(`[Patch] Converting 'weak let' to 'weak var' in: ${path.relative(process.cwd(), fullPath)}`);
          content = content.replace(/\bweak\s+let\b/g, 'weak var');
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      } else if (entry.name === 'Package.swift') {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('swift-tools-version: 6.2')) {
          console.log(`[Patch] Adjusting swift-tools-version in: ${path.relative(process.cwd(), fullPath)} to ${targetSwiftVer}`);
          content = content.replace(/swift-tools-version:\s*6\.2/g, `swift-tools-version: ${targetSwiftVer}`);
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      }
    }
  }
}

const projectRoot = path.resolve(__dirname, '..');
const nodeModules = path.join(projectRoot, 'node_modules');
const iosDir = path.join(projectRoot, 'ios');

walkAndPatch(nodeModules);
if (fs.existsSync(iosDir)) {
  walkAndPatch(iosDir);
}
console.log('Swift compatibility patch completed.');

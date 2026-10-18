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
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return; // Skip unreadable dirs
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git' && entry.name !== '.DerivedData' && entry.name !== 'build') {
        walkAndPatch(fullPath);
      }
    } else if (entry.isFile()) {
      if (entry.name === 'Package.swift') {
        let content;
        try { content = fs.readFileSync(fullPath, 'utf8'); } catch (e) { continue; }
        if (/swift-tools-version:\s*6\.[2-9]/.test(content)) {
          console.log(`[Patch] Adjusting swift-tools-version in: ${path.relative(process.cwd(), fullPath)} to ${targetSwiftVer}`);
          content = content.replace(/swift-tools-version:\s*6\.[2-9]/g, `swift-tools-version: ${targetSwiftVer}`);
          try { fs.writeFileSync(fullPath, content, 'utf8'); } catch (e) { console.warn(`  [WARN] Could not write: ${e.message}`); }
        }
      }
      if (entry.name.endsWith('.swift')) {
        let content;
        try { content = fs.readFileSync(fullPath, 'utf8'); } catch (e) { continue; }
        if (/weak\s+let\b/.test(content)) {
          console.log(`[Patch] Converting 'weak let' to 'weak var' in: ${path.relative(process.cwd(), fullPath)}`);
          content = content.replace(/\bweak\s+let\b/g, 'weak var');
          try { fs.writeFileSync(fullPath, content, 'utf8'); } catch (e) { console.warn(`  [WARN] Could not write: ${e.message}`); }
        }
      }
    }
  }
}

const projectRoot = path.resolve(__dirname, '..');

// Patch node_modules (before prebuild)
const nodeModules = path.join(projectRoot, 'node_modules');
walkAndPatch(nodeModules);

// Patch ios/ including ios/Pods/ (after prebuild + pod install)
const iosDir = path.join(projectRoot, 'ios');
walkAndPatch(iosDir);

console.log('Swift compatibility patch completed.');

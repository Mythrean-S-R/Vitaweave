const fs = require('fs');
const path = require('path');

const icons = new Set();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      walk(fullPath);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const text = fs.readFileSync(fullPath, 'utf8');
      const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react-native['"]/g;
      let match;
      while ((match = re.exec(text))) {
        match[1].split(',').forEach((part) => {
          const trimmed = part.trim();
          if (!trimmed) return;
          const aliasMatch = trimmed.match(/^(\w+)\s+as\s+\w+$/);
          icons.add(aliasMatch ? aliasMatch[1] : trimmed.split(/\s+as\s+/)[0].trim());
        });
      }
    }
  }
}

['app', 'components'].forEach(walk);
console.log([...icons].sort().join('\n'));

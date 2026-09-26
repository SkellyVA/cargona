const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.vue') || file.endsWith('.ts')) results.push(file);
  });
  return results;
}

const vueApis = ['ref', 'computed', 'watch', 'watchEffect', 'onMounted', 'onUnmounted', 'shallowRef', 'triggerRef', 'nextTick'];
const files = walk(path.join(__dirname, '..', 'apps', 'web', 'src'));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  vueApis.forEach(api => {
    const regex = new RegExp('\\b' + api + '\\s*\\(');
    if (regex.test(content)) {
      const importVueRegex = /import\s+\{([^}]+)\}\s+from\s+['"]vue['"]/;
      const match = content.match(importVueRegex);
      if (!match || !match[1].includes(api)) {
        if (!content.includes('function ' + api) && !content.includes('const ' + api) && !content.includes(api + ':') && !content.includes(api + ' =')) {
          console.log(`Possible missing ${api} in: ${f}`);
        }
      }
    }
  });
});

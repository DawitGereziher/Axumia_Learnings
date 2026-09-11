const fs = require('fs');

try {
  const content = fs.readFileSync('backend_errors.txt', 'utf16le').toString();
  const lines = content.split('\r\n').filter(Boolean);
  
  const counts = {};
  const examples = {};
  
  lines.forEach(l => {
    const m = l.match(/(src\/[^(]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)/);
    if (m) {
      const [_, file, line, col, code, msg] = m;
      const key = `${file} -> ${code}`;
      counts[key] = (counts[key] || 0) + 1;
      if (!examples[key]) {
        examples[key] = [];
      }
      if (examples[key].length < 3) {
        examples[key].push(`Line ${line}: ${msg}`);
      }
    } else {
      // unmatched line
      const key = 'Unmatched';
      counts[key] = (counts[key] || 0) + 1;
      if (!examples[key]) examples[key] = [];
      examples[key].push(l);
    }
  });
  
  let output = '=== TYPE ERROR SUMMARY ===\n\n';
  Object.keys(counts).forEach(key => {
    output += `${key} (Count: ${counts[key]})\n`;
    examples[key].forEach(ex => {
      output += `  - ${ex}\n`;
    });
    output += '\n';
  });
  
  fs.writeFileSync('backend_errors_summary.txt', output, 'utf8');
  console.log('Summary written to backend_errors_summary.txt');
} catch (e) {
  console.error(e);
}

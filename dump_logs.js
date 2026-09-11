const fs = require('fs');
const cp = require('child_process');
try {
  // Get both stdout and stderr using exec which merges them
  const result = cp.execSync('docker logs ethiolearn_backend 2>&1', { maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync('backend_boot_logs.txt', result.toString(), 'utf8');
} catch (err) {
  // execSync throws if exit code != 0, but output is still in err.stdout/stderr
  const combined = (err.stdout || '') + '\n' + (err.stderr || '');
  fs.writeFileSync('backend_boot_logs.txt', combined.toString(), 'utf8');
}

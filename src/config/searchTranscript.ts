import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.resolve('C:\\Users\\abhii\\.gemini\\antigravity\\brain\\844eebf4-531a-46b8-a954-f22d50b7fe12\\.system_generated\\logs');

if (fs.existsSync(logsDir)) {
  const files = fs.readdirSync(logsDir);
  console.log('Log files:', files);
  files.forEach(f => {
    if (f.endsWith('.jsonl') || f.endsWith('.log')) {
      const p = path.join(logsDir, f);
      const content = fs.readFileSync(p, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('password') || line.toLowerCase().includes('db') || line.toLowerCase().includes('postgres') || line.toLowerCase().includes('sql')) {
          if (line.length < 200) {
            console.log(`[${f}:${idx + 1}] ${line}`);
          } else {
            console.log(`[${f}:${idx + 1}] (long line) ${line.substring(0, 200)}...`);
          }
        }
      });
    }
  });
} else {
  console.log('Logs directory not found');
}

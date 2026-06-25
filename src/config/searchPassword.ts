import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir(process.cwd(), (filePath) => {
  if (filePath.endsWith('.env') || filePath.endsWith('.json') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('.gemini')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('postgres://') || content.includes('postgresql://') || content.includes('DATABASE_URL')) {
          console.log(`Found DB url in: ${filePath}`);
        }
      } catch (e) {}
    }
  }
});

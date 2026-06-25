import * as fs from 'fs';
import * as path from 'path';

const content = fs.readFileSync(path.resolve(process.cwd(), 'src/config/seedNewTeachers.ts'), 'utf8');
const searchNames = ['Arjun Sharma', 'Om Pandey', 'Manish Raj', 'MR Sir'];

searchNames.forEach(n => {
  if (content.includes(n)) {
    console.log(`Found "${n}" in seedNewTeachers.ts`);
  } else {
    console.log(`NOT found "${n}" in seedNewTeachers.ts`);
  }
});

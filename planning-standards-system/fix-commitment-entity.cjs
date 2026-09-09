const fs = require('fs');
const file = '/app/src/modules/commitment/dist/modules/commitment/src/modules/commitment/database/commitment.entity.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/,\s*\(0,\s*typeorm_1\.Unique\)\([^)]+\)/g, '');
fs.writeFileSync(file, content);
console.log('Successfully removed Unique decorator from commitment.entity.js');

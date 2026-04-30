const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// remove event listeners and DOM queries
code = code.replace(/chatForm\.addEventListener[\s\S]*?\}\);/g, '');
code = code.replace(/quickButtons\.forEach[\s\S]*?\}\);/g, '');
code = code.replace(/selectionButtons\.forEach[\s\S]*?\}\);/g, '');
code = code.replace(/robotLauncher\?\.addEventListener[\s\S]*?\}\);/g, '');
code = code.replace(/const style = document\.createElement[\s\S]*/g, '');

code = code.replace(/const chatMessages.*/g, 'const chatMessages = { appendChild: () => {}, querySelectorAll: () => [] };');
code = code.replace(/const chatForm.*/g, 'const chatForm = {};');
code = code.replace(/const userInput.*/g, 'const userInput = {};');
code = code.replace(/const quickButtons.*/g, 'const quickButtons = [];');
code = code.replace(/const selectionButtons.*/g, 'const selectionButtons = [];');
code = code.replace(/const selectionActions.*/g, 'const selectionActions = { classList: { add: () => {}, remove: () => {} } };');
code = code.replace(/const severityRow.*/g, 'const severityRow = { classList: { add: () => {}, remove: () => {} } };');
code = code.replace(/const typeRow.*/g, 'const typeRow = { classList: { add: () => {}, remove: () => {} } };');
code = code.replace(/const robotLauncher.*/g, 'const robotLauncher = {};');
code = code.replace(/const chatShell.*/g, 'const chatShell = {};');

code += `
document = { createElement: () => ({ classList: {} }) };

console.log('--- TEST 1: Hii ---');
console.log(medicalReply('hii'));

console.log('--- TEST 2: Shiv ---');
console.log(medicalReply('Shiv'));

console.log('--- TEST 3: 25 ---');
console.log(medicalReply('25'));

console.log('--- TEST 4: None ---');
console.log(medicalReply('None'));

console.log('--- TEST 5: None ---');
console.log(medicalReply('None'));

console.log('--- TEST 6: fever ---');
console.log(medicalReply('fever'));
`;

fs.writeFileSync('test.js', code);

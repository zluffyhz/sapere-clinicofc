const bcrypt = require('bcryptjs');

const temporaryPassword = 'Sapere2026!';
const hash = bcrypt.hashSync(temporaryPassword, 10);

console.log('Senha temporária:', temporaryPassword);
console.log('Hash bcrypt:', hash);

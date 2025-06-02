import crypto from 'crypto';

console.log('\nRandom Key:');
console.log(crypto.randomBytes(32).toString('hex'));

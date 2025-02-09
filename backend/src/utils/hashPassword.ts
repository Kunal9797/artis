import bcrypt from 'bcrypt';

const password = 'pass'; // Replace with your desired password
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log('Hashed password:', hash);
}); 
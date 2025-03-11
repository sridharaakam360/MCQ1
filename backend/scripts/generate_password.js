const bcrypt = require('bcryptjs');

async function generateHashedPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Hashed password:', hashedPassword);
}

// Generate hashed passwords for test users
generateHashedPassword('admin123');
generateHashedPassword('user123'); 
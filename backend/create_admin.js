const bcrypt = require('bcrypt');
const { pool } = require('./src/config/db');

async function createAdmin() {
    const email = 'admin@iot.com';
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
        const res = await pool.query(
            'INSERT INTO users (name, email, password_hash, is_platform_admin) VALUES ($1, $2, $3, $4) RETURNING id',
            ['Platform Admin', email, passwordHash, true]
        );
        console.log('Created admin user successfully. Email:', email, 'Password:', password);
    } catch (err) {
        if (err.code === '23505') {
            console.log('User already exists, updating password and setting as admin...');
            await pool.query(
                'UPDATE users SET password_hash = $1, is_platform_admin = true WHERE email = $2',
                [passwordHash, email]
            );
            console.log('Updated admin user successfully. Email:', email, 'Password:', password);
        } else {
            console.error('Error creating admin:', err);
        }
    }
    await pool.end();
}

createAdmin();

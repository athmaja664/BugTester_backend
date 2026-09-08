const con = require('../config/db')

const Bugs = async () => {
    try {
        await con.query(`
            CREATE TABLE IF NOT EXISTS bugs (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'New',
                priority VARCHAR(20) DEFAULT 'Medium',
                assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
                reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `)
        console.log('Bugs table ready')
    } catch (err) {
        console.log('Error creating bugs table:', err.message)
    }
}

module.exports = Bugs
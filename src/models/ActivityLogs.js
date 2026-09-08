const con = require('../config/db')

const ActivityLog = async () => {
    await con.query(`
        CREATE TABLE IF NOT EXISTS activity_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `)
    console.log("Activity Log table ready")
}

module.exports = ActivityLog
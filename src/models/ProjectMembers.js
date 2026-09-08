const con = require('../config/db')

const ProjectMembers = async () => {
    await con.query(`
        CREATE TABLE IF NOT EXISTS project_members (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL CHECK (role IN ('Developer', 'Tester')),
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (project_id, user_id, role)
        )
    `)
    console.log("Project Members table ready")
}

module.exports = ProjectMembers
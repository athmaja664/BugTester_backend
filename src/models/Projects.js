const con = require('../config/db');

const Projects = async () => {
    await con.query(`
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'Planning'
                CHECK (status IN ('Planning', 'In Progress', 'Completed', 'On Hold')),
            start_date DATE,
            due_date DATE,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await con.query(`
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log("Projects table ready");
};

module.exports = Projects;
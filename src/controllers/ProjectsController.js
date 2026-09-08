const con = require('../config/db')

// CREATE PROJECT (Admin only)
exports.createProject = async (req, res) => {
    try {

        if (req.role !== 'Administrator') {
            return res.status(403).json({
                message: "Access denied"
            })
        }

        const name = req.body.name?.trim()
        const description = req.body.description?.trim()

        const { status, start_date, due_date, lead_id, developer_ids, tester_ids } = req.body

        const createdBy = req.payload

        if (!name) {
            return res.status(400).json({
                message: "Project name is required"
            })
        }

        const allowedStatuses = [
            'Planning',
            'In Progress',
            'Completed',
            'On Hold'
        ]

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            })
        }

        const result = await con.query(
            `INSERT INTO projects
            (name, description, status, start_date, due_date, created_by, lead_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                name,
                description,
                status || 'Planning',
                start_date || null,
                due_date || null,
                createdBy,
                lead_id || null
            ]
        )

        const project = result.rows[0]

        if (Array.isArray(developer_ids)) {
            for (const devId of developer_ids) {
                await con.query(
                    `INSERT INTO project_members (project_id, user_id, role)
                     VALUES ($1, $2, $3)
                     ON CONFLICT DO NOTHING`,
                    [project.id, devId, 'Developer']
                )
            }
        }

        if (Array.isArray(tester_ids)) {
            for (const testerId of tester_ids) {
                await con.query(
                    `INSERT INTO project_members (project_id, user_id, role)
                     VALUES ($1, $2, $3)
                     ON CONFLICT DO NOTHING`,
                    [project.id, testerId, 'Tester']
                )
            }
        }

        res.status(200).json({
            message: "Project created successfully",
            project
        })

    } catch (err) {
        console.log(err)
        res.status(500).json({
            error: err.message
        })

    }
}

// GET ALL PROJECTS (includes lead name and member list)
exports.getProjects = async (req, res) => {
    try {
        const result = await con.query(`
            SELECT projects.*, leadUser.name AS lead_name
            FROM projects
            LEFT JOIN users leadUser ON leadUser.id = projects.lead_id
            ORDER BY projects.id DESC
        `)

        const projects = result.rows

        for (const project of projects) {
            const members = await con.query(
                `SELECT users.id, users.name, users.email, project_members.role
                 FROM project_members
                 JOIN users ON users.id = project_members.user_id
                 WHERE project_members.project_id = $1`,
                [project.id]
            )
            project.members = members.rows
        }

        res.status(200).json({ projects })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// GET SINGLE PROJECT BY ID (includes lead name and member list)
exports.getProjectById = async (req, res) => {
    try {
        const { id } = req.params

        const result = await con.query(`
            SELECT projects.*, leadUser.name AS lead_name
            FROM projects
            LEFT JOIN users leadUser ON leadUser.id = projects.lead_id
            WHERE projects.id = $1
        `, [id])

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Project not found" })
        }

        const project = result.rows[0]

        const members = await con.query(
            `SELECT users.id, users.name, users.email, project_members.role
             FROM project_members
             JOIN users ON users.id = project_members.user_id
             WHERE project_members.project_id = $1`,
            [id]
        )
        project.members = members.rows

        res.status(200).json({ project })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// UPDATE PROJECT (Admin only)
exports.updateProject = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }
        const { id } = req.params
        const name = req.body.name?.trim()
        const description = req.body.description?.trim()
        const { status, start_date, due_date } = req.body

        const allowedStatuses = ['Planning', 'In Progress', 'Completed', 'On Hold']
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" })
        }

        const existing = await con.query('SELECT * FROM projects WHERE id = $1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Project not found" })
        }

        const result = await con.query(
            `UPDATE projects
             SET name = $1, description = $2, status = $3, start_date = $4, due_date = $5, updated_at = NOW()
             WHERE id = $6 RETURNING *`,
            [name, description, status, start_date || null, due_date || null, id]
        )

        res.status(200).json({ message: "Project updated successfully", project: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// UPDATE PROJECT MEMBERS (Admin only) — Lead + Developers + Testers
exports.updateProjectMembers = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }

        const { id } = req.params
        const { lead_id, developer_ids, tester_ids } = req.body

        const existing = await con.query('SELECT * FROM projects WHERE id = $1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Project not found" })
        }

        await con.query(
            'UPDATE projects SET lead_id = $1, updated_at = NOW() WHERE id = $2',
            [lead_id || null, id]
        )

        await con.query('DELETE FROM project_members WHERE project_id = $1', [id])

        if (Array.isArray(developer_ids)) {
            for (const devId of developer_ids) {
                await con.query(
                    `INSERT INTO project_members (project_id, user_id, role)
                     VALUES ($1, $2, $3)`,
                    [id, devId, 'Developer']
                )
            }
        }

        if (Array.isArray(tester_ids)) {
            for (const testerId of tester_ids) {
                await con.query(
                    `INSERT INTO project_members (project_id, user_id, role)
                     VALUES ($1, $2, $3)`,
                    [id, testerId, 'Tester']
                )
            }
        }

        res.status(200).json({ message: "Project members updated successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// GET PROJECTS ASSIGNED TO THE LOGGED-IN USER (Lead / Developer / Tester)
exports.getMyProjects = async (req, res) => {
    try {
        const userId = req.payload
        const role = req.role

        let result

        if (role === 'Lead') {
            result = await con.query(
                'SELECT * FROM projects WHERE lead_id = $1 ORDER BY id DESC',
                [userId]
            )
        } else if (role === 'Developer' || role === 'Tester') {
            result = await con.query(
                `SELECT projects.*
                 FROM projects
                 JOIN project_members ON project_members.project_id = projects.id
                 WHERE project_members.user_id = $1 AND project_members.role = $2
                 ORDER BY projects.id DESC`,
                [userId, role]
            )
        } else {
            result = await con.query('SELECT * FROM projects ORDER BY id DESC')
        }

        res.status(200).json({ projects: result.rows })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// GET ADMIN DASHBOARD STATS (Administrator only)
exports.getAdminStats = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }

        const userId = req.payload

        const projectsManaged = await con.query(
            'SELECT COUNT(*) FROM projects WHERE created_by = $1',
            [userId]
        )

        const teamMembers = await con.query(
            `SELECT COUNT(*) FROM users WHERE role != 'Administrator'`
        )

        const bugsReviewed = await con.query(
            `SELECT COUNT(*) FROM bugs WHERE status IN ('Verified', 'Closed')`
        )

        res.status(200).json({
            projectsManaged: Number(projectsManaged.rows[0].count),
            teamMembers: Number(teamMembers.rows[0].count),
            bugsReviewed: Number(bugsReviewed.rows[0].count)
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// DELETE PROJECT (Admin only)
exports.deleteProject = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }
        const { id } = req.params

        const existing = await con.query('SELECT * FROM projects WHERE id = $1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Project not found" })
        }

        await con.query('DELETE FROM projects WHERE id = $1', [id])

        res.status(200).json({ message: "Project deleted successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

module.exports = exports
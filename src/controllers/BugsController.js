const con = require('../config/db')

// CREATE BUG
exports.createBug = async (req, res) => {
    const { title, description, project_id, priority, assigned_to } = req.body
    const reportedBy = req.payload
    try {
        if (!['Administrator', 'Lead', 'Tester'].includes(req.role)) {
            return res.status(403).json({ message: "Access denied" })
        }

        if (!title || !project_id) {
            return res.status(400).json({ message: "Title and project are required" })
        }

        const status = assigned_to ? 'Assigned' : 'New'

        const result = await con.query(
            `INSERT INTO bugs(title,description,project_id,status,priority,assigned_to,reported_by)
             VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [title, description, project_id, status, priority || 'Medium', assigned_to || null, reportedBy]
        )

        res.status(200).json({ message: "Bug added successfully", newBug: result.rows[0] })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// GET BUGS (role-based)
exports.getBugs = async (req, res) => {
    const role = req.role
    const userId = req.payload
    try {
        let bugs

        if (role === 'Administrator' || role === 'Lead') {
            bugs = await con.query('SELECT * FROM bugs ORDER BY created_at DESC')
        }
        else if (role === 'Developer') {
            bugs = await con.query('SELECT * FROM bugs WHERE assigned_to=$1 ORDER BY created_at DESC', [userId])
        }
        else if (role === 'Tester') {
            bugs = await con.query('SELECT * FROM bugs WHERE reported_by=$1 ORDER BY created_at DESC', [userId])
        }
        else {
            return res.status(403).json({ message: "Access denied" })
        }

        res.status(200).json(bugs.rows)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// GET SINGLE BUG
exports.getBugById = async (req, res) => {
    const { id } = req.params
    const role = req.role
    const userId = req.payload
    try {
        const existing = await con.query('SELECT * FROM bugs WHERE id=$1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Bug not found" })
        }

        const bug = existing.rows[0]

        if (role === 'Developer' && bug.assigned_to !== userId) {
            return res.status(403).json({ message: "Access denied" })
        }
        if (role === 'Tester' && bug.reported_by !== userId) {
            return res.status(403).json({ message: "Access denied" })
        }

        res.status(200).json(bug)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// UPDATE BUG
exports.updateBug = async (req, res) => {
    const { id } = req.params
    const { title, description, status, priority, assigned_to } = req.body
    const role = req.role
    const userId = req.payload
    try {
        const existing = await con.query('SELECT * FROM bugs WHERE id=$1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Bug not found" })
        }

        const bug = existing.rows[0]

        if (role === 'Developer' && bug.assigned_to !== userId) {
            return res.status(403).json({ message: "Access denied" })
        }
        if (role === 'Tester' && bug.reported_by !== userId) {
            return res.status(403).json({ message: "Access denied" })
        }
        if (assigned_to !== undefined && !['Administrator', 'Lead'].includes(role)) {
            return res.status(403).json({ message: "Only Admin or Lead can reassign bugs" })
        }

        const updatedTitle = title || bug.title
        const updatedDescription = description ?? bug.description
        const updatedStatus = status || bug.status
        const updatedPriority = priority || bug.priority
        const updatedAssignedTo = assigned_to !== undefined ? assigned_to : bug.assigned_to

        const result = await con.query(
            `UPDATE bugs SET title=$1,description=$2,status=$3,priority=$4,assigned_to=$5,updated_at=NOW()
             WHERE id=$6 RETURNING *`,
            [updatedTitle, updatedDescription, updatedStatus, updatedPriority, updatedAssignedTo, id]
        )

        res.status(200).json({ message: "Bug updated", updatedBug: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// DELETE BUG
exports.deleteBug = async (req, res) => {
    const { id } = req.params
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }

        await con.query('DELETE FROM bugs WHERE id=$1', [id])
        res.status(200).json({ message: "Bug Deleted Successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

module.exports = exports
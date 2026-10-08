const con = require('../config/db')
const supabase = require('../config/supabaseStorage')

const allowedTags = ['Bug', 'Enhancement', 'Feature']

// adds the list of assignees to each bug row
const assigneesQuery = `(SELECT COALESCE(json_agg(json_build_object('id', users.id, 'name', users.name)), '[]'::json)
    FROM bug_assignments JOIN users ON users.id = bug_assignments.user_id
    WHERE bug_assignments.bug_id = bugs.id) AS assignees`

// CREATE BUG
exports.createBug = async (req, res) => {
    const { title, description, project_id, priority, status, tag } = req.body
    const reportedBy = req.payload
    try {
        if (!['Administrator', 'Lead', 'Tester'].includes(req.role)) {
            return res.status(403).json({ message: "Access denied" })
        }
        if (!title || !project_id) {
            return res.status(400).json({ message: "Title and project are required" })
        }
        if (tag && !allowedTags.includes(tag)) {
            return res.status(400).json({ message: "Invalid tag" })
        }

        // assignedTo comes as a JSON string when sent with files (FormData)
        let assignedTo = req.body.assignedTo || []
        if (typeof assignedTo === 'string') {
            assignedTo = JSON.parse(assignedTo)
        }
        assignedTo = [...new Set(assignedTo)]

        // every assignee must belong to this organization
        if (assignedTo.length > 0) {
            const members = await con.query(
                'SELECT user_id FROM organization_members WHERE organization_id=$1 AND user_id = ANY($2::int[])',
                [req.orgId, assignedTo]
            )
            if (members.rows.length !== assignedTo.length) {
                return res.status(400).json({ message: "Assignees must belong to your organization" })
            }
        }

        const bugStatus = status || (assignedTo.length > 0 ? 'Assigned' : 'New')
        const result = await con.query(
            `INSERT INTO bugs(title,description,project_id,status,priority,tag,assigned_to,reported_by,organization_id)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [title, description, project_id, bugStatus, priority || 'Medium', tag || 'Bug', assignedTo[0] || null, reportedBy, req.orgId]
        )
        const newBug = result.rows[0]

        // save each assignee
        for (const userId of assignedTo) {
            await con.query('INSERT INTO bug_assignments(bug_id, user_id) VALUES($1,$2)', [newBug.id, userId])
        }

        // upload each file to supabase storage and save its url
        const files = req.files || []
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
            const filePath = `${req.orgId}/${Date.now()}-${i}-${safeName}`
            const { error } = await supabase.storage
                .from('bug-attachments')
                .upload(filePath, file.buffer, { contentType: file.mimetype })
            if (error) throw error
            const { data } = supabase.storage.from('bug-attachments').getPublicUrl(filePath)
            await con.query(
                'INSERT INTO bug_attachments(bug_id, file_name, file_path, file_url, uploaded_by) VALUES($1,$2,$3,$4,$5)',
                [newBug.id, file.originalname, filePath, data.publicUrl, reportedBy]
            )
        }

        res.status(200).json({ message: "Bug added successfully", newBug })
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
            bugs = await con.query(
                `SELECT bugs.*, ${assigneesQuery} FROM bugs
                 WHERE bugs.organization_id=$1 ORDER BY bugs.created_at DESC`,
                [req.orgId]
            )
        }
        else if (role === 'Developer') {
            bugs = await con.query(
                `SELECT bugs.*, ${assigneesQuery} FROM bugs
                 WHERE bugs.organization_id=$1
                 AND bugs.id IN (SELECT bug_id FROM bug_assignments WHERE user_id=$2)
                 ORDER BY bugs.created_at DESC`,
                [req.orgId, userId]
            )
        }
        else if (role === 'Tester') {
            bugs = await con.query(
                `SELECT bugs.*, ${assigneesQuery} FROM bugs
                 WHERE bugs.organization_id=$1 AND bugs.reported_by=$2
                 ORDER BY bugs.created_at DESC`,
                [req.orgId, userId]
            )
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

// GET MY ISSUES (bugs assigned to the logged-in user)
exports.getMyIssues = async (req, res) => {
    try {
        const bugs = await con.query(
            `SELECT bugs.*, ${assigneesQuery},
             (SELECT name FROM projects WHERE projects.id = bugs.project_id) AS project_name
             FROM bugs
             WHERE bugs.organization_id=$1
             AND bugs.id IN (SELECT bug_id FROM bug_assignments WHERE user_id=$2)
             ORDER BY bugs.created_at DESC`,
            [req.orgId, req.payload]
        )
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
        const existing = await con.query(
            `SELECT bugs.*, ${assigneesQuery} FROM bugs WHERE bugs.id=$1 AND bugs.organization_id=$2`,
            [id, req.orgId]
        )
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Bug not found" })
        }

        const bug = existing.rows[0]
        const assigned = await con.query('SELECT 1 FROM bug_assignments WHERE bug_id=$1 AND user_id=$2', [id, userId])

        if (role === 'Developer' && assigned.rows.length === 0) {
            return res.status(403).json({ message: "Access denied" })
        }
        if (role === 'Tester' && bug.reported_by !== userId) {
            return res.status(403).json({ message: "Access denied" })
        }

        const attachments = await con.query('SELECT id, file_name, file_url FROM bug_attachments WHERE bug_id=$1', [id])
        bug.attachments = attachments.rows

        res.status(200).json(bug)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// UPDATE BUG
exports.updateBug = async (req, res) => {
    const { id } = req.params
    const { title, description, status, priority, tag } = req.body
    let assignedTo = req.body.assignedTo !== undefined ? req.body.assignedTo : req.body.assigned_to
    const changeAssignees = assignedTo !== undefined
    const role = req.role
    const userId = req.payload
    try {
        const existing = await con.query('SELECT * FROM bugs WHERE id=$1 AND organization_id=$2', [id, req.orgId])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Bug not found" })
        }
        const bug = existing.rows[0]
        const assigned = await con.query('SELECT 1 FROM bug_assignments WHERE bug_id=$1 AND user_id=$2', [id, userId])

        if (role === 'Developer' && assigned.rows.length === 0) {
            return res.status(403).json({ message: "Access denied" })
        }
        if (role === 'Tester' && bug.reported_by !== userId) {
            return res.status(403).json({ message: "Access denied" })
        }
        if (changeAssignees && !['Administrator', 'Lead'].includes(role)) {
            return res.status(403).json({ message: "Only Admin or Lead can reassign bugs" })
        }
        if (tag && !allowedTags.includes(tag)) {
            return res.status(400).json({ message: "Invalid tag" })
        }

        if (changeAssignees) {
            if (typeof assignedTo === 'string' && assignedTo.startsWith('[')) {
                assignedTo = JSON.parse(assignedTo)
            }
            if (!Array.isArray(assignedTo)) {
                assignedTo = assignedTo ? [Number(assignedTo)] : []
            }
            assignedTo = [...new Set(assignedTo)]

            if (assignedTo.length > 0) {
                const members = await con.query(
                    'SELECT user_id FROM organization_members WHERE organization_id=$1 AND user_id = ANY($2::int[])',
                    [req.orgId, assignedTo]
                )
                if (members.rows.length !== assignedTo.length) {
                    return res.status(400).json({ message: "Assignees must belong to your organization" })
                }
            }
        }

        const updatedTitle = title || bug.title
        const updatedDescription = description ?? bug.description
        const updatedStatus = status || bug.status
        const updatedPriority = priority || bug.priority
        const updatedTag = tag || bug.tag
        const updatedAssignedTo = changeAssignees ? (assignedTo[0] || null) : bug.assigned_to
        const result = await con.query(
            `UPDATE bugs SET title=$1,description=$2,status=$3,priority=$4,tag=$5,assigned_to=$6,updated_at=NOW()
             WHERE id=$7 AND organization_id=$8 RETURNING *`,
            [updatedTitle, updatedDescription, updatedStatus, updatedPriority, updatedTag, updatedAssignedTo, id, req.orgId]
        )

        if (changeAssignees) {
            await con.query('DELETE FROM bug_assignments WHERE bug_id=$1', [id])
            for (const uId of assignedTo) {
                await con.query('INSERT INTO bug_assignments(bug_id, user_id) VALUES($1,$2)', [id, uId])
            }
        }

        res.status(200).json({ message: "Bug updated", updatedBug: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// DELETE BUG (Admin, or the Lead who owns the bug's project)
exports.deleteBug = async (req, res) => {
    const { id } = req.params
    try {
        const existing = await con.query('SELECT * FROM bugs WHERE id=$1 AND organization_id=$2', [id, req.orgId])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Bug not found" })
        }
        const bug = existing.rows[0]
        if (req.role === 'Administrator') {
            await con.query('DELETE FROM bugs WHERE id=$1', [id])
            return res.status(200).json({ message: "Bug Deleted Successfully" })
        }
        if (req.role === 'Lead') {
            const project = await con.query('SELECT * FROM projects WHERE id=$1', [bug.project_id])
            if (project.rows.length === 0 || project.rows[0].lead_id !== req.payload) {
                return res.status(403).json({ message: "Access denied" })
            }
            await con.query('DELETE FROM bugs WHERE id=$1', [id])
            return res.status(200).json({ message: "Bug Deleted Successfully" })
        }
        return res.status(403).json({ message: "Access denied" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}
module.exports = exports
const con = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// SUPERADMIN LOGIN
exports.login = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase()
        const { password } = req.body
        const result = await con.query('SELECT * FROM superadmins WHERE email=$1', [email])
        const superAdmin = result.rows[0]
        if (!superAdmin) {
            return res.status(400).json({ message: "admin not found" })
        }
        const isMatch = await bcrypt.compare(password, superAdmin.password)
        if (!isMatch) {
            return res.status(401).json({ message: "invalid password" })
        }
        const token = jwt.sign({ id: superAdmin.id }, process.env.JWT_SECRET, { expiresIn: '2h' })
        res.status(200).json({
            message: "login success",
            token,
            superAdmin: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email }
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// CREATE ORGANIZATION (with its first Admin)
exports.createOrganization = async (req, res) => {
    const client = await con.connect()
    try {
        const orgName = req.body.orgName?.trim()
        const contactEmail = req.body.contactEmail?.trim().toLowerCase()
        const adminName = req.body.adminName?.trim()
        const adminEmail = req.body.adminEmail?.trim().toLowerCase()
        const { adminPassword } = req.body

        if (!orgName || !adminEmail) {
            return res.status(400).json({ message: "Organization name and admin email are required" })
        }

        const existingAdmin = await client.query('SELECT * FROM users WHERE email = $1', [adminEmail])
        if (existingAdmin.rows.length > 0) {
            return res.status(400).json({ message: "Admin email already in use" })
        }

        // everything from here on either all succeeds together, or all gets undone
        await client.query('BEGIN')
        const orgResult = await client.query(
            'INSERT INTO organizations(name, contact_email) VALUES($1, $2) RETURNING id',
            [orgName, contactEmail]
        )
        const organizationId = orgResult.rows[0].id

        const hashedPassword = await bcrypt.hash(adminPassword, 10)

        const userResult = await client.query(
            'INSERT INTO users(name, email, password, role) VALUES($1, $2, $3, $4) RETURNING id',
            [adminName, adminEmail, hashedPassword, 'Administrator']
        )
        const newAdminId = userResult.rows[0].id

        await client.query(
            'INSERT INTO organization_members(user_id, organization_id, role) VALUES($1, $2, $3)',
            [newAdminId, organizationId, 'Administrator']
        )

        await client.query('COMMIT')

        res.status(200).json({
            message: "Organization created successfully",
            organization: { id: organizationId, name: orgName },
            admin: { id: newAdminId, name: adminName, email: adminEmail }
        })
    }
   catch (err) {
    await client.query('ROLLBACK')
    console.log(err)
    if (err.code === '23505') {
        return res.status(400).json({ message: "Organization already exists" })
    }
    res.status(500).json({ message: "Something went wrong while creating the organization" })
}
    finally {
        client.release()
    }
}

//GET THE ORGANZIATION
exports.getOrganizations = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM organizations ORDER BY id DESC')
        res.status(200).json({ organizations: result.rows })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

//GET ORGNAZIATION BY ID
exports.getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params
        const result = await con.query('SELECT * FROM organizations WHERE id=$1', [id])
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Organization not found" })
        }
        const organization = result.rows[0]

        const members = await con.query(
            `SELECT users.id, users.name, users.email, organization_members.role
             FROM organization_members
             JOIN users ON users.id = organization_members.user_id
             WHERE organization_members.organization_id = $1`,
            [id]
        )
        organization.members = members.rows

        const projectCount = await con.query('SELECT COUNT(*) FROM projects WHERE organization_id=$1', [id])
        const bugCount = await con.query(
            "SELECT COUNT(*) FROM bugs WHERE organization_id=$1 AND status NOT IN ('Resolved', 'Verified', 'Closed')",
            [id]
        )
        organization.project_count = parseInt(projectCount.rows[0].count)
        organization.open_bug_count = parseInt(bugCount.rows[0].count)

        res.status(200).json({ organization })
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({ message: err.message })
    }
}

// UPDATE ORGANIZATION BILLING STATUS (activate or deactivate)
exports.updateBillingStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!['active', 'pending'].includes(status)) {
            return res.status(400).json({ message: "Status must be 'active' or 'pending'" })
        }

        const existing = await con.query('SELECT * FROM organizations WHERE id=$1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Organization not found" })
        }

        const result = await con.query(
            'UPDATE organizations SET billing_status=$1 WHERE id=$2 RETURNING id, name, billing_status',
            [status, id]
        )

        res.status(200).json({
            message: `Organization ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
            organization: result.rows[0]
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

module.exports = exports
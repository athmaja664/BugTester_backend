const con = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { logActivity } = require('./ActivityController')

// ADMIN REGISTER
exports.adminRegister = async (req, res) => {
    try {
        const name = req.body.name?.trim()
        const email = req.body.email?.trim().toLowerCase()
        const { password } = req.body
        const existing = await con.query('SELECT * FROM users WHERE email = $1', [email])
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: "Admin already exist" })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        await con.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
            [name, email, hashedPassword, 'Administrator']
        )
        res.status(200).json({ message: "Admin registered successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// LOGIN (Admin, Lead, Developer, Tester)
exports.login = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase()
        const { password } = req.body
        const result = await con.query('SELECT * FROM users WHERE email = $1', [email])
        const user = result.rows[0]
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" })
        }
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' })
        res.status(200).json({ message: "Login successful", token, user })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// ADMIN CREATES A USER (Lead / Developer / Tester)
exports.createUser = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }
        const name = req.body.name?.trim()
        const email = req.body.email?.trim().toLowerCase()
        const { password, role } = req.body

        const allowedRoles = ['Lead', 'Developer', 'Tester']
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role" })
        }

        const existing = await con.query('SELECT * FROM users WHERE email = $1', [email])
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const result = await con.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role]
        )

        await logActivity(req.payload, `Created ${role} account for ${name}`)

        res.status(200).json({ message: `${role} created successfully`, user: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// ADMIN GETS ALL USERS
exports.getUsers = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM users')
        res.status(200).json({ users: result.rows })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// ADMIN GETS A SINGLE USER BY ID
exports.getUserById = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }

        const { id } = req.params

        const result = await con.query(
            'SELECT id, name, email, role FROM users WHERE id = $1',
            [id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" })
        }

        res.status(200).json({ user: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// ADMIN DELETES A USER
exports.deleteUser = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }

        const { id } = req.params

        const existing = await con.query('SELECT * FROM users WHERE id = $1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "User not found" })
        }

        await con.query('DELETE FROM users WHERE id = $1', [id])

        await logActivity(req.payload, `Deleted user account for ${existing.rows[0].name}`)

        res.status(200).json({ message: "User deleted successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// ADMIN UPDATES A USER (name / email / role)
exports.updateUser = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }

        const { id } = req.params
        const name = req.body.name?.trim()
        const email = req.body.email?.trim().toLowerCase()
        const { role } = req.body

        const allowedRoles = ['Administrator', 'Lead', 'Developer', 'Tester']
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role" })
        }

        const existing = await con.query('SELECT * FROM users WHERE id = $1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "User not found" })
        }

        const emailTaken = await con.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, id])
        if (emailTaken.rows.length > 0) {
            return res.status(400).json({ message: "Email already in use" })
        }

        const result = await con.query(
            'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role',
            [name, email, role, id]
        )

        res.status(200).json({ message: "User updated successfully", user: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// ADMIN RESETS A USER'S PASSWORD
exports.resetUserPassword = async (req, res) => {
    try {
        if (req.role !== 'Administrator') {
            return res.status(403).json({ message: "Access denied" })
        }

        const { id } = req.params
        const { newPassword } = req.body

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" })
        }

        const existing = await con.query('SELECT * FROM users WHERE id = $1', [id])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "User not found" })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await con.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, id]
        )

        await logActivity(req.payload, `Reset password for ${existing.rows[0].name}`)

        res.status(200).json({ message: "Password reset successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// GET MY OWN PROFILE (any logged-in role)
exports.getMyProfile = async (req, res) => {
    try {
        const userId = req.payload

        const result = await con.query(
            'SELECT id, name, email, role, phone, location, created_at FROM users WHERE id = $1',
            [userId]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" })
        }

        res.status(200).json({ user: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// UPDATE MY OWN PROFILE (any logged-in role)
exports.updateMyProfile = async (req, res) => {
    try {
        const userId = req.payload
        const name = req.body.name?.trim()
        const phone = req.body.phone?.trim()
        const location = req.body.location?.trim()

        const result = await con.query(
            `UPDATE users
             SET name = $1, phone = $2, location = $3, updated_at = NOW()
             WHERE id = $4
             RETURNING id, name, email, role, phone, location`,
            [name, phone, location, userId]
        )

        await logActivity(userId, "Updated profile information")

        res.status(200).json({ message: "Profile updated successfully", user: result.rows[0] })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

// CHANGE MY OWN PASSWORD (any logged-in role)
exports.changeMyPassword = async (req, res) => {
    try {
        const userId = req.payload
        const { currentPassword, newPassword } = req.body

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" })
        }

        const existing = await con.query('SELECT * FROM users WHERE id = $1', [userId])
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "User not found" })
        }

        const isMatch = await bcrypt.compare(currentPassword, existing.rows[0].password)
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await con.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId])

        await logActivity(userId, "Changed account password")

        res.status(200).json({ message: "Password changed successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

module.exports = exports
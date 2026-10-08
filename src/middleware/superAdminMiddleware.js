const jwt = require('jsonwebtoken')
const con = require('../config/db')

const superAdminMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "No token provided" })
        }
        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const result = await con.query('SELECT id, name, email FROM superadmins WHERE id=$1', [decoded.id])
        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Not authorized as superadmin" })
        }

        req.superAdmin = result.rows[0]
        next()
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

module.exports = superAdminMiddleware
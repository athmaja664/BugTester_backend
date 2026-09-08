const con = require('../config/db')

// HELPER — call this from other controllers to record an action
exports.logActivity = async (userId, message) => {
    try {
        await con.query(
            'INSERT INTO activity_log (user_id, message) VALUES ($1, $2)',
            [userId, message]
        )
    } catch (err) {
        console.log(err)
    }
}

// GET RECENT ACTIVITY FOR LOGGED-IN USER
exports.getRecentActivity = async (req, res) => {
    try {
        const userId = req.payload

        const result = await con.query(
            'SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
            [userId]
        )

        res.status(200).json({ activity: result.rows })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

module.exports = exports
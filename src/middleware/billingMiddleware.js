const con = require('../config/db')

// blocks access if the user's organization isn't active
const billingMiddleware = async (req, res, next) => {
    try {
        const result = await con.query('SELECT billing_status FROM organizations WHERE id=$1', [req.orgId])

        if (result.rows.length === 0) {
            return res.status(403).json({ message: "Organization not found" })
        }

        if (result.rows[0].billing_status !== 'active') {
            return res.status(403).json({
                code: 'ORG_INACTIVE',
                message: "Your organization's account is inactive. Please contact your administrator or support."
            })
        }

        next()
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: "Something went wrong" })
    }
}

module.exports = billingMiddleware
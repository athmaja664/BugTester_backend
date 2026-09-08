const jwt = require('jsonwebtoken')

const jwtMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ message: "Token not found" })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.payload = decoded.id
        req.role = decoded.role

        next()
    }
    catch (err) {
        console.log(err.message)
        res.status(401).json({ message: "Invalid or expired token" })
    }
}

module.exports = jwtMiddleware
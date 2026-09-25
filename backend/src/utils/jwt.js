const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "civicsync_secure_jwt_secret_key_2026";

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function verifyToken(token) {
    return jwt.verify(
        token,
        JWT_SECRET
    );
}

module.exports = {
    generateToken,
    verifyToken
};
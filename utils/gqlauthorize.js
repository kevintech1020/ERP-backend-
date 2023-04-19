const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

gqlauthorize = context => {
    let token = context.header('authorization');
    if (!token || !token.split(" ")[1]) {
        return false;
    } else {
        token = token.split(" ")[1];
        try {
            var decoded = jwt.verify(token, secret);
            return decoded;
        } catch (e) {
            return false;
        }
    }
}

module.exports = gqlauthorize;
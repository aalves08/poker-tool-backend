const jwt = require('jsonwebtoken');

const createSessionToken = ({ username, uid }) => {
  const token = jwt.sign({ username, uid }, process.env.JWT_TOKEN_SECRET);
  return token;
};

const validateSessionToken = (token) => {
  const decode = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
  return decode;
};

module.exports = { createSessionToken, validateSessionToken };

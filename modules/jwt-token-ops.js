const jwt = require('jsonwebtoken');
const { checkGithubOauthToken } = require('./github-oauth');

const createSessionToken = (data) => {
  const token = jwt.sign({ ...data }, process.env.JWT_TOKEN_SECRET);
  return token;
};

const validateSessionToken = async (token) => {
  let isValid = false;
  const decode = jwt.verify(token, process.env.JWT_TOKEN_SECRET);

  if (decode && decode.accessToken) {
    isValid = await checkGithubOauthToken(decode.accessToken);
  }

  return isValid ? { username: decode.username, avatar: decode.avatar } : isValid;
};

module.exports = { createSessionToken, validateSessionToken };

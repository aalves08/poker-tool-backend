const axios = require('axios');
const qs = require('qs');

const getGithubOauthToken = async ({ code }) => {
  const rootUrl = 'https://github.com/login/oauth/access_token';
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    code,
  };

  const queryString = qs.stringify(options);

  const reqData = await axios.post(`${rootUrl}?${queryString}`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (reqData.status !== 200) {
    return { error: true, errorData: reqData };
  }

  const decoded = qs.parse(reqData.data);
  return decoded;
};

const getGithubUser = async ({ accessToken }) => {
  const reqData = await axios.get(
    'https://api.github.com/user',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (reqData.status !== 200) {
    return { error: true, errorData: reqData };
  }

  return reqData.data;
};

const checkRancherOrgMembership = async ({ user, accessToken }) => {
  const reqData = await axios.get(
    `https://api.github.com/orgs/rancher/members/${user}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (reqData.status !== 204) {
    return { error: true, errorData: reqData };
  }

  return true;
};

const checkGithubOauthToken = async (accessToken) => {
  const reqData = await axios.get(
    'https://api.github.com/user/repos',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (reqData.status === 401) {
    return false;
  }

  return true;
};

const handleGithubLogin = async ({ code }) => {
  const oauthToken = await getGithubOauthToken({ code });

  if (oauthToken.error && oauthToken.errorData) {
    return { error: true, errorData: 'no_oauth_token' };
  }

  const userData = await getGithubUser({ accessToken: oauthToken.access_token });

  if (userData.error && userData.errorData) {
    return { error: true, errorData: 'no_user' };
  }

  const membershipCheck = await checkRancherOrgMembership({
    user: userData.login,
    accessToken: oauthToken.access_token,
  });

  if (membershipCheck.error && membershipCheck.errorData) {
    return { error: true, errorData: 'not_member' };
  }

  return {
    username: userData.login,
    avatar: userData.avatar_url,
    fullName: userData.name,
    accessToken: oauthToken.access_token,
    githubToken: process.env.VUE_APP_API_TOKEN,
  };
};

module.exports = { handleGithubLogin, checkGithubOauthToken };

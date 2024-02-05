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

  try {
    const { data } = await axios.post(`${rootUrl}?${queryString}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const decoded = qs.parse(data);

    return decoded;
  } catch (err) {
    throw Error(err);
  }
};

const getGithubUser = async ({ accessToken }) => {
  try {
    const { data } = await axios.get(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return data;
  } catch (err) {
    throw Error(err);
  }
};

const checkRancherOrgMembership = async ({ user, accessToken }) => {
  try {
    const data = await axios.get(
      `https://api.github.com/orgs/rancher/members/${user}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // data.status === 204 belongs to org
    return data;
  } catch (err) {
    throw Error(err);
  }
};

module.exports = { getGithubOauthToken, getGithubUser, checkRancherOrgMembership };

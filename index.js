const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
// const redis = require('redis');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const { handleUserConnect, checkRoom } = require('./modules/api');
const { getGithubOauthToken, getGithubUser, checkRancherOrgMembership } = require('./modules/github-oauth');

// express init
const app = express();

// setup cors and body-parser
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const httpServer = createServer(app);

// setup redis
// const redisClient = redis.createClient(6379, '127.0.0.1');

// Connect to redis server
// (async () => {
//   await redisClient.connect();
// })();

// redisClient.on('connect', () => {
//   console.log('REDIS Connected!');

//   const io = new Server(httpServer, {
//     cors: {
//       origin: 'http://localhost:4000',
//       methods: ['GET', 'POST'],
//     },
//   });

//   io.on('connection', (socket) => {
//     handleUserConnect(socket, io, redisClient);
//   });
// });

// init socketio
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  handleUserConnect(socket, io);
});

// check session id
app.post('/api/checkRoom', (req, res) => {
  const { room } = req.body;
  const session = checkRoom(room);
  res.send(session);
});

// Github oauth callback
app.get('/api/auth/callback/github', async (req, res) => {
  console.log('-------------------------');
  console.log('req ******', req.query);

  const { code } = req.query;

  // TODO: handle errors in FE
  if (req.query.error) {
    return res.redirect(`${process.env.FE_ORIGIN}?error=${encodeURIComponent(req.query.error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FE_ORIGIN}?error=no_code`);
  }

  const data1 = await getGithubOauthToken({ code });
  console.log('data1 ******', data1);
  const data2 = await getGithubUser({ accessToken: data1.access_token });
  console.log('data2 ******', data2);
  const data3 = await checkRancherOrgMembership({
    user: data2.login,
    accessToken: data1.access_token,
  });
  console.log('data3 ******', data3);

  return res.redirect(process.env.FE_ORIGIN);
});

httpServer.listen(8080, () => {
  console.log('Server is running...', process.env.GITHUB_CLIENT_ID);
});

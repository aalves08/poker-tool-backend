const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./db/mongodbConnection');

dotenv.config();

const { handleUserConnect, checkRoom } = require('./modules/api');
const { handleGithubLogin } = require('./modules/github-oauth');
const { createSessionToken, validateSessionToken } = require('./modules/jwt-token-ops');


// Connect to MongoDB before starting the server
connectDB().then(() => {
  // express init
  const app = express();

  // setup cors and body-parser
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  const httpServer = createServer(app);

  // init socketio
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', async (socket) => {
    await handleUserConnect(socket, io);
  });

  // validate user token
  app.post('/api/validateToken', async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.send(false);
    }

    const isValid = await validateSessionToken(token);

    if (isValid) {
      return res.send(isValid);
    }

    return res.redirect(401, `${process.env.FE_ORIGIN}?error=invalid_token`);
  });

  // check session id
  app.post('/api/checkRoom', async (req, res) => {
    const { room } = req.body;
    const session = await checkRoom(room);
    res.send(session);
  });

  // Github oauth callback
  app.get('/api/auth/callback/github', async (req, res) => {
    const { code } = req.query;

    // TODO: handle errors in FE
    if (req.query.error) {
      return res.redirect(`${process.env.FE_ORIGIN}?error=${encodeURIComponent(req.query.error)}`);
    }

    if (!code) {
      return res.redirect(`${process.env.FE_ORIGIN}?error=no_code`);
    }

    const data = await handleGithubLogin({ code });

    if (data.error) {
      return res.redirect(`${process.env.FE_ORIGIN}?error=${encodeURIComponent(data.errorData)}`);
    }

    const sessionToken = createSessionToken(data);
    console.log(`User ${data.username} has logged in to the app with sessionToken ${sessionToken}`); // eslint-disable-line no-console

    return res.redirect(`${process.env.FE_ORIGIN}?sessionToken=${encodeURIComponent(sessionToken)}&username=${encodeURIComponent(data.username)}&avatar=${encodeURIComponent(data.avatar)}`);
  });

  httpServer.listen(8080, () => {
    console.log('Server is running...');
  });
});

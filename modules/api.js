const databaseOps = require('../db/databaseOps');

// helper function to disconnect from room
async function disconnectFromRoom({ socket, socketId, roomId }) {
  const currSession = await databaseOps.getSession(room);
  const index = currSession.users.findIndex((user) => user.socketId === socketId);

  if (index >= 0) {
    currSession.users.splice(index, 1);
  }

  // update db with the new users list
 const newSession = await databaseOps.updateUsers(roomId, session.users);

  console.log(`disconnectFromRoom ::: Users database after disconnect ${session.users} in room ${roomId}`); // eslint-disable-line no-console

  // update session on all clients
  socket.nsp.to(roomId).emit('updateSession', newSession);
  // notifiy all users that socketID can disconnect (client will enforce it for the user)
  socket.nsp.to(roomId).emit('canDisconnect', socketId);

}

// check if room id exists
const checkRoom = async (roomId) => {
  const session = await databaseOps.getSession(roomId);
  return session;
};

// handle user connection to websockets
// socket, io, redisClient
const handleUserConnect = async (socket) => {
  // socket data
  const { id } = socket;

  // user data
  const { role, username, avatar, userId } = socket.handshake.query;

  // room/session data
  const { room, sessionName } = socket.handshake.query;

  console.log(`User ${username} with userId ${userId} connected on room ${room} with sessionName ${sessionName} with socket id ${id}`); // eslint-disable-line no-console

  const defaultSessionData = {
    roomId: room,
    sessionName,
    users: [],
    issues: []
  }

  // check database to see if session exists
  const session = await databaseOps.getSession(room) || defaultSessionData;

  // join room (websockets)
  socket.join(room);

  // update sessionName (if it didn't exist yet)
  if (!session.sessionName && sessionName && sessionName.length) {
    session.sessionName = sessionName;
  }

  // update users
  const userFoundIndex = session.users?.findIndex((user) => user.userId === userId);

  if (typeof userFoundIndex === 'number' && userFoundIndex >= 0) {
    session.users[userFoundIndex].username = username;
    session.users[userFoundIndex].avatar = avatar;
    session.users[userFoundIndex].socketId = id;
  } else {
    session.users.push({
      role,
      username,
      avatar,
      userId,
      socketId: id,
    });
  }

  // update database
  const newSession = await databaseOps.createOrUpdateSession(room, session);

  // update session on all clients after first connection
  setTimeout(() => {
    socket.nsp.to(room).emit('updateSession', newSession);
  }, 300);

  // **EVENT** disconnect
  socket.on('disconnect', (reason) => {
    console.log(`***** Socket EV "disconnect" ::: User ${username} disconnected on room ${room}: ${reason}`); // eslint-disable-line no-console
  });

  // **EVENT** event to trigger disconnect from room
  socket.on('disconnectFromRoom', async (socketId) => {
    console.log(`***** Socket EV "disconnectFromRoom" ::: Disconnecting from room ${room} with socketId ${socketId}`); // eslint-disable-line no-console

    await disconnectFromRoom({
      socket,
      socketId,
      room,
    });
  });

  // **EVENT** leave room (needs to be a different event so that we can forcefully remove a user)
  socket.on('leaveRoom', (socketId) => {
    // if it's the same socket leaving, do socket.leave
    if (socketId === id) {
      console.log(`***** Socket EV "leaveRoom" ::: User ${username} left the room ${room} with socketId ${socketId}`); // eslint-disable-line no-console
      socket.leave(room);
    }
  });

  // **EVENT** force remove user
  socket.on('forceRemoveUser', async (socketId) => {
    console.log(`***** Socket EV "forceRemoveUser" ::: Forcefully removing user ${username} on room ${room} with socketId ${socketId}`); // eslint-disable-line no-console

    await disconnectFromRoom({
      socket,
      socketId,
      room,
    });
  });

  // **EVENT** update session name
  socket.on('updateSessionName', async (newSessionName) => {
    console.log(`***** Socket EV "updateSessionName" ::: Updating session with new session name ${newSessionName} on room ${room}`); // eslint-disable-line no-console
    const currSession = await databaseOps.getSession(room);

    currSession.sessionName = newSessionName;
    const newSession = await databaseOps.createOrUpdateSession(room, currSession);

    // update session on all clients
    socket.nsp.to(room).emit('updateSession', newSession);
  });

  // **EVENT** update admin route
  socket.on('updateAdminCurrRoute', (adminRoute) => {
    console.log(`***** Socket EV "updateAdminCurrRoute" ::: Updating all clients with new admin route ${adminRoute} on room ${room} (data not in db)`); // eslint-disable-line no-console

    // update admin route on all clients
    socket.nsp.to(room).emit('updateAdminCurrRoute', adminRoute);
  });

  // **EVENT** update issues list
  socket.on('updateIssuesList', async (issues) => {
    console.log(`***** Socket EV "updateIssuesList" ::: Updating session with new issues list ${issues} on room ${room}`); // eslint-disable-line no-console
    
    const newSession = await databaseOps.updateIssues(room, issues);

    // update session on all clients
    socket.nsp.to(room).emit('updateSession', newSession);
  });

  // **EVENT** update voting issue status
  socket.on('updateVotingIssueStatus', async ({ issueId, started, stopped }) => {
    console.log(`***** Socket EV "updateVotingIssueStatus" ::: Updating voting issue status on issue ${issueId} - started: ${started} - stopped: ${stopped} - on room ${room}`); // eslint-disable-line no-console
    const currSession = await databaseOps.getSession(room);

    const issueIndex = currSession.issues?.findIndex((issue) => issue.number == issueId);

    if (issueIndex >= 0) {
      if (started) {
        currSession.issues[issueIndex].votingInProgress = true;
      } else if (stopped) {
        currSession.issues[issueIndex].votingInProgress = false;
        currSession.issues[issueIndex].finishedUserVoting = true;
      }

      const newSession = await databaseOps.updateIssues(room, currSession.issues);

      // update session on all clients
      socket.nsp.to(room).emit('updateSession', newSession);
    }
  });

  // **EVENT** users voting on issue
  socket.on('castVoteOnIssue', async ({ issueId, vote }) => {
    let stringifiedVote;

    if (vote) {
      stringifiedVote = JSON.stringify(vote, null, 2);
    }
    console.log(`***** Socket EV "castVoteOnIssue" ::: User ${userId} is casting a vote on issue ${issueId} - vote: ${stringifiedVote} - on room ${room}`); // eslint-disable-line no-console
    const currSession = await databaseOps.getSession(room);

    const issueIndex = session.issues?.findIndex((issue) => issue.number == issueId);

    console.log('!*!*!*!*!*!* issueIndex', issueIndex);

    if (issueIndex >= 0) {
      const userVoteIndex = currSession.issues[issueIndex].votes
        .findIndex((v) => v.userId === userId);

      if (userVoteIndex >= 0) {
        currSession.issues[issueIndex].votes[userVoteIndex].vote = vote;
      } else {
        currSession.issues[issueIndex].votes.push({
          userId,
          vote,
        });
      }

      const newSession = await databaseOps.updateIssues(room, currSession.issues);

      // update session on all clients
      socket.nsp.to(room).emit('updateSession', newSession);
    }
  });

  // **EVENT** final admin vote
  socket.on('finalizeVoting', async ({ issueId, vote }) => {
    console.log(`***** Socket EV "finalizeVoting" ::: Finalizing vote on issue ${issueId} - vote: ${vote} - on room ${room}`); // eslint-disable-line no-console
    const currSession = await databaseOps.getSession(room);
    const issueIndex = currSession.issues?.findIndex((issue) => issue.number == issueId);

    if (issueIndex >= 0) {
      currSession.issues[issueIndex].finalVote = vote;
      const newSession = await databaseOps.updateIssues(room, currSession.issues);

      // update session on all clients
      socket.nsp.to(room).emit('updateSession', newSession);
    }
  });

  // **EVENT** reset issue
  socket.on('resetIssue', async ({ issueId }) => {
    console.log(`***** Socket EV "resetIssue" ::: Resetting issue ${issueId} on room ${room}`); // eslint-disable-line no-console
    const currSession = await databaseOps.getSession(room);
    const issueIndex = currSession.issues?.findIndex((issue) => issue.number == issueId);

    if (issueIndex >= 0) {
      currSession.issues[issueIndex].finalVote = null;
      currSession.issues[issueIndex].votingInProgress = false;
      currSession.issues[issueIndex].finishedUserVoting = false;
      currSession.issues[issueIndex].votes = Object.assign([], []);

      const newSession = await databaseOps.updateIssues(room, currSession.issues);

      // update session on all clients
      socket.nsp.to(room).emit('updateSession', newSession);
    }
  });

  // **EVENT** make user an admin and demote previous admin
  socket.on('makeAdmin', async ({ user }) => {
    console.log(`***** Socket EV "makeAdmin" ::: Making user an admin, user ${user} on room ${room}`); // eslint-disable-line no-console
    const currSession = await databaseOps.getSession(room);
    const userIndex = currSession.users.findIndex((u) => u.userId === user.userId);

    if (userIndex >= 0) {
      currSession.users[userIndex].role = 'admin';
    }

    const demoteUserIndex = currSession.users.findIndex((u) => u.userId === userId);

    if (demoteUserIndex >= 0) {
      currSession.users[demoteUserIndex].role = 'user';
    }

    const newSession = await databaseOps.updateUsers(room, currSession.users);

    // update session on all clients
    socket.nsp.to(room).emit('updateSession', newSession);
  });
};

module.exports = { handleUserConnect, checkRoom };

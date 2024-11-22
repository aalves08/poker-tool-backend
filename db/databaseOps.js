const Session = require('../models/session');

const databaseOps = {
  async getSession(roomId) {
    try {
      const session = await Session.findOne({ roomId });
      console.log('databaseOps "getSession" ::: success');  // eslint-disable-line no-console
      return session;
    } catch (error) {
      console.error('databaseOps "getSession" ::: Error getting session from db:', error);  // eslint-disable-line no-console
      return null;
    }
  },

  async createOrUpdateSession(roomId, sessionData) {
    try {
      const session = await Session.findOneAndUpdate(
        { roomId },
        { ...sessionData },
        { upsert: true, new: true }
      );
      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  },

  async updateUsers(roomId, users) {
    try {
      const session = await Session.findOneAndUpdate(
        { roomId },
        { users },
        { new: true }
      );
      return session;
    } catch (error) {
      console.error('Error updating users:', error);
      return null;
    }
  },

  async updateIssues(roomId, issues) {
    try {
      const session = await Session.findOneAndUpdate(
        { roomId },
        { issues },
        { new: true }
      );
      
      return session;
    } catch (error) {
      console.error('Error updating issues:', error);
      return null;
    }
  }
};

module.exports = databaseOps;
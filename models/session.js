const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  userId: String,
  vote: {
    label: String,
    value: String,
    deterministic: Boolean
  }
});

const IssueSchema = new mongoose.Schema({
  url: String,
  repository_url: String,
  labels_url: String,
  comments_url: String,
  events_url: String,
  html_url: String,
  id: Number,
  node_id: String,
  number: String,
  title: String,
  user: mongoose.Mixed,
  labels: mongoose.Mixed,
  state: String,
  locked: Boolean,
  assignee: mongoose.Mixed,
  assignees: mongoose.Mixed,
  milestone: mongoose.Mixed,
  comments: Number,
  created_at: String,
  updated_at: String,
  closed_at: String,
  author_association: String,
  active_lock_reason: String,
  draft: Boolean,
  pull_request: mongoose.Mixed,
  body: String,
  closed_by: mongoose.Mixed,
  reactions: mongoose.Mixed,
  timeline_url: String,
  performed_via_github_app: mongoose.Mixed,
  state_reason: String,
  parsedCreationDate: String,
  voted: Boolean,
  votingInProgress: { type: Boolean, default: false },
  finishedUserVoting: { type: Boolean, default: false },
  votes: [VoteSchema],
  finalVote: Number
});

const UserSchema = new mongoose.Schema({
  role: String,
  username: String,
  avatar: String,
  userId: String,
  socketId: String
});

const SessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  sessionName: { type: String, default: '' },
  users: [UserSchema],
  issues: [IssueSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Session', SessionSchema);


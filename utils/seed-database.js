'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const Note = require('../models/note');
const Folder = require('../models/folder');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.info('Dropping Database');
    return mongoose.connection.db.dropDatabase();
  })
  .then(() => {
    console.info('Seeding Database');
    return Promise.all([
      Note.insertMany(seedNotes),
      Folder.insertMany(seedFolders),
      Folder.createIndexes()
    ]);
  })
  .then(() => {
    console.info('Disconnecting');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
    db.disconnect();
  });

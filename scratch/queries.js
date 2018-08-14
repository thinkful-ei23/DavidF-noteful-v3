'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Note = require('../models/note');

//Find a note with searchTerm in title
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    const searchTerm = 'about cats';

    return Note.find()
      .or([
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } }
      ])
      .sort({ updatedAt: 'desc' });
  })
  .then(results => {
    console.log(results);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });

//Find a note by ID
// mongoose
//   .connect(MONGODB_URI)
//   .then(() => {
//     const noteId = '000000000000000000000007';
//     return Note.findById(noteId);
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

//Create a new note
// mongoose.connect(MONGODB_URI).then(() => {
//   Note.create({
//     title: 'A new Note',
//     content: 'A story of an ice planet'
//   })
//     .then(results => {
//       console.log(results);
//     })
//     .then(() => {
//       return mongoose.disconnect();
//     })
//     .catch(err => {
//       console.error(`ERROR: ${err.message}`);
//       console.error(err);
//     });
// });

//Find a note by ID and update it
// mongoose
//   .connect(MONGODB_URI)
//   .then(() => {
//     const noteId = '5b73261edaa958d9494b61b0';
//     const updateObj = {
//       title: 'Return of the Update',
//       content: 'The update makes a comeback'
//     };
//     return Note.findByIdAndUpdate(noteId, updateObj, {new: true});
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

//Delete a note by id
// mongoose
//   .connect(MONGODB_URI)
//   .then(() => {
//     const noteId = '5b73261edaa958d9494b61b0';
//     return Note.findByIdAndRemove(noteId);
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

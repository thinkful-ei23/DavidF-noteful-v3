'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      const { searchTerm } = req.query;
      if (searchTerm) {
        return Note.find()
          .or([
            { title: { $regex: searchTerm, $options: 'i' } },
            { content: { $regex: searchTerm, $options: 'i' } }
          ])
          .sort({ updatedAt: 'desc' });
      }
      return Note.find().sort({ updatedAt: 'desc' });
    })
    .then(results => {
      res.json(results);
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      const noteId = req.params.id;
      return Note.findById(noteId);
    })
    .then(results => {
      res.json(results);
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  mongoose.connect(MONGODB_URI).then(() => {
    const { title, content } = req.body;
    Note.create({
      title,
      content
    })
      .then(results => {
        res
          .location(`${req.originalUrl}/${req.id}`)
          .status(201)
          .json(results);
      })
      .then(() => {
        return mongoose.disconnect();
      })
      .catch(err => {
        console.error(`ERROR: ${err.message}`);
        console.error(err);
      });
  });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      const noteId = req.params.id;
      const { title, content } = req.body;
      const updateObj = {
        title,
        content
      };
      return Note.findByIdAndUpdate(noteId, updateObj, { new: true });
    })
    .then(results => {
      if (results) {
        res
          .location(`${req.originalUrl}/${req.id}`)
          .status(201)
          .json(results);
      }
      return next();
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      const noteId = req.params.id;
      return Note.findByIdAndRemove(noteId);
    })
    .then(() => {
      res.sendStatus(204);
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      next(err);
    });
});

module.exports = router;

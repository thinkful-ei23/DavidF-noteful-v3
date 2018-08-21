'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const { MONGODB_URI } = require('../config');

const Tag = require('../models/tags');
const Note = require('../models/note');

const router = express.Router();

// Protect endpoints using JWT Strategy
router.use(
  '/',
  passport.authenticate('jwt', { session: false, failWithError: true })
);

//Get all tags and sort by name
router.get('/', (req, res, next) => {
  const { searchTerm } = req.query;
  let filter = {};

  if (searchTerm) {
    filter.name = { $regex: searchTerm, $options: 'i' };
  }

  Tag.find(filter)
    .sort({ name: 'asc' })
    .then(results => res.json(results))
    .catch(err => next(err));
});

//Get tag by id
router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Tag.findById(id)
    .then(result => {
      result ? res.json(result) : next();
    })
    .catch(err => next(err));
});

//Post a new tag
router.post('/', (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  const newTag = { name };

  Tag.create(newTag)
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

//PUT tag by id to update name
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  const updateTag = { name };

  Tag.findByIdAndUpdate(id, updateTag, { new: true })
    .then(result => (result ? res.json(result) : next()))
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

// DELETE a tag by id
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  const tagRemovePromise = Tag.findByIdAndRemove(id);
  const noteRemovePromise = Note.updateMany(
    {},
    { $pull: { tags: { $in: [id] } } }
  );

  Promise.all([tagRemovePromise, noteRemovePromise])
    .then(() => res.status(204).end())
    .catch(err => next(err));
});
module.exports = router;

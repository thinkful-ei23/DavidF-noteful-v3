'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

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
  const userId = req.user.id;
  let filter = { userId };

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
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Tag.findOne({ _id: id, userId })
    .then(result => {
      result ? res.json(result) : next();
    })
    .catch(err => next(err));
});

//Post a new tag
router.post('/', (req, res, next) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  const newTag = { name, userId };

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
  const userId = req.user.id;

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

  Tag.findOneAndUpdate({ _id: id, userId }, updateTag, { new: true })
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
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  const tagRemovePromise = Tag.findOneAndRemove({ _id: id, userId });
  const noteRemovePromise = Note.updateMany(
    { tags: id, userId },
    { $pull: { tags: id } }
  );

  Promise.all([tagRemovePromise, noteRemovePromise])
    .then(() => res.status(204).end())
    .catch(err => next(err));
});
module.exports = router;

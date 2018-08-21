'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const { MONGODB_URI } = require('../config');

const Folder = require('../models/folder');
const Note = require('../models/note');

const router = express.Router();

// Protect endpoints using JWT Strategy
router.use(
  '/',
  passport.authenticate('jwt', { session: false, failWithError: true })
);

//GET all folders
router.get('/', (req, res, next) => {
  const { searchTerm } = req.query;
  let filter = {};

  if (searchTerm) {
    filter.name = { $regex: searchTerm, $options: 'i' };
  }

  Folder.find(filter)
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => next(err));
});

//GET folder by id
router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Folder.findById(id)
    .then(result => {
      result ? res.json(result) : next();
    })
    .catch(err => next(err));
});

//POST a new folder
router.post('/', (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  const newFolder = { name };

  Folder.create(newFolder)
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;
      }
      next(err);
    });
});

//PUT folder by id to update name
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

  const updateFolder = { name };

  Folder.findByIdAndUpdate(id, updateFolder, { new: true })
    .then(result => {
      result ? res.json(result) : next();
    })
    .catch(err => next(err));
});

//DELETE a folder by id
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  const folderRemovePromise = Folder.findByIdAndRemove(id);
  const noteRemovePromise = Note.updateMany(
    { folderId: id },
    { $unset: { folderId: '' } }
  );

  Promise.all([folderRemovePromise, noteRemovePromise])
    .then(() => res.status(204).end())
    .catch(err => next(err));
});

module.exports = router;

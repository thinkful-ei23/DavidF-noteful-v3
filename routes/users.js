'use strict';

const express = require('express');
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');

const User = require('../models/users');

const router = express.Router();

//POST a new user
router.post('/', (req, res, next) => {
  const { fullname, username } = req.body;

  if (!username) {
    const err = new Error('Missing `username` in request body');
    err.status = 400;
    return next(err);
  }

  const newUser = { fullname, username };

  User.create(newUser)
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

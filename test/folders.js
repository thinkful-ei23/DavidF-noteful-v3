'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config');

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');

const Folder = require('../models/folder');
const User = require('../models/user');

const seedFolders = require('../db/seed/folders');
const seedUsers = require('../db/seed/users');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Folders', function() {
  before(function() {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  let user;
  let token;

  beforeEach(function() {
    return Promise.all([
      User.insertMany(seedUsers),
      Folder.insertMany(seedFolders),
      Folder.createIndexes(),
      User.createIndexes()
    ]).then(([users]) => {
      user = users[0];
      token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
    });
  });

  afterEach(function() {
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('GET /api/folders', function() {
    it('should return the correct number of Notes', function() {
      return Promise.all([
        Folder.find({ userId: user.id }),
        chai
          .request(app)
          .get('/api/folders')
          .set('Authorization', `Bearer ${token}`)
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
      });
    });

    it('should return a list with the correct fields', function() {
      return Promise.all([
        Folder.find({ userId: user.id }).sort('name'),
        chai
          .request(app)
          .get('/api/folders')
          .set('Authorization', `Bearer ${token}`)
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        res.body.forEach(function(item, i) {
          expect(item).to.be.a('object');
          expect(item).to.include.all.keys(
            'id',
            'name',
            'userId',
            'createdAt',
            'updatedAt'
          );
          expect(item.id).to.equal(data[i].id);
          expect(item.name).to.equal(data[i].name);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });

    it('should return correct search results for a searchTerm query', function() {
      const searchTerm = 'Personal';

      const dbPromise = Folder.find({
        name: { $regex: searchTerm, $options: 'i' }
      });

      const apiPromise = chai
        .request(app)
        .get(`/api/folders?searchTerm=${searchTerm}`)
        .set('Authorization', `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        res.body.forEach(function(item, i) {
          expect(item).to.be.a('object');
          expect(item).to.include.all.keys(
            'id',
            'name',
            'userId',
            'createdAt',
            'updatedAt'
          );
          expect(item.id).to.equal(data[i].id);
          expect(item.name).to.equal(data[i].name);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });
    it('should return an empty array for an incorrect query', function() {
      const searchTerm = 'NotValid';
      const dbPromise = Folder.find({
        title: { $regex: searchTerm, $options: 'i' }
      });
      const apiPromise = chai
        .request(app)
        .get(`/api/folders?searchTerm=${searchTerm}`)
        .set('Authorization', `Bearer ${token}`);
      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
      });
    });
  });

  describe('GET /api/folders/:id', function() {
    it('should return correct folder', function() {
      let data;
      return Folder.findOne()
        .then(_data => {
          data = _data;
          return chai
            .request(app)
            .get(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys(
            'id',
            'name',
            'userId',
            'createdAt',
            'updatedAt'
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not valid', function() {
      return chai
        .request(app)
        .get('/api/folders/NOT-VALID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function() {
      return chai
        .request(app)
        .get('/api/folders/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => expect(res).to.have.status(404));
    });
  });

  describe('POST /api/folders', function() {
    it('should create and return a new folder when provided valid data', function() {
      const newFolder = { name: 'Miscellaneous' };

      let res;
      return chai
        .request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newFolder)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys(
            'id',
            'name',
            'userId',
            'createdAt',
            'updatedAt'
          );
          return Folder.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "name" field', function() {
      const newFolder = {};
      return chai
        .request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newFolder)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function() {
      return Folder.findOne()
        .then(data => {
          const newItem = { name: data.name };
          return chai
            .request(app)
            .post('/api/folders')
            .set('Authorization', `Bearer ${token}`)
            .send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The folder name already exists');
        });
    });
  });

  describe('PUT /api/folders/:id', function() {
    it('should find and update a folder when given valid data', function() {
      const updateFolder = { name: 'Stuff' };

      let folder;
      return Folder.findOne()
        .then(_folder => {
          folder = _folder;
          return chai
            .request(app)
            .put(`/api/folders/${folder.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateFolder);
        })
        .then(res => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys(
            'id',
            'name',
            'userId',
            'createdAt',
            'updatedAt'
          );
          expect(res.body.id).to.equal(folder.id);
          expect(res.body.name).to.equal(updateFolder.name);
          expect(new Date(res.body.createdAt)).to.eql(folder.createdAt);
          expect(new Date(res.body.updatedAt)).to.greaterThan(folder.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not valid', function() {
      const updateFolder = { name: 'I\'m an updated Folder' };

      return chai
        .request(app)
        .put('/api/folders/NOT-VALID')
        .set('Authorization', `Bearer ${token}`)
        .send(updateFolder)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should return an error when missing "name" field', function() {
      const updateFolder = {};
      let folder;

      return Folder.findOne()
        .then(_folder => {
          folder = _folder;

          return chai
            .request(app)
            .put(`/api/folders/${folder.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateFolder);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });
  });

  describe('DELETE /api/folders/:id', function() {
    it('should delte an existing folder and respond with a 204 status', function() {
      let folder;
      return Folder.findOne()
        .then(_folder => {
          folder = _folder;
          return chai
            .request(app)
            .delete(`/api/folders/${folder.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          return Folder.count({ _id: folder.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should return an error with an invalid Id', function() {
      let folder;
      return Folder.findOne()
        .then(_folder => {
          folder = _folder;
          return chai
            .request(app)
            .delete('/api/folders/Not-Valid')
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });
  });
});

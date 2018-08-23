'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config');

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');

const Tag = require('../models/tags');
const User = require('../models/user');

const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Tags', function() {
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
      Tag.insertMany(seedTags),
      Tag.createIndexes(),
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

  describe('GET /api/tags', function() {
    it('should return the correct number of Notes', function() {
      return Promise.all([
        Tag.find(),
        chai
          .request(app)
          .get('/api/tags')
          .set('Authorization', `Bearer ${token}`)
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
      });
    });

    it('should return a list with the correct fields', function() {
      return Promise.all([
        Tag.find().sort('name'),
        chai
          .request(app)
          .get('/api/tags')
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
            'createdAt',
            'updatedAt'
          );
        });
      });
    });

    it('should return correct search results for a searchTerm query', function() {
      const searchTerm = 'domestic';

      const dbPromise = Tag.find({
        name: { $regex: searchTerm, $options: 'i' }
      });

      const apiPromise = chai
        .request(app)
        .get(`/api/tags?searchTerm=${searchTerm}`)
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
      const dbPromise = Tag.find({
        title: { $regex: searchTerm, $options: 'i' }
      });
      const apiPromise = chai
        .request(app)
        .get(`/api/tags?searchTerm=${searchTerm}`)
        .set('Authorization', `Bearer ${token}`);
      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
      });
    });
  });

  describe('GET /api/tags/:id', function() {
    it('should return correct tag', function() {
      let data;
      return Tag.findOne()
        .then(_data => {
          data = _data;
          return chai
            .request(app)
            .get(`/api/tags/${data.id}`)
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
          expect(res.body.userId).to.equal(data.userId.toHexString());
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not valid', function() {
      return chai
        .request(app)
        .get('/api/tags/NOT-VALID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function() {
      return chai
        .request(app)
        .get('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => expect(res).to.have.status(404));
    });
  });

  describe('POST /api/tags', function() {
    it('should create and return a new tag when provided valid data', function() {
      const newTag = { name: 'thoroughbred' };

      let res;
      return chai
        .request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .send(newTag)
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
          return Tag.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(res.body.userId).to.equal(data.userId.toHexString());
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "name" field', function() {
      const newTag = {};
      return chai
        .request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .send(newTag)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function() {
      return Tag.findOne()
        .then(data => {
          const newItem = { name: data.name };
          return chai
            .request(app)
            .post('/api/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The tag name already exists');
        });
    });
  });

  describe('PUT /api/tags/:id', function() {
    it('should find and update a tag when given valid data', function() {
      const updateTag = { name: 'Stuff' };

      let tag;
      return Tag.findOne()
        .then(_tag => {
          tag = _tag;
          return chai
            .request(app)
            .put(`/api/tags/${tag.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateTag);
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
          expect(res.body.id).to.equal(tag.id);
          expect(res.body.name).to.equal(updateTag.name);
          expect(res.body.userId).to.equal(tag.userId.toHexString());
          expect(new Date(res.body.createdAt)).to.eql(tag.createdAt);
          expect(new Date(res.body.updatedAt)).to.greaterThan(tag.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not valid', function() {
      const updateTag = { name: 'I\'m an updated Tag' };

      return chai
        .request(app)
        .put('/api/tags/NOT-VALID')
        .set('Authorization', `Bearer ${token}`)
        .send(updateTag)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function() {
      const updateItem = { name: 'Blah' };
      return chai
        .request(app)
        .put('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function() {
      const updateTag = {};
      let tag;

      return Tag.findOne()
        .then(_tag => {
          tag = _tag;

          return chai
            .request(app)
            .put(`/api/tags/${tag.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateTag);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function() {
      return Tag.find({ userId: user.id })
        .limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai
            .request(app)
            .put(`/api/tags/${item1.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(item1);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The tag name already exists');
        });
    });
  });

  describe('DELETE /api/tags/:id', function() {
    it('should delete an existing tag and respond with a 204 status', function() {
      let tag;
      return Tag.findOne()
        .then(_tag => {
          tag = _tag;
          return chai
            .request(app)
            .delete(`/api/tags/${tag.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          return Tag.count({ _id: tag.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should return an error with an invalid Id', function() {
      let tag;
      return Tag.findOne()
        .then(_tag => {
          tag = _tag;
          return chai
            .request(app)
            .delete('/api/tags/Not-Valid')
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });
  });
});

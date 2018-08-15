'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');

const Note = require('../models/note');

const seedNotes = require('../db/seed/notes');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Notes', function() {
  before(function() {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function() {
    return Note.insertMany(seedNotes);
  });

  afterEach(function() {
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('GET /api/notes', function() {
    it('should return the correct number of Notes', function() {
      return Promise.all([
        Note.find(),
        chai.request(app).get('/api/notes')
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
      });
    });

    it('should return a list with the correct right fields', function() {
      return Promise.all([
        Note.find().sort({ updatedAt: 'desc' }),
        chai.request(app).get('/api/notes')
      ]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
        res.body.forEach(function(item, i) {
          expect(item).to.be.a('object');
          expect(item).to.include.all.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt'
          );
          expect(item.id).to.equal(data[i].id);
          expect(item.title).to.equal(data[i].title);
          expect(item.content).to.equal(data[i].content);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });

    it('should return correct search results for a searchTerm query', function() {
      const searchTerm = 'gaga';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ 'title': re }, { 'content': re }]
      });
      const apiPromise = chai
        .request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`);

      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(1);
        res.body.forEach(function(item, i) {
          expect(item).to.be.a('object');
          expect(item).to.include.all.keys(
            'id',
            'title',
            'createdAt',
            'updatedAt'
          );
          expect(item.id).to.equal(data[i].id);
          expect(item.title).to.equal(data[i].title);
          expect(item.content).to.equal(data[i].content);
          expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
          expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
        });
      });
    });

    it('should return an empty array for an incorrect query', function() {
      const searchTerm = 'NotValid';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ 'title': re }, { 'content': re }]
      });
      const apiPromise = chai
        .request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`);
      return Promise.all([dbPromise, apiPromise]).then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);
      });
    });
  });

  describe('GET /api/notes/:id', function() {
    it('should return correct note', function() {
      let data;
      return Note.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).get(`/api/notes/${data.id}`);
        })
        .then(res => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt'
          );
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });
  });

  it('should respond with status 400 and an error message when `id` is not valid', function() {
    return chai
      .request(app)
      .get('/api/notes/NOT-VALID')
      .then(res => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.equal('The `id` is not valid');
      });
  });

  it('should respond with a 404 for an id that does not exist', function() {
    return chai
      .request(app)
      .get('/api/notes/DOESNOTEXIST')
      .then(res => {
        expect(res).to.have.status(404);
      });
  });

  describe('POST /api/notes', function() {
    it('should create and return a new item when provided valid data', function() {
      const newItem = {
        title: 'The best article about cats ever!',
        content:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };
      let res;
      return chai
        .request(app)
        .post('/api/notes')
        .send(newItem)
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt'
          );
          return Note.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });
    it('should return an error when missing "title" field', function() {
      const newItem = {
        content: 'new content'
      };
      return chai
        .request(app)
        .post('/api/notes')
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });
  });

  describe('PUT /api/notes/:id', function() {
    it('should find and update an item when given valid data', function() {
      const updateItem = {
        title: 'An updated title',
        content: 'Updated content'
      };
      let note;
      return Note.findOne()
        .then(function(_note) {
          note = _note;
          return chai
            .request(app)
            .put(`/api/notes/${note.id}`)
            .send(updateItem);
        })
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys(
            'id',
            'title',
            'content',
            'createdAt',
            'updatedAt'
          );
          expect(res.body.id).to.equal(note.id);
          expect(res.body.title).to.equal(updateItem.title);
          expect(res.body.content).to.equal(updateItem.content);
          expect(new Date(res.body.createdAt)).to.eql(note.createdAt);
          expect(new Date(res.body.updatedAt)).to.greaterThan(note.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is note valid', function() {
      const updateItem = {
        title: 'I\'m going to throw an error',
        content: 'Errored out!'
      };
      return chai
        .request(app)
        .put('/api/notes/NOT-VALID')
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });
    it('should respond with a 404 for an id that does not exist', function() {
      const updateItem = {
        title: 'I\'m going to throw an error',
        content: 'Errored out!'
      };
      return chai
        .request(app)
        .put('/api/notes/DOESNOTEXIST')
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });
    it('should return an error when missing "title" field', function() {
      const updateItem = {
        content: 'Updated content with no title!'
      };
      let data;
      return Note.findOne()
        .then(_data => {
          data = _data;

          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });
  });

  describe('DELETE /api/notes/:id', function() {
    it('should delete an existing document and respond with a 204 status', function() {
      let note;
      return Note.findOne()
        .then(_note => {
          note = _note;
          return chai.request(app).delete(`/api/notes/${note.id}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          return Note.count({ _id: note.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });
  });
});

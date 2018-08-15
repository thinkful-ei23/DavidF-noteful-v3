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
});

describe('GET /api/notes', function() {
  // 1) Call the database **and** the API
  // 2) Wait for both promises to resolve using `Promise.all`
  it('should return the correct number of Notes', function() {
    return (
      Promise.all([Note.find(), chai.request(app).get('/api/notes')])
        // 3) then compare database results to API response
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        })
    );
  });

  it('should return a list with the correct fields', function() {
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
          'udpatedAt'
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
    const re = new RegExp(searchTerm, 'i');
    const dbPromise = Note.find({
      $or: [{ title: re }, { content: re }]
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
    const re = new RegExp(searchTerm, 'i');
    const dbPromise = Note.find({
      $or: [{ title: re }, { content: re }]
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

// describe('GET /api/notes/:id', function() {
//   it('should return correct note', function() {
//     let data;
//     // 1) First, call the database
//     return Note.findOne()
//       .then(_data => {
//         data = _data;
//         // 2) then call the API with the ID
//         return chai.request(app).get(`/api/notes/${data.id}`);
//       })
//       .then(res => {
//         expect(res).to.have.status(200);
//         expect(res).to.be.json;

//         expect(res.body).to.be.an('object');
//         expect(res.body).to.have.keys(
//           'id',
//           'title',
//           'content',
//           'createdAt',
//           'updatedAt'
//         );

//         // 3) then compare database results to API response
//         expect(res.body.id).to.equal(data.id);
//         expect(res.body.title).to.equal(data.title);
//         expect(res.body.content).to.equal(data.content);
//         expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
//         expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
//       });
//   });
// });

// describe('POST /api/notes', function() {
//   it('should create and return a new item when provided valid data', function() {
//     const newItem = {
//       title: 'The best article about cats ever!',
//       content:
//         'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
//     };

//     let res;
//     // 1) First, call the API
//     return (
//       chai
//         .request(app)
//         .post('/api/notes')
//         .send(newItem)
//         .then(function(_res) {
//           res = _res;
//           expect(res).to.have.status(201);
//           expect(res).to.have.header('location');
//           expect(res).to.be.json;
//           expect(res.body).to.be.a('object');
//           expect(res.body).to.have.keys(
//             'id',
//             'title',
//             'content',
//             'createdAt',
//             'updatedAt'
//           );
//           // 2) then call the database
//           return Note.findById(res.body.id);
//         })
//         // 3) then compare the API response to the database results
//         .then(data => {
//           expect(res.body.id).to.equal(data.id);
//           expect(res.body.title).to.equal(data.title);
//           expect(res.body.content).to.equal(data.content);
//           expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
//           expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
//         })
//         .catch(err => {
//           console.log(err);
//         })
//     );
//   });
// });

// describe('PUT /api/notes/:id', function() {
//   //1) Call the database and get a valid id
//   it('should find and update an item when given an id', function() {
//     const updateItem = {
//       title: 'An updated title',
//       content: 'Updated content'
//     };

//     let res;
//     //2) PUT request to edit a note by id
//     return (
//       Note.findOne()
//         .then(function(note) {
//           updateItem.id = note.id;
//           return chai
//             .request(app)
//             .put(`/api/notes/${note.id}`)
//             .send(updateItem);
//         })
//         //3) Check the response
//         .then(function(_res) {
//           res = _res;
//           expect(res).to.have.status(200);
//           expect(res).to.be.json;
//           expect(res.body).to.be.a('object');
//           expect(res.body).to.have.keys(
//             'id',
//             'title',
//             'content',
//             'createdAt',
//             'updatedAt'
//           );
//           //4)Query the database again using the same id
//           return Note.findById(res.body.id);
//         })
//         .then(function(data) {
//           //5) Verify the data in the database matches the updated content
//           expect(res.body.id).to.equal(data.id);
//           expect(res.body.title).to.equal(data.title);
//           expect(res.body.content).to.equal(data.content);
//           expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
//           expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
//         })
//     );
//   });
// });

// describe('DELETE note by id', function(){

// })

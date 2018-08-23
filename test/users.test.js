'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const seedUsers = require('../db/seed/users');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', function() {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before(function() {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function() {
    return User.createIndexes();
  });

  afterEach(function() {
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('/api/users', function() {
    describe('POST', function() {
      it('Should create a new user', function() {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function() {
        const testUser = { password, fullname };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res.body).to.be.a('object');
            expect(res.body.message).to.equal(
              'Missing \'username\' in request body'
            );
          });
      });
      it('Should reject users with missing password', function() {
        const testUser = { username, fullname };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res.body).to.be.a('object');
            expect(res.body.message).to.equal(
              'Missing \'password\' in request body'
            );
          });
      });
      it('Should reject users with non-string username', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username: 1234,
            password,
            fullname
          })
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res).to.be.a('object');
            expect(res.body.message).to.equal(
              'Field: \'username\' must be type String'
            );
          });
      });
      it('Should reject users with non-string password', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password: 1234,
            fullname
          })
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res).to.be.a('object');
            expect(res.body.message).to.equal(
              'Field: \'password\' must be type String'
            );
          });
      });
      it('Should reject users with non-trimmed username', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username: ` ${username} `,
            password,
            fullname
          })
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res).to.be.a('object');
            expect(res.body.message).to.equal(
              'Field: \'username\' cannot start or end with whitespace'
            );
          });
      });
      it('Should reject users with non-trimmed password', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password: ` ${password} `,
            fullname
          })
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res).to.be.a('object');
            expect(res.body.message).to.equal(
              'Field: \'password\' cannot start or end with whitespace'
            );
          });
      });
      it('Should reject users with empty username', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username: '',
            password,
            fullname
          })
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res.body).to.be.a('object');
            expect(res.body.message).to.equal(
              'Field: \'username\' must be at least 1 characters long'
            );
          });
      });
      it('Should reject users with password less than 8 characters', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password: '1234567',
            fullname
          })
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res.body).to.be.a('object');
            expect(res.body.message).to.equal(
              'Field: \'password\' must be at least 8 characters long'
            );
          });
      });
      it('Should reject users with password greater than 72 characters', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password: new Array(73).fill('a').join(''),
            fullname
          })
          .then(res => {
            expect(res).to.have.status(422);
            expect(res).to.be.json;
            expect(res.body).to.be.a('object');
            expect(res.body.message).to.equal(
              'Field: \'password\' must be at most 72 characters long'
            );
          });
      });
      it('Should reject users with duplicate username', function() {
        // Create an initial user
        return User.create({
          username,
          password,
          fullname
        })
          .then(() =>
            // Try to create a second user with the same username
            chai
              .request(app)
              .post('/api/users')
              .send({
                username,
                password,
                fullname
              })
          )
          .then(res => {
            expect(res).to.have.status(400);
            expect(res).to.be.json;
            expect(res).to.be.a('object');
            expect(res.body.message).to.equal('The username already exists');
          });
      });
      it('Should trim fullname', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password,
            fullname: ` ${fullname} `
          })
          .then(res => {
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('username', 'fullname', 'id');
            expect(res.body.username).to.equal(username);
            expect(res.body.fullname).to.equal(fullname);
            return User.findOne({
              username
            });
          })
          .then(user => {
            expect(user).to.not.be.null;
            expect(user.fullname).to.equal(fullname);
          });
      });
    });
  });
});

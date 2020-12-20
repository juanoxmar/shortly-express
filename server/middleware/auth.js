const models = require('../models');
const Promise = require('bluebird');

const createSession = (req, res, next) => {

  models.Sessions.create()
    .then((data) => {
      const { insertId } = data;
      return models.Sessions.get({ id: insertId });
    })
    .then((session) => {
      req.session = session;
      res.cookie('shortlyid', session.hash);

      if (req.cookies.shortlyid) {
        return models.Sessions.get({ hash: req.cookies.shortlyid});
      } else {
        throw 'No Shortly Cookie';
      }
    })
    .then((session) => {
      return models.Sessions.update({ hash: req.session.hash }, { userId: session.userId })
        .then(() => {
          req.session.userId = session.userId;
          return models.Sessions.delete({ hash: session.hash });
        })
        .then(() => {
          return models.Users.get({ id: session.userId });
        });
    })
    .then((data) => {
      req.session.user = { username: data.username };
      return;
    })
    .catch((err) => {
      return err;
    })
    .finally(() => {
      next();
    });

};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

module.exports.createSession = createSession;

const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(cookieParser);
app.use(Auth.createSession);

/**
 * if you go to '/' it should check to see if you have a shortly cookie
 * if you have a shotly cookie, it will verify the session
 * if you do not have a cookie, it will forward you to the login page
 *
 * when you login a session will be created
 * when your login/password is validated
 * your username will be attached to the session
 * if the validation is false, the session will be deleted
 */

// const verifySession = (req, res, next) => {

//   if (req.session.userId) {
//     next();
//   } else {
//     res.redirect('/login');
//     next();
//   }

//   console.log(models.Sessions.isLoggedIn(req.session));
//   console.log(req.session);
//   if (req.session.userId) {
//     res.redirect('/login');
//   }
//   next();
// };

// app.use('/', verifySession);
// app.use('/create', verifySession);
// app.use('/links', verifySession);

app.get('/', (req, res, next) => {
  if (!models.Sessions.isLoggedIn(req.session)) {
    res.redirect('/login');
    next();
  } else {
    res.render('index');
  }
});

app.get('/create', (req, res, next) => {
  if (!models.Sessions.isLoggedIn(req.session)) {
    res.redirect('/login');
    next();
  } else {
    res.render('index');
  }
});

app.get('/links', (req, res, next) => {
  if (!models.Sessions.isLoggedIn(req.session)) {
    res.redirect('/login');
    next();
  } else {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  }
});

app.post('/links', (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



app.get('/login', (req, res, next) => {
  res.render('login');
});

app.post('/login', (req, res, next) => {
  return models.Users.get({username: req.body.username})
    .then((userInfo) => {
      if (userInfo) {
        const {password, salt} = userInfo;
        return models.Users.compare(req.body.password, password, salt);
      } else {
        res.redirect('/login');
        next();
      }
    })
    .then((valid) => {
      if (valid) {
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
      next();
    })
    .catch((err) => {
      return err;
    });
});

app.get('/signup', (req, res, next) => {
  res.render('signup');
});


app.post('/signup', (req, res, next) => {
  return models.Users.get({ username: req.body.username })
    .then((data) => {
      if (!data) {
        models.Users.create(req.body)
          .then(({ insertId }) => {
            return models.Sessions.update({ hash: req.session.hash }, { userId: insertId });
          })
          .then(() => {
            res.redirect('/');
            next();
          });
      } else {
        res.redirect('/signup');
        next();
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get('/logout', (req, res, next) => {
  models.Sessions.delete({ id: req.session.id })
    .then(() => {
      res.clearCookie('shortlyid');
      res.redirect('/login');
      next();
    })
    .catch((err) => {
      return err;
    });
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;

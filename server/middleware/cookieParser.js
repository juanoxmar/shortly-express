const parseCookies = (req, res, next) => {

  const toObject = (cookies) => Object.fromEntries(
    cookies.split(/; */).map(cookie => {
      const [key, ...v] = cookie.split('=');
      return [key, decodeURIComponent(v.join('='))];
    })
  );

  req.cookies = req.headers.cookie ? toObject(req.headers.cookie) : {};

  next();
};

module.exports = parseCookies;
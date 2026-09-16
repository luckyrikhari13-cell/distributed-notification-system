const asynchandler = (handler) => {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

module.exports = asynchandler;

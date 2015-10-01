module.exports = function (we, done) {
  we.db.models.event.findAll()
  .then(function (events) {
    if (!events || !we.config.cfcertification.handlers) return done();

    var hNames = Object.keys(we.config.cfcertification.handlers);

    we.utils.async.eachSeries(events, function (e, done) {
      we.utils.async.eachSeries(hNames, function (name, done) {
        we.config.cfcertification.handlers[name](we, e, done);
      }, done);
    }, done);
  });
}
module.exports = function (we, done) {
  we.db.models.event.findAll()
  .then(function (events) {
    if (!events || !we.config.cfcertification.handlers) return done();

    we.utils.async.eachSeries(events, function (e, done) {
      we.plugins['we-plugin-event-certification'].generateEventCertifications(e, we, done);
    }, done);
  });
}
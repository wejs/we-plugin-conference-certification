module.exports = function (we, done) {
  we.db.models.event.findAll()
  .then(function (events) {
    if (!events) return done();

    we.utils.async.eachSeries(events, function (e, done) {
      if (e.registrationStatus != 'closed_after') return done();
      // only generate if event is closed after (after end)
      we.plugins['we-plugin-event-certification'].generateEventCertifications(e, we, done);
    }, done);
  });
}
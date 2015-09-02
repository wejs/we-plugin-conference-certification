module.exports = {
  adminPage: function adminPage(req, res) {
    req.we.utils.async.series([
      function loadCFRegistrationTypes(done) {
        req.we.db.models.cfregistrationtype.findAll({
          where: {
            conferenceId: res.locals.conference.id
          }
        }).then(function (r) {
          req.we.utils.async.each(r, function(cfr, next) {
            req.we.db.models.certificationTemplate.findOne({
              where: { modelName: 'cfregistrationtype', modelId: cfr.id }
            }).then(function (ct){
              cfr.certificationTemplate = ct;
              next();
            }).catch(next);
          }, function (err){
            if (err) return done(err);

            res.locals.cfregistrationtypes = r;
            done();
          });
        }).catch(done);
      },
      function loadRegistrableCFSessions(done) {
        req.we.db.models.cfsession.findAll({
          where: {
            conferenceId: res.locals.conference.id,
            requireRegistration: true
          }
        }).then(function (r){
          res.locals.cfsessions = r;
          done();
        }).catch(done);
      }
    ], function (err) {
      if (err) return res.serverError(err);

      res.ok();
    });
  },

  /**
   * Create or update one certification template for conference content
   */
  updateTemplate: function(req, res) {
    if (!req.we.db.models[req.params.modelName]) return res.notFound();
    var Model = req.we.db.models[req.params.modelName];
    var relatedRecord;

    req.we.utils.async.series([
      function loadRelatedRecord(done) {
        Model.findById(req.params.modelId).then(function (r){
          relatedRecord = r;
          done();
        }).catch(done);
      },
      function loadCertificationTemplate(done) {
        req.we.db.models.certificationTemplate.findOne({
          where: {
            modelName: req.params.modelName,
            modelId: req.params.modelId
          }
        }).then(function (r) {
          res.locals.record = r;
          done();
        }).catch(done);
      }
    ], function (err){
      if (err) return res.queryError(err);

      if (req.method == 'POST') {
        if (res.locals.record) {
          res.locals.record.updateAttributes({
            name: req.body.name,
            text: req.body.text,
            image: req.body.image
          }).then(function(){
            res.ok();
          }).catch(res.queryError);
        } else {
          // create
          req.we.db.models.certificationTemplate
          .create({
            modelName: req.params.modelName,
            modelId: req.params.modelId,
            name: req.body.name,
            text: req.body.text,
            image: req.body.image
          }).then(function (r) {
            res.locals.record = r;
            res.ok();
          }).catch(res.queryError);
        }
      } else {
        res.ok();
      }
    });
  }
};
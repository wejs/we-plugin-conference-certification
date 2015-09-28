module.exports = {
  adminPage: function adminPage(req, res) {
    req.we.utils.async.series([
      function loadCFRegistrationTypes(done) {
        req.we.db.models.cfregistrationtype.findAll({
          where: {
            eventId: res.locals.event.id
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
            eventId: res.locals.event.id,
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
   * Create or update one certification template for event content
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
            textPosition: req.body.textPosition,
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
            textPosition: req.body.textPosition,
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
  },

  generate: function generate(req, res) {
    if (!res.locals.event || !res.locals.event.id) return res.notFound();

    var tpls, cfrs, eId = res.locals.event.id;

    req.we.utils.async.series([
      function loadCertificationTypes(done) {
        req.we.db.models.cfregistrationtype.findAll({
          where: { eventId: res.locals.event.id }
        }).then(function (r) {
          cfrs = r;
          done();
        }).catch(done);
      },
      function loadCertificationTemplates(done) {
        if (!cfrs) return done();
        req.we.db.models.certificationTemplate.findAll({
          where: {
            modelName: 'cfregistrationtype',
            modelId: cfrs.map(function (i){ return i.id; })
          }
        }).then(function (r) {
          tpls = r;
          done();
        }).catch(done);
      },
      function loadCFR(done) {
        if (!tpls) return done();

        req.we.utils.async.eachSeries(tpls, function (tpl, next) {
          var sql = 'SELECT cfr.id AS id, cfr.userId AS userId '+
            'FROM cfregistrations AS cfr '+
            'LEFT JOIN  certifications ON modelName="cfregistration" '+
               'AND modelId=cfr.id '+
            'WHERE eventId="'+eId+'" AND present=true AND certifications.id IS NULL ';

          req.we.db.defaultConnection.query(sql)
          .then(function (r) {
            if (!r || !r[0]) return next();

            var cToCreate = r[0].map(function (i) {
              return {
                name: req.__('cfcertification.cfregitration.name', {
                  event: res.locals.event
                }),
                modelName: 'cfregistration',
                modelId: i.id,
                userId: i.userId,
                templateId: tpl.id
              };
            });

            req.we.db.models.certification
            .bulkCreate(cToCreate).then(function (rf) {
              if (rf && rf.length) {
                res.addMessage('success', {
                  text: 'cfcertification.cfregitration.success',
                  vars: { count: rf.length }
                });
              }

              next();
            }).catch(next);
          }).catch(next);
        }, done);
      }
    ], function (err) {
      if (err) {
        req.we.log.error('Error in generate user certifications: ', err);
      }

      return res.goTo(req.body.redirectTo);
    });
  }
};
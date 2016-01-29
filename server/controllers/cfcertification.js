// TODO move query to model

module.exports = {
  adminPage: function adminPage(req, res) {
    if (!res.locals.event) return res.notFound();

    res.locals.certificationIdentifiers = {}
    res.locals.certificationIdentifiers['event-'+res.locals.event.id+'-registration'] = {};
    res.locals.certificationIdentifiers['event-'+res.locals.event.id+'-cfsession'] = {};

    var cIcount = Object.keys(res.locals.certificationIdentifiers).length

    //res.locals.certificationIdentifiers['event-'+res.locals.event.id+'-cfspeaker'] = {};

    req.we.utils.async.series([
      function loadCertificationTemplate(done) {
        req.we.db.models.certificationTemplate.findAll({
          where: {
            identifier: {
              $like:'event-'+res.locals.event.id+'%'
            }
          }
        }).then(function (ct) {
          res.locals.certificationTemplate = ct;

          if (ct) {
            for (var i = 0; i < ct.length; i++) {
              res.locals.certificationIdentifiers[ct[i].identifier] = ct[i];
            }

            if ( (ct.length >=  cIcount) &&
              (res.locals.event.registrationStatus == 'closed_after')
            ) {
              res.locals.haveAllTemplates = true;
            }
          }

          done();
        }).catch(done);
      },
      function loadCFRegistrationTypes(done) {
        req.we.db.models.cfregistrationtype.findAll({
          where: { eventId: res.locals.event.id }
        }).then(function (r) {
          res.locals.cfregistrationtypes = r;
          done();
        }).catch(done);
      },
      function loadRegistrableCFSessions(done) {
        req.we.db.models.cfsession.findAll({
          where: {
            eventId: res.locals.event.id,
            requireRegistration: true
          }
        }).then(function (r) {
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
   * Create or update one certification template for event
   */
  updateTemplate: function(req, res) {
    if (!res.locals.event) return res.notFound();
    var idParams = req.params.identifier.split('-');
    var identifierEventId = idParams[1];
    if (identifierEventId != res.locals.event.id) return res.notFound();

    var handlerName;
    if (idParams[2] == 'registration') {
      handlerName = 'event_registrations';
    } else if (idParams[2] == 'cfsession') {
      handlerName = 'cfsession_subscribers';
    } else if (idParams[2] == 'cfspeaker') {
      handlerName = 'cfsession_speakers';
    } else {
      return res.notFound();
    }

    req.we.utils.async.series([
      function loadCertificationTemplate(done) {
        req.we.db.models.certificationTemplate.findOne({
          where: { identifier: req.params.identifier }
        }).then(function (r) {
          if (r) {
            res.locals.data = r;
          } else {
            res.locals.data = {
              text: req.we.config.cfcertification.texts[handlerName]
            }
          }
          done();
        }).catch(done);
      }
    ], function (err){
      if (err) return res.queryError(err);

      if (req.method == 'POST') {
        if (res.locals.data && res.locals.data.id) {
          // update
          res.locals.data.updateAttributes({
            name: req.body.name,
            text: req.body.text,
            textPosition: req.body.textPosition,
            image: req.body.image,
            published: req.body.published
          }).then(function(){
            res.ok();
          }).catch(res.queryError);
        } else {
          // create
          req.we.db.models.certificationTemplate
          .create({
            identifier: req.params.identifier,
            name: req.body.name,
            text: req.body.text,
            textPosition: req.body.textPosition,
            image: req.body.image
          }).then(function (r) {
            res.locals.data = r;
            res.ok();
          }).catch(res.queryError);
        }
      } else {
        res.ok();
      }
    });
  },

  /**
   * render one exemple template
   *
   */
  previewTemplate: function(req, res) {
    var certificator = req.we.plugins['we-plugin-certification'];

    var idParams = req.params.identifier.split('-');
    var identifierEventId = idParams[1];
    if (identifierEventId != res.locals.event.id) return res.notFound();

    var handlerName;
    if (idParams[2] == 'registration') {
      handlerName = 'event_registrations';
    } else if (idParams[2] == 'cfsession') {
      handlerName = 'cfsession_subscribers';
    } else if (idParams[2] == 'cfspeaker') {
      handlerName = 'cfsession_speakers';
    } else {
      return res.notFound();
    }

    req.we.db.models.certificationTemplate.findOne({
      where: { identifier: req.params.identifier }
    }).then(function (tpl) {
      if (!tpl) {
        tpl = {
          text: req.we.config.cfcertification.texts[handlerName]
        }
      }

      res.locals.pdfTemplate = tpl;
      res.locals.data = { text: tpl.text };

      certificator.renderPDFtemplate(req, res);

    }).catch(res.queryError);
  },

  // /**
  //  * Generate one event certification
  //  * TODO split in small functions
  //  */
  // generate: function generate(req, res) {
  //   if (!res.locals.event || !res.locals.event.id) return res.notFound();

  //   var tpls, record, cToCreate, eId = res.locals.event.id;

  //   req.we.utils.async.series([
  //     function loadCertificationTypes(done) {
  //       if (req.params.modelName != 'cfregistrationtype')
  //         return done();

  //       req.we.db.models.cfregistrationtype.findOne({
  //         where: {
  //           eventId: res.locals.event.id,
  //           id: req.params.modelId
  //         }
  //       }).then(function (r) {
  //         record = r;
  //         done();
  //       }).catch(done);
  //     },
  //     function loadSession(done) {
  //       if (req.params.modelName != 'cfsession')
  //         return done();

  //       req.we.db.models.cfsession.findOne({
  //         where: {
  //           eventId: res.locals.event.id,
  //           id: req.params.modelId
  //         }
  //       }).then(function (r) {
  //         record = r;
  //         done();
  //       }).catch(done);
  //     },
  //     function loadCertificationTemplates(done) {
  //       if (!record) return done();
  //       req.we.db.models.certificationTemplate.findAll({
  //         where: {
  //           modelName: req.params.modelName,
  //           modelId: record.id
  //         }
  //       }).then(function (r) {
  //         tpls = r;
  //         done();
  //       }).catch(done);
  //     },
  //     function loadCFR(done) {
  //       if (!tpls || (req.params.modelName != 'cfregistrationtype')) return done();

  //       req.we.utils.async.eachSeries(tpls, function (tpl, next) {
  //         var sql = 'SELECT cfr.id AS id, cfr.userId AS userId '+
  //           'FROM cfregistrations AS cfr '+
  //           'LEFT JOIN  certifications ON certifications.modelName="cfregistration" '+
  //              'AND certifications.modelId=cfr.id '+
  //           'WHERE eventId="'+eId+'" AND present=true AND certifications.id IS NULL ';

  //         req.we.db.defaultConnection.query(sql)
  //         .then(function (r) {
  //           if (!r || !r[0]) return next();

  //           var cToCreate = r[0].map(function (i) {
  //             return {
  //               name: req.__('cfcertification.cfregitration.name', {
  //                 event: res.locals.event
  //               }),
  //               modelName: 'cfregistration',
  //               modelId: i.id,
  //               userId: i.userId,
  //               templateId: tpl.id
  //             };
  //           });

  //           req.we.db.models.certification
  //           .bulkCreate(cToCreate).then(function (rf) {
  //             if (rf && rf.length) {
  //               res.addMessage('success', {
  //                 text: 'cfcertification.cfregitration.success',
  //                 vars: { count: rf.length }
  //               });
  //             }
  //             next();
  //           }).catch(next);
  //         }).catch(next);
  //       }, done);
  //     },

  //     /**
  //      * createCfsession certifications, this function will set modelName with
  //      *   cfsession.id and modelId with cfregistrationId
  //      * @param  {Function} done callback
  //      */
  //     function createCFSessionCerfications(done) {
  //       if (!tpls || (req.params.modelName != 'cfsession')) return done();
  //       req.we.utils.async.eachSeries(tpls, function (tpl, next) {
  //         var sql = 'SELECT cfr.id AS id, cfr.userId AS userId '+
  //           'FROM cfsessionSubscribers AS cfss '+
  //           'LEFT JOIN cfregistrations AS cfr ON cfr.id=cfss.cfregistrationId '+
  //           'LEFT JOIN certifications '+
  //             'ON certifications.modelName="$cfsessionSubscriber-'+record.id+'" '+
  //           'AND certifications.modelId=cfr.id '+
  //           'WHERE cfr.eventId="'+eId+'" AND cfss.present=true '+
  //             'AND certifications.id IS NULL ';

  //         req.we.db.defaultConnection.query(sql)
  //         .then(function (r) {
  //           if (!r || !r[0]) return next();

  //           cToCreate = r[0].map(function (i) {
  //             return {
  //               name: req.__('cfsession.cfregitration.name', {
  //                 event: res.locals.event,
  //                 cfsession: record
  //               }),
  //               modelName: '$cfsessionSubscriber-'+record.id,
  //               modelId: i.id,
  //               userId: i.userId,
  //               templateId: tpl.id
  //             };
  //           });

  //           req.we.db.models.certification
  //           .bulkCreate(cToCreate).then(function (rf) {
  //             next();
  //           }).catch(next);
  //         }).catch(next);
  //       }, done);
  //     }
  //   ], function (err) {
  //     if (err) {
  //       req.we.log.error('Error in generate user certifications: ', err);
  //     }

  //     if (cToCreate && cToCreate.length) {
  //       res.addMessage('success', {
  //         text: 'cfcertification.cfregitration.success',
  //         vars: { count: cToCreate.length }
  //       });
  //     } else {
  //       res.addMessage('success', {
  //         text: 'cfcertification.cfregitration.nothing'
  //       });
  //     }

  //     return res.goTo(req.body.redirectTo);
  //   });
  // }
};
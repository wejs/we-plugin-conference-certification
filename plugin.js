/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/extend.plugin
 */
module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);
  // set plugin configs
  plugin.setConfigs({
    forms: {
      'cfcertification-template': __dirname + '/server/forms/cfcertification-template.json'
    },
    cfcertification: {
      names: {
        'event_registrations': 'Certificamos que {{data.fullName}}, participou do {{event.title}}, '+
          'no período de {{startDate}} a {{endDate}} ',
        'cfsession_subscribers': '',
        // 'cfsession_speakers': ''
      },
      texts: {
        'event_registrations': 'Certificamos que {{data.fullName}}, participou do {{event.title}} '+
          'no período de {{startDate}} a {{endDate}} ',
        'cfsession_subscribers': 'Certificamos que {{data.fullName}}, participou da atividade {{cfsession.title}} '+
          'no evento {{event.title}} '+
          'no período de {{startDate}} a {{endDate}} ',
        // 'cfsession_speakers': 'Certificamos que {{data.fullName}}, '+
        //   'participou como palestrante da atividade {{cfsession.title}} '+
        //   'no evento {{event.title}} '+
        //   'no período de {{startDate}} a {{endDate}} '
      },
      handlers: {
      'event_registrations': function(we, e, done) {
        var tpl, cfregistrations, cToCreate = [];
        var identifier = 'event-'+e.id+'-registration';

        we.utils.async.series([
          function loadCertificationTypes(done) {
            we.db.models.cfregistrationtype.findAll({
              where: { eventId: e.id }
            }).then(function (r) {
              cfregistrations = r;
              done();
            }).catch(done);
          },
          function loadCertificationTemplate(done) {
            if (!cfregistrations) return done();
            we.db.models.certificationTemplate.findOne({
              where: {
                identifier: identifier,
                published: true
              }
            }).then(function (r) {
              tpl = r;
              done();
            }).catch(done);
          },
          function loadCFR(done) {
            if (!tpl) return done();

            var startDate = we.utils.moment(e.eventStartDate).format('DD/MM');
            var endDate = we.utils.moment(e.eventEndDate).format('DD/MM');

            we.utils.async.eachSeries(cfregistrations, function (cfr, done) {
              var sql = 'SELECT cfr.id AS id, cfr.userId AS userId, users.fullName, users.displayName, users.email '+
                'FROM cfregistrations AS cfr '+
                'LEFT JOIN  users ON users.id=cfr.userId '+
                'LEFT JOIN  certifications ON certifications.identifier="'+identifier+
                    '" AND certifications.userId=cfr.userId '+
                'WHERE cfr.eventId="'+e.id+'" AND cfr.present=true '+
                  ' AND certifications.id IS NULL ';

              var textFN = we.hbs.compile(tpl.text);

              we.db.defaultConnection.query(sql)
              .then(function (r) {
                if (!r || !r[0]) return done();

                cToCreate = cToCreate.concat(r[0].map(function (i) {
                  return {
                    name: we.i18n.__('cfcertification.cfregitration.name', {
                      event: e
                    }),
                    text: textFN({
                      event: e,
                      cfregistration: cfr,
                      data: i,
                      startDate: startDate,
                      endDate: endDate
                    }),
                    identifier: identifier,
                    userId: i.userId,
                    templateId: tpl.id
                  };
                }));
                done();
              }).catch(done);
            }, done);
          },
          function createCertifications(done) {
            if (!cToCreate) return done();
            we.db.models.certification
            .bulkCreate(cToCreate).then(function () {
              if (cToCreate && cToCreate.length) {
                we.log.info('Event: registration certifications: '+cToCreate.length);
              }
              done();
            }).catch(done);
          }
        ], function (err){
          if (err) {
            we.log.error('Error in generate user registration certifications: ', err);
          }
          return done();
        });
      },
      // 'cfsession_subscribers': function(we, e, done) {
      //   var tpl, cfsessions, cToCreate = [];

      //   we.utils.async.series([
      //     function loadSession(done) {
      //       we.db.models.cfsession.findAll({
      //         where: { eventId: e.id }
      //       }).then(function (r) {
      //         cfsessions = r;
      //         done();
      //       }).catch(done);
      //     },
      //     function loadCertificationTemplate(done) {
      //       if (!cfsessions) return done();
      //       we.db.models.certificationTemplate.findOne({
      //         where: { identifier: 'event-1-cfsession', published: true }
      //       }).then(function (r) {
      //         tpl = r;
      //         done();
      //       }).catch(done);
      //     },
      //     function createCFSessionCerfications(done) {
      //       if (!tpl) return done();

      //       var startDate = we.utils.moment(e.eventStartDate).format('DD/MM');
      //       var endDate = we.utils.moment(e.eventEndDate).format('DD/MM');
      //       var textFN = we.hbs.compile(tpl.text);

      //       we.utils.async.eachSeries(cfsessions, function (cfsession, next) {
      //         var identifier = 'event-'+e.id+'-cfsession'+cfsession.id;

      //         var sql = 'SELECT cfr.id AS id, cfr.userId AS userId, users.fullName, users.displayName, users.email '+
      //           'FROM cfsessionSubscribers AS cfss '+
      //           'LEFT JOIN cfregistrations AS cfr ON cfr.id=cfss.cfregistrationId '+
      //           'LEFT JOIN  users ON users.id=cfr.userId '+
      //           'LEFT JOIN certifications ON certifications.identifier="'+identifier+'" '+
      //             ' AND certifications.userId=cfr.userId '+
      //           'WHERE cfr.eventId="'+e.id+'" AND cfss.present=true '+
      //             'AND certifications.id IS NULL AND cfss.cfsessionId='+cfsession.id;

      //         we.db.defaultConnection.query(sql)
      //         .then(function (r) {
      //           if (!r || !r[0]) return next();
      //           cToCreate = cToCreate.concat(r[0].map(function (i) {
      //             return {
      //               name: we.i18n.__('cfcertification.cfsession.name', {
      //                 event: e, cfsession: cfsession, data: i
      //               }),
      //               text: textFN({
      //                 event: e, cfsession: cfsession, data: i,
      //                 startDate: startDate,
      //                 endDate: endDate
      //               }),
      //               identifier: identifier,
      //               userId: i.userId,
      //               templateId: tpl.id
      //             };
      //           }));

      //           next();
      //         }).catch(next);
      //       }, done);
      //     },
      //     function createCertifications(done) {
      //       if (!cToCreate) return done();
      //       we.db.models.certification
      //       .bulkCreate(cToCreate).then(function () {
      //         if (cToCreate && cToCreate.length) {
      //           we.log.info('Event: cfsession certifications created: '+cToCreate.length);
      //         }
      //         done();
      //       }).catch(done);
      //     },
      //   ], function (err){
      //     if (err) {
      //       we.log.error('Error in generate user cfsession certifications: ', err);
      //     }
      //     return done();
      //   });
      // },
      // 'cfsession_speakers': function(we, e, done) {
      //   var tpl, cfsessions, cToCreate = [];

      //   we.utils.async.series([
      //     function loadSession(done) {
      //       we.db.models.cfsession.findAll({
      //         where: { eventId: e.id }
      //       }).then(function (r) {
      //         cfsessions = r;
      //         done();
      //       }).catch(done);
      //     },
      //     function loadCertificationTemplate(done) {
      //       if (!cfsessions) return done();
      //       we.db.models.certificationTemplate.findOne({
      //         where: { identifier: 'event-1-cfspeaker' }
      //       }).then(function (r) {
      //         tpl = r;
      //         done();
      //       }).catch(done);
      //     },

      //     function createCFSessionCerfications(done) {
      //       if (!tpl) return done();

      //       var startDate = we.utils.moment(e.eventStartDate).format('DD/MM');
      //       var endDate = we.utils.moment(e.eventEndDate).format('DD/MM');
      //       var textFN = we.hbs.compile(tpl.text);

      //       we.utils.async.eachSeries(cfsessions, function (cfsession, next) {
      //         var identifier = 'event-'+e.id+'-cfspeaker-'+cfsession.id;

      //         var sql = 'SELECT cfs.id AS id, cfs.userId AS userId, users.fullName, users.displayName, users.email '+
      //           'FROM cfsessions AS cfs '+
      //           'LEFT JOIN  users ON users.id=cfs.userId '+
      //           'LEFT JOIN certifications ON certifications.identifier="'+identifier+'" '+
      //             ' AND certifications.userId=cfs.userId '+
      //           'WHERE cfs.eventId="'+e.id+'" '+
      //             'AND certifications.id IS NULL AND cfs.id='+cfsession.id;

      //         we.db.defaultConnection.query(sql)
      //         .then(function (r) {
      //           if (!r || !r[0]) return next();
      //           cToCreate = cToCreate.concat(r[0].map(function (i) {
      //             return {
      //               name: we.i18n.__('cfcertification.cfsession.name', {
      //                 event: e, cfsession: cfsession, data: i
      //               }),
      //               text: textFN({
      //                 event: e, cfsession: cfsession, data: i,
      //                 startDate: startDate,
      //                 endDate: endDate
      //               }),
      //               identifier: identifier,
      //               userId: i.userId,
      //               templateId: tpl.id
      //             };
      //           }));

      //           next();
      //         }).catch(next);
      //       }, done);
      //     },
      //     function createCertifications(done) {
      //       if (!cToCreate) return done();
      //       we.db.models.certification
      //       .bulkCreate(cToCreate).then(function () {
      //         if (cToCreate && cToCreate.length) {
      //           we.log.info('Event: cfspeaker certifications created: '+cToCreate.length);
      //         }
      //         done();
      //       }).catch(done);
      //     },
      //   ], function (err){
      //     if (err) {
      //       we.log.error('Error in generate user cfspeaker certifications: ', err);
      //     }
      //     return done();
      //   });
      // }
    }
    }
  });
  // ser plugin routes
  plugin.setRoutes({
    'get /event/:eventId([0-9]+)/admin/certification': {
      titleHandler  : 'i18n',
      titleI18n     : 'cfcertification.adminPage',
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'adminPage',
      // model         : 'event',
      permission    : 'manage_event',
      template      : 'cfcertification/adminPage'
    },
    'get /event/:eventId([0-9]+)/admin/certification/:identifier/template': {
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'updateTemplate',
      model         : 'certificationTemplate',
      permission    : 'manage_event',
      template      : 'cfcertification/updateTemplate'
    },
    'post /event/:eventId([0-9]+)/admin/certification/:identifier/template': {
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'updateTemplate',
      model         : 'certificationTemplate',
      permission    : 'manage_event',
      template      : 'cfcertification/updateTemplate'
    },

    'get /event/:eventId([0-9]+)/admin/certification/:identifier/template/preview.pdf': {
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'previewTemplate',
      model         : 'certificationTemplate',
      permission    : 'manage_event',
      template      : 'cfcertification/updateTemplate'
    },
    // 'post /event/:eventId([0-9]+)/admin/certification/:modelName(cfregistrationtype|cfsession)/:modelId([0-9]+)/generate': {
    //   layoutName    : 'eventAdmin',
    //   controller    : 'cfcertification',
    //   action        : 'generate',
    //   model         : 'certificationTemplate',
    //   permission    : 'manage_event'
    // }
  });

  return plugin;
};
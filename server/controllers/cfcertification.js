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

  updateCFRTypeTemplate: function updateCFRTypeTemplate(req, res) {
    if (!res.locals.event) return res.notFound();

    var id = req.params.cfregistrationtypeId;
    var identifier = 'event-'+res.locals.event.id+'-cfregistrationtype-'+id;

    req.we.utils.async.series([
      function loadCFRType(done) {
        req.we.db.models.cfregistrationtype.findOne({
          where: {
            id: id, eventId: res.locals.event.id
          }
        }).then(function afterLoadCFRType(r) {
          if (!r) return res.notFound();
          res.locals.cfregistrationtype = r;
          done();
        }).catch(done);
      },
      function loadCertificationTemplate(done) {
        req.we.db.models.certificationTemplate.findOne({
          where: { identifier: identifier }
        }).then(function (r) {
          if (r) {
            res.locals.data = r;
          } else {
            res.locals.data = {
              text: req.we.config.cfcertification.texts.cfregistrationtype
            }
          }
          done();
        }).catch(done);
      }
    ], function afterLoadAllData(err) {
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
          }).then(function afterUpdate() {

            res.addMessage('success', {
              text: 'cfcertification.template.updated.successfully'
            });

            res.ok();
          }).catch(res.queryError);
        } else {
          // create
          req.we.db.models.certificationTemplate
          .create({
            identifier: identifier,
            name: req.body.name,
            text: req.body.text,
            textPosition: req.body.textPosition,
            image: req.body.image,
            published: req.body.published
          }).then(function afterCreate(r) {
            res.locals.data = r;

            res.addMessage('success', {
              text: 'cfcertification.template.updated.successfully'
            });

            res.ok();
          }).catch(res.queryError);
        }
      } else {
        // get form
        res.ok();
      }
    });
  },

  /**
   * render one exemple template
   *
   */
  previewCFRTypeTemplate: function previewCFRTypeTemplate(req, res) {
    if (!res.locals.event) return res.notFound();

    var certificator = req.we.plugins['we-plugin-certification'];

    var id = req.params.cfregistrationtypeId;
    var identifier = 'event-'+res.locals.event.id+'-cfregistrationtype-'+id;

    req.we.db.models.certificationTemplate.findOne({
      where: { identifier: identifier }
    }).then(function afterFind(tpl) {
      if (!tpl) {
        // if not fount, redirect to create/update template page
        return res.goTo(
          '/event/'+res.locals.event.id+
          '/admin/cfregistrationtype/'+id+'/template');
      }

      res.locals.pdfTemplate = tpl;
      res.locals.data = { text: tpl.text };

      certificator.renderPDFtemplate(req, res);

    }).catch(res.queryError);
  }
};
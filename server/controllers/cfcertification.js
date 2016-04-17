module.exports = {
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
      function getGeneratedCertificationsCount(done) {
        if (!res.locals.cfregistrationtype) return done();

        req.we.db.models.certification.count({
          where: {
            identifier: identifier
          }
        }).then(function afterGetCount(count) {
          res.locals.metadata.certificationsCount = count;

          done();
        }).catch(done);
      },
      function CFRTypeRegistrations(done) {
        req.we.db.models.cfregistration.count({
          where: {
            cfregistrationtypeId: res.locals.cfregistrationtype.id
          }
        }).then(function (count) {
          res.locals.metadata.CFRTregistrationCount = count;
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
  },

  generateAllCFRTypeCertifications: function generateAllCFRTypeCertifications(req, res) {
    var plugin = req.we.plugins['we-plugin-event-certification'];
    var id = req.params.cfregistrationtypeId;

    req.we.db.models.cfregistrationtype.findOne({
      where: {
        id: id,
        eventId: res.locals.event.id
      }
    }).then(function afterFindCFRType(cfr) {
      if (!cfr) return res.notFound();

      var identifier = 'event-'+res.locals.event.id+'-cfregistrationtype-'+id;

      req.we.db.models.certification.destroy({
        where: { identifier: identifier }
      }).then(function afterDeleteOldCertifications(){

        plugin.generateCertificatiosForCFRType(req.we, res.locals.event, cfr, function(err) {
          if (err) return res.serverError();

          res.goTo(res.locals.redirectTo || '/event/'+res.locals.event.id+
            '/admin/cfregistrationtype/'+id+'/template');
        });
      }).catch(res.queryError);

    }).catch(res.queryError);
  }
};
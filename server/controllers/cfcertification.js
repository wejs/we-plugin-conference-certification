module.exports = {
  updateCFRTypeTemplate(req, res) {
    if (!res.locals.event) return res.notFound();

    let id = req.params.cfregistrationtypeId;
    let identifier = 'event-'+res.locals.event.id+'-cfregistrationtype-'+id;

    let models = req.we.db.models;

    req.we.utils.async.series([
      function loadCFRType(done) {
        models.cfregistrationtype
        .findOne({
          where: {
            id: id,
            eventId: res.locals.event.id
          }
        })
        .then(function afterLoadCFRType(r) {
          if (!r) return res.notFound();
          res.locals.cfregistrationtype = r;
          done();
        })
        .catch(done);
      },
      function getGeneratedCertificationsCount(done) {
        if (!res.locals.cfregistrationtype) return done();

        models.certification.count({
          where: {
            identifier: identifier
          }
        }).then(function afterGetCount(count) {
          res.locals.metadata.certificationsCount = count;

          done();
        }).catch(done);
      },
      function CFRTypeRegistrations(done) {
        models.cfregistration.count({
          where: {
            cfregistrationtypeId: res.locals.cfregistrationtype.id,
            present: true
          }
        })
        .then(function (count) {
          res.locals.metadata.CFRTregistrationCount = count;
          done();
        })
        .catch( (err)=> {
          req.we.log.error(err);
          done(err);
          return null;
        });
      },
      function loadCertificationTemplate(done) {
        models['certification-template'].findOne({
          where: { identifier: identifier }
        })
        .then(function (r) {
          if (r) {
            res.locals.data = r;
          } else {
            res.locals.data = {
              text: req.we.config.cfcertification.texts.cfregistrationtype
            }
          }
          done();
        })
        .catch(done);
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
          })
          .then(function afterUpdate() {

            res.addMessage('success', {
              text: 'cfcertification.template.updated.successfully'
            });

            res.ok();
          })
          .catch(res.queryError);
        } else {
          // create
          req.we.db.models['certification-template']
          .create({
            identifier: identifier,
            name: req.body.name,
            text: req.body.text,
            textPosition: req.body.textPosition,
            image: req.body.image,
            published: req.body.published
          })
          .then(function afterCreate(r) {
            res.locals.data = r;

            res.addMessage('success', {
              text: 'cfcertification.template.updated.successfully'
            });

            res.ok();
          })
          .catch(res.queryError);
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
  previewCFRTypeTemplate(req, res) {
    if (!res.locals.event) return res.notFound();

    let models = req.we.db.models;
    let certificator = req.we.plugins['we-plugin-certification'];

    let id = req.params.cfregistrationtypeId;
    let identifier = 'event-'+res.locals.event.id+'-cfregistrationtype-'+id;

    models['certification-template']
    .findOne({
      where: { identifier: identifier }
    })
    .then(function afterFind(tpl) {
      if (!tpl) {
        // if not fount, redirect to create/update template page
        return res.goTo(
          '/event/'+res.locals.event.id+
          '/admin/cfregistrationtype/'+id+'/template');
      }

      res.locals.pdfTemplate = tpl;
      res.locals.data = { text: tpl.text };

      certificator.renderPDFtemplate(req, res);

    })
    .catch(res.queryError);
  },

  generateAllCFRTypeCertifications(req, res) {
    const models = req.we.db.models;

    let plugin = req.we.plugins['we-plugin-event-certification'];
    let id = req.params.cfregistrationtypeId;

    models.cfregistrationtype
    .findOne({
      where: {
        id: id,
        eventId: res.locals.event.id
      }
    })
    .then(function afterFindCFRType(cfrt) {
      if (!cfrt) return res.notFound();

      plugin.generateCertificatiosForCFRType(req.we, res.locals.event, cfrt, function(err) {
        if (err) {
          req.we.log.error('cfcertification:generateAllCFRTypeCertifications:Error on generate certifications');
          return res.serverError(err);
        }

        res.goTo(res.locals.redirectTo || '/event/'+res.locals.event.id+
          '/admin/cfregistrationtype/'+id+'/template');
      });

    })
    .catch(res.queryError);
  },

  findAllCertifications(req, res) {
    const cf = res.locals.event;

    if (!cf || !cf.id) return res.notFound();

    const we = req.we,
      models = we.db.models;

    res.locals.query.where.identifier = {
      [we.Op.like]: 'event-'+res.locals.event.id+'-%'
    };

    res.locals.query.includes = [{
      as: 'user', model: models.user
    }];

    models.certification
    .findAll(res.locals.query)
    .then( function count(certifications) {
      return models.certification
      .count(res.locals.query)
      .then( (count)=> {
        res.locals.metadata.count = count;
        return certifications;
      });
    })
    .then( function respond(certifications) {
      res.locals.data = certifications;
      res.ok();
    })
    .catch(res.queryError);
  }
};
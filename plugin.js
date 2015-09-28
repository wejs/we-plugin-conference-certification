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
    }
  });
  // ser plugin routes
  plugin.setRoutes({
    'get /event/:eventId([0-9]+)/admin/certification': {
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'adminPage',
      // model         : 'event',
      permission    : 'manage_event',
      template      : 'cfcertification/adminPage'
    },
    'get /event/:eventId([0-9]+)/admin/certification/:modelName(cfregistrationtype|cfsession)/:modelId([0-9]+)/template': {
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'updateTemplate',
      model         : 'certificationTemplate',
      permission    : 'manage_event',
      template      : 'cfcertification/updateTemplate'
    },
    'post /event/:eventId([0-9]+)/admin/certification/:modelName(cfregistrationtype|cfsession)/:modelId([0-9]+)/template': {
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'updateTemplate',
      model         : 'certificationTemplate',
      permission    : 'manage_event',
      template      : 'cfcertification/updateTemplate'
    },
    'post /event/:eventId([0-9]+)/admin/certification/generate': {
      layoutName    : 'eventAdmin',
      controller    : 'cfcertification',
      action        : 'generate',
      model         : 'certificationTemplate',
      permission    : 'manage_event'
    }
  });
  return plugin;
};
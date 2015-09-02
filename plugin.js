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
    'get /conference/:conferenceId([0-9]+)/admin/certification': {
      layoutName    : 'conferenceAdmin',
      controller    : 'cfcertification',
      action        : 'adminPage',
      // model         : 'conference',
      permission    : 'manage_conference',
      template      : 'cfcertification/adminPage'
    },
    'get /conference/:conferenceId([0-9]+)/admin/certification/:modelName(cfregistrationtype|cfsession)/:modelId([0-9]+)/template': {
      layoutName    : 'conferenceAdmin',
      controller    : 'cfcertification',
      action        : 'updateTemplate',
      model         : 'certificationTemplate',
      permission    : 'manage_conference',
      template      : 'cfcertification/updateTemplate'
    },
    'post /conference/:conferenceId([0-9]+)/admin/certification/:modelName(cfregistrationtype|cfsession)/:modelId([0-9]+)/template': {
      layoutName    : 'conferenceAdmin',
      controller    : 'cfcertification',
      action        : 'updateTemplate',
      model         : 'certificationTemplate',
      permission    : 'manage_conference',
      template      : 'cfcertification/updateTemplate'
    }
  });
  return plugin;
};
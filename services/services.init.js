// Import libraries
var log4js = require("log4js");

// Obtain logger
var logger = log4js.getLogger('ServerScripts');

// Import functions
var SMSService = require("./sms.service").SMSService;

// Init the service
exports.ServicesInit = function(app) {

    // Write log
    logger.info('Incializando servicios');

    // Init service
    SMSService(app);
};

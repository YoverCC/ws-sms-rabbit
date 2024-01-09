var path = require("path");

// Obtiene el PID asociado al log
var getLogPid = function (loggingEvent) {
    // Obtengo pid
    var pid = loggingEvent.pid.toString();
    // Devuevlo con formato y largo fijo
    return (pid + '     ').substring(0, 5);
};

// Obtiene y arma el dato de nivel de log
var getLogLevel = function (loggingEvent) {
    // Largo del resultado a devolver
    var resultLength = 5;
    // Obtengo nivel de log
    var level = loggingEvent.level.toString();
    // Devuevlo con formato y largo fijo
    return '[' + (level + Array(resultLength + 1).join(' ')).substring(0, resultLength) + ']';
};

// Obtiene y arma el dato de categoría de log
var getLogCategory = function(loggingEvent) {
    // Largo del resultado a devolver
    var resultLength = 20;
    // Obtengo categoría de log
    var category = loggingEvent.categoryName.toString() + '.log';
    // Devuevlo con formato y largo fijo
    return '[' + (category + Array(resultLength + 1).join(' ')).substring(0, resultLength) + ']';
};

// Obtiene y arma el contexto asiciado al log
var getLogContext = function(loggingEvent) {

    // Largo del resultado a devolver
    let resultLength = 30;
    // Busco si se recibieron datos del contexto (enableCallStack tiene que estar habilitado)
    let filePath = loggingEvent.fileName;
    let lineNumber = (loggingEvent.lineNumber || 0).toString();
    // Verifico que tengo al menos la cantidad esperada de llamados
    if (!filePath) return '[Unknown context               ]';
    // Obtengo el nombre del archivo a partir del path
    let fileName = path.basename(filePath) || '';
    // Armo y acomodo el contexto para que tenga siempre el mismo largo
    let context = fileName + ':' + lineNumber;
    context = context.length > resultLength ? '...' + context.slice(-1 * (resultLength - ('...').length)) : context;
    // Devuelvo el texto completo juntando todo
    return '[' + (context + Array(resultLength + 1).join(' ')).substring(0, resultLength) + ']';
};

// Devuelve un file appender en base a un nombre de archivo
var GetFileAppender = function(logName, showContext, showCategory) {
    return {
        type: 'file',
        filename: path.resolve(__dirname, '..', 'logs', logName + '.log'),
        maxLogSize: 20 * 1000 * 1024,
        backups: 5,
        category: logName,
        layout: {
            type: 'pattern',
            pattern: (showCategory ? '%x{category} ' : '') + '%x{level} %d{yyyy-MM-dd hh:mm:ss.SSS} %x{pid} ' + (showContext ? '%x{context} ' : '') + '%m',
            tokens: {
                pid: getLogPid,
                level: getLogLevel,
                category: getLogCategory,
                context: getLogContext
            }
        }
    };
};

// Devuelve un console appender en base a un nombre de archivo
var GetConsoleAppender = function (logName, showContext, showCategory) {
    return ({
        type: 'console',
        category: logName,
        layout: {
            type: 'pattern',
            pattern: (showCategory ? '%x{category} ' : '') + '%x{level} %d{yyyy-MM-dd hh:mm:ss.SSS} %x{pid} ' + (showContext ? '%x{context} ' : '') + '%m',
            tokens: {
                pid: getLogPid,
                level: getLogLevel,
                category: getLogCategory,
                context: getLogContext
            }
        }
    });
};

// Devuelve un file appender en base a un nombre de archivo
var GetLogLevelAppender = function (level, appender) {
    return ({
        type: 'logLevelFilter',
        level: level,
        appender: appender,
    });
};

// Devuelve una categoría en base a un appender y el nivel mínimo a loguear
var GetCategory = function (appender, level, sendToErrorLog) {
    return ({
        appenders: [
            appender
        ].concat((sendToErrorLog ? ['ErrorFilter'] : [])),
        level: level,
        enableCallStack: true,
    });
};

// Configuracion de los loggers a utilizar
exports.LOGGER_CONFIG = {
    appenders: {
        'Console': GetConsoleAppender('Console', true, false),
        'Error': GetFileAppender('Error', true, true),
        'ErrorFilter': GetLogLevelAppender('ERROR', 'Error'),
        'AccessLog': GetFileAppender('AccessLog', false, false),
        'ServerScripts': GetFileAppender('ServerScripts', true, false),
    },
    categories: {
        'default': GetCategory('ServerScripts', 'DEBUG', true),
        'Console': GetCategory('Console', 'DEBUG', true),
        'Error': GetCategory('Error', 'DEBUG', true),
        'AccessLog': GetCategory('AccessLog', 'DEBUG', false),
        'ServerScripts': GetCategory('ServerScripts', 'DEBUG', true),
    },
    pm2: true,
    disableClustering: true,
};

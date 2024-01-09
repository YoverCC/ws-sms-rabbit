// Importo librerías
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var path = require('path');
var fs = require('fs');
var log4js = require("log4js");
var moment = require('moment');

// Importo configuraciones
var LOGGER_CONFIG = require("./config/logger.config").LOGGER_CONFIG;
var HTTP_BINDING_HOST = require("./config/server.config").HTTP_BINDING_HOST;
var HTTP_BINDING_PORT = require("./config/server.config").HTTP_BINDING_PORT;
var REQUEST_SIZE_LIMIT = require("./config/server.config").REQUEST_SIZE_LIMIT;

// Importo funciones compartidas
var DummyPromise = require('./shared/promise.shared.js').DummyPromise;

// Importo funcioón de inicialización para servicios
var ServicesInit = require('./services/services.init.js').ServicesInit;

// Obtengo aplicacion de Exress
var app = express();

// Referencia al server HTTP
var httpServer;

// Función par inicializar el server
function InitServer() {

    // Obtengo la ruta para la carpeta de logs
    var logsPath = path.resolve(__dirname, 'logs');

    // Si no existe la creo
    if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath);

    // Incremento la cantidad de listeners para evitar que el logger tire warning al inicializar
    global.process.setMaxListeners(20);

    // Inicializo los logs
    log4js.configure(LOGGER_CONFIG);

    // Obtengo logger
    var logger = log4js.getLogger('ServerScripts');

    // Anuncio servicio inicializandose
    logger.info('********************************************************');
    logger.info('* Inicializando servicio                               *');
    logger.info('********************************************************');

    // Inicializo los middleware para manejo de los request
    app.use(log4js.connectLogger(log4js.getLogger('AccessLog'), { level: 'auto' }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json({ limit: REQUEST_SIZE_LIMIT }));
    app.use(bodyParser.text({ limit: REQUEST_SIZE_LIMIT }));
    app.use(bodyParser.raw({ limit: REQUEST_SIZE_LIMIT }));
    app.use(cookieParser());
    app.use(compression());

    // Verifico si hubo error de parseo y lo capturo
    app.use(function(err, req, res, next) {
        // Error de parseo en el body tipo JSON
        if (err && err instanceof SyntaxError && err.status >= 400 && err.status < 500 && err.message.indexOf('JSON')) {
            // Logueo error
            logger.warn('No se pudo parsear contenido JSON de request ' + req.method + ' para \'' + req.path + '\'');
            // Devuelvo un not found
            res.status(400).json({ error: 'ERROR_INVALID_JSON', message: 'JSON inválido' });
        // Error por tamaño del request
        } else if (err && err.type === 'entity.too.large') {
            // Logueo error
            logger.warn('El contenido del request ' + req.method + ' para \'' + req.path + '\' supera el tamaño máximo permitido (' + REQUEST_SIZE_LIMIT + ')');
            // Devuelvo un not found
            res.status(400).json({  error: 'ERROR_REQUEST_SIZE_LIMIT', message: 'El request superó el tamaño máximo permitido (' + REQUEST_SIZE_LIMIT + ')' });
        // Error de parseo genérico
        } else if (err) {
            // Logueo error
            logger.warn('No se pudo parsear contenido de request ' + req.method + ' para \'' + req.path + '\'');
            // Devuelvo un not found
            res.status(400).json({ error: 'ERROR_INVALID_REQUEST', message: 'Request inválido' });
        }
    });

    // Para recibir los datos de la solicitud original en caso de estar atras de un proxy
    app.set('trust proxy', true);

    // Verifico si el dominio llego con www (para no tener que definir los dos dominios)
    app.use(function(req, res, next) {
        // Si me llega una solicitud con www, lo redirijo
        if (req.headers.host && req.headers.host.slice(0, 4) === 'www.') {
            var newHost = req.headers.host.slice(4);
            return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
        }
        // En cualquier otro caso sigo ejecutando
        next();
    });

    // Deshabilito el header Etag para evitar cache web en los request (el contenido static lo sigue usando)
    app.disable('etag');

    // Hago inicialización de servicios para APIs
    ServicesInit(app);

    // Si la solicitud no cayo en ningun servicio, devuelvo not found
    app.get('/*', function(req, res, next) {
        // Devuelvo un not found
        res.status(404).type('txt').send('Page not found');
    });

    // Configuraciones de moment para evitar que tire warnings al validar fechas
    moment.suppressDeprecationWarnings = true;

    // Inicio cadena de promesas
    return DummyPromise().then(
        result => {
            // Inicializo servicio HTTP
            return new Promise((resolve, reject) => {

                // Escribo a log
                logger.info('Iniciando servicio HTTP');
                // Logueo a consola
                console.log('Iniciando servicio HTTP');

                // Creo y obtengo el servidor HTTP
                httpServer = http.createServer(app);

                // Levanto servicio HTTP en el puerto configurado
                httpServer.listen(HTTP_BINDING_PORT, HTTP_BINDING_HOST)
                .on('listening', () => {
                    // Escribo a log
                    logger.info('Servicio HTTP escuchando en ' + httpServer.address().address + ':' + HTTP_BINDING_PORT.toString());
                    // Logueo a consola
                    console.log('Servicio HTTP escuchando en ' + httpServer.address().address + ':' + HTTP_BINDING_PORT.toString());
                    // Resuelvo promesa
                    resolve(true);
                });
            });
        }
    ).then(
        result => {
            // Escribo a log
            logger.info('Servicio inicializado correctamente');
            // Logueo a consola
            console.log('Servicio inicializado correctamente');
        }
    ).catch(
        err => {
            // Obtengo mensaje de error
            var errorMsg = (typeof err === 'string' ? err : err.message || err.description || '');

            // Escribo a log
            logger.error('Error al inicializar el servicio: ' + errorMsg);
            // Logueo a consola
            console.error('Error al inicializar el servicio: ' + errorMsg);
        }
    );
}

// Llamo a función de inicialización
InitServer();

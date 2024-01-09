
// Función dummy para encadenar promesas
exports.DummyPromise = function() {
  // Devuelvo promesa dummy que siempre resuelve true
  return new Promise(function(resolve, reject) {
      resolve(true);
  });
}

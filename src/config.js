// Configuracion de produccion
window.APP_CONFIG = {
  seedUrl: 'db/seed.sql',
  // Endpoint que recibe { messages } y devuelve { choices: [{ message: { content } }] }
  aiEndpoint: '/api/dictado'
};

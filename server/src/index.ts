import { createServer } from 'http';
import app from './app';
import { env } from './config/env';

const server = createServer(app);
const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

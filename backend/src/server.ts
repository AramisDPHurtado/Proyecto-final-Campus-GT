import "dotenv/config";
import { createApp } from "./app.js";
import { createStore } from "./repositories/create-store.js";

const port = Number(process.env.PORT ?? 4000);
const store = createStore();
const app = createApp({ store });
const server = app.listen(port, () => {
  console.log("API Karting Campus GT disponible en el puerto " + port);
});

async function shutdown() {
  server.close();
  await store.close();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

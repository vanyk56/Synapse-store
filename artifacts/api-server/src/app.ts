import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startBot } from "./bot/index";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API endpoints
app.use("/api", router);

// Serve Admin Panel static files in production / build
const publicPath = path.resolve(__dirname, "../../admin-panel/dist/public");
app.use(express.static(publicPath));

// For all other routes, serve index.html for SPA (client-side routing)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(publicPath, "index.html"), (err) => {
    if (err) {
      // If index.html doesn't exist yet (e.g. not built), forward to 404 handler
      res.status(404).send("Admin panel build not found. Please build the admin panel using: pnpm --filter @workspace/admin-panel run build");
    }
  });
});

// Start Telegram bot in polling mode alongside Express
startBot();

export default app;

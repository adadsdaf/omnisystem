import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

app.use("/api", router);

const frontendDist = process.env["FRONTEND_DIST"];
if (frontendDist) {
  const distPath = path.resolve(frontendDist);
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export default app;

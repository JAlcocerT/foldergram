/*
    Foldergram - Local-only photo and video gallery
    Copyright (C) 2026 Sajjad Ali

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { createServer } from "node:http";

import { appConfig } from "./config/env.js";
import { createApp } from "./app.js";
import { log } from "./services/log-service.js";
import { scannerService } from "./services/scanner-service.js";
import { watcherService } from "./services/watcher-service.js";

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = createServer(app);

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      log.error(
        `Port ${appConfig.port} is already in use`,
        "Another server is already listening on that port. Stop it first or change SERVER_PORT in .env.",
      );
    } else {
      log.error("HTTP server failed to start", error.message);
    }

    process.exitCode = 1;
  });

  server.listen(appConfig.port, () => {
    log.info(`HTTP server listening on http://localhost:${appConfig.port}`);
    const startupAction = scannerService.handleStartup("startup");
    if (startupAction === "blocked") {
      log.info("Gallery watcher deferred until the library rebuild completes");
      return;
    }

    if (startupAction === "idle" && appConfig.isDevelopment) {
      log.info(
        "Gallery watcher idle until a user-triggered scan or rebuild starts it",
      );
    }
  });

  async function shutdown(signal: string): Promise<void> {
    log.info(`Received ${signal}, shutting down`);
    await watcherService.stop();
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void bootstrap();

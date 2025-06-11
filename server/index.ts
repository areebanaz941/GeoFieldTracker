import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setStorage, type IStorage } from "./storage";
import { MongoStorage } from "./mongoStorage";
import { connectToMongoDB } from "./mongoDb";
import { InsertUser, InsertTeam } from "@shared/schema";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to add supervisor account and team data
async function addInitialData(storage: IStorage) {
  try {
    log("Setting up initial data...");

    // Check if supervisor exists
    const existingSupervisor = await storage.getUserByUsername("supervisor12");
    let supervisorId: string;

    if (!existingSupervisor) {
      // Create supervisor account
      log("Creating supervisor account with username: supervisor12");
      const supervisorData: InsertUser = {
        username: "supervisor12",
        password: "supervisor@12", // Will be hashed in storage.createUser
        name: "System Supervisor",
        email: "supervisor@geowhats.com",
        role: "Supervisor",
      };

      const supervisor = await storage.createUser(supervisorData);
      supervisorId = supervisor._id.toString();
      log(`Supervisor created with ID: ${supervisorId}`);
    } else {
      supervisorId = existingSupervisor._id.toString();
      log(`Supervisor already exists with ID: ${supervisorId}`);
    }

    // Check if teams exist
    const allTeams = await storage.getAllTeams();

    if (allTeams.length === 0) {
      // Create initial teams
      log("Creating initial teams for field users");

      const teams: InsertTeam[] = [
        {
          name: "Field Team Alpha",
          description:
            "Primary field operations team for towers and infrastructure",
          status: "Approved",
          createdBy: supervisorId,
        },
        {
          name: "Field Team Beta",
          description: "Secondary field operations team for maintenance tasks",
          status: "Approved",
          createdBy: supervisorId,
        },
        {
          name: "Maintenance Team",
          description:
            "Specialized team for infrastructure maintenance and repairs",
          status: "Approved",
          createdBy: supervisorId,
        },
        {
          name: "Survey Team",
          description: "Team responsible for site surveys and boundary mapping",
          status: "Approved",
          createdBy: supervisorId,
        },
      ];

      for (const teamData of teams) {
        const team = await storage.createTeam(teamData);
        log(`Created team: ${team.name} (ID: ${team._id})`);
      }

      log("Initial teams created successfully");
    } else {
      log(`Found ${allTeams.length} existing teams`);
    }

    // Create a sample field user for testing (optional)
    const existingFieldUser =
      await storage.getUserByUsername("field_user_demo");
    if (!existingFieldUser && allTeams.length > 0) {
      log("Creating demo field user");

      const fieldUserData: InsertUser = {
        username: "field_user_demo",
        password: "demo123",
        name: "Demo Field User",
        email: "field.demo@geowhats.com",
        role: "Field",
        teamId: allTeams[0]._id.toString(), // Assign to first team
      };

      const fieldUser = await storage.createUser(fieldUserData);
      log(`Demo field user created with ID: ${fieldUser._id}`);
    }

    log("Initial data setup completed successfully");
  } catch (error) {
    console.error("Error adding initial data:", error);
    throw error; // Re-throw to handle connection issues
  }
}

// Function to initialize storage with connection handling
async function initializeStorage(): Promise<IStorage> {
  const useMongoDb = process.env.USE_MONGODB !== "false"; // Default to true unless explicitly disabled

  if (useMongoDb) {
    try {
      log("Attempting to connect to MongoDB...");

      // Try MongoDB first
      const { setupDatabase } = await import("./db");
      const { MongoStorage } = await import("./mongoStorage");

      // Setup database connection and indexes
      await setupDatabase();

      const storage = new MongoStorage();
      log("MongoDB connection established successfully");
      return storage;
    } catch (error) {
      console.error("MongoDB connection failed:", error);
      log("Falling back to file storage...");
    }
  } else {
    log("MongoDB disabled via environment variable, using file storage");
  }

  // Fallback to file storage
  log("Using file storage for data persistence...");
  const { FileStorage } = await import("./fileStorage");
  return new FileStorage();
}

// Graceful shutdown handling
function setupGracefulShutdown(server: any, storage: IStorage) {
  const shutdown = async (signal: string) => {
    log(`Received ${signal}. Shutting down gracefully...`);

    try {
      // Close HTTP server
      server.close(() => {
        log("HTTP server closed");
      });

      // Close database connection if it's MongoDB
      if ("disconnect" in storage) {
        await (storage as any).disconnect();
        log("Database connection closed");
      }

      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

(async () => {
  try {
    log("Starting GeoWhats application...");

    // Initialize storage (MongoDB with file storage fallback)
    const storage = await initializeStorage();

    // Set as the global storage instance
    setStorage(storage);

    // Add initial data (supervisor account and teams)
    await addInitialData(storage);

    // Setup routes
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error ${status}: ${message}`);
      res.status(status).json({ message });

      // Log error details in development
      if (app.get("env") === "development") {
        console.error(err);
      }
    });

    // Setup Vite in development or serve static files in production
    if (app.get("env") === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Serving static files for production...");
      serveStatic(app);
    }

    // Start the server
    const port = parseInt(process.env.PORT || "5000", 10);
const host = process.env.HOST || "127.0.0.1"; // Use IPv4 explicitly instead of "localhost"

server.listen(port, host, () => {
  log(`🚀 GeoWhats server running on http://${host}:${port}`);
  log(`📊 Environment: ${app.get("env") || "development"}`);
  log(`💾 Storage: ${storage.constructor.name}`);

  if (app.get("env") === "development") {
    log("📝 API documentation available at /api");
    log("🔧 Development tools enabled");
  }
});

    // Setup graceful shutdown
    setupGracefulShutdown(server, storage);
  } catch (error) {
    console.error("Failed to start application:", error);

    // If MongoDB fails completely, try file storage as last resort
    if (error instanceof Error && error.message.includes("MongoDB")) {
      try {
        log("Attempting emergency file storage fallback...");
        const { FileStorage } = await import("./fileStorage");
        const storage = new FileStorage();
        setStorage(storage);
        await addInitialData(storage);
        log(
          "Emergency fallback successful - application running with file storage",
        );
      } catch (fallbackError) {
        console.error("Emergency fallback also failed:", fallbackError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
})();

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

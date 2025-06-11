import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import bcrypt from "bcryptjs";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer, { MulterError } from "multer";
import path from "path";
import fs from "fs";
import {
  insertUserSchema,
  insertTaskSchema,
  insertFeatureSchema,
  insertBoundarySchema,
  insertTaskUpdateSchema,
  insertTaskEvidenceSchema,
  insertTeamSchema,
  isValidObjectId,
} from "@shared/schema";
import { z } from "zod";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Extend Express Request type for file uploads
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, uploadDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "geowhats-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  // Passport setup
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Update user's last active time
        await storage.updateUserLastActive(user._id.toString());

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    done(null, user._id.toString());
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Serve static uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Middleware to check if user is supervisor
  const isSupervisor = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && (req.user as any).role === "Supervisor") {
      return next();
    }
    res
      .status(403)
      .json({ message: "Access denied: Supervisor role required" });
  };

  // Middleware to validate ObjectId
  const validateObjectId = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const id = req.params[paramName];
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: `Invalid ${paramName} format` });
      }
      next();
    };
  };

  // Authentication routes
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/current-user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = { ...(req.user as any) };
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      if (userData.role === "Field" && userData.teamId) {
        if (!isValidObjectId(userData.teamId)) {
          return res.status(400).json({ message: "Invalid team ID format" });
        }

        const team = await storage.getTeam(userData.teamId);
        if (!team) {
          return res.status(400).json({ message: "Team does not exist" });
        }
        if (team.status !== "Approved") {
          return res
            .status(400)
            .json({ message: "Team is not approved for registration" });
        }
      }

      userData.password = await bcrypt.hash(userData.password, 10);
      const newUser = await storage.createUser(userData);
      const { password, ...userResponse } = newUser as any;
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users/field", isAuthenticated, async (req, res) => {
    try {
      const fieldUsers = await storage.getAllFieldUsers();
      const usersResponse = fieldUsers.map((user: any) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersResponse);
    } catch (error) {
      console.error("Get field users error:", error);
      res.status(500).json({ message: "Failed to fetch field users" });
    }
  });

  app.post("/api/users/location", isAuthenticated, async (req, res) => {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) {
        return res
          .status(400)
          .json({ message: "Latitude and longitude are required" });
      }

      const updatedUser = await storage.updateUserLocation(
        (req.user as any)._id.toString(),
        { lat, lng },
      );
      const { password, ...userResponse } = updatedUser as any;
      res.json(userResponse);
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Task routes
  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      taskData.createdBy = (req.user as any)._id.toString();

      const newTask = await storage.createTask(taskData);
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Create task error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Get all tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/my-tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasksByAssignee(
        (req.user as any)._id.toString(),
      );
      res.json(tasks);
    } catch (error) {
      console.error("Get my tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Feature routes
  app.post("/api/features", isAuthenticated, async (req, res) => {
    try {
      const featureData = insertFeatureSchema.parse({
        ...req.body,
        createdBy: (req.user as any)._id.toString(),
      });

      const newFeature = await storage.createFeature(featureData);
      res.status(201).json(newFeature);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Create feature error:", error);
      res.status(500).json({ message: "Failed to create feature" });
    }
  });

  app.get("/api/features", isAuthenticated, async (req, res) => {
    try {
      const features = await storage.getAllFeatures();
      res.json(features);
    } catch (error) {
      console.error("Get features error:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  // Team routes
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      teamData.createdBy = (req.user as any)._id.toString();

      if ((req.user as any).role === "Supervisor") {
        teamData.status = "Approved";
      }

      const newTeam = await storage.createTeam(teamData);
      res.status(201).json(newTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Create team error:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Get teams error:", error);
      res.status(500).json({ message: "Failed to get teams" });
    }
  });

  app.get(
    "/api/teams/:id",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }
        res.json(team);
      } catch (error) {
        console.error("Get team error:", error);
        res.status(500).json({ message: "Failed to get team" });
      }
    },
  );

  app.patch(
    "/api/teams/:id/status",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
        const { status } = req.body;

        if (!["Pending", "Approved", "Rejected"].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }

        const updatedTeam = await storage.updateTeamStatus(
          teamId,
          status,
          status === "Approved" ? (req.user as any)._id.toString() : undefined,
        );

        res.json(updatedTeam);
      } catch (error) {
        console.error("Update team status error:", error);
        res.status(500).json({ message: "Failed to update team status" });
      }
    },
  );

  app.get(
    "/api/teams/:id/members",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }

        const members = await storage.getUsersByTeam(teamId);
        const membersResponse = members.map((user: any) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        res.json(membersResponse);
      } catch (error) {
        console.error("Get team members error:", error);
        res.status(500).json({ message: "Failed to get team members" });
      }
    },
  );

  // Task status and assignment routes
  app.put(
    "/api/tasks/:id/status",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const updatedTask = await storage.updateTaskStatus(
          taskId,
          status,
          (req.user as any)._id.toString(),
        );
        res.json(updatedTask);
      } catch (error) {
        console.error("Update task status error:", error);
        res.status(500).json({ message: "Failed to update task status" });
      }
    },
  );

  app.put(
    "/api/tasks/:id/assign",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const { assignedTo } = req.body;

        if (!assignedTo) {
          return res.status(400).json({ message: "AssignedTo is required" });
        }

        if (!isValidObjectId(assignedTo)) {
          return res
            .status(400)
            .json({ message: "Invalid assignedTo ID format" });
        }

        const updatedTask = await storage.assignTask(taskId, assignedTo);
        res.json(updatedTask);
      } catch (error) {
        console.error("Assign task error:", error);
        res.status(500).json({ message: "Failed to assign task" });
      }
    },
  );

  // Task updates routes
  app.post(
    "/api/tasks/:id/updates",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const updateData = insertTaskUpdateSchema.parse({
          ...req.body,
          taskId,
          userId: (req.user as any)._id.toString(),
        });

        const newUpdate = await storage.createTaskUpdate(updateData);
        res.status(201).json(newUpdate);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        console.error("Create task update error:", error);
        res.status(500).json({ message: "Failed to create task update" });
      }
    },
  );

  app.get(
    "/api/tasks/:id/updates",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const updates = await storage.getTaskUpdates(taskId);
        res.json(updates);
      } catch (error) {
        console.error("Get task updates error:", error);
        res.status(500).json({ message: "Failed to fetch task updates" });
      }
    },
  );

  // Task evidence routes
  app.post(
    "/api/tasks/:id/evidence",
    isAuthenticated,
    validateObjectId("id"),
    upload.single("image"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const { description } = req.body;

        if (!req.file) {
          return res.status(400).json({ message: "Image file is required" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        const evidenceData = insertTaskEvidenceSchema.parse({
          taskId,
          userId: (req.user as any)._id.toString(),
          imageUrl,
          description: description || "",
        });

        const newEvidence = await storage.addTaskEvidence(evidenceData);
        res.status(201).json(newEvidence);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        console.error("Add task evidence error:", error);
        res.status(500).json({ message: "Failed to add task evidence" });
      }
    },
  );

  app.get(
    "/api/tasks/:id/evidence",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const evidence = await storage.getTaskEvidence(taskId);
        res.json(evidence);
      } catch (error) {
        console.error("Get task evidence error:", error);
        res.status(500).json({ message: "Failed to fetch task evidence" });
      }
    },
  );

  // Feature management routes
  app.put(
    "/api/features/:id",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const featureId = req.params.id;
        const feature = await storage.getFeature(featureId);

        if (!feature) {
          return res.status(404).json({ message: "Feature not found" });
        }

        // Check permissions - only creator or supervisor can update
        const user = req.user as any;
        if (
          feature.createdBy?.toString() !== user._id.toString() &&
          user.role !== "Supervisor"
        ) {
          return res
            .status(403)
            .json({
              message: "You don't have permission to update this feature",
            });
        }

        const updatedFeature = await storage.updateFeature(featureId, req.body);
        res.json(updatedFeature);
      } catch (error) {
        console.error("Update feature error:", error);
        res.status(500).json({ message: "Failed to update feature" });
      }
    },
  );

  app.delete(
    "/api/features/:id",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const featureId = req.params.id;
        const feature = await storage.getFeature(featureId);

        if (!feature) {
          return res.status(404).json({ message: "Feature not found" });
        }

        // Check permissions - only creator or supervisor can delete
        const user = req.user as any;
        if (
          feature.createdBy?.toString() !== user._id.toString() &&
          user.role !== "Supervisor"
        ) {
          return res
            .status(403)
            .json({
              message: "You don't have permission to delete this feature",
            });
        }

        const deleted = await storage.deleteFeature(featureId);
        if (deleted) {
          res.json({ message: "Feature deleted successfully" });
        } else {
          res.status(500).json({ message: "Failed to delete feature" });
        }
      } catch (error) {
        console.error("Delete feature error:", error);
        res.status(500).json({ message: "Failed to delete feature" });
      }
    },
  );

  // Boundary routes
  app.post("/api/boundaries", isSupervisor, async (req, res) => {
    try {
      const boundaryData = insertBoundarySchema.parse(req.body);
      const newBoundary = await storage.createBoundary(boundaryData);
      res.status(201).json(newBoundary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Create boundary error:", error);
      res.status(500).json({ message: "Failed to create boundary" });
    }
  });

  app.get("/api/boundaries", isAuthenticated, async (req, res) => {
    try {
      const boundaries = await storage.getAllBoundaries();
      res.json(boundaries);
    } catch (error) {
      console.error("Get boundaries error:", error);
      res.status(500).json({ message: "Failed to fetch boundaries" });
    }
  });

  app.put(
    "/api/boundaries/:id/status",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const updatedBoundary = await storage.updateBoundaryStatus(
          boundaryId,
          status,
        );
        res.json(updatedBoundary);
      } catch (error) {
        console.error("Update boundary status error:", error);
        res.status(500).json({ message: "Failed to update boundary status" });
      }
    },
  );

  app.put(
    "/api/boundaries/:id/assign",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const { assignedTo } = req.body;

        if (!assignedTo) {
          return res.status(400).json({ message: "AssignedTo is required" });
        }

        if (!isValidObjectId(assignedTo)) {
          return res
            .status(400)
            .json({ message: "Invalid assignedTo ID format" });
        }

        const updatedBoundary = await storage.assignBoundary(
          boundaryId,
          assignedTo,
        );
        res.json(updatedBoundary);
      } catch (error) {
        console.error("Assign boundary error:", error);
        res.status(500).json({ message: "Failed to assign boundary" });
      }
    },
  );

  // User assignment routes
  app.post(
    "/api/users/:id/assign-team",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const userId = req.params.id;
        const { teamId } = req.body;

        if (!teamId) {
          return res.status(400).json({ message: "Team ID is required" });
        }

        if (!isValidObjectId(teamId)) {
          return res.status(400).json({ message: "Invalid team ID format" });
        }

        const updatedUser = await storage.assignUserToTeam(userId, teamId);
        const { password, ...userResponse } = updatedUser as any;

        res.json(userResponse);
      } catch (error) {
        console.error("Assign user to team error:", error);
        res.status(500).json({ message: "Failed to assign user to team" });
      }
    },
  );

  // Enhanced functionality routes (conditional based on storage capabilities)
  const hasEnhancedMethods = (storage as any).getUsersNearLocation !== undefined;

  if (hasEnhancedMethods) {
    // Geospatial routes
    app.get("/api/users/nearby", isAuthenticated, async (req, res) => {
      try {
        const { lng, lat, maxDistance = 1000 } = req.query;

        if (!lng || !lat) {
          return res
            .status(400)
            .json({ message: "Longitude and latitude are required" });
        }

        const nearbyUsers = await (storage as any).getUsersNearLocation(
          parseFloat(lng as string),
          parseFloat(lat as string),
          parseInt(maxDistance as string),
        );

        const usersResponse = nearbyUsers.map((user: any) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        res.json(usersResponse);
      } catch (error) {
        console.error("Get nearby users error:", error);
        res.status(500).json({ message: "Failed to get nearby users" });
      }
    });

    app.get(
      "/api/boundaries/:id/features",
      isAuthenticated,
      validateObjectId("id"),
      async (req, res) => {
        try {
          const boundaryId = req.params.id;
          const features = await (storage as any).getFeaturesInBoundary(boundaryId);
          res.json(features);
        } catch (error) {
          console.error("Get features in boundary error:", error);
          res.status(500).json({ message: "Failed to get features in boundary" });
        }
      },
    );

    app.get(
      "/api/boundaries/:id/tasks",
      isAuthenticated,
      validateObjectId("id"),
      async (req, res) => {
        try {
          const boundaryId = req.params.id;
          const tasks = await (storage as any).getTasksInBoundary(boundaryId);
          res.json(tasks);
        } catch (error) {
          console.error("Get tasks in boundary error:", error);
          res.status(500).json({ message: "Failed to get tasks in boundary" });
        }
      },
    );

    // Analytics routes
    app.get("/api/analytics/task-stats", isAuthenticated, async (req, res) => {
      try {
        const { userId } = req.query;

        if (!userId || !isValidObjectId(userId as string)) {
          return res.status(400).json({ message: "Valid user ID is required" });
        }

        const stats = await (storage as any).getTaskStatsByUser(userId as string);
        res.json(stats);
      } catch (error) {
        console.error("Get task stats error:", error);
        res.status(500).json({ message: "Failed to get task statistics" });
      }
    });

    app.get("/api/analytics/feature-stats", isAuthenticated, async (req, res) => {
      try {
        const stats = await (storage as any).getFeatureStatsByType();
        res.json(stats);
      } catch (error) {
        console.error("Get feature stats error:", error);
        res.status(500).json({ message: "Failed to get feature statistics" });
      }
    });

    // Search routes
    app.get("/api/search/features", isAuthenticated, async (req, res) => {
      try {
        const { q } = req.query;

        if (!q) {
          return res.status(400).json({ message: "Search query is required" });
        }

        const features = await (storage as any).searchFeatures(q as string);
        res.json(features);
      } catch (error) {
        console.error("Search features error:", error);
        res.status(500).json({ message: "Failed to search features" });
      }
    });

    app.get("/api/search/tasks", isAuthenticated, async (req, res) => {
      try {
        const { q } = req.query;

        if (!q) {
          return res.status(400).json({ message: "Search query is required" });
        }

        const tasks = await (storage as any).searchTasks(q as string);
        res.json(tasks);
      } catch (error) {
        console.error("Search tasks error:", error);
        res.status(500).json({ message: "Failed to search tasks" });
      }
    });

    // Bulk operations routes
    app.patch("/api/tasks/bulk-status", isAuthenticated, async (req, res) => {
      try {
        const { taskIds, status } = req.body;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
          return res.status(400).json({ message: "Task IDs array is required" });
        }

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const invalidIds = taskIds.filter((id) => !isValidObjectId(id));
        if (invalidIds.length > 0) {
          return res
            .status(400)
            .json({ message: "Invalid task ID format", invalidIds });
        }

        const updatedCount = await (storage as any).bulkUpdateTaskStatus(taskIds, status);
        res.json({ message: `Updated ${updatedCount} tasks`, updatedCount });
      } catch (error) {
        console.error("Bulk update task status error:", error);
        res.status(500).json({ message: "Failed to bulk update task status" });
      }
    });
  }

  return httpServer;
}
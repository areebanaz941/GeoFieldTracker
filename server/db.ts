import mongoose from "mongoose";
import * as schema from "@shared/schema";

// MongoDB connection string
const connectionString =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "mongodb+srv://areebanaz4848:Geowhatsapp@cluster0.ldne1j8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Log the connection being used (without showing credentials)
console.log("Using MongoDB connection with host:", connectionString.split('@')[1]?.split('/')[0] || 'Unknown host');

// MongoDB connection options
const mongooseOptions = {
  retryWrites: true,
  w: "majority" as const,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
  // bufferMaxEntries option removed as it's no longer supported
};

// Database connection instance
let isConnected = false;

// Connect to MongoDB
async function connectToDatabase() {
  if (isConnected) {
    console.log("Already connected to MongoDB");
    return mongoose.connection;
  }

  try {
    console.log("Connecting to MongoDB...");

    // Connect with appropriate options for MongoDB Atlas
    const connection = await mongoose.connect(
      connectionString,
      {
        ...mongooseOptions,
        ssl: true,
        tls: true,
        tlsAllowInvalidCertificates: true
      } as mongoose.ConnectOptions
    );

    isConnected = true;
    console.log("Successfully connected to MongoDB");

    return connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// Setup database and initialize collections
async function setupDatabase() {
  try {
    console.log("Setting up MongoDB database...");

    // Connect to database
    await connectToDatabase();

    // Create indexes for better performance
    await createIndexes();

    console.log("Database setup complete");
    return mongoose.connection;
  } catch (error) {
    console.error("Database setup error:", error);
    throw error;
  }
}

// Create necessary indexes for performance
async function createIndexes() {
  try {
    console.log("Creating database indexes...");

    // User indexes
    await schema.User.collection.createIndex({ username: 1 }, { unique: true });
    await schema.User.collection.createIndex({ email: 1 }, { unique: true });
    await schema.User.collection.createIndex({ teamId: 1 });
    await schema.User.collection.createIndex({ currentLocation: "2dsphere" });

    // Team indexes
    await schema.Team.collection.createIndex({ name: 1 }, { unique: true });
    await schema.Team.collection.createIndex({ status: 1 });
    await schema.Team.collection.createIndex({ createdBy: 1 });

    // Task indexes
    await schema.Task.collection.createIndex({ status: 1 });
    await schema.Task.collection.createIndex({ priority: 1 });
    await schema.Task.collection.createIndex({ assignedTo: 1 });
    await schema.Task.collection.createIndex({ createdBy: 1 });
    await schema.Task.collection.createIndex({ dueDate: 1 });
    await schema.Task.collection.createIndex({ location: "2dsphere" });
    await schema.Task.collection.createIndex({ featureId: 1 });
    await schema.Task.collection.createIndex({ boundaryId: 1 });

    // Feature indexes
    await schema.Feature.collection.createIndex({ feaNo: 1 });
    await schema.Feature.collection.createIndex({ feaState: 1 });
    await schema.Feature.collection.createIndex({ feaStatus: 1 });
    await schema.Feature.collection.createIndex({ feaType: 1 });
    await schema.Feature.collection.createIndex({ geometry: "2dsphere" });
    await schema.Feature.collection.createIndex({ boundaryId: 1 });
    await schema.Feature.collection.createIndex({ createdBy: 1 });

    // Boundary indexes
    await schema.Boundary.collection.createIndex({ name: 1 });
    await schema.Boundary.collection.createIndex({ status: 1 });
    await schema.Boundary.collection.createIndex({ assignedTo: 1 });
    await schema.Boundary.collection.createIndex({ geometry: "2dsphere" });

    // Task Update indexes
    await schema.TaskUpdate.collection.createIndex({ taskId: 1 });
    await schema.TaskUpdate.collection.createIndex({ userId: 1 });
    await schema.TaskUpdate.collection.createIndex({ createdAt: -1 });

    // Task Evidence indexes
    await schema.TaskEvidence.collection.createIndex({ taskId: 1 });
    await schema.TaskEvidence.collection.createIndex({ userId: 1 });
    await schema.TaskEvidence.collection.createIndex({ createdAt: -1 });

    console.log("Database indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes:", error);
    // Don't throw here as indexes might already exist
  }
}

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected from MongoDB");
  isConnected = false;
});

// Handle process termination
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    process.exit(1);
  }
});

// Helper function to get database connection
function getDatabase() {
  if (!isConnected) {
    throw new Error("Database not connected. Call setupDatabase() first.");
  }
  return mongoose.connection;
}

// Helper function to check connection status
function isConnectedToDatabase(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

// Database operation utilities
export const db = {
  // Models from schema
  User: schema.User,
  Team: schema.Team,
  Task: schema.Task,
  Feature: schema.Feature,
  Boundary: schema.Boundary,
  TaskUpdate: schema.TaskUpdate,
  TaskEvidence: schema.TaskEvidence,

  // Connection utilities
  connect: connectToDatabase,
  disconnect: () => mongoose.connection.close(),
  getConnection: getDatabase,
  isConnected: isConnectedToDatabase,

  // Transaction helper
  transaction: async <T>(
    callback: (session: mongoose.ClientSession) => Promise<T>,
  ): Promise<T> => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  },
};

// Seed data function (optional)
async function seedDatabase() {
  try {
    console.log("Checking for existing data...");

    // Check if users already exist
    const userCount = await schema.User.countDocuments();
    if (userCount > 0) {
      console.log(`Database already has ${userCount} users. Skipping seed.`);
      return;
    }

    console.log("Seeding database with initial data...");

    // Create default admin user
    const adminUser = new schema.User({
      username: "admin",
      password: "hashed_password_here", // Make sure to hash this!
      name: "System Administrator",
      email: "admin@example.com",
      role: "Supervisor",
    });

    await adminUser.save();
    console.log("Default admin user created");

    // Create default team
    const defaultTeam = new schema.Team({
      name: "Default Team",
      description: "Default field operations team",
      status: "Approved",
      createdBy: adminUser._id,
      approvedBy: adminUser._id,
    });

    await defaultTeam.save();
    console.log("Default team created");

    console.log("Database seeding complete");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

export {
  setupDatabase,
  connectToDatabase,
  createIndexes,
  seedDatabase,
  isConnectedToDatabase as isConnected,
};

import mongoose, { Schema, Document, Types } from "mongoose";
import { z } from "zod";

// Enums for feature states and statuses
export const FEATURE_STATES = [
  "Plan",
  "Under Construction",
  "As-Built",
  "Abandoned",
] as const;
export const FEATURE_STATUSES = [
  "New",
  "InProgress",
  "Completed",
  "In-Completed",
  "Submit-Review",
  "Review_Accepted",
  "Review_Reject",
  "Review_inprogress",
  "Active",
] as const;
export const MAINTENANCE_STATUSES = ["Required", "None"] as const;

// Zod enums for form validation
export const featureStateEnum = z.enum(FEATURE_STATES);
export const featureStatusEnum = z.enum(FEATURE_STATUSES);
export const maintenanceEnum = z.enum(MAINTENANCE_STATUSES);
export const FEATURE_TYPES = [
  "Tower",
  "Manhole",
  "FiberCable",
  "Parcel",
] as const;
export const SPECIFIC_FEATURE_TYPES = [
  "Mobillink",
  "Ptcl",
  "2-way",
  "4-way",
  "10F",
  "24F",
  "Commercial",
  "Residential",
] as const;
export const USER_ROLES = ["Supervisor", "Field"] as const;
export const TASK_STATUSES = [
  "Unassigned",
  "Assigned",
  "In Progress",
  "Completed",
  "In-Complete",
  "Submit-Review",
  "Review_Accepted",
  "Review_Reject",
  "Review_inprogress",
] as const;
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const TEAM_STATUSES = ["Pending", "Approved", "Rejected"] as const;

// TypeScript types for enums
export type FeatureState = (typeof FEATURE_STATES)[number];
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type FeatureType = (typeof FEATURE_TYPES)[number];
export type SpecificFeatureType = (typeof SPECIFIC_FEATURE_TYPES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TeamStatus = (typeof TEAM_STATUSES)[number];

// GeoJSON interface
interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONLineString;

// User Schema
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: Types.ObjectId;
  lastActive?: Date;
  currentLocation?: GeoJSONPoint;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "Field",
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    lastActive: {
      type: Date,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  {
    timestamps: true,
  },
);

// Add index for geospatial queries
userSchema.index({ currentLocation: "2dsphere" });

// Team Schema
export interface ITeam extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  status: TeamStatus;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: TEAM_STATUSES,
      default: "Pending",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Boundary Schema
export interface IBoundary extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  geometry: GeoJSONPolygon;
  status: FeatureStatus;
  assignedTo?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const boundarySchema = new Schema<IBoundary>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    status: {
      type: String,
      enum: FEATURE_STATUSES,
      default: "New",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Add geospatial index
boundarySchema.index({ geometry: "2dsphere" });

// Feature Schema
export interface IFeature extends Document {
  _id: Types.ObjectId;
  name: string;
  feaNo: string;
  feaState: FeatureState;
  feaStatus: FeatureStatus;
  feaType: FeatureType;
  specificType: SpecificFeatureType;
  maintenance: MaintenanceStatus;
  maintenanceDate?: Date;
  geometry: GeoJSONGeometry;
  lastUpdated: Date;
  remarks?: string;
  createdBy?: Types.ObjectId;
  boundaryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema<IFeature>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    feaNo: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    feaState: {
      type: String,
      enum: FEATURE_STATES,
      default: "Plan",
      required: true,
    },
    feaStatus: {
      type: String,
      enum: FEATURE_STATUSES,
      default: "New",
      required: true,
    },
    feaType: {
      type: String,
      enum: FEATURE_TYPES,
      required: true,
    },
    specificType: {
      type: String,
      enum: SPECIFIC_FEATURE_TYPES,
      required: true,
    },
    maintenance: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      default: "None",
      required: true,
    },
    maintenanceDate: {
      type: Date,
    },
    geometry: {
      type: {
        type: String,
        enum: ["Point", "LineString", "Polygon"],
        required: true,
      },
      coordinates: {
        type: Schema.Types.Mixed,
        required: true,
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    boundaryId: {
      type: Schema.Types.ObjectId,
      ref: "Boundary",
    },
  },
  {
    timestamps: true,
  },
);

// Add geospatial index
featureSchema.index({ geometry: "2dsphere" });

// Task Schema
export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  location?: GeoJSONPoint;
  assignedTo?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  featureId?: Types.ObjectId;
  boundaryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "Unassigned",
      required: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
      required: true,
    },
    dueDate: {
      type: Date,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    featureId: {
      type: Schema.Types.ObjectId,
      ref: "Feature",
    },
    boundaryId: {
      type: Schema.Types.ObjectId,
      ref: "Boundary",
    },
  },
  {
    timestamps: true,
  },
);

// Add geospatial index
taskSchema.index({ location: "2dsphere" });

// Task Update Schema
export interface ITaskUpdate extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  comment?: string;
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
  createdAt: Date;
}

const taskUpdateSchema = new Schema<ITaskUpdate>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      trim: true,
    },
    oldStatus: {
      type: String,
      enum: TASK_STATUSES,
    },
    newStatus: {
      type: String,
      enum: TASK_STATUSES,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Task Evidence Schema
export interface ITaskEvidence extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  imageUrl: string;
  description?: string;
  createdAt: Date;
}

const taskEvidenceSchema = new Schema<ITaskEvidence>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Create Models
export const User = mongoose.model<IUser>("User", userSchema);
export const Team = mongoose.model<ITeam>("Team", teamSchema);
export const Boundary = mongoose.model<IBoundary>("Boundary", boundarySchema);
export const Feature = mongoose.model<IFeature>("Feature", featureSchema);
export const Task = mongoose.model<ITask>("Task", taskSchema);
export const TaskUpdate = mongoose.model<ITaskUpdate>(
  "TaskUpdate",
  taskUpdateSchema,
);
export const TaskEvidence = mongoose.model<ITaskEvidence>(
  "TaskEvidence",
  taskEvidenceSchema,
);

// Zod validation schemas for input validation
export const insertUserSchema = z.object({
  username: z.string().min(1).trim(),
  password: z.string().min(6),
  name: z.string().min(1).trim(),
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(USER_ROLES).default("Field"),
  teamId: z.string().optional(),
});

export const insertBoundarySchema = z.object({
  name: z.string().min(1).trim(),
  description: z.string().optional(),
  geometry: z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  status: z.enum(FEATURE_STATUSES).default("New"),
  assignedTo: z.string().optional(),
});

export const insertFeatureSchema = z.object({
  name: z.string().min(1).trim(),
  feaNo: z.string().min(1).max(100).trim(),
  feaState: z.enum(FEATURE_STATES).default("Plan"),
  feaStatus: z.enum(FEATURE_STATUSES).default("New"),
  feaType: z.enum(FEATURE_TYPES),
  specificType: z.enum(SPECIFIC_FEATURE_TYPES),
  maintenance: z.enum(MAINTENANCE_STATUSES).default("None"),
  maintenanceDate: z.date().optional(),
  geometry: z.object({
    type: z.enum(["Point", "LineString", "Polygon"]),
    coordinates: z.union([
      z.array(z.number()), // Point
      z.array(z.array(z.number())), // LineString
      z.array(z.array(z.array(z.number()))), // Polygon
    ]),
  }),
  remarks: z.string().optional(),
  createdBy: z.string().optional(),
  boundaryId: z.string().optional(),
});

export const insertTaskSchema = z.object({
  title: z.string().min(1).trim(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).default("Unassigned"),
  priority: z.enum(TASK_PRIORITIES).default("Medium"),
  dueDate: z.date().optional(),
  location: z
    .object({
      type: z.literal("Point"),
      coordinates: z.array(z.number()).length(2),
    })
    .optional(),
  assignedTo: z.string().optional(),
  createdBy: z.string().optional(),
  featureId: z.string().optional(),
  boundaryId: z.string().optional(),
});

export const insertTaskUpdateSchema = z.object({
  taskId: z.string(),
  userId: z.string(),
  comment: z.string().optional(),
  oldStatus: z.enum(TASK_STATUSES).optional(),
  newStatus: z.enum(TASK_STATUSES).optional(),
});

export const insertTaskEvidenceSchema = z.object({
  taskId: z.string(),
  userId: z.string(),
  imageUrl: z.string().url(),
  description: z.string().optional(),
});

export const insertTeamSchema = z.object({
  name: z.string().min(1).trim(),
  description: z.string().optional(),
  status: z.enum(TEAM_STATUSES).default("Pending"),
  createdBy: z.string(),
});

// Infer types from Zod schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBoundary = z.infer<typeof insertBoundarySchema>;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertTaskUpdate = z.infer<typeof insertTaskUpdateSchema>;
export type InsertTaskEvidence = z.infer<typeof insertTaskEvidenceSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

// Extended types for frontend use
export type UserWithLocation = IUser & {
  location?: {
    lat: number;
    lng: number;
  };
};

export type FeatureWithGeometry = IFeature & {
  geometryData: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
};

export type TaskWithAssignee = ITask & {
  assignee?: IUser;
};

export type UserWithTeam = IUser & {
  team?: ITeam;
};

// Utility function to convert ObjectId to string for frontend
export const toObjectId = (id: string): Types.ObjectId =>
  new Types.ObjectId(id);

// Utility function to validate ObjectId
export const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

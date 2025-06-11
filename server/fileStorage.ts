import fs from "fs";
import path from "path";
import { IStorage } from "./storage";
import {
  InsertUser,
  InsertTeam,
  InsertTask,
  InsertFeature,
  InsertBoundary,
  InsertTaskUpdate,
  InsertTaskEvidence,
  isValidObjectId,
} from "@shared/schema";

// Plain object interfaces for FileStorage (without Mongoose document methods)
interface FileUser {
  _id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: "Supervisor" | "Field";
  teamId?: string;
  lastActive?: Date;
  currentLocation?: {
    type: "Point";
    coordinates: [number, number];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface FileTeam {
  _id: string;
  name: string;
  description?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FileTask {
  _id: string;
  title: string;
  description?: string;
  status: "Completed" | "Submit-Review" | "Review_Accepted" | "Review_Reject" | "Review_inprogress" | "Unassigned" | "Assigned" | "In Progress" | "In-Complete";
  priority: "Low" | "Medium" | "High" | "Critical";
  createdBy?: string;
  assignedTo?: string;
  dueDate?: Date;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  boundaryId?: string;
  featureId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FileFeature {
  _id: string;
  name: string;
  feaNo: string;
  feaState: "Plan" | "Under Construction" | "As-Built" | "Abandoned";
  feaStatus: "Completed" | "Submit-Review" | "Review_Accepted" | "Review_Reject" | "Review_inprogress" | "New" | "On-Hold" | "Active";
  feaType: string;
  specificType: string;
  maintenance: "None" | "Required" | "Completed";
  maintenanceDate?: Date;
  geometry?: {
    type: "Point" | "LineString" | "Polygon";
    coordinates: [number, number] | [number, number][] | [number, number][][];
  };
  remarks?: string;
  createdBy?: string;
  boundaryId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: Date;
}

interface FileBoundary {
  _id: string;
  name: string;
  description?: string;
  status: "New" | "In Progress" | "Completed" | "Under Review";
  assignedTo?: string;
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface FileTaskUpdate {
  _id: string;
  taskId: string;
  userId: string;
  comment?: string;
  oldStatus?: "Completed" | "Submit-Review" | "Review_Accepted" | "Review_Reject" | "Review_inprogress" | "Unassigned" | "Assigned" | "In Progress" | "In-Complete";
  newStatus?: "Completed" | "Submit-Review" | "Review_Accepted" | "Review_Reject" | "Review_inprogress" | "Unassigned" | "Assigned" | "In Progress" | "In-Complete";
  createdAt: Date;
}

interface FileTaskEvidence {
  _id: string;
  taskId: string;
  userId: string;
  imageUrl: string;
  description?: string;
  createdAt: Date;
}

/**
 * FileStorage implementation of IStorage interface
 * This class stores data in local JSON files to persist between app restarts
 * Updated to use MongoDB-style ObjectIds for consistency
 */
export class FileStorage implements IStorage {
  private users: Map<string, FileUser> = new Map();
  private tasks: Map<string, FileTask> = new Map();
  private features: Map<string, FileFeature> = new Map();
  private boundaries: Map<string, FileBoundary> = new Map();
  private taskUpdates: Map<string, FileTaskUpdate> = new Map();
  private taskEvidence: Map<string, FileTaskEvidence> = new Map();
  private teams: Map<string, FileTeam> = new Map();

  private dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), "data");

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.loadAllData();
  }

  // Generate MongoDB-style ObjectId
  private generateObjectId(): string {
    const timestamp = Math.floor(Date.now() / 1000)
      .toString(16)
      .padStart(8, "0");
    const machineId = Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
    const processId = Math.floor(Math.random() * 65535)
      .toString(16)
      .padStart(4, "0");
    const counter = Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
    return timestamp + machineId + processId + counter;
  }

  // Load data from files
  private loadAllData() {
    this.loadUsers();
    this.loadTeams();
    this.loadTasks();
    this.loadFeatures();
    this.loadBoundaries();
    this.loadTaskUpdates();
    this.loadTaskEvidence();
  }

  // Helper methods for file operations
  private loadUsers() {
    try {
      const filePath = path.join(this.dataDir, "users.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.users = new Map(
          data.users.map((user: FileUser) => [user._id.toString(), user]),
        );
      }
    } catch (error) {
      console.error("Error loading users data:", error);
    }
  }

  private saveUsers() {
    try {
      const filePath = path.join(this.dataDir, "users.json");
      const data = {
        users: Array.from(this.users.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving users data:", error);
    }
  }

  private loadTeams() {
    try {
      const filePath = path.join(this.dataDir, "teams.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.teams = new Map(
          data.teams.map((team: FileTeam) => [team._id.toString(), team]),
        );
      }
    } catch (error) {
      console.error("Error loading teams data:", error);
    }
  }

  private saveTeams() {
    try {
      const filePath = path.join(this.dataDir, "teams.json");
      const data = {
        teams: Array.from(this.teams.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving teams data:", error);
    }
  }

  private loadTasks() {
    try {
      const filePath = path.join(this.dataDir, "tasks.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.tasks = new Map(
          data.tasks.map((task: FileTask) => [task._id.toString(), task]),
        );
      }
    } catch (error) {
      console.error("Error loading tasks data:", error);
    }
  }

  private saveTasks() {
    try {
      const filePath = path.join(this.dataDir, "tasks.json");
      const data = {
        tasks: Array.from(this.tasks.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving tasks data:", error);
    }
  }

  private loadFeatures() {
    try {
      const filePath = path.join(this.dataDir, "features.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.features = new Map(
          data.features.map((feature: FileFeature) => [
            feature._id.toString(),
            feature,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading features data:", error);
    }
  }

  private saveFeatures() {
    try {
      const filePath = path.join(this.dataDir, "features.json");
      const data = {
        features: Array.from(this.features.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving features data:", error);
    }
  }

  private loadBoundaries() {
    try {
      const filePath = path.join(this.dataDir, "boundaries.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.boundaries = new Map(
          data.boundaries.map((boundary: FileBoundary) => [
            boundary._id.toString(),
            boundary,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading boundaries data:", error);
    }
  }

  private saveBoundaries() {
    try {
      const filePath = path.join(this.dataDir, "boundaries.json");
      const data = {
        boundaries: Array.from(this.boundaries.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving boundaries data:", error);
    }
  }

  private loadTaskUpdates() {
    try {
      const filePath = path.join(this.dataDir, "taskUpdates.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.taskUpdates = new Map(
          data.taskUpdates.map((update: FileTaskUpdate) => [
            update._id.toString(),
            update,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading task updates data:", error);
    }
  }

  private saveTaskUpdates() {
    try {
      const filePath = path.join(this.dataDir, "taskUpdates.json");
      const data = {
        taskUpdates: Array.from(this.taskUpdates.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving task updates data:", error);
    }
  }

  private loadTaskEvidence() {
    try {
      const filePath = path.join(this.dataDir, "taskEvidence.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.taskEvidence = new Map(
          data.taskEvidence.map((evidence: FileTaskEvidence) => [
            evidence._id.toString(),
            evidence,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading task evidence data:", error);
    }
  }

  private saveTaskEvidence() {
    try {
      const filePath = path.join(this.dataDir, "taskEvidence.json");
      const data = {
        taskEvidence: Array.from(this.taskEvidence.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving task evidence data:", error);
    }
  }

  // User operations
  async getUser(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<any> {
    const id = this.generateObjectId();
    const user: FileUser = {
      _id: id,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      email: insertUser.email,
      role: insertUser.role,
      teamId: insertUser.teamId ? insertUser.teamId.toString() : undefined,
      lastActive: undefined,
      currentLocation: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async updateUserLocation(
    id: string,
    location: { lat: number; lng: number },
  ): Promise<any> {
    if (!isValidObjectId(id)) throw new Error("Invalid user ID");

    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    user.currentLocation = {
      type: "Point",
      coordinates: [location.lng, location.lat],
    };
    user.lastActive = new Date();
    user.updatedAt = new Date();
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async updateUserLastActive(id: string): Promise<any> {
    if (!isValidObjectId(id)) throw new Error("Invalid user ID");

    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    user.lastActive = new Date();
    user.updatedAt = new Date();
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async getAllFieldUsers(): Promise<any[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === "Field",
    );
  }

  // Team operations
  async createTeam(insertTeam: InsertTeam): Promise<any> {
    const id = this.generateObjectId();
    const team: FileTeam = {
      _id: id,
      name: insertTeam.name,
      description: insertTeam.description,
      status: insertTeam.status || "Pending",
      createdBy: insertTeam.createdBy.toString(),
      approvedBy: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teams.set(id, team);
    this.saveTeams();
    return team;
  }

  async getTeam(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<any> {
    return Array.from(this.teams.values()).find((team) => team.name === name);
  }

  async updateTeamStatus(
    id: string,
    status: string,
    approvedBy?: string,
  ): Promise<any> {
    if (!isValidObjectId(id)) throw new Error("Invalid team ID");
    if (approvedBy && !isValidObjectId(approvedBy))
      throw new Error("Invalid approver ID");

    const team = this.teams.get(id);
    if (!team) {
      throw new Error(`Team with id ${id} not found`);
    }
    team.status = status as any;
    team.updatedAt = new Date();
    if (approvedBy) {
      team.approvedBy = approvedBy;
    }
    this.teams.set(id, team);
    this.saveTeams();
    return team;
  }

  async getAllTeams(): Promise<any[]> {
    return Array.from(this.teams.values());
  }

  async getUsersByTeam(teamId: string): Promise<any[]> {
    if (!isValidObjectId(teamId)) return [];
    return Array.from(this.users.values()).filter(
      (user) => user.teamId === teamId,
    );
  }

  async assignUserToTeam(userId: string, teamId: string): Promise<any> {
    if (!isValidObjectId(userId) || !isValidObjectId(teamId)) {
      throw new Error("Invalid user or team ID");
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    user.teamId = teamId;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    this.saveUsers();
    return user;
  }

  // Task operations
  async createTask(insertTask: InsertTask): Promise<any> {
    const id = this.generateObjectId();
    const task: FileTask = {
      _id: id,
      title: insertTask.title,
      description: insertTask.description,
      status: insertTask.status || "Unassigned",
      priority: insertTask.priority as any, // Type assertion to handle priority mismatch
      createdBy: insertTask.createdBy ? insertTask.createdBy.toString() : undefined,
      assignedTo: insertTask.assignedTo ? insertTask.assignedTo.toString() : undefined,
      dueDate: insertTask.dueDate,
      location: insertTask.location ? {
        type: "Point",
        coordinates: insertTask.location.coordinates as [number, number],
      } : undefined,
      boundaryId: insertTask.boundaryId ? insertTask.boundaryId.toString() : undefined,
      featureId: insertTask.featureId ? insertTask.featureId.toString() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);
    this.saveTasks();
    return task;
  }

  async getTask(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    return this.tasks.get(id);
  }

  async updateTaskStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<any> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new Error("Invalid task or user ID");
    }

    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    const oldStatus = task.status;
    task.status = status as any;
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    this.saveTasks();

    // Create task update record
    await this.createTaskUpdate({
      taskId: id,
      userId: userId,
      oldStatus: oldStatus as any,
      newStatus: status as any,
      comment: `Status updated to ${status}`,
    });

    return task;
  }

  async assignTask(id: string, assignedTo: string): Promise<any> {
    if (!isValidObjectId(id) || !isValidObjectId(assignedTo)) {
      throw new Error("Invalid task or user ID");
    }

    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    task.assignedTo = assignedTo;
    task.status = "Assigned";
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    this.saveTasks();
    return task;
  }

  async getTasksByAssignee(userId: string): Promise<any[]> {
    if (!isValidObjectId(userId)) return [];
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedTo === userId,
    );
  }

  async getTasksByCreator(userId: string): Promise<any[]> {
    if (!isValidObjectId(userId)) return [];
    return Array.from(this.tasks.values()).filter(
      (task) => task.createdBy === userId,
    );
  }

  async getAllTasks(): Promise<any[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // Feature operations
  async createFeature(insertFeature: InsertFeature): Promise<any> {
    const id = this.generateObjectId();
    
    // Convert geometry coordinates to proper types
    let geometry: FileFeature['geometry'] = undefined;
    if (insertFeature.geometry) {
      const geom = insertFeature.geometry;
      if (geom.type === "Point") {
        geometry = {
          type: "Point",
          coordinates: geom.coordinates as [number, number],
        };
      } else if (geom.type === "LineString") {
        geometry = {
          type: "LineString",
          coordinates: geom.coordinates as [number, number][],
        };
      } else if (geom.type === "Polygon") {
        geometry = {
          type: "Polygon",
          coordinates: geom.coordinates as [number, number][][],
        };
      }
    }

    const feature: FileFeature = {
      _id: id,
      name: insertFeature.name,
      feaNo: insertFeature.feaNo,
      feaState: insertFeature.feaState,
      feaStatus: insertFeature.feaStatus as any, // Type assertion to handle status mismatch
      feaType: insertFeature.feaType,
      specificType: insertFeature.specificType,
      maintenance: insertFeature.maintenance || "None",
      maintenanceDate: insertFeature.maintenanceDate,
      geometry: geometry,
      remarks: insertFeature.remarks,
      createdBy: insertFeature.createdBy ? insertFeature.createdBy.toString() : undefined,
      boundaryId: insertFeature.boundaryId ? insertFeature.boundaryId.toString() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date(),
    };
    this.features.set(id, feature);
    this.saveFeatures();
    return feature;
  }

  async getFeature(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    return this.features.get(id);
  }

  async updateFeature(id: string, featureUpdate: Partial<InsertFeature>): Promise<any> {
    if (!isValidObjectId(id)) {
      throw new Error("Invalid feature ID");
    }

    const existingFeature = this.features.get(id);
    if (!existingFeature) {
      throw new Error(`Feature with id ${id} not found`);
    }

    // Handle geometry conversion if present in update
    let geometry = existingFeature.geometry;
    if (featureUpdate.geometry) {
      const geom = featureUpdate.geometry;
      if (geom.type === "Point") {
        geometry = {
          type: "Point",
          coordinates: geom.coordinates as [number, number],
        };
      } else if (geom.type === "LineString") {
        geometry = {
          type: "LineString",
          coordinates: geom.coordinates as [number, number][],
        };
      } else if (geom.type === "Polygon") {
        geometry = {
          type: "Polygon",
          coordinates: geom.coordinates as [number, number][][],
        };
      }
    }

    const updatedFeature: FileFeature = {
      ...existingFeature,
      ...featureUpdate,
      _id: existingFeature._id,
      geometry: geometry,
      feaStatus: featureUpdate.feaStatus ? featureUpdate.feaStatus as any : existingFeature.feaStatus, // Type assertion
      lastUpdated: new Date(),
      updatedAt: new Date(),
    };

    this.features.set(id, updatedFeature);
    this.saveFeatures();
    return updatedFeature;
  }

  async deleteFeature(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = this.features.delete(id);
    this.saveFeatures();
    return result;
  }

  async getFeaturesByType(type: string): Promise<any[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaType === type,
    );
  }

  async getFeaturesByStatus(status: string): Promise<any[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaStatus === status,
    );
  }

  async getAllFeatures(): Promise<any[]> {
    return Array.from(this.features.values());
  }

  // Boundary operations
  async createBoundary(insertBoundary: InsertBoundary): Promise<any> {
    const id = this.generateObjectId();
    const boundary: FileBoundary = {
      _id: id,
      name: insertBoundary.name,
      description: insertBoundary.description,
      status: (insertBoundary.status as any) || "New", // Type assertion to handle status mismatch
      assignedTo: insertBoundary.assignedTo ? insertBoundary.assignedTo.toString() : undefined,
      geometry: {
        type: "Polygon",
        coordinates: insertBoundary.geometry.coordinates as [number, number][][],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async getBoundary(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    return this.boundaries.get(id);
  }

  async updateBoundaryStatus(id: string, status: string): Promise<any> {
    if (!isValidObjectId(id)) throw new Error("Invalid boundary ID");

    const boundary = this.boundaries.get(id);
    if (!boundary) {
      throw new Error(`Boundary with id ${id} not found`);
    }
    boundary.status = status as any;
    boundary.updatedAt = new Date();
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async assignBoundary(id: string, userId: string): Promise<any> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new Error("Invalid boundary or user ID");
    }

    const boundary = this.boundaries.get(id);
    if (!boundary) {
      throw new Error(`Boundary with id ${id} not found`);
    }
    boundary.assignedTo = userId;
    boundary.updatedAt = new Date();
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async getAllBoundaries(): Promise<any[]> {
    return Array.from(this.boundaries.values());
  }

  // Task updates operations
  async createTaskUpdate(insertUpdate: InsertTaskUpdate): Promise<any> {
    if (
      !isValidObjectId(insertUpdate.taskId) ||
      !isValidObjectId(insertUpdate.userId)
    ) {
      throw new Error("Invalid task or user ID");
    }

    const id = this.generateObjectId();
    const update: FileTaskUpdate = {
      _id: id,
      taskId: insertUpdate.taskId.toString(),
      userId: insertUpdate.userId.toString(),
      comment: insertUpdate.comment,
      oldStatus: insertUpdate.oldStatus,
      newStatus: insertUpdate.newStatus,
      createdAt: new Date(),
    };
    this.taskUpdates.set(id, update);
    this.saveTaskUpdates();
    return update;
  }

  async getTaskUpdates(taskId: string): Promise<any[]> {
    if (!isValidObjectId(taskId)) return [];
    return Array.from(this.taskUpdates.values())
      .filter((update) => update.taskId === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Task evidence operations
  async addTaskEvidence(
    insertEvidence: InsertTaskEvidence,
  ): Promise<any> {
    if (
      !isValidObjectId(insertEvidence.taskId) ||
      !isValidObjectId(insertEvidence.userId)
    ) {
      throw new Error("Invalid task or user ID");
    }

    const id = this.generateObjectId();
    const evidence: FileTaskEvidence = {
      _id: id,
      taskId: insertEvidence.taskId.toString(),
      userId: insertEvidence.userId.toString(),
      imageUrl: insertEvidence.imageUrl,
      description: insertEvidence.description,
      createdAt: new Date(),
    };
    this.taskEvidence.set(id, evidence);
    this.saveTaskEvidence();
    return evidence;
  }

  async getTaskEvidence(taskId: string): Promise<any[]> {
    if (!isValidObjectId(taskId)) return [];
    return Array.from(this.taskEvidence.values())
      .filter((evidence) => evidence.taskId === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Helper method to calculate distance between two points (Haversine formula)
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
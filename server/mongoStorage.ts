import { Types } from "mongoose";
import { IStorage } from "./storage";
import {
  User, Team, Task, Feature, Boundary, TaskUpdate, TaskEvidence,
  IUser, ITeam, ITask, IFeature, IBoundary, ITaskUpdate, ITaskEvidence,
  InsertUser, InsertTeam, InsertTask, InsertFeature, InsertBoundary, InsertTaskUpdate, InsertTaskEvidence
} from "@shared/schema";

/**
 * MongoStorage implementation of IStorage interface
 * This class handles all database operations using MongoDB models
 */
export class MongoStorage implements IStorage {
  constructor() {
    console.log("Initializing MongoDB storage with Mongoose models");
  }

  // User operations
  async getUser(id: string): Promise<IUser | undefined> {
    try {
      const user = await User.findById(id);
      return user || undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<IUser | undefined> {
    try {
      const user = await User.findOne({ username });
      return user || undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<IUser> {
    try {
      const user = new User(userData);
      await user.save();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUserLocation(id: string, location: { lat: number, lng: number }): Promise<IUser> {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      user.currentLocation = {
        type: "Point",
        coordinates: [location.lng, location.lat]
      };
      
      await user.save();
      return user;
    } catch (error) {
      console.error("Error updating user location:", error);
      throw error;
    }
  }

  async updateUserLastActive(id: string): Promise<IUser> {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      user.lastActive = new Date();
      await user.save();
      return user;
    } catch (error) {
      console.error("Error updating user last active:", error);
      throw error;
    }
  }

  async getAllFieldUsers(): Promise<IUser[]> {
    try {
      return await User.find({ role: "Field" });
    } catch (error) {
      console.error("Error getting all field users:", error);
      return [];
    }
  }

  // Team operations
  async createTeam(teamData: InsertTeam): Promise<ITeam> {
    try {
      const team = new Team(teamData);
      await team.save();
      return team;
    } catch (error) {
      console.error("Error creating team:", error);
      throw error;
    }
  }

  async getTeam(id: string): Promise<ITeam | undefined> {
    try {
      const team = await Team.findById(id);
      return team || undefined;
    } catch (error) {
      console.error("Error getting team:", error);
      return undefined;
    }
  }

  async getTeamByName(name: string): Promise<ITeam | undefined> {
    try {
      const team = await Team.findOne({ name });
      return team || undefined;
    } catch (error) {
      console.error("Error getting team by name:", error);
      return undefined;
    }
  }

  async updateTeamStatus(id: string, status: string, approvedBy?: string): Promise<ITeam> {
    try {
      const team = await Team.findById(id);
      if (!team) {
        throw new Error(`Team with ID ${id} not found`);
      }

      team.status = status as any;
      if (approvedBy) {
        team.approvedBy = new Types.ObjectId(approvedBy);
      }
      
      await team.save();
      return team;
    } catch (error) {
      console.error("Error updating team status:", error);
      throw error;
    }
  }

  async getAllTeams(): Promise<ITeam[]> {
    try {
      return await Team.find();
    } catch (error) {
      console.error("Error getting all teams:", error);
      return [];
    }
  }

  async getUsersByTeam(teamId: string): Promise<IUser[]> {
    try {
      return await User.find({ teamId: new Types.ObjectId(teamId) });
    } catch (error) {
      console.error("Error getting users by team:", error);
      return [];
    }
  }

  async assignUserToTeam(userId: string, teamId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error(`Team with ID ${teamId} not found`);
      }

      user.teamId = new Types.ObjectId(teamId);
      await user.save();
      return user;
    } catch (error) {
      console.error("Error assigning user to team:", error);
      throw error;
    }
  }

  // Task operations
  async createTask(taskData: InsertTask): Promise<ITask> {
    try {
      const task = new Task(taskData);
      await task.save();
      return task;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async getTask(id: string): Promise<ITask | undefined> {
    try {
      const task = await Task.findById(id);
      return task || undefined;
    } catch (error) {
      console.error("Error getting task:", error);
      return undefined;
    }
  }

  async updateTaskStatus(id: string, status: string, userId: string): Promise<ITask> {
    try {
      const task = await Task.findById(id);
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }

      // Save old status for history
      const oldStatus = task.status;
      
      // Update task status
      task.status = status as any;
      await task.save();

      // Create task update history
      await TaskUpdate.create({
        taskId: task._id,
        userId: new Types.ObjectId(userId),
        oldStatus,
        newStatus: status,
      });

      return task;
    } catch (error) {
      console.error("Error updating task status:", error);
      throw error;
    }
  }

  async assignTask(id: string, assignedTo: string): Promise<ITask> {
    try {
      const task = await Task.findById(id);
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }

      task.assignedTo = new Types.ObjectId(assignedTo);
      if (task.status === "Unassigned") {
        task.status = "Assigned";
      }
      
      await task.save();
      return task;
    } catch (error) {
      console.error("Error assigning task:", error);
      throw error;
    }
  }

  async getTasksByAssignee(userId: string): Promise<ITask[]> {
    try {
      return await Task.find({ assignedTo: new Types.ObjectId(userId) });
    } catch (error) {
      console.error("Error getting tasks by assignee:", error);
      return [];
    }
  }

  async getTasksByCreator(userId: string): Promise<ITask[]> {
    try {
      return await Task.find({ createdBy: new Types.ObjectId(userId) });
    } catch (error) {
      console.error("Error getting tasks by creator:", error);
      return [];
    }
  }

  async getAllTasks(): Promise<ITask[]> {
    try {
      return await Task.find();
    } catch (error) {
      console.error("Error getting all tasks:", error);
      return [];
    }
  }

  // Feature operations
  async createFeature(featureData: InsertFeature): Promise<IFeature> {
    try {
      const feature = new Feature(featureData);
      feature.lastUpdated = new Date();
      await feature.save();
      return feature;
    } catch (error) {
      console.error("Error creating feature:", error);
      throw error;
    }
  }

  async getFeature(id: string): Promise<IFeature | undefined> {
    try {
      const feature = await Feature.findById(id);
      return feature || undefined;
    } catch (error) {
      console.error("Error getting feature:", error);
      return undefined;
    }
  }

  async updateFeature(id: string, feature: Partial<InsertFeature>): Promise<IFeature> {
    try {
      const existingFeature = await Feature.findById(id);
      if (!existingFeature) {
        throw new Error(`Feature with ID ${id} not found`);
      }

      // Update all fields from partial update
      Object.keys(feature).forEach((key) => {
        (existingFeature as any)[key] = (feature as any)[key];
      });
      
      existingFeature.lastUpdated = new Date();
      await existingFeature.save();
      return existingFeature;
    } catch (error) {
      console.error("Error updating feature:", error);
      throw error;
    }
  }

  async deleteFeature(id: string): Promise<boolean> {
    try {
      const result = await Feature.deleteOne({ _id: new Types.ObjectId(id) });
      return result.deletedCount === 1;
    } catch (error) {
      console.error("Error deleting feature:", error);
      return false;
    }
  }

  async getFeaturesByType(type: string): Promise<IFeature[]> {
    try {
      return await Feature.find({ feaType: type });
    } catch (error) {
      console.error("Error getting features by type:", error);
      return [];
    }
  }

  async getFeaturesByStatus(status: string): Promise<IFeature[]> {
    try {
      return await Feature.find({ feaStatus: status });
    } catch (error) {
      console.error("Error getting features by status:", error);
      return [];
    }
  }

  async getAllFeatures(): Promise<IFeature[]> {
    try {
      return await Feature.find();
    } catch (error) {
      console.error("Error getting all features:", error);
      return [];
    }
  }

  // Boundary operations
  async createBoundary(boundaryData: InsertBoundary): Promise<IBoundary> {
    try {
      const boundary = new Boundary(boundaryData);
      await boundary.save();
      return boundary;
    } catch (error) {
      console.error("Error creating boundary:", error);
      throw error;
    }
  }

  async getBoundary(id: string): Promise<IBoundary | undefined> {
    try {
      const boundary = await Boundary.findById(id);
      return boundary || undefined;
    } catch (error) {
      console.error("Error getting boundary:", error);
      return undefined;
    }
  }

  async updateBoundaryStatus(id: string, status: string): Promise<IBoundary> {
    try {
      const boundary = await Boundary.findById(id);
      if (!boundary) {
        throw new Error(`Boundary with ID ${id} not found`);
      }

      boundary.status = status as any;
      await boundary.save();
      return boundary;
    } catch (error) {
      console.error("Error updating boundary status:", error);
      throw error;
    }
  }

  async assignBoundary(id: string, userId: string): Promise<IBoundary> {
    try {
      const boundary = await Boundary.findById(id);
      if (!boundary) {
        throw new Error(`Boundary with ID ${id} not found`);
      }

      boundary.assignedTo = new Types.ObjectId(userId);
      await boundary.save();
      return boundary;
    } catch (error) {
      console.error("Error assigning boundary:", error);
      throw error;
    }
  }

  async getAllBoundaries(): Promise<IBoundary[]> {
    try {
      return await Boundary.find();
    } catch (error) {
      console.error("Error getting all boundaries:", error);
      return [];
    }
  }

  // Task update operations
  async createTaskUpdate(updateData: InsertTaskUpdate): Promise<ITaskUpdate> {
    try {
      const update = new TaskUpdate(updateData);
      await update.save();
      return update;
    } catch (error) {
      console.error("Error creating task update:", error);
      throw error;
    }
  }

  async getTaskUpdates(taskId: string): Promise<ITaskUpdate[]> {
    try {
      return await TaskUpdate.find({ 
        taskId: new Types.ObjectId(taskId) 
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error getting task updates:", error);
      return [];
    }
  }

  // Task evidence operations
  async addTaskEvidence(evidenceData: InsertTaskEvidence): Promise<ITaskEvidence> {
    try {
      const evidence = new TaskEvidence(evidenceData);
      await evidence.save();
      return evidence;
    } catch (error) {
      console.error("Error adding task evidence:", error);
      throw error;
    }
  }

  async getTaskEvidence(taskId: string): Promise<ITaskEvidence[]> {
    try {
      return await TaskEvidence.find({ 
        taskId: new Types.ObjectId(taskId) 
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error getting task evidence:", error);
      return [];
    }
  }
}
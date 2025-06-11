import { db } from "./db";
import {
  User,
  Team,
  Task,
  Feature,
  Boundary,
  TaskUpdate,
  TaskEvidence,
  IUser,
  ITeam,
  ITask,
  IFeature,
  IBoundary,
  ITaskUpdate,
  ITaskEvidence,
  InsertUser,
  InsertTeam,
  InsertTask,
  InsertFeature,
  InsertBoundary,
  InsertTaskUpdate,
  InsertTaskEvidence,
  toObjectId,
  isValidObjectId,
} from "@shared/schema";
import { IStorage } from "./storage";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";

export class MongoStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<IUser | undefined> {
    if (!isValidObjectId(id)) return undefined;

    const user = await User.findById(id).populate("teamId").exec();
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<IUser | undefined> {
    const user = await User.findOne({ username }).populate("teamId").exec();
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<IUser> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = new User({
      ...userData,
      password: hashedPassword,
      teamId: userData.teamId ? toObjectId(userData.teamId) : undefined,
      lastActive: null,
      currentLocation: null,
    });

    await user.save();
    return user;
  }

  async updateUserLocation(
    id: string,
    location: { lat: number; lng: number },
  ): Promise<IUser> {
    if (!isValidObjectId(id)) throw new Error("Invalid user ID");

    const geoLocation = {
      type: "Point" as const,
      coordinates: [location.lng, location.lat], // MongoDB expects [longitude, latitude]
    };

    const user = await User.findByIdAndUpdate(
      id,
      {
        currentLocation: geoLocation,
        lastActive: new Date(),
      },
      { new: true },
    )
      .populate("teamId")
      .exec();

    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserLastActive(id: string): Promise<IUser> {
    if (!isValidObjectId(id)) throw new Error("Invalid user ID");

    const user = await User.findByIdAndUpdate(
      id,
      { lastActive: new Date() },
      { new: true },
    )
      .populate("teamId")
      .exec();

    if (!user) throw new Error("User not found");
    return user;
  }

  async getAllFieldUsers(): Promise<IUser[]> {
    return User.find({ role: "Field" }).populate("teamId").exec();
  }

  // Task operations
  async createTask(taskData: InsertTask): Promise<ITask> {
    const task = new Task({
      ...taskData,
      assignedTo: taskData.assignedTo
        ? toObjectId(taskData.assignedTo)
        : undefined,
      createdBy: taskData.createdBy
        ? toObjectId(taskData.createdBy)
        : undefined,
      featureId: taskData.featureId
        ? toObjectId(taskData.featureId)
        : undefined,
      boundaryId: taskData.boundaryId
        ? toObjectId(taskData.boundaryId)
        : undefined,
      location: taskData.location
        ? {
            type: "Point" as const,
            coordinates: taskData.location.coordinates,
          }
        : undefined,
    });

    await task.save();
    return task;
  }

  async getTask(id: string): Promise<ITask | undefined> {
    if (!isValidObjectId(id)) return undefined;

    const task = await Task.findById(id)
      .populate("assignedTo")
      .populate("createdBy")
      .populate("featureId")
      .populate("boundaryId")
      .exec();

    return task || undefined;
  }

  async updateTaskStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<ITask> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new Error("Invalid task or user ID");
    }

    // Get current task to record old status
    const currentTask = await Task.findById(id).exec();
    if (!currentTask) throw new Error("Task not found");

    const oldStatus = currentTask.status;

    const task = await Task.findByIdAndUpdate(
      id,
      {
        status: status as any,
        updatedAt: new Date(),
      },
      { new: true },
    )
      .populate(["assignedTo", "createdBy", "featureId", "boundaryId"])
      .exec();

    if (!task) throw new Error("Task not found");

    // Create a task update record
    await this.createTaskUpdate({
      taskId: id,
      userId: userId,
      oldStatus: oldStatus as any,
      newStatus: status as any,
      comment: `Status updated to ${status}`,
    });

    return task;
  }

  async assignTask(id: string, assignedTo: string): Promise<ITask> {
    if (!isValidObjectId(id) || !isValidObjectId(assignedTo)) {
      throw new Error("Invalid task or user ID");
    }

    const task = await Task.findByIdAndUpdate(
      id,
      {
        assignedTo: toObjectId(assignedTo),
        status: "Assigned",
        updatedAt: new Date(),
      },
      { new: true },
    )
      .populate(["assignedTo", "createdBy", "featureId", "boundaryId"])
      .exec();

    if (!task) throw new Error("Task not found");
    return task;
  }

  async getTasksByAssignee(userId: string): Promise<ITask[]> {
    if (!isValidObjectId(userId)) return [];

    return Task.find({ assignedTo: toObjectId(userId) })
      .populate(["assignedTo", "createdBy", "featureId", "boundaryId"])
      .sort({ createdAt: -1 })
      .exec();
  }

  async getTasksByCreator(userId: string): Promise<ITask[]> {
    if (!isValidObjectId(userId)) return [];

    return Task.find({ createdBy: toObjectId(userId) })
      .populate(["assignedTo", "createdBy", "featureId", "boundaryId"])
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllTasks(): Promise<ITask[]> {
    return Task.find({})
      .populate(["assignedTo", "createdBy", "featureId", "boundaryId"])
      .sort({ createdAt: -1 })
      .exec();
  }

  // Feature operations
  async createFeature(featureData: InsertFeature): Promise<IFeature> {
    const feature = new Feature({
      ...featureData,
      createdBy: featureData.createdBy
        ? toObjectId(featureData.createdBy)
        : undefined,
      boundaryId: featureData.boundaryId
        ? toObjectId(featureData.boundaryId)
        : undefined,
      lastUpdated: new Date(),
    });

    await feature.save();
    return feature;
  }

  async getFeature(id: string): Promise<IFeature | undefined> {
    if (!isValidObjectId(id)) return undefined;

    const feature = await Feature.findById(id)
      .populate("createdBy")
      .populate("boundaryId")
      .exec();

    return feature || undefined;
  }

  async updateFeature(
  id: string,
  featureUpdate: Partial<InsertFeature>,
): Promise<IFeature> {
  if (!isValidObjectId(id)) throw new Error("Invalid feature ID");

  const feature = await Feature.findByIdAndUpdate(
    id,
    {
      ...featureUpdate,
      lastUpdated: new Date(),
    },
    { new: true },
  )
    .populate(["createdBy", "boundaryId"])
    .exec();

  if (!feature) throw new Error("Feature not found");
  return feature;
}

  async deleteFeature(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;

    const result = await Feature.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async getFeaturesByType(type: string): Promise<IFeature[]> {
    return Feature.find({ feaType: type })
      .populate(["createdBy", "boundaryId"])
      .exec();
  }

  async getFeaturesByStatus(status: string): Promise<IFeature[]> {
    return Feature.find({ feaStatus: status })
      .populate(["createdBy", "boundaryId"])
      .exec();
  }

  async getAllFeatures(): Promise<IFeature[]> {
    return Feature.find({}).populate(["createdBy", "boundaryId"]).exec();
  }

  // Boundary operations
  async createBoundary(boundaryData: InsertBoundary): Promise<IBoundary> {
    const boundary = new Boundary({
      ...boundaryData,
      assignedTo: boundaryData.assignedTo
        ? toObjectId(boundaryData.assignedTo)
        : undefined,
    });

    await boundary.save();
    return boundary;
  }

  async getBoundary(id: string): Promise<IBoundary | undefined> {
    if (!isValidObjectId(id)) return undefined;

    const boundary = await Boundary.findById(id).populate("assignedTo").exec();

    return boundary || undefined;
  }

  async updateBoundaryStatus(id: string, status: string): Promise<IBoundary> {
    if (!isValidObjectId(id)) throw new Error("Invalid boundary ID");

    const boundary = await Boundary.findByIdAndUpdate(
      id,
      {
        status: status as any,
        updatedAt: new Date(),
      },
      { new: true },
    )
      .populate("assignedTo")
      .exec();

    if (!boundary) throw new Error("Boundary not found");
    return boundary;
  }

  async assignBoundary(id: string, userId: string): Promise<IBoundary> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new Error("Invalid boundary or user ID");
    }

    const boundary = await Boundary.findByIdAndUpdate(
      id,
      {
        assignedTo: toObjectId(userId),
        updatedAt: new Date(),
      },
      { new: true },
    )
      .populate("assignedTo")
      .exec();

    if (!boundary) throw new Error("Boundary not found");
    return boundary;
  }

  async getAllBoundaries(): Promise<IBoundary[]> {
    return Boundary.find({}).populate("assignedTo").exec();
  }

  // Task updates operations
  async createTaskUpdate(updateData: InsertTaskUpdate): Promise<ITaskUpdate> {
    if (
      !isValidObjectId(updateData.taskId) ||
      !isValidObjectId(updateData.userId)
    ) {
      throw new Error("Invalid task or user ID");
    }

    const taskUpdate = new TaskUpdate({
      ...updateData,
      taskId: toObjectId(updateData.taskId),
      userId: toObjectId(updateData.userId),
    });

    await taskUpdate.save();
    return taskUpdate;
  }

  async getTaskUpdates(taskId: string): Promise<ITaskUpdate[]> {
    if (!isValidObjectId(taskId)) return [];

    return TaskUpdate.find({ taskId: toObjectId(taskId) })
      .populate("userId")
      .sort({ createdAt: -1 })
      .exec();
  }

  // Task evidence operations
  async addTaskEvidence(
    evidenceData: InsertTaskEvidence,
  ): Promise<ITaskEvidence> {
    if (
      !isValidObjectId(evidenceData.taskId) ||
      !isValidObjectId(evidenceData.userId)
    ) {
      throw new Error("Invalid task or user ID");
    }

    const taskEvidence = new TaskEvidence({
      ...evidenceData,
      taskId: toObjectId(evidenceData.taskId),
      userId: toObjectId(evidenceData.userId),
    });

    await taskEvidence.save();
    return taskEvidence;
  }

  async getTaskEvidence(taskId: string): Promise<ITaskEvidence[]> {
    if (!isValidObjectId(taskId)) return [];

    return TaskEvidence.find({ taskId: toObjectId(taskId) })
      .populate("userId")
      .sort({ createdAt: -1 })
      .exec();
  }

  // Team operations
  async createTeam(teamData: InsertTeam): Promise<ITeam> {
    if (!isValidObjectId(teamData.createdBy)) {
      throw new Error("Invalid creator ID");
    }

    const team = new Team({
      ...teamData,
      createdBy: toObjectId(teamData.createdBy),
    });

    await team.save();
    return team;
  }

  async getTeam(id: string): Promise<ITeam | undefined> {
    if (!isValidObjectId(id)) return undefined;

    const team = await Team.findById(id)
      .populate(["createdBy", "approvedBy"])
      .exec();

    return team || undefined;
  }

  async getTeamByName(name: string): Promise<ITeam | undefined> {
    const team = await Team.findOne({ name })
      .populate(["createdBy", "approvedBy"])
      .exec();

    return team || undefined;
  }

  async updateTeamStatus(
    id: string,
    status: string,
    approvedBy?: string,
  ): Promise<ITeam> {
    if (!isValidObjectId(id)) throw new Error("Invalid team ID");
    if (approvedBy && !isValidObjectId(approvedBy))
      throw new Error("Invalid approver ID");

    const update: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    if (approvedBy) {
      update.approvedBy = toObjectId(approvedBy);
    }

    const team = await Team.findByIdAndUpdate(id, update, { new: true })
      .populate(["createdBy", "approvedBy"])
      .exec();

    if (!team) throw new Error("Team not found");
    return team;
  }

  async getAllTeams(): Promise<ITeam[]> {
    return Team.find({}).populate(["createdBy", "approvedBy"]).exec();
  }

  async getUsersByTeam(teamId: string): Promise<IUser[]> {
    if (!isValidObjectId(teamId)) return [];

    return User.find({ teamId: toObjectId(teamId) })
      .populate("teamId")
      .exec();
  }

  async assignUserToTeam(userId: string, teamId: string): Promise<IUser> {
    if (!isValidObjectId(userId) || !isValidObjectId(teamId)) {
      throw new Error("Invalid user or team ID");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { teamId: toObjectId(teamId) },
      { new: true },
    )
      .populate("teamId")
      .exec();

    if (!user) throw new Error("User not found");
    return user;
  }

  // Additional utility methods for MongoDB-specific operations

  // Geospatial queries
  async getUsersNearLocation(
    longitude: number,
    latitude: number,
    maxDistance: number = 1000,
  ): Promise<IUser[]> {
    return User.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance,
        },
      },
    })
      .populate("teamId")
      .exec();
  }

  async getFeaturesInBoundary(boundaryId: string): Promise<IFeature[]> {
    if (!isValidObjectId(boundaryId)) return [];

    return Feature.find({ boundaryId: toObjectId(boundaryId) })
      .populate(["createdBy", "boundaryId"])
      .exec();
  }

  async getTasksInBoundary(boundaryId: string): Promise<ITask[]> {
    if (!isValidObjectId(boundaryId)) return [];

    return Task.find({ boundaryId: toObjectId(boundaryId) })
      .populate(["assignedTo", "createdBy", "featureId", "boundaryId"])
      .sort({ createdAt: -1 })
      .exec();
  }

  // Aggregation queries
  async getTaskStatsByUser(
    userId: string,
  ): Promise<{ status: string; count: number }[]> {
    if (!isValidObjectId(userId)) return [];

    const stats = await Task.aggregate([
      { $match: { assignedTo: toObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } },
    ]);

    return stats;
  }

  async getFeatureStatsByType(): Promise<{ type: string; count: number }[]> {
    const stats = await Feature.aggregate([
      { $group: { _id: "$feaType", count: { $sum: 1 } } },
      { $project: { type: "$_id", count: 1, _id: 0 } },
    ]);

    return stats;
  }

  // Bulk operations
  async bulkUpdateTaskStatus(
    taskIds: string[],
    status: string,
  ): Promise<number> {
    const validIds = taskIds
      .filter((id) => isValidObjectId(id))
      .map((id) => toObjectId(id));

    const result = await Task.updateMany(
      { _id: { $in: validIds } },
      {
        status: status as any,
        updatedAt: new Date(),
      },
    );

    return result.modifiedCount;
  }

  // Search operations
  async searchFeatures(query: string): Promise<IFeature[]> {
    return Feature.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { feaNo: { $regex: query, $options: "i" } },
        { remarks: { $regex: query, $options: "i" } },
      ],
    })
      .populate(["createdBy", "boundaryId"])
      .exec();
  }

  async searchTasks(query: string): Promise<ITask[]> {
    return Task.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    })
      .populate(["assignedTo", "createdBy", "featureId", "boundaryId"])
      .exec();
  }
}

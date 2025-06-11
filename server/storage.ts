import {
  IUser, ITeam, ITask, IFeature, IBoundary, ITaskUpdate, ITaskEvidence, 
  InsertUser, InsertTeam, InsertTask, InsertFeature, InsertBoundary, InsertTaskUpdate, InsertTaskEvidence
} from "@shared/schema";

// Define the storage interface for data access
export interface IStorage {
  // User operations
  getUser(id: string): Promise<IUser | undefined>;
  getUserByUsername(username: string): Promise<IUser | undefined>;
  createUser(userData: InsertUser): Promise<IUser>;
  updateUserLocation(id: string, location: { lat: number, lng: number }): Promise<IUser>;
  updateUserLastActive(id: string): Promise<IUser>;
  getAllFieldUsers(): Promise<IUser[]>;
  
  // Team operations
  createTeam(teamData: InsertTeam): Promise<ITeam>;
  getTeam(id: string): Promise<ITeam | undefined>;
  getTeamByName(name: string): Promise<ITeam | undefined>;
  updateTeamStatus(id: string, status: string, approvedBy?: string): Promise<ITeam>;
  getAllTeams(): Promise<ITeam[]>;
  getUsersByTeam(teamId: string): Promise<IUser[]>;
  assignUserToTeam(userId: string, teamId: string): Promise<IUser>;
  
  // Task operations
  createTask(taskData: InsertTask): Promise<ITask>;
  getTask(id: string): Promise<ITask | undefined>;
  updateTaskStatus(id: string, status: string, userId: string): Promise<ITask>;
  assignTask(id: string, assignedTo: string): Promise<ITask>;
  getTasksByAssignee(userId: string): Promise<ITask[]>;
  getTasksByCreator(userId: string): Promise<ITask[]>;
  getAllTasks(): Promise<ITask[]>;
  
  // Feature operations
  createFeature(featureData: InsertFeature): Promise<IFeature>;
  getFeature(id: string): Promise<IFeature | undefined>;
  updateFeature(id: string, feature: Partial<InsertFeature>): Promise<IFeature>;
  deleteFeature(id: string): Promise<boolean>;
  getFeaturesByType(type: string): Promise<IFeature[]>;
  getFeaturesByStatus(status: string): Promise<IFeature[]>;
  getAllFeatures(): Promise<IFeature[]>;
  
  // Boundary operations
  createBoundary(boundaryData: InsertBoundary): Promise<IBoundary>;
  getBoundary(id: string): Promise<IBoundary | undefined>;
  updateBoundaryStatus(id: string, status: string): Promise<IBoundary>;
  assignBoundary(id: string, userId: string): Promise<IBoundary>;
  getAllBoundaries(): Promise<IBoundary[]>;
  
  // Task update operations
  createTaskUpdate(updateData: InsertTaskUpdate): Promise<ITaskUpdate>;
  getTaskUpdates(taskId: string): Promise<ITaskUpdate[]>;
  
  // Task evidence operations
  addTaskEvidence(evidenceData: InsertTaskEvidence): Promise<ITaskEvidence>;
  getTaskEvidence(taskId: string): Promise<ITaskEvidence[]>;
}

// In-memory storage implementation as a fallback
export class MemStorage implements IStorage {
  private users: Map<string, IUser> = new Map();
  private teams: Map<string, ITeam> = new Map();
  private tasks: Map<string, ITask> = new Map();
  private features: Map<string, IFeature> = new Map();
  private boundaries: Map<string, IBoundary> = new Map();
  private taskUpdates: Map<string, ITaskUpdate> = new Map();
  private taskEvidence: Map<string, ITaskEvidence> = new Map();
  
  private userCurrentId = 1;
  private teamCurrentId = 1;
  private taskCurrentId = 1;
  private featureCurrentId = 1;
  private boundaryCurrentId = 1;
  private taskUpdateCurrentId = 1;
  private taskEvidenceCurrentId = 1;

  constructor() {
    console.log('Initializing in-memory storage');
  }

  // Generate string ID
  private generateId(prefix: string, counter: number): string {
    return `${prefix}_${counter.toString().padStart(6, '0')}`;
  }

  // User methods
  async getUser(id: string): Promise<IUser | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<IUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<IUser> {
    const id = this.generateId('user', this.userCurrentId++);
    const user = {
      _id: id as any,
      ...insertUser,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActive: undefined,
      currentLocation: undefined,
    } as unknown as IUser;
    
    this.users.set(id, user);
    return user;
  }

  async updateUserLocation(id: string, location: { lat: number, lng: number }): Promise<IUser> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    user.currentLocation = { 
      type: 'Point',
      coordinates: [location.lng, location.lat]
    } as any;
    user.updatedAt = new Date();
    
    return user;
  }

  async updateUserLastActive(id: string): Promise<IUser> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    user.lastActive = new Date();
    user.updatedAt = new Date();
    
    return user;
  }

  async getAllFieldUsers(): Promise<IUser[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === 'Field'
    );
  }

  // Team methods
  async createTeam(insertTeam: InsertTeam): Promise<ITeam> {
    const id = this.generateId('team', this.teamCurrentId++);
    const team = {
      _id: id as any,
      ...insertTeam,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedBy: undefined,
    } as unknown as ITeam;
    
    this.teams.set(id, team);
    return team;
  }

  async getTeam(id: string): Promise<ITeam | undefined> {
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<ITeam | undefined> {
    return Array.from(this.teams.values()).find(
      (team) => team.name.toLowerCase() === name.toLowerCase()
    );
  }

  async updateTeamStatus(id: string, status: string, approvedBy?: string): Promise<ITeam> {
    const team = await this.getTeam(id);
    if (!team) {
      throw new Error(`Team with ID ${id} not found`);
    }
    
    team.status = status as any;
    team.updatedAt = new Date();
    
    if (approvedBy) {
      team.approvedBy = approvedBy as any;
    }
    
    return team;
  }

  async getAllTeams(): Promise<ITeam[]> {
    return Array.from(this.teams.values());
  }

  async getUsersByTeam(teamId: string): Promise<IUser[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.teamId?.toString() === teamId
    );
  }

  async assignUserToTeam(userId: string, teamId: string): Promise<IUser> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const team = await this.getTeam(teamId);
    if (!team) {
      throw new Error(`Team with ID ${teamId} not found`);
    }
    
    user.teamId = teamId as any;
    user.updatedAt = new Date();
    
    return user;
  }

  // Task methods
  async createTask(insertTask: InsertTask): Promise<ITask> {
    const id = this.generateId('task', this.taskCurrentId++);
    const task = {
      _id: id as any,
      ...insertTask,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ITask;
    
    this.tasks.set(id, task);
    return task;
  }

  async getTask(id: string): Promise<ITask | undefined> {
    return this.tasks.get(id);
  }

  async updateTaskStatus(id: string, status: string, userId: string): Promise<ITask> {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }
    
    task.status = status as any;
    task.updatedAt = new Date();
    
    return task;
  }

  async assignTask(id: string, assignedTo: string): Promise<ITask> {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }
    
    task.assignedTo = assignedTo as any;
    task.status = 'Assigned' as any;
    task.updatedAt = new Date();
    
    return task;
  }

  async getTasksByAssignee(userId: string): Promise<ITask[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedTo?.toString() === userId
    );
  }

  async getTasksByCreator(userId: string): Promise<ITask[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.createdBy?.toString() === userId
    );
  }

  async getAllTasks(): Promise<ITask[]> {
    return Array.from(this.tasks.values());
  }

  // Feature methods
  async createFeature(insertFeature: InsertFeature): Promise<IFeature> {
    const id = this.generateId('feature', this.featureCurrentId++);
    const feature = {
      _id: id as any,
      ...insertFeature,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date(),
    } as unknown as IFeature;
    
    this.features.set(id, feature);
    return feature;
  }

  async getFeature(id: string): Promise<IFeature | undefined> {
    return this.features.get(id);
  }

  async updateFeature(id: string, featureUpdate: Partial<InsertFeature>): Promise<IFeature> {
    const feature = await this.getFeature(id);
    if (!feature) {
      throw new Error(`Feature with ID ${id} not found`);
    }
    
    // Create a clean object without Mongoose properties
    const updatedFeature = {
      _id: feature._id,
      name: featureUpdate.name ?? feature.name,
      feaNo: featureUpdate.feaNo ?? feature.feaNo,
      feaState: featureUpdate.feaState ?? feature.feaState,
      feaStatus: featureUpdate.feaStatus ?? feature.feaStatus,
      feaType: featureUpdate.feaType ?? feature.feaType,
      specificType: featureUpdate.specificType ?? feature.specificType,
      maintenance: featureUpdate.maintenance ?? feature.maintenance,
      maintenanceDate: featureUpdate.maintenanceDate ?? feature.maintenanceDate,
      geometry: featureUpdate.geometry ?? feature.geometry,
      remarks: featureUpdate.remarks ?? feature.remarks,
      createdBy: featureUpdate.createdBy ?? feature.createdBy,
      boundaryId: featureUpdate.boundaryId ?? feature.boundaryId,
      createdAt: feature.createdAt,
      updatedAt: new Date(),
      lastUpdated: new Date(),
    } as unknown as IFeature;
    
    this.features.set(id, updatedFeature);
    return updatedFeature;
  }

  async deleteFeature(id: string): Promise<boolean> {
    return this.features.delete(id);
  }

  async getFeaturesByType(type: string): Promise<IFeature[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaType === type
    );
  }

  async getFeaturesByStatus(status: string): Promise<IFeature[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaStatus === status
    );
  }

  async getAllFeatures(): Promise<IFeature[]> {
    return Array.from(this.features.values());
  }

  // Boundary methods
  async createBoundary(insertBoundary: InsertBoundary): Promise<IBoundary> {
    const id = this.generateId('boundary', this.boundaryCurrentId++);
    const boundary = {
      _id: id as any,
      ...insertBoundary,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IBoundary;
    
    this.boundaries.set(id, boundary);
    return boundary;
  }

  async getBoundary(id: string): Promise<IBoundary | undefined> {
    return this.boundaries.get(id);
  }

  async updateBoundaryStatus(id: string, status: string): Promise<IBoundary> {
    const boundary = await this.getBoundary(id);
    if (!boundary) {
      throw new Error(`Boundary with ID ${id} not found`);
    }
    
    boundary.status = status as any;
    boundary.updatedAt = new Date();
    
    return boundary;
  }

  async assignBoundary(id: string, userId: string): Promise<IBoundary> {
    const boundary = await this.getBoundary(id);
    if (!boundary) {
      throw new Error(`Boundary with ID ${id} not found`);
    }
    
    boundary.assignedTo = userId as any;
    boundary.updatedAt = new Date();
    
    return boundary;
  }

  async getAllBoundaries(): Promise<IBoundary[]> {
    return Array.from(this.boundaries.values());
  }

  // Task update methods
  async createTaskUpdate(insertUpdate: InsertTaskUpdate): Promise<ITaskUpdate> {
    const id = this.generateId('update', this.taskUpdateCurrentId++);
    const update = {
      _id: id as any,
      ...insertUpdate,
      createdAt: new Date(),
    } as unknown as ITaskUpdate;
    
    this.taskUpdates.set(id, update);
    return update;
  }

  async getTaskUpdates(taskId: string): Promise<ITaskUpdate[]> {
    return Array.from(this.taskUpdates.values()).filter(
      (update) => update.taskId?.toString() === taskId
    );
  }

  // Task evidence methods
  async addTaskEvidence(insertEvidence: InsertTaskEvidence): Promise<ITaskEvidence> {
    const id = this.generateId('evidence', this.taskEvidenceCurrentId++);
    const evidence = {
      _id: id as any,
      ...insertEvidence,
      createdAt: new Date(),
    } as unknown as ITaskEvidence;
    
    this.taskEvidence.set(id, evidence);
    return evidence;
  }

  async getTaskEvidence(taskId: string): Promise<ITaskEvidence[]> {
    return Array.from(this.taskEvidence.values()).filter(
      (evidence) => evidence.taskId?.toString() === taskId
    );
  }
}

// Storage singleton instance
export let storage: IStorage = new MemStorage();

// Export a function to set the storage implementation
export function setStorage(newStorage: IStorage) {
  storage = newStorage;
  console.log('Storage implementation set to:', newStorage.constructor.name);
}
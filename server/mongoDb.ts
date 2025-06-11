import mongoose from 'mongoose';

// Get MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || '';

// Parse connection string to determine if SSL is required
const isAtlasConnection = MONGODB_URI.includes('mongodb+srv') || 
                         MONGODB_URI.includes('mongodb.net');

// Connection options with SSL configuration only if needed
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  // SSL options only applied for Atlas connections
  ...(isAtlasConnection ? {
    ssl: true, 
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
    directConnection: false,
  } : {})
} as mongoose.ConnectOptions;

/**
 * Connects to MongoDB using mongoose
 * @returns Promise resolving to the mongoose connection
 */
export async function connectToMongoDB() {
  if (!MONGODB_URI) {
    throw new Error('MongoDB connection string is not defined!');
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    const connection = await mongoose.connect(MONGODB_URI, options);
    console.log('Successfully connected to MongoDB Atlas!');
    return connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}
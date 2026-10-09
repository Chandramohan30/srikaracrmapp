import mongoose from 'mongoose';
import { 
  UserModel, CourseModel, TrainerModel, StudentModel, 
  InstallmentModel, PaymentModel, LeaveModel, ScheduleModel, 
  SettingsModel, AuditLogModel, CounterModel, RefreshTokenModel
} from './models.js';
import { hashPassword, verifyPassword } from './auth.js';

let isConnected = false;
let connectionError: string | null = null;

export interface MongoStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'not_configured';
  host?: string;
  database?: string;
  error?: string | null;
  uriConfigured: boolean;
}

export async function connectMongoDB(): Promise<MongoStatus> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('[MongoDB Atlas] MONGODB_URI is not defined in environment. Running in offline/memory mode.');
    return {
      status: 'not_configured',
      uriConfigured: false,
      error: 'MONGODB_URI environment variable is not defined.'
    };
  }

  try {
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      return {
        status: 'connected',
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        uriConfigured: true
      };
    }

    console.log('[MongoDB Atlas] Connecting to MongoDB Atlas cluster...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    connectionError = null;
    console.log(`[MongoDB Atlas] Successfully connected to database: ${mongoose.connection.name} at ${mongoose.connection.host}`);

    // Create empty collections + indexes (NO sample data is inserted)
    await ensureCollections();

    // Make sure at least one admin login exists
    await ensureAdminUser();

    return {
      status: 'connected',
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      uriConfigured: true
    };
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message || 'Connection failed';
    console.warn('[MongoDB Atlas] Failed to connect to MongoDB Atlas:', err.message);
    return {
      status: 'disconnected',
      uriConfigured: true,
      error: connectionError
    };
  }
}

export function getMongoStatus(): MongoStatus {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { status: 'not_configured', uriConfigured: false };
  }

  const readyState = mongoose.connection.readyState;
  switch (readyState) {
    case 1:
      return {
        status: 'connected',
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        uriConfigured: true
      };
    case 2:
      return { status: 'connecting', uriConfigured: true };
    default:
      return {
        status: 'disconnected',
        uriConfigured: true,
        error: connectionError
      };
  }
}

/**
 * Creates every collection (empty) and builds indexes.
 * No demo / seed records are inserted.
 */
export async function ensureCollections() {
  const models: any[] = [
    UserModel, CourseModel, TrainerModel, StudentModel,
    InstallmentModel, PaymentModel, LeaveModel, ScheduleModel,
    SettingsModel, AuditLogModel, CounterModel, RefreshTokenModel
  ];
  for (const m of models) {
    try {
      await m.createCollection();
    } catch (e: any) {
      // "NamespaceExists" (code 48) simply means it is already there
      if (e?.code !== 48 && !/already exists/i.test(e?.message || '')) {
        console.warn(`[MongoDB Atlas] Could not create collection for ${m.modelName}:`, e.message);
      }
    }
    try {
      await m.syncIndexes();
    } catch (e: any) {
      console.warn(`[MongoDB Atlas] Could not sync indexes for ${m.modelName}:`, e.message);
    }
  }
}

/**
 * The ONLY record created automatically: one Admin login so you can sign in
 * and start onboarding trainers, courses and students.
 * Override with ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in .env
 */
export async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || 's').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Academy Admin';

  const existing: any = await UserModel.findOne({ email }).select('+password_hash');

  if (!existing) {
    await UserModel.create({
      id: 'usr-admin-1',
      name,
      email,
      phone: '',
      role: 'admin',
      status: 'active',
      password_hash: await hashPassword(password)
    });
    console.log(`[MongoDB Atlas] Admin login created -> ${email}`);
    return;
  }

  // Repair / sync: make sure this admin can sign in with ADMIN_PASSWORD from .env
  if (existing.role === 'admin') {
    const ok = await verifyPassword(password, existing.password_hash);
    if (!ok || existing.status !== 'active') {
      existing.password_hash = await hashPassword(password);
      existing.status = 'active';
      await existing.save();
      console.log(`[MongoDB Atlas] Admin password synced from .env -> ${email}`);
    }
  }
}

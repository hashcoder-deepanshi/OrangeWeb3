import { 
  users, vibes, comments, likes, connections, notifications, messages,
  learningModules, quests, achievements, userLearningProgress, userQuestProgress,
  userAchievementProgress, userLevel,
  type User, type InsertUser, type Vibe, type InsertVibe,
  type Comment, type InsertComment, type Like, type InsertLike,
  type Connection, type InsertConnection, type Notification, type InsertNotification,
  type Message, type InsertMessage,
  type LearningModule, type InsertLearningModule, type Quest, type InsertQuest,
  type Achievement, type InsertAchievement, type UserLearningProgress, type InsertUserLearningProgress,
  type UserQuestProgress, type InsertUserQuestProgress, type UserAchievementProgress,
  type InsertUserAchievementProgress, type UserLevel, type InsertUserLevel
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, sql, asc, count, or, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

// Setup PostgreSQL for session storage
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<Omit<InsertUser, 'password'>>): Promise<User>;
  
  // Vibe operations
  createVibe(vibe: InsertVibe): Promise<Vibe>;
  getVibeById(id: number): Promise<Vibe | undefined>;
  getAllVibes(limit?: number, offset?: number): Promise<Vibe[]>;
  getVibesByUserId(userId: number): Promise<Vibe[]>;
  getTrendingVibes(limit?: number): Promise<Vibe[]>;
  getVibesByHashtag(hashtag: string): Promise<Vibe[]>;
  deleteVibe(id: number): Promise<void>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByVibeId(vibeId: number): Promise<Comment[]>;
  
  // Like operations
  createOrUpdateLike(like: InsertLike): Promise<Like>;
  getLikeByUserAndVibe(userId: number, vibeId: number): Promise<Like | undefined>;
  getLikesByVibeId(vibeId: number): Promise<Like[]>;
  
  // Connection operations
  createConnection(connection: InsertConnection): Promise<Connection>;
  getConnectionById(id: number): Promise<Connection | undefined>;
  getConnectionByUsers(userId: number, connectedToId: number): Promise<Connection | undefined>;
  getUserConnections(userId: number, status?: string): Promise<Connection[]>;
  updateConnectionStatus(id: number, status: string): Promise<Connection>;
  getUsersToConnect(userId: number, limit?: number): Promise<User[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number, isRead?: boolean): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(senderId: number, receiverId: number): Promise<Message[]>;
  
  // Learning operations
  // Module operations
  getLearningModules(): Promise<LearningModule[]>;
  getLearningModuleById(id: number): Promise<LearningModule | undefined>;
  createLearningModule(module: InsertLearningModule): Promise<LearningModule>;
  updateLearningModule(id: number, moduleData: Partial<InsertLearningModule>): Promise<LearningModule>;
  
  // Quest operations
  getQuests(): Promise<Quest[]>;
  getQuestById(id: number): Promise<Quest | undefined>;
  getQuestsByModuleId(moduleId: number): Promise<Quest[]>;
  createQuest(quest: InsertQuest): Promise<Quest>;
  updateQuest(id: number, questData: Partial<InsertQuest>): Promise<Quest>;
  
  // Achievement operations
  getAchievements(): Promise<Achievement[]>;
  getAchievementById(id: number): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  updateAchievement(id: number, achievementData: Partial<InsertAchievement>): Promise<Achievement>;
  
  // User Learning Progress operations
  getUserLearningProgress(userId: number): Promise<UserLearningProgress[]>;
  getUserLearningProgressByModule(userId: number, moduleId: number): Promise<UserLearningProgress | undefined>;
  createUserLearningProgress(progress: InsertUserLearningProgress): Promise<UserLearningProgress>;
  updateUserLearningProgress(id: number, progressData: Partial<InsertUserLearningProgress>): Promise<UserLearningProgress>;
  completeUserLearningModule(userId: number, moduleId: number): Promise<UserLearningProgress>;
  
  // User Quest Progress operations
  getUserQuestProgress(userId: number): Promise<UserQuestProgress[]>;
  getUserQuestProgressByQuest(userId: number, questId: number): Promise<UserQuestProgress | undefined>;
  createUserQuestProgress(progress: InsertUserQuestProgress): Promise<UserQuestProgress>;
  updateUserQuestProgress(id: number, progressData: Partial<InsertUserQuestProgress>): Promise<UserQuestProgress>;
  completeUserQuest(userId: number, questId: number): Promise<UserQuestProgress>;
  
  // User Achievement Progress operations
  getUserAchievementProgress(userId: number): Promise<UserAchievementProgress[]>;
  getUserAchievementProgressByAchievement(userId: number, achievementId: number): Promise<UserAchievementProgress | undefined>;
  createUserAchievementProgress(progress: InsertUserAchievementProgress): Promise<UserAchievementProgress>;
  updateUserAchievementProgress(id: number, progressData: Partial<InsertUserAchievementProgress>): Promise<UserAchievementProgress>;
  incrementUserAchievementProgress(userId: number, achievementId: number, amount?: number): Promise<UserAchievementProgress>;
  unlockUserAchievement(userId: number, achievementId: number): Promise<UserAchievementProgress>;
  
  // User Level operations
  getUserLevel(userId: number): Promise<UserLevel | undefined>;
  createUserLevel(level: InsertUserLevel): Promise<UserLevel>;
  updateUserLevel(userId: number, levelData: Partial<InsertUserLevel>): Promise<UserLevel>;
  addUserXp(userId: number, xp: number): Promise<UserLevel>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<Omit<InsertUser, 'password'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Vibe operations
  async createVibe(vibe: InsertVibe): Promise<Vibe> {
    const [createdVibe] = await db.insert(vibes).values(vibe).returning();
    return createdVibe;
  }

  async getVibeById(id: number): Promise<Vibe | undefined> {
    const [vibe] = await db.select().from(vibes).where(eq(vibes.id, id));
    return vibe;
  }

  async getAllVibes(limit: number = 10, offset: number = 0): Promise<Vibe[]> {
    return db
      .select()
      .from(vibes)
      .orderBy(desc(vibes.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getVibesByUserId(userId: number): Promise<Vibe[]> {
    return db
      .select()
      .from(vibes)
      .where(eq(vibes.userId, userId))
      .orderBy(desc(vibes.createdAt));
  }

  async getTrendingVibes(limit: number = 10): Promise<Vibe[]> {
    const result = await db
      .select({
        vibeId: vibes.id,
        likes: count(likes.id).as('likes_count'),
      })
      .from(vibes)
      .leftJoin(likes, and(eq(likes.vibeId, vibes.id), eq(likes.isLike, true)))
      .groupBy(vibes.id)
      .orderBy(desc(sql`likes_count`))
      .limit(limit);

    const vibeIds = result.map(r => r.vibeId);
    
    if (vibeIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(vibes)
      .where(inArray(vibes.id, vibeIds))
      .orderBy(desc(vibes.createdAt));
  }

  async getVibesByHashtag(hashtag: string): Promise<Vibe[]> {
    return db
      .select()
      .from(vibes)
      .where(sql`${vibes.hashtags} @> ARRAY[${hashtag}]::text[]`)
      .orderBy(desc(vibes.createdAt));
  }
  
  async deleteVibe(id: number): Promise<void> {
    // First, delete all related comments and likes
    await db.delete(comments).where(eq(comments.vibeId, id));
    await db.delete(likes).where(eq(likes.vibeId, id));
    
    // Then delete the vibe itself
    await db.delete(vibes).where(eq(vibes.id, id));
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    const [createdComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return createdComment;
  }

  async getCommentsByVibeId(vibeId: number): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.vibeId, vibeId))
      .orderBy(asc(comments.createdAt));
  }

  // Like operations
  async createOrUpdateLike(like: InsertLike): Promise<Like> {
    const existingLike = await this.getLikeByUserAndVibe(like.userId, like.vibeId);
    
    if (existingLike) {
      const [updatedLike] = await db
        .update(likes)
        .set({ isLike: like.isLike })
        .where(eq(likes.id, existingLike.id))
        .returning();
      return updatedLike;
    } else {
      const [newLike] = await db
        .insert(likes)
        .values(like)
        .returning();
      return newLike;
    }
  }

  async getLikeByUserAndVibe(userId: number, vibeId: number): Promise<Like | undefined> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.vibeId, vibeId)));
    return like;
  }

  async getLikesByVibeId(vibeId: number): Promise<Like[]> {
    return db
      .select()
      .from(likes)
      .where(eq(likes.vibeId, vibeId));
  }

  // Connection operations
  async createConnection(connection: InsertConnection): Promise<Connection> {
    const [createdConnection] = await db
      .insert(connections)
      .values(connection)
      .returning();
    return createdConnection;
  }

  async getConnectionById(id: number): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, id));
    return connection;
  }

  async getConnectionByUsers(userId: number, connectedToId: number): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.userId, userId),
          eq(connections.connectedToId, connectedToId)
        )
      );
    return connection;
  }

  async getUserConnections(userId: number, status?: string): Promise<Connection[]> {
    let query = db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.userId, userId),
          eq(connections.connectedToId, userId)
        )
      );
    
    if (status) {
      query = query.where(eq(connections.status, status));
    }
    
    return query.orderBy(desc(connections.createdAt));
  }

  async updateConnectionStatus(id: number, status: string): Promise<Connection> {
    const [connection] = await db
      .update(connections)
      .set({ status })
      .where(eq(connections.id, id))
      .returning();
    return connection;
  }

  async getAllUsers(excludeUserId?: number): Promise<User[]> {
    let query = db.select().from(users);
    
    if (excludeUserId) {
      query = query.where(sql`${users.id} <> ${excludeUserId}`);
    }
    
    return query;
  }

  async getUsersToConnect(userId: number, limit: number = 10): Promise<User[]> {
    return this.getAllUsers(userId).then(users => users.slice(0, limit));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [createdNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return createdNotification;
  }

  async getUserNotifications(userId: number, isRead?: boolean): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId)); // Ensure we only get notifications for this user
      
    if (isRead !== undefined) {
      query = query.where(eq(notifications.isRead, isRead));
    }
    
    const results = await query.orderBy(desc(notifications.createdAt));
    return results.filter(notification => notification.userId === userId); // Double check filter
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [createdMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return createdMessage;
  }

  async getMessagesBetweenUsers(senderId: number, receiverId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, senderId),
            eq(messages.receiverId, receiverId)
          ),
          and(
            eq(messages.senderId, receiverId),
            eq(messages.receiverId, senderId)
          )
        )
      )
      .orderBy(asc(messages.createdAt));
  }
}

export const storage = new DatabaseStorage();

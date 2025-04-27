import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
});

// Relationships for users
// User relations are defined at the bottom of this file

// Vibes (posts) table
export const vibes = pgTable("vibes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // 'image', 'video', etc.
  hashtags: text("hashtags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVibeSchema = createInsertSchema(vibes).pick({
  userId: true,
  content: true,
  mediaUrl: true,
  mediaType: true,
  hashtags: true,
});

// Relationships for vibes
export const vibesRelations = relations(vibes, ({ one, many }) => ({
  user: one(users, {
    fields: [vibes.userId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
}));

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  vibeId: integer("vibe_id").notNull().references(() => vibes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  vibeId: true,
  userId: true,
  content: true,
});

// Relationships for comments
export const commentsRelations = relations(comments, ({ one }) => ({
  vibe: one(vibes, {
    fields: [comments.vibeId],
    references: [vibes.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// Likes table
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  vibeId: integer("vibe_id").notNull().references(() => vibes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isLike: boolean("is_like").notNull(), // true for like, false for dislike
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  vibeId: true,
  userId: true,
  isLike: true,
});

// Relationships for likes
export const likesRelations = relations(likes, ({ one }) => ({
  vibe: one(vibes, {
    fields: [likes.vibeId],
    references: [vibes.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

// Connections (followers/following) table
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectedToId: integer("connected_to_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConnectionSchema = createInsertSchema(connections).pick({
  userId: true,
  connectedToId: true,
  status: true,
});

// Relationships for connections
export const connectionsRelations = relations(connections, ({ one }) => ({
  user: one(users, {
    fields: [connections.userId],
    references: [users.id],
    relationName: "user_connections",
  }),
  connectedTo: one(users, {
    fields: [connections.connectedToId],
    references: [users.id],
    relationName: "connected_with",
  }),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'like', 'comment', 'connection_request', 'message'
  fromUserId: integer("from_user_id").references(() => users.id),
  entityId: integer("entity_id"), // vibeId, commentId, connectionId, etc.
  content: text("content"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  fromUserId: true,
  entityId: true,
  content: true,
  isRead: true,
});

// Relationships for notifications
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
}));

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  isRead: true,
});

// Relationships for messages
export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Vibe = typeof vibes.$inferSelect;
export type InsertVibe = z.infer<typeof insertVibeSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;

export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Learning platform schema
export const learningModules = pgTable("learning_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  level: integer("level").default(1).notNull(),
  xpReward: integer("xp_reward").default(100).notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLearningModuleSchema = createInsertSchema(learningModules).pick({
  title: true,
  description: true,
  level: true,
  xpReward: true,
  content: true,
});

export const learningModulesRelations = relations(learningModules, ({ many }) => ({
  userProgress: many(userLearningProgress),
  quests: many(quests),
}));

export const quests = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  xpReward: integer("xp_reward").default(50).notNull(),
  relatedModuleId: integer("related_module_id").references(() => learningModules.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestSchema = createInsertSchema(quests).pick({
  title: true,
  description: true,
  xpReward: true,
  relatedModuleId: true,
});

export const questsRelations = relations(quests, ({ one, many }) => ({
  relatedModule: one(learningModules, {
    fields: [quests.relatedModuleId],
    references: [learningModules.id],
  }),
  userProgress: many(userQuestProgress),
}));

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  requiredProgress: integer("required_progress").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  title: true,
  description: true,
  requiredProgress: true,
});

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userProgress: many(userAchievementProgress),
}));

export const userLearningProgress = pgTable("user_learning_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  moduleId: integer("module_id").notNull().references(() => learningModules.id),
  progress: integer("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertUserLearningProgressSchema = createInsertSchema(userLearningProgress).pick({
  userId: true,
  moduleId: true,
  progress: true,
  completed: true,
  completedAt: true,
});

export const userLearningProgressRelations = relations(userLearningProgress, ({ one }) => ({
  user: one(users, {
    fields: [userLearningProgress.userId],
    references: [users.id],
  }),
  module: one(learningModules, {
    fields: [userLearningProgress.moduleId],
    references: [learningModules.id],
  }),
}));

export const userQuestProgress = pgTable("user_quest_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  questId: integer("quest_id").notNull().references(() => quests.id),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertUserQuestProgressSchema = createInsertSchema(userQuestProgress).pick({
  userId: true,
  questId: true,
  completed: true,
  completedAt: true,
});

export const userQuestProgressRelations = relations(userQuestProgress, ({ one }) => ({
  user: one(users, {
    fields: [userQuestProgress.userId],
    references: [users.id],
  }),
  quest: one(quests, {
    fields: [userQuestProgress.questId],
    references: [quests.id],
  }),
}));

export const userAchievementProgress = pgTable("user_achievement_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  progress: integer("progress").default(0).notNull(),
  unlocked: boolean("unlocked").default(false).notNull(),
  unlockedAt: timestamp("unlocked_at"),
});

export const insertUserAchievementProgressSchema = createInsertSchema(userAchievementProgress).pick({
  userId: true,
  achievementId: true,
  progress: true,
  unlocked: true,
  unlockedAt: true,
});

export const userAchievementProgressRelations = relations(userAchievementProgress, ({ one }) => ({
  user: one(users, {
    fields: [userAchievementProgress.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievementProgress.achievementId],
    references: [achievements.id],
  }),
}));

export const userLevel = pgTable("user_level", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserLevelSchema = createInsertSchema(userLevel).pick({
  userId: true,
  level: true,
  xp: true,
});

export const userLevelRelations = relations(userLevel, ({ one }) => ({
  user: one(users, {
    fields: [userLevel.userId],
    references: [users.id],
  }),
}));

// Add user level relation to users
export const usersRelations = relations(users, ({ many, one }) => ({
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  vibes: many(vibes),
  comments: many(comments),
  likes: many(likes),
  connections: many(connections),
  receivedConnections: many(connections, { relationName: "connectedTo" }),
  notifications: many(notifications),
  fromNotifications: many(notifications, { relationName: "from" }),
  learningProgress: many(userLearningProgress),
  questProgress: many(userQuestProgress),
  achievementProgress: many(userAchievementProgress),
  levelData: one(userLevel),
}));

export type LearningModule = typeof learningModules.$inferSelect;
export type InsertLearningModule = z.infer<typeof insertLearningModuleSchema>;

export type Quest = typeof quests.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserLearningProgress = typeof userLearningProgress.$inferSelect;
export type InsertUserLearningProgress = z.infer<typeof insertUserLearningProgressSchema>;

export type UserQuestProgress = typeof userQuestProgress.$inferSelect;
export type InsertUserQuestProgress = z.infer<typeof insertUserQuestProgressSchema>;

export type UserAchievementProgress = typeof userAchievementProgress.$inferSelect;
export type InsertUserAchievementProgress = z.infer<typeof insertUserAchievementProgressSchema>;

export type UserLevel = typeof userLevel.$inferSelect;
export type InsertUserLevel = z.infer<typeof insertUserLevelSchema>;

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertVibeSchema, insertCommentSchema, insertLikeSchema, insertConnectionSchema, insertMessageSchema,
  insertLearningModuleSchema, insertQuestSchema, insertAchievementSchema,
  insertUserLearningProgressSchema, insertUserQuestProgressSchema, insertUserAchievementProgressSchema,
  insertUserLevelSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Set up multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage_multer });

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // ========= Vibes (Posts) API Routes =========

  // Get all vibes (feed)
  app.get("/api/vibes", async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const vibes = await storage.getAllVibes(limit, offset);
      res.json(vibes);
    } catch (error) {
      next(error);
    }
  });

  // Get trending vibes
  app.get("/api/vibes/trending", async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const trendingVibes = await storage.getTrendingVibes(limit);
      res.json(trendingVibes);
    } catch (error) {
      next(error);
    }
  });

  // Get vibes by hashtag
  app.get("/api/vibes/hashtag/:hashtag", async (req, res, next) => {
    try {
      const hashtag = req.params.hashtag;
      const vibes = await storage.getVibesByHashtag(hashtag);
      res.json(vibes);
    } catch (error) {
      next(error);
    }
  });

  // Get vibes by user
  app.get("/api/users/:userId/vibes", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const vibes = await storage.getVibesByUserId(userId);
      res.json(vibes);
    } catch (error) {
      next(error);
    }
  });

  // Create a new vibe
  app.post("/api/vibes", upload.array('media', 4), async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Parse the content and hashtags from the form
      const content = req.body.content || "";
      let hashtags: string[] = [];

      if (req.body.hashtags) {
        try {
          hashtags = JSON.parse(req.body.hashtags);
        } catch (e) {
          console.log("Failed to parse hashtags:", e);
        }
      }

      // Handle multiple file uploads
      const files = req.files as Express.Multer.File[];
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      if (files && files.length > 0) {
        files.forEach(file => {
          mediaUrls.push(`/uploads/${file.filename}`);
          mediaTypes.push(file.mimetype.startsWith('image/') ? 'image' : 'video');
        });
      }

      const vibeData = {
        userId: req.user.id,
        content,
        hashtags,
        mediaUrl: mediaUrls.length > 0 ? mediaUrls.join(',') : null,
        mediaType: mediaTypes.length > 0 ? mediaTypes.join(',') : null
      };

      const vibe = await storage.createVibe(vibeData);
      res.status(201).json(vibe);
    } catch (error) {
      console.error("Error creating vibe:", error);
      next(error);
    }
  });

  // Get a specific vibe
  app.get("/api/vibes/:id", async (req, res, next) => {
    try {
      const vibeId = parseInt(req.params.id);
      const vibe = await storage.getVibeById(vibeId);

      if (!vibe) {
        return res.status(404).json({ message: "Vibe not found" });
      }

      res.json(vibe);
    } catch (error) {
      next(error);
    }
  });

  // Delete a vibe
  app.delete("/api/vibes/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const vibeId = parseInt(req.params.id);
      const vibe = await storage.getVibeById(vibeId);

      if (!vibe) {
        return res.status(404).json({ message: "Vibe not found" });
      }

      // Ensure the user is the owner of the vibe
      if (vibe.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this vibe" });
      }

      await storage.deleteVibe(vibeId);
      res.status(200).json({ message: "Vibe deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========= Comments API Routes =========

  // Get comments for a vibe
  app.get("/api/vibes/:vibeId/comments", async (req, res, next) => {
    try {
      const vibeId = parseInt(req.params.vibeId);
      const comments = await storage.getCommentsByVibeId(vibeId);
      res.json(comments);
    } catch (error) {
      next(error);
    }
  });

  // Add a comment to a vibe
  app.post("/api/vibes/:vibeId/comments", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const vibeId = parseInt(req.params.vibeId);
      const commentData = insertCommentSchema.parse({
        vibeId,
        userId: req.user.id,
        content: req.body.content
      });

      const comment = await storage.createComment(commentData);

      // Create notification for the vibe owner if not the same as commenter
      const vibe = await storage.getVibeById(vibeId);
      if (vibe && vibe.userId !== req.user.id) {
        await storage.createNotification({
          userId: vibe.userId,
          type: "comment",
          fromUserId: req.user.id,
          entityId: vibeId,
          content: req.body.content,
          isRead: false
        });
      }

      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      next(error);
    }
  });

  // ========= Likes API Routes =========

  // Like/Dislike a vibe
  app.post("/api/vibes/:vibeId/like", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const vibeId = parseInt(req.params.vibeId);
      const likeData = insertLikeSchema.parse({
        vibeId,
        userId: req.user.id,
        isLike: req.body.isLike
      });

      const like = await storage.createOrUpdateLike(likeData);

      // Create notification for the vibe owner if liked and not the same as liker
      const vibe = await storage.getVibeById(vibeId);
      if (vibe && vibe.userId !== req.user.id && likeData.isLike) {
        await storage.createNotification({
          userId: vibe.userId,
          type: "like",
          fromUserId: req.user.id,
          entityId: vibeId,
          isRead: false
        });
      }

      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid like data", errors: error.errors });
      }
      next(error);
    }
  });

  // Get likes for a vibe
  app.get("/api/vibes/:vibeId/likes", async (req, res, next) => {
    try {
      const vibeId = parseInt(req.params.vibeId);
      const likes = await storage.getLikesByVibeId(vibeId);
      res.json(likes);
    } catch (error) {
      next(error);
    }
  });

  // ========= Users API Routes =========

  // Get users to connect with
  app.get("/api/users/connect", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const search = (req.query.search as string || '').toLowerCase();
      const currentUserId = req.user.id;
      
      // Get all users except current user
      const allUsers = await storage.getAllUsers(currentUserId);
      
      // Filter users based on search query
      const filteredUsers = search 
        ? allUsers.filter(u => 
            u.username.toLowerCase().includes(search) || 
            (u.displayName && u.displayName.toLowerCase().includes(search))
          )
        : allUsers;
      
      res.json(filteredUsers.slice(0, limit));
    } catch (error) {
      next(error);
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password field from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // ========= Connections API Routes =========

  // Create a connection request
  app.post("/api/connections", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const connectionData = insertConnectionSchema.parse({
        userId: req.user.id,
        connectedToId: req.body.connectedToId,
        status: "pending"
      });

      // Check if connection already exists
      const existingConnection = await storage.getConnectionByUsers(
        connectionData.userId,
        connectionData.connectedToId
      );

      if (existingConnection) {
        return res.status(400).json({ message: "Connection already exists" });
      }

      const connection = await storage.createConnection(connectionData);

      // Create notification for connection request
      await storage.createNotification({
        userId: connectionData.connectedToId,
        type: "connection_request",
        fromUserId: req.user.id,
        entityId: connection.id,
        isRead: false
      });

      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid connection data", errors: error.errors });
      }
      next(error);
    }
  });

  // Update connection status (accept/reject)
  app.put("/api/connections/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const connectionId = parseInt(req.params.id);
      const status = req.body.status;

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const connection = await storage.getConnectionById(connectionId);

      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      // Only the connection recipient can update the status
      if (connection.connectedToId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this connection" });
      }

      const updatedConnection = await storage.updateConnectionStatus(connectionId, status);

      // Create notification for accepted connection
      if (status === "accepted") {
        await storage.createNotification({
          userId: connection.userId,
          type: "connection_accepted",
          fromUserId: req.user.id,
          entityId: connection.id,
          isRead: false
        });
      }

      res.json(updatedConnection);
    } catch (error) {
      next(error);
    }
  });

  // Get user connections
  app.get("/api/connections", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const status = req.query.status as string;
      const connections = await storage.getUserConnections(req.user.id, status);
      res.json(connections);
    } catch (error) {
      next(error);
    }
  });

  // ========= Notifications API Routes =========

  // Get user notifications
  app.get("/api/notifications", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const isRead = req.query.isRead === "true" ? true : 
                     req.query.isRead === "false" ? false : 
                     undefined;

      // Only fetch notifications for the authenticated user
      const notifications = await storage.getUserNotifications(req.user.id, isRead);

      // Additional security check to ensure notifications belong to user
      const filteredNotifications = notifications.filter(n => n.userId === req.user.id);

      res.json(filteredNotifications);
    } catch (error) {
      next(error);
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error) {
      next(error);
    }
  });

  // ========= Messages API Routes =========

  // Send a message
  app.post("/api/messages", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const messageData = insertMessageSchema.parse({
        senderId: req.user.id,
        receiverId: req.body.receiverId,
        content: req.body.content,
        isRead: false
      });

      const message = await storage.createMessage(messageData);

      // Create notification for new message
      await storage.createNotification({
        userId: messageData.receiverId,
        type: "message",
        fromUserId: req.user.id,
        entityId: message.id,
        content: messageData.content.substring(0, 50),
        isRead: false
      });

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      next(error);
    }
  });

  // Get messages between users
  app.get("/api/messages/:userId", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getMessagesBetweenUsers(req.user.id, otherUserId);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  // ========= Learning Platform API Routes =========

  // Get all learning modules
  app.get("/api/learning/modules", async (req, res, next) => {
    try {
      const modules = await storage.getLearningModules();
      res.json(modules);
    } catch (error) {
      next(error);
    }
  });

  // Get a specific learning module
  app.get("/api/learning/modules/:id", async (req, res, next) => {
    try {
      const moduleId = parseInt(req.params.id);
      const learningModule = await storage.getLearningModuleById(moduleId);
      
      if (!learningModule) {
        return res.status(404).json({ message: "Learning module not found" });
      }

      res.json(learningModule);
    } catch (error) {
      next(error);
    }
  });

  // Get all quests
  app.get("/api/learning/quests", async (req, res, next) => {
    try {
      const quests = await storage.getQuests();
      res.json(quests);
    } catch (error) {
      next(error);
    }
  });

  // Get quests for a specific module
  app.get("/api/learning/modules/:moduleId/quests", async (req, res, next) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const quests = await storage.getQuestsByModuleId(moduleId);
      res.json(quests);
    } catch (error) {
      next(error);
    }
  });

  // Get all achievements
  app.get("/api/learning/achievements", async (req, res, next) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      next(error);
    }
  });

  // Get user learning progress
  app.get("/api/learning/progress", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      const progress = await storage.getUserLearningProgress(userId);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  });

  // Get user quest progress
  app.get("/api/learning/quests/progress", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      const progress = await storage.getUserQuestProgress(userId);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  });

  // Get user achievement progress
  app.get("/api/learning/achievements/progress", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      const progress = await storage.getUserAchievementProgress(userId);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  });

  // Get user level
  app.get("/api/learning/level", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      const level = await storage.getUserLevel(userId);
      
      if (!level) {
        // Create initial user level if it doesn't exist
        const newLevel = await storage.createUserLevel({
          userId,
          level: 1,
          xp: 0
        });
        return res.json(newLevel);
      }
      
      res.json(level);
    } catch (error) {
      next(error);
    }
  });

  // Complete a quest
  app.post("/api/learning/quests/:questId/complete", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      const questId = parseInt(req.params.questId);
      
      // Complete the quest and update user progress
      const updatedProgress = await storage.completeUserQuest(userId, questId);
      
      // Get the quest to add XP
      const quest = await storage.getQuestById(questId);
      if (quest && quest.xpReward) {
        // Add XP to user level
        await storage.addUserXp(userId, quest.xpReward);
      }
      
      res.json(updatedProgress);
    } catch (error) {
      next(error);
    }
  });

  // Complete a learning module
  app.post("/api/learning/modules/:moduleId/complete", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      const moduleId = parseInt(req.params.moduleId);
      
      // Complete the module and update user progress
      const updatedProgress = await storage.completeUserLearningModule(userId, moduleId);
      
      // Get the module to add XP
      const module = await storage.getLearningModuleById(moduleId);
      if (module && module.xpReward) {
        // Add XP to user level
        await storage.addUserXp(userId, module.xpReward);
      }
      
      res.json(updatedProgress);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
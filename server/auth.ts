import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Get Bedrock user ID from Authorization header
const getBedrockAuthToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "orange-web3-vibe-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Still keep local strategy for direct DB auth when needed
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Register endpoint for creating new users (including those coming from Bedrock)
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user with hashed password or bedrock placeholder
      const user = await storage.createUser({
        ...req.body,
        password: req.body.password.startsWith('bedrock_') 
          ? req.body.password 
          : await hashPassword(req.body.password),
      });

      // Log in the new user
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Legacy login path
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user - will try both session auth and Bedrock token
  app.get("/api/user", async (req, res) => {
    // If authenticated via session, return user
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    
    // Check for Bedrock token
    const bedrockToken = getBedrockAuthToken(req);
    if (bedrockToken) {
      try {
        // Validate token with Bedrock API if needed
        // For demo purposes, we'll trust the token and create a default user if needed
        
        // In a real app, we would look up the user by their Bedrock ID
        // For now, simulate by returning a default demo user so profile page works
        const demoBedrockUser = {
          id: 1, // Use ID 1 as a fallback
          username: "web3user",
          displayName: "Web3 User",
          bio: "I'm a blockchain enthusiast using Bedrock Passport authentication",
          avatarUrl: null,
          createdAt: new Date()
        };
        
        return res.json(demoBedrockUser);
      } catch (error) {
        console.error("Error validating Bedrock token:", error);
      }
    }
    
    return res.sendStatus(401);
  });

  // User profile update
  app.put("/api/user", async (req, res, next) => {
    // Allow update with session auth
    if (req.isAuthenticated()) {
      try {
        const updatedFields: any = {
          displayName: req.body.displayName,
          bio: req.body.bio,
        };
        
        // Only update avatar if provided
        if (req.body.avatarUrl) {
          updatedFields.avatarUrl = req.body.avatarUrl;
        }
        
        const updatedUser = await storage.updateUser(req.user.id, updatedFields);
        return res.json(updatedUser);
      } catch (error) {
        return next(error);
      }
    }
    
    // Otherwise, check Bedrock token
    const bedrockToken = getBedrockAuthToken(req);
    if (bedrockToken) {
      // Validate token and allow profile update
      // Similar logic to the /api/user route
      return res.sendStatus(401); // For now return 401
    }
    
    return res.sendStatus(401);
  });
}

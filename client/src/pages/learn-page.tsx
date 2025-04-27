import React, { useState } from "react";
import { motion } from "framer-motion";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Award, BookOpen, Check, CheckCircle, ChevronRight, CircleDollarSign, LightbulbIcon, Lock, Puzzle, Star, TrendingUp, Trophy } from "lucide-react";

// Define interfaces for our learning elements
interface Quest {
  id: number;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  locked: boolean;
  icon: React.ReactNode;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface LearningModule {
  id: number;
  title: string;
  description: string;
  level: number;
  completed: boolean;
  locked: boolean;
  xpReward: number;
  icon: React.ReactNode;
  content?: React.ReactNode;
}

export default function LearnPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  // Dummy user progress data - in a real app, this would come from the database
  const [userProgress, setUserProgress] = useState({
    level: 2,
    xp: 150,
    xpForNextLevel: 200,
    completedQuests: 3,
    totalQuests: 10,
    unlockedAchievements: 2,
    totalAchievements: 8,
    completedModules: 1,
    totalModules: 6,
  });

  // Example quests
  const quests: Quest[] = [
    {
      id: 1,
      title: "Complete Your Profile",
      description: "Fill out all your profile information",
      xpReward: 50,
      completed: true,
      locked: false,
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    },
    {
      id: 2,
      title: "Learn Blockchain Basics",
      description: "Complete the Blockchain Basics module",
      xpReward: 100,
      completed: true,
      locked: false,
      icon: <BookOpen className="h-5 w-5 text-blue-500" />,
    },
    {
      id: 3,
      title: "Make Your First Transaction",
      description: "Send crypto to another user",
      xpReward: 75,
      completed: true,
      locked: false,
      icon: <CircleDollarSign className="h-5 w-5 text-yellow-500" />,
    },
    {
      id: 4,
      title: "Smart Contracts 101",
      description: "Complete the Smart Contracts module",
      xpReward: 125,
      completed: false,
      locked: false,
      icon: <Puzzle className="h-5 w-5 text-purple-500" />,
    },
    {
      id: 5,
      title: "DeFi Explorer",
      description: "Learn about DeFi protocols and applications",
      xpReward: 150,
      completed: false,
      locked: true,
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
    },
  ];

  // Example achievements
  const achievements: Achievement[] = [
    {
      id: 1,
      title: "Crypto Curious",
      description: "Complete your first learning module",
      icon: <LightbulbIcon className="h-6 w-6 text-yellow-500" />,
      unlocked: true,
      progress: 1,
      maxProgress: 1,
    },
    {
      id: 2,
      title: "Quest Hunter",
      description: "Complete 3 quests",
      icon: <Award className="h-6 w-6 text-blue-500" />,
      unlocked: true,
      progress: 3,
      maxProgress: 3,
    },
    {
      id: 3,
      title: "Knowledge Master",
      description: "Complete all learning modules",
      icon: <Trophy className="h-6 w-6 text-purple-500" />,
      unlocked: false,
      progress: 1,
      maxProgress: 6,
    },
    {
      id: 4,
      title: "Web3 Wizard",
      description: "Reach level 10",
      icon: <Star className="h-6 w-6 text-amber-500" />,
      unlocked: false,
      progress: 2,
      maxProgress: 10,
    },
  ];

  // Example learning modules
  const learningModules: LearningModule[] = [
    {
      id: 1,
      title: "Blockchain Basics",
      description: "Learn the fundamental concepts of blockchain technology",
      level: 1,
      completed: true,
      locked: false,
      xpReward: 100,
      icon: <BookOpen className="h-6 w-6 text-blue-500" />,
    },
    {
      id: 2,
      title: "Crypto Wallets",
      description: "Understand different types of wallets and how to secure your assets",
      level: 1,
      completed: false,
      locked: false,
      xpReward: 100,
      icon: <CircleDollarSign className="h-6 w-6 text-green-500" />,
    },
    {
      id: 3,
      title: "Smart Contracts",
      description: "Dive into smart contracts and their applications",
      level: 2,
      completed: false,
      locked: false,
      xpReward: 125,
      icon: <Puzzle className="h-6 w-6 text-purple-500" />,
    },
    {
      id: 4,
      title: "DeFi Fundamentals",
      description: "Explore decentralized finance protocols and opportunities",
      level: 2,
      completed: false,
      locked: true,
      xpReward: 150,
      icon: <TrendingUp className="h-6 w-6 text-amber-500" />,
    },
    {
      id: 5,
      title: "NFTs & Digital Ownership",
      description: "Understanding NFTs and the future of digital ownership",
      level: 3,
      completed: false,
      locked: true,
      xpReward: 175,
      icon: <Award className="h-6 w-6 text-pink-500" />,
    },
    {
      id: 6,
      title: "DAOs & Governance",
      description: "Learn about decentralized autonomous organizations",
      level: 3,
      completed: false,
      locked: true,
      xpReward: 200,
      icon: <Trophy className="h-6 w-6 text-indigo-500" />,
    },
  ];

  // Function to claim quest reward
  const claimQuestReward = (quest: Quest) => {
    if (quest.completed) {
      toast({
        title: "Already claimed",
        description: "You've already completed this quest!",
      });
      return;
    }

    if (quest.locked) {
      toast({
        title: "Quest locked",
        description: "You need to complete previous quests first!",
        variant: "destructive",
      });
      return;
    }

    // Update local state (in a real app, this would make an API call)
    setUserProgress(prev => ({
      ...prev,
      xp: prev.xp + quest.xpReward,
      completedQuests: prev.completedQuests + 1,
      level: prev.xp + quest.xpReward >= prev.xpForNextLevel ? prev.level + 1 : prev.level,
    }));

    // Update the quest
    const updatedQuests = quests.map(q => 
      q.id === quest.id ? { ...q, completed: true } : q
    );

    toast({
      title: "Quest completed!",
      description: `You earned ${quest.xpReward} XP!`,
    });
  };

  // Calculate level progress percentage
  const levelProgressPercentage = Math.min(
    100,
    Math.floor((userProgress.xp / userProgress.xpForNextLevel) * 100)
  );

  return (
    <AppLayout>
      <div className="container max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Crypto Academy</h1>
          <p className="text-muted-foreground">
            Learn about blockchain, crypto, and web3 through interactive lessons and quests
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Level Progress Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Level {userProgress.level}</CardTitle>
              <CardDescription>Your Learning Journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>{userProgress.xp} XP</span>
                  <span>{userProgress.xpForNextLevel} XP</span>
                </div>
                <Progress value={levelProgressPercentage} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {userProgress.xpForNextLevel - userProgress.xp} XP until level {userProgress.level + 1}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quest Progress Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Quests</CardTitle>
              <CardDescription>Your progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold">{userProgress.completedQuests}/{userProgress.totalQuests}</span>
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <Progress 
                  value={(userProgress.completedQuests / userProgress.totalQuests) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Achievements Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Achievements</CardTitle>
              <CardDescription>Badges earned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold">{userProgress.unlockedAchievements}/{userProgress.totalAchievements}</span>
                  <span className="text-muted-foreground">Unlocked</span>
                </div>
                <Progress 
                  value={(userProgress.unlockedAchievements / userProgress.totalAchievements) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="dashboard" className="flex-1">Dashboard</TabsTrigger>
            <TabsTrigger value="modules" className="flex-1">Learning Modules</TabsTrigger>
            <TabsTrigger value="quests" className="flex-1">Quests</TabsTrigger>
            <TabsTrigger value="achievements" className="flex-1">Achievements</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <h2 className="text-2xl font-semibold">Your Learning Dashboard</h2>
            
            {/* Featured/Next module */}
            <Card>
              <CardHeader>
                <CardTitle>Continue Learning</CardTitle>
                <CardDescription>Pick up where you left off</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Puzzle className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Smart Contracts 101</h3>
                    <p className="text-muted-foreground">Unlock the power of programmable blockchain technology</p>
                    <div className="mt-2">
                      <Progress value={25} className="h-1.5 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">25% Complete</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Continue Learning</Button>
              </CardFooter>
            </Card>

            {/* Recent achievements */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Recent Achievements</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.filter(a => a.unlocked).map(achievement => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-full">
                            {achievement.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold">{achievement.title}</h4>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Active quests */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Active Quests</h3>
              <div className="space-y-4">
                {quests.filter(q => !q.completed && !q.locked).slice(0, 3).map(quest => (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardContent className="pt-6 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              {quest.icon}
                            </div>
                            <div>
                              <h4 className="font-semibold">{quest.title}</h4>
                              <p className="text-sm text-muted-foreground">{quest.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            +{quest.xpReward} XP
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Learning Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <h2 className="text-2xl font-semibold">Learning Modules</h2>
            <p className="text-muted-foreground mb-6">
              Complete these modules to learn about blockchain, crypto, and web3
            </p>

            <div className="grid grid-cols-1 gap-4">
              {learningModules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`${module.locked ? 'opacity-70' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${module.completed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-primary/10'}`}>
                            {module.locked ? (
                              <Lock className="h-6 w-6 text-muted-foreground" />
                            ) : module.completed ? (
                              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                            ) : (
                              module.icon
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{module.title}</h3>
                              <Badge variant="outline">Level {module.level}</Badge>
                            </div>
                            <p className="text-muted-foreground">{module.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge variant="outline">+{module.xpReward} XP</Badge>
                          <Button 
                            variant={module.completed ? "outline" : "default"} 
                            disabled={module.locked}
                            size="sm"
                            className="shrink-0"
                          >
                            {module.completed ? "Review" : "Start Learning"}
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Quests Tab */}
          <TabsContent value="quests" className="space-y-6">
            <h2 className="text-2xl font-semibold">Quests</h2>
            <p className="text-muted-foreground mb-6">
              Complete quests to earn XP and level up your crypto knowledge
            </p>

            <div className="grid grid-cols-1 gap-4">
              {quests.map((quest, index) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`${quest.locked ? 'opacity-70' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${quest.completed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-primary/10'}`}>
                            {quest.locked ? (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            ) : quest.completed ? (
                              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              quest.icon
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{quest.title}</h3>
                            <p className="text-sm text-muted-foreground">{quest.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge variant="outline">+{quest.xpReward} XP</Badge>
                          <Button 
                            variant={quest.completed ? "outline" : "default"} 
                            size="sm"
                            disabled={quest.completed || quest.locked}
                            onClick={() => claimQuestReward(quest)}
                            className="shrink-0"
                          >
                            {quest.completed ? "Completed" : "Complete"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <h2 className="text-2xl font-semibold">Achievements</h2>
            <p className="text-muted-foreground mb-6">
              Earn badges by reaching milestones in your crypto learning journey
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={!achievement.unlocked ? 'opacity-70' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${achievement.unlocked ? 'bg-primary/20' : 'bg-muted'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{achievement.title}</h3>
                            {achievement.unlocked && (
                              <Badge variant="secondary">Unlocked</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span>{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <Progress 
                              value={(achievement.progress / achievement.maxProgress) * 100} 
                              className="h-1.5" 
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/app-layout";
import VibeCard from "@/components/ui/vibe-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Vibe } from "@shared/schema";

export default function TrendingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");
  const [searchTab, setSearchTab] = useState("vibes");

  // Fetch trending vibes
  const {
    data: trendingVibes = [],
    isLoading: isLoadingTrending,
  } = useQuery({
    queryKey: ["/api/vibes/trending"],
    queryFn: async () => {
      const response = await fetch("/api/vibes/trending", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch trending vibes");
      return response.json();
    },
  });

  // Search vibes by hashtag
  const {
    data: searchResults = [],
    isLoading: isLoadingSearch,
    isFetched: isSearchFetched,
  } = useQuery({
    queryKey: ["/api/vibes/hashtag", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const hashtag = searchQuery.startsWith("#")
        ? searchQuery.substring(1)
        : searchQuery;
        
      const response = await fetch(`/api/vibes/hashtag/${hashtag}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch search results");
      return response.json();
    },
    enabled: !!searchQuery.trim() && activeTab === "search",
  });

  // Extract and count hashtags for trending topics
  const hashtagCounts = trendingVibes.reduce((acc: Record<string, number>, vibe: Vibe) => {
    if (!vibe.hashtags) return acc;
    
    vibe.hashtags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    
    return acc;
  }, {});

  // Sort hashtags by count for trending topics
  const trendingTopics = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab("search");
    }
  };

  return (
    <AppLayout header={<h2 className="text-xl font-bold">Trending</h2>}>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="trending" className="flex-1">
            <TrendingUp className="mr-2 h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className="flex-1"
          >
            <Search className="mr-2 h-4 w-4" />
            Search Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-6 mt-0">
          {/* Trending Hashtags */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Trending Topics</h3>
              
              {isLoadingTrending ? (
                <div className="flex flex-wrap gap-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              ) : trendingTopics.length === 0 ? (
                <p className="text-muted-foreground">No trending topics yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map(([tag, count], index) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        setSearchQuery(tag);
                        setActiveTab("search");
                      }}
                    >
                      #{tag}
                      <span className="ml-2 text-xs bg-muted-foreground/20 rounded-full px-2">
                        {count}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trending Vibes */}
          <h3 className="text-lg font-medium mb-8">Top Vibes</h3>
          
          {isLoadingTrending ? (
            <div className="space-y-6">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-40 w-full" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trendingVibes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trending vibes yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {trendingVibes.map((vibe: Vibe, index: number) => (
                <motion.div
                  key={vibe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <VibeCard vibe={vibe} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-0">

          <div className="relative mb-6">
            <form onSubmit={handleSearch}>
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10 pr-4 py-6"
                placeholder="Search hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Trending Topics</h3>

              {isLoadingTrending ? (
                <div className="flex flex-wrap gap-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              ) : trendingTopics.length === 0 ? (
                <p className="text-muted-foreground">No trending topics yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map(([tag, count], index) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        setSearchQuery(tag);
                        setActiveTab("search");
                      }}
                    >
                      #{tag}
                      <span className="ml-2 text-xs bg-muted-foreground/20 rounded-full px-2">
                        {count}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {isLoadingSearch ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : searchQuery && isSearchFetched && searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No results found for "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Results for "{searchQuery.startsWith("#") ? searchQuery : `#${searchQuery}`}"
                </h3>
                <Badge variant="outline">{searchResults.length} results</Badge>
              </div>
              
              {searchResults.map((vibe: Vibe, index: number) => (
                <motion.div
                  key={vibe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <VibeCard vibe={vibe} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

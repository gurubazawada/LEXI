'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchLeaderboard } from '@/lib/api';
import type { LeaderboardEntry } from '@/types/lessons';
import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Trophy, Star, Users, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await fetchLeaderboard(20); // Only fetch top 20
      setLeaderboard(data.leaderboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Medal className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
    }
    if (rank === 2) {
      return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
    }
    if (rank === 3) {
      return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
    }
    return null;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-amber-600 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  if (loading) {
    return (
      <>
        <Page.Header className="p-0">
          <TopBar title="Leaderboard" />
        </Page.Header>
        <Page.Main className="flex items-center justify-center">
          <p className="text-gray-600">Loading leaderboard...</p>
        </Page.Main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Page.Header className="p-0">
          <TopBar title="Leaderboard" />
        </Page.Header>
        <Page.Main className="flex items-center justify-center">
          <p className="text-red-600">{error}</p>
        </Page.Main>
      </>
    );
  }

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Leaderboard" />
      </Page.Header>
      <Page.Main className="space-y-4 pb-16">
        {leaderboard.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No leaderboard data yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Fluent speakers will appear here once they receive reviews
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium - Only show if we have at least 3 entries */}
            {leaderboard.length >= 3 ? (
              <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    <span className="text-xl font-bold">Podium</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-center gap-3 px-2">
                    {/* 2nd Place - Silver (Medium Height) */}
                    <div className="flex-1 max-w-[120px]">
                      <div className="flex flex-col items-center">
                        {/* Medal */}
                        <div className="mb-2 relative">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg border-2 border-gray-400">
                            <Medal className="w-10 h-10 text-white" />
                          </div>
                          <Badge className="absolute -top-2 -right-2 bg-gray-500 text-white border-2 border-white shadow-md">
                            #2
                          </Badge>
                        </div>
                        {/* Podium Base */}
                        <div className="w-full bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg shadow-lg border-2 border-gray-500" style={{ height: '140px' }}>
                          <div className="h-full flex flex-col items-center justify-start pt-3 px-2">
                            <p className="font-bold text-sm text-white truncate w-full text-center drop-shadow-md">
                              {leaderboard[1].fluentUsername}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                              <span className="text-base font-bold text-white">{leaderboard[1].averageRating.toFixed(1)}</span>
                            </div>
                            <p className="text-xs text-gray-100 mt-1">{leaderboard[1].totalSessions} sessions</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 1st Place - Gold (Tallest) */}
                    <div className="flex-1 max-w-[140px]">
                      <div className="flex flex-col items-center">
                        {/* Medal */}
                        <div className="mb-2 relative">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center shadow-xl border-4 border-yellow-700">
                            <Medal className="w-12 h-12 text-yellow-800" />
                          </div>
                          <Badge className="absolute -top-2 -right-2 bg-yellow-600 text-white border-2 border-white shadow-lg font-bold">
                            #1
                          </Badge>
                        </div>
                        {/* Podium Base */}
                        <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg shadow-xl border-4 border-yellow-700" style={{ height: '180px' }}>
                          <div className="h-full flex flex-col items-center justify-start pt-4 px-2">
                            <p className="font-bold text-base text-white truncate w-full text-center drop-shadow-lg">
                              {leaderboard[0].fluentUsername}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="w-5 h-5 fill-yellow-200 text-yellow-200" />
                              <span className="text-lg font-bold text-white">{leaderboard[0].averageRating.toFixed(1)}</span>
                            </div>
                            <p className="text-xs text-yellow-100 mt-1">{leaderboard[0].totalSessions} sessions</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3rd Place - Bronze (Shortest) */}
                    <div className="flex-1 max-w-[120px]">
                      <div className="flex flex-col items-center">
                        {/* Medal */}
                        <div className="mb-2 relative">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg border-2 border-amber-900">
                            <Medal className="w-10 h-10 text-amber-200" />
                          </div>
                          <Badge className="absolute -top-2 -right-2 bg-amber-700 text-white border-2 border-white shadow-md">
                            #3
                          </Badge>
                        </div>
                        {/* Podium Base */}
                        <div className="w-full bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg shadow-lg border-2 border-amber-900" style={{ height: '100px' }}>
                          <div className="h-full flex flex-col items-center justify-start pt-2 px-2">
                            <p className="font-bold text-sm text-white truncate w-full text-center drop-shadow-md">
                              {leaderboard[2].fluentUsername}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                              <span className="text-base font-bold text-white">{leaderboard[2].averageRating.toFixed(1)}</span>
                            </div>
                            <p className="text-xs text-amber-100 mt-1">{leaderboard[2].totalSessions} sessions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : leaderboard.length > 0 && (
              /* Show simplified top entry if less than 3 */
              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    Top Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="flex flex-col items-center mb-4">
                      {getRankIcon(1)}
                      <Badge className={cn('mt-2', getRankBadgeColor(1))}>#1</Badge>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg p-4 shadow-lg border-2 border-yellow-400">
                      <p className="font-bold text-lg">{leaderboard[0].fluentUsername}</p>
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-lg font-bold">{leaderboard[0].averageRating.toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{leaderboard[0].totalSessions} sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rest of Top 20 Leaderboard List (excluding top 3) */}
            {leaderboard.length > 3 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold px-2">Top 20 Rankings</h2>
                {leaderboard.slice(3).map((entry) => (
                  <Card
                    key={entry.fluentId}
                    className="transition-shadow hover:shadow-md"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 text-center">
                          <div className="flex flex-col items-center">
                            <Award className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-600 mt-1">#{entry.rank}</span>
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate">{entry.fluentUsername}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{entry.averageRating.toFixed(1)}</span>
                              <span className="text-xs text-gray-500">({entry.totalReviews} reviews)</span>
                            </div>
                          </div>
                        </div>

                        {/* Sessions */}
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">{entry.totalSessions}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </Page.Main>
    </>
  );
}


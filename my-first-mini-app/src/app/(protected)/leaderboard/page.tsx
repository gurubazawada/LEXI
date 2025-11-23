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
      const data = await fetchLeaderboard(100);
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
              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-center gap-2">
                    {/* 2nd Place */}
                    <div className="flex-1 text-center">
                      <div className="flex flex-col items-center mb-2">
                        {getRankIcon(2)}
                        <Badge className={cn('mt-2', getRankBadgeColor(2))}>#2</Badge>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-md border border-gray-200">
                        <p className="font-semibold text-sm truncate">{leaderboard[1].fluentUsername}</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{leaderboard[1].averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{leaderboard[1].totalSessions} sessions</p>
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex-1 text-center">
                      <div className="flex flex-col items-center mb-2">
                        {getRankIcon(1)}
                        <Badge className={cn('mt-2', getRankBadgeColor(1))}>#1</Badge>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg p-4 shadow-lg border-2 border-yellow-400">
                        <p className="font-bold text-base truncate">{leaderboard[0].fluentUsername}</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-lg font-bold">{leaderboard[0].averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{leaderboard[0].totalSessions} sessions</p>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex-1 text-center">
                      <div className="flex flex-col items-center mb-2">
                        {getRankIcon(3)}
                        <Badge className={cn('mt-2', getRankBadgeColor(3))}>#3</Badge>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-md border border-gray-200">
                        <p className="font-semibold text-sm truncate">{leaderboard[2].fluentUsername}</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{leaderboard[2].averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{leaderboard[2].totalSessions} sessions</p>
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

            {/* Full Leaderboard List */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold px-2">All Rankings</h2>
              {leaderboard.map((entry, index) => {
                const isTopThree = entry.rank <= 3;
                return (
                  <Card
                    key={entry.fluentId}
                    className={cn(
                      'transition-shadow',
                      isTopThree && 'border-2 shadow-md',
                      entry.rank === 1 && 'border-yellow-400',
                      entry.rank === 2 && 'border-gray-400',
                      entry.rank === 3 && 'border-amber-600'
                    )}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 text-center">
                          {isTopThree ? (
                            <div className="flex flex-col items-center">
                              {getRankIcon(entry.rank)}
                              <Badge className={cn('mt-1 text-xs', getRankBadgeColor(entry.rank))}>
                                #{entry.rank}
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Award className="w-5 h-5 text-gray-400" />
                              <span className="text-sm font-semibold text-gray-600 mt-1">#{entry.rank}</span>
                            </div>
                          )}
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
                );
              })}
            </div>
          </>
        )}
      </Page.Main>
    </>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchLessons, fetchLeaderboard } from '@/lib/api';
import { MessageCircle, Trophy, Users, TrendingUp, ArrowRight } from 'lucide-react';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalLessons: 0,
    leaderboardRank: '--',
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [session]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userId = session?.user?.id || session?.user?.walletAddress;
      
      if (userId) {
        // Get user's lessons
        const lessonsData = await fetchLessons(userId, 1000);
        const totalLessons = lessonsData.lessons.length;

        // Get leaderboard to find user's rank
        const leaderboardData = await fetchLeaderboard(1000);
        const userEntry = leaderboardData.leaderboard.find(
          entry => entry.fluentId === userId
        );
        const leaderboardRank = userEntry ? `#${userEntry.rank}` : '--';
        const averageRating = userEntry?.averageRating || 0;

        setStats({
          totalLessons,
          leaderboardRank,
          averageRating,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Home" />
      </Page.Header>
      <Page.Main className="space-y-4 pb-20">
        {/* Welcome Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Welcome{session?.user?.username ? `, ${session.user.username}` : ''}!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Ready to practice a new language? Start matching with partners now!
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <MessageCircle className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <p className="text-2xl font-bold">{stats.totalLessons}</p>
              <p className="text-xs text-gray-500">Lessons</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.leaderboardRank}</p>
              <p className="text-xs text-gray-500">Rank</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-gray-500">Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/match')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Start Matching</p>
                    <p className="text-sm text-gray-500">Find a language partner</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/lessons')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Past Conversations</p>
                    <p className="text-sm text-gray-500">View and review your lessons</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/leaderboard')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Leaderboard</p>
                    <p className="text-sm text-gray-500">See top language partners</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Page.Main>
    </>
  );
}

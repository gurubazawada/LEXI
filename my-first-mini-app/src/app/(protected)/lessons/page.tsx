'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Review } from '@/components/Review';
import { fetchLessons, fetchReviewForLesson, checkReviewExists } from '@/lib/api';
import type { Lesson, Review as ReviewType } from '@/types/lessons';
import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { MessageCircle, Star, Clock, User } from 'lucide-react';
// Simple date formatting function
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

const languageNames: { [key: string]: string } = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
  jp: 'Japanese',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  zh: 'Mandarin',
};

export default function LessonsPage() {
  const { data: session } = useSession();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [reviewData, setReviewData] = useState<{ [lessonId: string]: ReviewType | null }>({});
  const [hasReviewed, setHasReviewed] = useState<{ [lessonId: string]: boolean }>({});

  useEffect(() => {
    if (session?.user?.walletAddress) {
      loadLessons();
    }
  }, [session]);

  const loadLessons = async () => {
    if (!session?.user?.walletAddress) return;

    try {
      setLoading(true);
      const data = await fetchLessons(session.user.walletAddress);
      setLessons(data.lessons);

      // Load review data for each lesson
      const reviewPromises = data.lessons.map(async (lesson) => {
        try {
          const reviewData = await fetchReviewForLesson(lesson.id);
          const checkData = await checkReviewExists(lesson.id, session.user.walletAddress!);
          return {
            lessonId: lesson.id,
            review: reviewData.review,
            hasReviewed: checkData.hasReviewed,
          };
        } catch (err) {
          return {
            lessonId: lesson.id,
            review: null,
            hasReviewed: false,
          };
        }
      });

      const reviewResults = await Promise.all(reviewPromises);
      const reviewMap: { [lessonId: string]: ReviewType | null } = {};
      const hasReviewedMap: { [lessonId: string]: boolean } = {};

      reviewResults.forEach(({ lessonId, review, hasReviewed }) => {
        reviewMap[lessonId] = review;
        hasReviewedMap[lessonId] = hasReviewed;
      });

      setReviewData(reviewMap);
      setHasReviewed(hasReviewedMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getPartnerInfo = (lesson: Lesson) => {
    const isLearner = session?.user?.walletAddress === lesson.learnerId;
    return {
      name: isLearner ? lesson.fluentUsername : lesson.learnerUsername,
      role: isLearner ? 'Fluent Speaker' : 'Learner',
    };
  };

  const handleReviewSubmitted = () => {
    if (selectedLesson) {
      loadLessons();
      setSelectedLesson(null);
    }
  };

  if (loading) {
    return (
      <>
        <Page.Header className="p-0">
          <TopBar title="Past Conversations" />
        </Page.Header>
        <Page.Main className="flex items-center justify-center">
          <p className="text-gray-600">Loading lessons...</p>
        </Page.Main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Page.Header className="p-0">
          <TopBar title="Past Conversations" />
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
        <TopBar title="Past Conversations" />
      </Page.Header>
      <Page.Main className="space-y-4 pb-16">
        {lessons.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No conversations yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Start matching with language partners to see your conversations here
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectedLesson ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedLesson(null)}
                  className="mb-4"
                >
                  ← Back to Conversations
                </Button>

                {session?.user?.walletAddress === selectedLesson.learnerId && 
                 !hasReviewed[selectedLesson.id] && (
                  <Review
                    lesson={selectedLesson}
                    learnerId={session.user.walletAddress}
                    onReviewSubmitted={handleReviewSubmitted}
                  />
                )}

                {reviewData[selectedLesson.id] && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= reviewData[selectedLesson.id]!.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-2">
                          {reviewData[selectedLesson.id]!.rating}/5
                        </span>
                      </div>
                      {reviewData[selectedLesson.id]!.comment && (
                        <p className="text-sm text-gray-700 mt-2">
                          {reviewData[selectedLesson.id]!.comment}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Conversation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Partner:</strong> {getPartnerInfo(selectedLesson).name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{languageNames[selectedLesson.language] || selectedLesson.language}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Duration:</strong> {formatDuration(selectedLesson.duration)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Started:</strong>{' '}
                      {formatDistanceToNow(new Date(selectedLesson.startedAt))}
                    </div>
                    {selectedLesson.endedAt && (
                      <div className="text-sm text-gray-600">
                        <strong>Ended:</strong>{' '}
                        {formatDistanceToNow(new Date(selectedLesson.endedAt))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              lessons.map((lesson) => {
                const partner = getPartnerInfo(lesson);
                const review = reviewData[lesson.id];
                const canReview = session?.user?.walletAddress === lesson.learnerId && !hasReviewed[lesson.id];

                return (
                  <Card
                    key={lesson.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{partner.name}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{partner.role}</p>
                        </div>
                        {review && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">{review.rating}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{languageNames[lesson.language] || lesson.language}</Badge>
                        {lesson.duration && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(lesson.duration)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(lesson.startedAt))}
                      </p>
                      {canReview && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLesson(lesson);
                            }}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Rate Conversation
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </>
        )}
      </Page.Main>
    </>
  );
}


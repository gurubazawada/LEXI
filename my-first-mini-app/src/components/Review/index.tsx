'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createReview } from '@/lib/api';
import type { Lesson } from '@/types/lessons';

interface ReviewProps {
  lesson: Lesson;
  learnerId: string;
  onReviewSubmitted?: () => void;
}

export function Review({ lesson, learnerId, onReviewSubmitted }: ReviewProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createReview(lesson.id, learnerId, rating, comment || undefined);
      setSuccess(true);
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'w-6 h-6',
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  )}
                />
              ))}
            </div>
            <p className="text-green-600 font-semibold text-lg">Thank you for your review!</p>
            <p className="text-sm text-gray-600 mt-2">
              Your rating has been submitted and will update the leaderboard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-yellow-200 bg-yellow-50/50">
      <CardHeader>
        <CardTitle>Rate Your Fluent Speaker</CardTitle>
        <p className="text-sm text-gray-700 font-medium">
          How was your conversation with <span className="font-semibold">{lesson.fluentUsername}</span>?
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Your rating helps improve the leaderboard and helps others find great language partners
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Rating (1-5 Stars)</Label>
            <div className="flex gap-3 mt-3 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className={cn(
                    "focus:outline-none transition-transform hover:scale-110 active:scale-95",
                    (hoveredRating >= star || rating >= star) && "scale-110"
                  )}
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  <Star
                    className={cn(
                      'w-10 h-10 transition-all duration-200',
                      (hoveredRating >= star || rating >= star)
                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                        : 'fill-gray-300 text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="mt-3 text-center">
                <p className="text-base font-semibold text-gray-800">
                  {rating === 1 && '⭐ Poor'}
                  {rating === 2 && '⭐⭐ Fair'}
                  {rating === 3 && '⭐⭐⭐ Good'}
                  {rating === 4 && '⭐⭐⭐⭐ Very Good'}
                  {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about the conversation..."
              className="mt-2"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


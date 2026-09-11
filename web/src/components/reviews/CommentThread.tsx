'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  helpful_count: number;
  is_hidden: boolean;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    image?: string;
  };
  replies?: Comment[];
}

interface CommentThreadProps {
  reviewId: string;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentThread({ reviewId, onCommentCountChange }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/reviews/${reviewId}/comments?include_replies=true`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch comments');
      setComments(data);
      onCommentCountChange?.(data.length);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [reviewId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await authFetch(`/api/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add comment');
      }

      setNewComment('');
      fetchComments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await authFetch(`/api/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: replyText, parent_id: parentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add reply');
      }

      setReplyText('');
      setReplyingTo(null);
      fetchComments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteHelpful = async (commentId: string) => {
    try {
      const res = await authFetch(`/api/reviews/comments/${commentId}/helpful`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to vote');
      }

      const data = await res.json();
      // Update the comment's helpful count locally
      setComments(prevComments => 
        updateCommentHelpfulCount(prevComments, commentId, data.helpful_count)
      );
    } catch (err: any) {
      console.error('Error voting:', err);
    }
  };

  const updateCommentHelpfulCount = (comments: Comment[], commentId: string, newCount: number): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, helpful_count: newCount };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentHelpfulCount(comment.replies, commentId, newCount),
        };
      }
      return comment;
    });
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div
      style={{
        padding: isReply ? '0.75rem 0 0.75rem 1.5rem' : '1rem',
        borderLeft: isReply ? '2px solid #374151' : 'none',
        marginLeft: isReply ? '1rem' : '0',
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: comment.user.image 
              ? `url(${comment.user.image}) center/cover` 
              : '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            color: '#9ca3af',
            flexShrink: 0,
          }}
        >
          {comment.user.image ? '' : comment.user.first_name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>
                {comment.user.first_name} {comment.user.last_name}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            {comment.comment}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
            <button
              onClick={() => handleVoteHelpful(comment.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              👍 {comment.helpful_count}
            </button>
            {!isReply && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                Reply
              </button>
            )}
          </div>

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div style={{ marginTop: '0.75rem' }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: 6,
                  border: '1px solid #374151',
                  background: '#18181b',
                  color: '#fff',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  marginBottom: '0.5rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleReply(comment.id)}
                  disabled={submitting || !replyText.trim()}
                  className="btn-primary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    opacity: submitting || !replyText.trim() ? 0.7 : 1,
                    cursor: submitting || !replyText.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Sending...' : 'Reply'}
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: 6,
                    background: '#374151',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h4 style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '1rem', fontSize: '1.1rem' }}>
        Comments ({comments.length})
      </h4>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '0.75rem',
          color: '#fca5a5',
          marginBottom: '1rem',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* Add Comment Form */}
      <div style={{ marginBottom: '1.5rem' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 8,
            border: '1px solid #374151',
            background: '#18181b',
            color: '#fff',
            fontSize: '0.9rem',
            resize: 'vertical',
            marginBottom: '0.5rem',
          }}
        />
        <button
          onClick={handleAddComment}
          disabled={submitting || !newComment.trim()}
          className="btn-primary"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            opacity: submitting || !newComment.trim() ? 0.7 : 1,
            cursor: submitting || !newComment.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>

      {/* Comments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 8, textAlign: 'center', color: '#64748b' }}>
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
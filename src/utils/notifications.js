import { supabase } from '../supabaseClient';

/**
 * Create a notification
 * @param {string} recipientId - The user who will receive the notification
 * @param {string} actorId - The user who performed the action
 * @param {string} type - 'follow', 'like', 'comment', 'event_rsvp'
 * @param {Object} options - { postId, commentId, eventId }
 */
export async function createNotification(recipientId, actorId, type, options = {}) {
  if (recipientId === actorId) return; // Don't notify yourself

  const notification = {
    user_id: recipientId,
    actor_id: actorId,
    type,
    post_id: options.postId || null,
    comment_id: options.commentId || null,
    event_id: options.eventId || null,
    read: false
  };

  try {
    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
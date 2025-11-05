import { supabase } from './supabase';

type AnalyticsEvent =
  | 'app_open'
  | 'draw_started'
  | 'draw_submitted'
  | 'rating_given'
  | 'rat_viewed_fullscreen'
  | 'badge_earned'
  | 'purchase_started'
  | 'purchase_completed';

export const trackEvent = async (
  eventName: AnalyticsEvent,
  eventData: Record<string, any> = {}
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('analytics_events').insert({
      profile_id: user?.id || null,
      event_name: eventName,
      event_data: eventData,
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

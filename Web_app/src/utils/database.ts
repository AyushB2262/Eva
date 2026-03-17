import { supabase } from './supabase';

/**
 * Analytics Tracking
 */
export async function trackEvent(eventType: string, platform?: string, metadata?: any, userId?: string) {
    try {
        await supabase.from('analytics').insert({
            user_id: userId || null,
            event_type: eventType,
            platform,
            metadata,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("[Database] Analytics failed:", e);
    }
}

/**
 * Support Ticket Management
 */
export async function createTicket(userId: string, subject: string, message: string, priority: 'low' | 'normal' | 'high' = 'normal') {
    if (!userId) return { error: "Login required to create tickets." };
    try {
        const { data, error } = await supabase.from('support_tickets').insert({
            user_id: userId,
            subject,
            message,
            priority,
            status: 'open',
            timestamp: new Date().toISOString()
        }).select().single();

        if (error) throw error;
        return { data };
    } catch (e: any) {
        console.error("[Database] Ticket creation failed:", e);
        return { error: e.message };
    }
}

export async function getUserTickets(userId: string) {
    if (!userId) return [];
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("[Database] Fetching tickets failed:", e);
        return [];
    }
}

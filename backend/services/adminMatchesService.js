import { getSupabaseAdminClient, isSupabaseConfigured } from "../config/supabase.js";
import { crexLiveMatchService } from "./crexLiveMatchService.js";

const TABLE = "admin_tracked_matches";
const CACHE_TTL_MS = 1000; // 1 second for real-time updates
const matchCache = new Map();

export const adminMatchesService = {
  /**
   * Get all admin-added matches from Supabase
   */
  async getAllAdminMatches() {
    if (!isSupabaseConfigured()) {
      return { success: false, data: [], message: "Supabase not configured" };
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      return { success: false, data: [], message: "Supabase client not available" };
    }

    try {
      const result = await client
        .from(TABLE)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (result.error) {
        console.error("Supabase fetch error:", result.error);
        return { success: false, data: [], message: result.error.message };
      }

      return { success: true, data: result.data || [], message: "Matches retrieved" };
    } catch (error) {
      console.error("Error fetching admin matches:", error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Get live match data by scraping the URL from Supabase
   */
  async getLiveMatchData(matchId, options = {}) {
    const forceFresh = Boolean(options?.forceFresh);

    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error("Supabase client not available");
    }

    // Get match record from Supabase
    const result = await client
      .from(TABLE)
      .select("*")
      .eq("id", matchId)
      .eq("is_active", true)
      .single();

    if (result.error || !result.data) {
      throw new Error("Match not found in database");
    }

    const matchRecord = result.data;
    const url = matchRecord.source_url;

    if (!url) {
      throw new Error("Match URL not found");
    }

    // Check cache
    const cacheKey = url;
    const now = Date.now();
    const cached = matchCache.get(cacheKey);

    if (!forceFresh && cached && cached.expiresAt > now) {
      return {
        match: cached.data.match,
        scoreboard: cached.data.scoreboard,
        _meta: { cacheHit: true, source: "admin" },
      };
    }

    // Scrape live data using the proper Crex service
    const liveData = await crexLiveMatchService.getLiveMatchByUrl(url, { 
      forceFresh: true,
      tournamentId: matchRecord.tournament_id,
      series: matchRecord.series 
    });

    // Format response
    const response = {
      match: {
        id: matchRecord.id,
        title: matchRecord.match_title || liveData.title || `${liveData.team1} vs ${liveData.team2}`,
        sport: matchRecord.sport || "cricket",
        section: matchRecord.section_label || matchRecord.series || "Cricket",
        series: matchRecord.series || liveData.series || "Cricket",
        team1: liveData.team1 || matchRecord.team1,
        team2: liveData.team2 || matchRecord.team2,
        team1Score: liveData.team1Score,
        team2Score: liveData.team2Score,
        team1Overs: liveData.team1Overs,
        team2Overs: liveData.team2Overs,
        status: liveData.status,
        venue: liveData.venue,
        sourceUrl: url,
        fetchedAt: liveData.fetchedAt,
      },
      scoreboard: liveData.scoreboard,
    };

    // Cache the result
    matchCache.set(cacheKey, {
      data: response,
      expiresAt: now + CACHE_TTL_MS,
    });

    return {
      ...response,
      _meta: { cacheHit: false, source: "admin" },
    };
  },

  /**
   * Get all live matches with scraped data
   */
  async getAllLiveMatchesWithData(options = {}) {
    const matchesResult = await this.getAllAdminMatches();

    if (!matchesResult.success) {
      return { success: false, data: [], message: matchesResult.message };
    }

    const liveMatches = matchesResult.data.filter((m) => m.mode === "live");

    // Scrape data for each match (in parallel, but limit concurrency)
    const results = await Promise.allSettled(
      liveMatches.map(async (matchRecord) => {
        try {
          const liveData = await crexLiveMatchService.getLiveMatchByUrl(matchRecord.source_url, {
            forceFresh: options?.forceFresh,
            tournamentId: matchRecord.tournament_id,
            series: matchRecord.series,
          });

          return {
            id: matchRecord.id,
            title: matchRecord.match_title || `${liveData.team1} vs ${liveData.team2}`,
            sport: matchRecord.sport,
            series: matchRecord.series || liveData.series,
            team1: liveData.team1,
            team2: liveData.team2,
            team1Score: liveData.team1Score,
            team2Score: liveData.team2Score,
            team1Overs: liveData.team1Overs,
            team2Overs: liveData.team2Overs,
            status: liveData.status,
            venue: liveData.venue,
            sourceUrl: matchRecord.source_url,
            name: `${liveData.team1} vs ${liveData.team2}`,
            matchStarted: liveData.status === "Live",
            matchEnded: liveData.status === "Completed",
          };
        } catch (error) {
          console.error(`Error scraping match ${matchRecord.id}:`, error);
          return null;
        }
      })
    );

    const successfulMatches = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value);

    return {
      success: true,
      data: successfulMatches,
      message: `Retrieved ${successfulMatches.length} live matches`,
    };
  },

  /**
   * Add a new live match
   */
  async addLiveMatch(data) {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error("Supabase client not available");
    }

    const payload = {
      source_url: data.url,
      mode: "live",
      tournament_id: data.tournamentId || "admin",
      series: data.series || null,
      sport: data.sport || "cricket",
      category: data.category || null,
      section_label: data.section || null,
      match_title: data.title || null,
      team1: data.team1 || null,
      team2: data.team2 || null,
      is_active: true,
    };

    const result = await client.from(TABLE).upsert(payload, { onConflict: "source_url" }).select("*").single();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  },

  /**
   * Add a new upcoming match
   */
  async addUpcomingMatch(data) {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error("Supabase client not available");
    }

    const payload = {
      source_url: data.url,
      mode: "upcoming",
      tournament_id: data.tournamentId || "admin",
      series: data.series || null,
      sport: data.sport || "cricket",
      category: data.category || null,
      section_label: data.section || null,
      match_title: data.title || null,
      team1: data.team1 || null,
      team2: data.team2 || null,
      status: `${data.date} ${data.time}`.trim() || null,
      is_active: true,
    };

    const result = await client.from(TABLE).upsert(payload, { onConflict: "source_url" }).select("*").single();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  },

  /**
   * Delete a match (soft delete)
   */
  async deleteMatch(matchId) {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error("Supabase client not available");
    }

    const result = await client.from(TABLE).update({ is_active: false }).eq("id", matchId).select("id").single();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  },
};

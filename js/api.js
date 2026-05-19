// api.js - api-sports.io Football API integration

const API_KEY    = '067da40ed79f82a6c13ff3eb0eb3e26f';
const BASE_URL   = 'https://v3.football.api-sports.io';
const WC_LEAGUE  = 1;       // FIFA World Cup
const WC_SEASON  = 2026;
const CACHE_TTL  = 60 * 60 * 1000; // 1 hour in ms

class FootballAPI {

    // ── Internal HTTP helper with localStorage caching ─────────
    async _get(endpoint, params = {}) {
        const url = new URL(`${BASE_URL}${endpoint}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        const cacheKey = `wc_api_${endpoint}_${url.search}`;
        const cached   = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const { data, ts } = JSON.parse(cached);
                if (Date.now() - ts < CACHE_TTL) return data;
            } catch { /* corrupt cache – ignore */ }
        }

        try {
            const res = await fetch(url.toString(), {
                headers: { 'x-apisports-key': API_KEY }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.errors && Object.keys(json.errors).length) {
                console.warn('[API] errors:', json.errors);
            }
            localStorage.setItem(cacheKey, JSON.stringify({ data: json, ts: Date.now() }));
            return json;
        } catch (err) {
            console.warn(`[API] ${endpoint} failed:`, err.message);
            return cached ? JSON.parse(cached).data : null; // stale cache fallback
        }
    }

    // ── Public fetch methods ────────────────────────────────────
    getFixtures() {
        return this._get('/fixtures', { league: WC_LEAGUE, season: WC_SEASON });
    }

    getTopScorers() {
        return this._get('/players/topscorers', { league: WC_LEAGUE, season: WC_SEASON });
    }

    getTopAssists() {
        return this._get('/players/topassists', { league: WC_LEAGUE, season: WC_SEASON });
    }

    // ── Map API round string → store stage label ────────────────
    _mapRound(round = '') {
        if (round.includes('Group'))   return 'Group Stage';
        if (round.includes('32'))      return 'Round of 32';
        if (round.includes('16'))      return 'Round of 16';
        if (round.includes('Quarter')) return 'Quarter-finals';
        if (round.includes('Semi'))    return 'Semi-finals';
        if (round.includes('Final'))   return 'Final';
        return 'Group Stage';
    }

    // ── Convert decimal odds → implied probability % ────────────
    _oddsToProbs(h, d, a) {
        const ih = 1 / h, id = 1 / d, ia = 1 / a;
        const t  = ih + id + ia;
        const winProb1 = Math.round((ih / t) * 100);
        const drawProb = Math.round((id / t) * 100);
        const winProb2 = 100 - winProb1 - drawProb;
        return { winProb1, drawProb, winProb2 };
    }

    // ── Map a single API fixture → store match format ───────────
    mapFixture(f) {
        const { fixture, teams, goals, score, league } = f;

        // Default probabilities (equal-ish)
        let winProb1 = 40, drawProb = 25, winProb2 = 35;

        // Status
        const short      = fixture.status?.short ?? 'NS';
        const isFinished = ['FT', 'AET', 'PEN'].includes(short);

        return {
            id:         String(fixture.id),
            team1:      teams.home.name,
            team2:      teams.away.name,
            team1Logo:  teams.home.logo,
            team2Logo:  teams.away.logo,
            stage:      this._mapRound(league.round ?? ''),
            date:       fixture.date,
            winProb1, drawProb, winProb2,
            status:     isFinished ? 'finished' : 'upcoming',
            score1:     isFinished ? (goals?.home     ?? null) : null,
            score2:     isFinished ? (goals?.away     ?? null) : null,
            score1_et:  isFinished ? (score?.extratime?.home ?? null) : null,
            score2_et:  isFinished ? (score?.extratime?.away ?? null) : null,
            score1_p:   isFinished ? (score?.penalty?.home   ?? null) : null,
            score2_p:   isFinished ? (score?.penalty?.away   ?? null) : null,
            fromAPI:    true
        };
    }

    // ── Sync WC fixtures into store (non-blocking) ──────────────
    async syncFixtures() {
        const data = await this.getFixtures();
        if (!data?.response?.length) {
            console.warn('[API] syncFixtures: no data returned.');
            return false;
        }

        const db = store.db;
        let added = 0, updated = 0;

        data.response.forEach(apiFixture => {
            const mapped = this.mapFixture(apiFixture);
            const idx    = db.matches.findIndex(m => String(m.id) === mapped.id);

            if (idx >= 0) {
                // Preserve manually-entered scorers; update everything else
                db.matches[idx] = {
                    scorers_t1: db.matches[idx].scorers_t1,
                    scorers_t2: db.matches[idx].scorers_t2,
                    ...mapped
                };
                updated++;
            } else {
                db.matches.push(mapped);
                added++;
            }
        });

        store.save();
        console.log(`[API] Sync done — +${added} new, ${updated} updated.`);
        return true;
    }

    // ── Build players list for autocomplete ─────────────────────
    async getPlayersForAutocomplete() {
        const [scorers, assists] = await Promise.all([
            this.getTopScorers(),
            this.getTopAssists()
        ]);
        const names = new Set();
        scorers?.response?.forEach(p => p?.player?.name && names.add(p.player.name));
        assists?.response?.forEach(p => p?.player?.name && names.add(p.player.name));
        return [...names].sort();
    }
}

window.footballAPI = new FootballAPI();

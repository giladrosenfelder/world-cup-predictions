// store.js - Handles LocalStorage Data

const DB_KEY = 'wc_predictions_db';

const defaultDB = {
    users: [], // { id, email, password, role: 'user' | 'admin' }
    matches: [], // { id, team1, team2, stage, date, winProb1, drawProb, winProb2, status: 'upcoming' | 'finished', score1, score2, drawResult: 'team1'|'team2'|null }
    predictions: [], // { id, userId, matchId, score1, score2, drawResult: 'team1'|'team2'|null, points: 0 }
    tournamentPredictions: [], // { userId, topScorer, topAssister }
    tournamentResults: { topScorer: null, topAssister: null },
};

const PLAYERS_DB = {
    'ארגנטינה': ['אמיליאנו מרטינז', 'חרמיניו רולי', 'פרנקו ארמני', 'נאוול מולינה', 'גונסאלו מונטייל', 'כריסטיאן רומרו', 'חרמן פצלה', 'ניקולאס אוטמנדי', 'ליסנדרו מרטינז', 'מרקוס אקוניה', 'ניקולאס טגליאפיקו', 'חואן פוית', 'רודריגו דה פול', 'לאנדרו פארדס', 'אלכסיס מק אליסטר', 'גידו רודריגס', 'אלחנדרו גומז', 'אנסו פרננדס', 'אסקייל פלאסיוס', 'טיאגו אלמאדה', 'אנחל די מריה', 'לאוטרו מרטינז', 'חוליאן אלברס', 'פאולו דיבאלה', 'אנחל קוריאה', 'ליונל מסי'],
    'ברזיל': ['אליסון', 'אדרסון', 'וברטון', 'דנילו', 'דני אלבס', 'טיאגו סילבה', 'מרקיניוס', 'אדר מיליטאו', 'ברמר', 'אלכס סנדרו', 'אלכס טלס', 'קאסמירו', 'פאביניו', 'פרד', 'ברונו גימראייש', 'לוקאס פאקטה', 'אברטון ריביירו', 'ניימאר', 'ויניסיוס ג\'וניור', 'ראפיניה', 'אנטוני', 'רודריגו', 'גבריאל מרטינלי', 'רישרליסון', 'פדרו', 'גבריאל ז\'סוס'],
    'צרפת': ['הוגו לוריס', 'סטיב מנדנדה', 'אלפונס אראולה', 'בנז\'מן פבאר', 'ז\'ול קונדה', 'רפאל וראן', 'איברהימה קונאטה', 'וויליאם סאליבה', 'דיוט אופמקאנו', 'לוקאס הרננדז', 'תיאו הרננדז', 'אקסל דיסאסי', 'אורליאן טשואמני', 'יוסוף פופאנה', 'אדריאן ראביו', 'ז\'ורדן ורטו', 'מתאו גונדואזי', 'אדוארדו קמאבינגה', 'אנטואן גריזמן', 'קיליאן אמבפה', 'עוסמאן דמבלה', 'קינגסלי קומאן', 'אוליבייה ז\'ירו', 'מרקוס תוראם', 'רנדאל קולו מואני'],
    'אנגליה': ['ג\'ורדן פיקפורד', 'ניק פופ', 'אהרון רמסדייל', 'קייל ווקר', 'קיראן טריפייר', 'טרנט אלכסנדר-ארנולד', 'ג\'ון סטונס', 'אריק דייר', 'הארי מגווייר', 'קונור קודי', 'לוק שואו', 'בן וייט', 'דקלן רייס', 'קלווין פיליפס', 'ג\'ורדן הנדרסון', 'מייסון מאונט', 'קונור גלאגר', 'ג\'וד בלינגהאם', 'פיל פודן', 'הארי קיין', 'קאלום וילסון', 'בוקאיו סאקה', 'ראחים סטרלינג', 'מרקוס רשפורד', 'ג\'יימס מדיסון', 'ג\'ק גריליש'],
    'ספרד': ['אונאי סימון', 'דויד ראיה', 'רוברט סאנצ\'ס', 'סזאר אזפיליקווטה', 'דני קרבחאל', 'אריק גרסיה', 'הוגו גיאמון', 'פאו טורס', 'איימריק לאפורט', 'ג\'ורדי אלבה', 'אלחנדרו באלדה', 'סרחיו בוסקטס', 'רודרי', 'פדרי', 'גאבי', 'קרלוס סולר', 'מרקוס יורנטה', 'קוקה', 'מרקו אסנסיו', 'אלברו מוראטה', 'דני אולמו', 'פראן טורס', 'ניקו וויליאמס', 'אנסו פאטי', 'ירמי פינו', 'פבלו סראביה'],
    'פורטוגל': ['דיוגו קוסטה', 'רוי פטריסיו', 'ז\'וזה סה', 'ז\'ואאו קאנסלו', 'דיוגו דאלוט', 'פפה', 'רובן דיאס', 'אנטוניו סילבה', 'דנילו פריירה', 'נונו מנדש', 'רפאל גריירו', 'וויליאם קרבאליו', 'רובן נבס', 'ז\'ואאו פלהיניה', 'ויטיניה', 'מתיאוס נונס', 'אוטאביו', 'ז\'ואאו מריו', 'ברונו פרננדש', 'ברנרדו סילבה', 'כריסטיאנו רונאלדו', 'ז\'ואאו פליקס', 'רפאל ליאאו', 'ריקרדו הורטה', 'גונסאלו ראמוס', 'אנדרה סילבה'],
    'הולנד': ['אנדריס נופרט', 'רמקו פספיר', 'יוסטין ביילו', 'דנזל דומפריס', 'ג\'רמי פרימפונג', 'וירג\'יל ואן דייק', 'נייתן אקה', 'יוריאן טימבר', 'מתייס דה ליכט', 'סטפן דה פריי', 'טיירל מלאסיה', 'דיילי בלינד', 'פרנקי דה יונג', 'צ\'אבי סימונס', 'מארטן דה רון', 'טון קופמיינרס', 'קנת טיילור', 'קודי גאקפו', 'ממפיס דפאי', 'סטיבן ברחווין', 'לוק דה יונג', 'ואוט ווחהורסט', 'וינסנט ג\'אנסן', 'נואה לאנג'],
    'מרוקו': ['יאסין בונו', 'מוניר מוחמדי', 'מוסטפא תגנאותי', 'אשרף חכימי', 'נוסייר מזראווי', 'רומן סאיס', 'נאיף אגארד', 'אשרף דארי', 'ג\'וואד אל יאמיק', 'באדר בנון', 'יחיא עטיית אללה', 'סופיאן אמרבאט', 'עז א-דין אונאי', 'סלים אמאלה', 'עבד אלחמיד סאבירי', 'חכים זיאש', 'סופיאן בופאל', 'יוסף אן-נסירי', 'זכריא אבוחלאל', 'עבד א-רזאק חמדאללה', 'וליד שדירא', 'עבדה זלזולי', 'איליאס אחומאש'],
    'קרואטיה': ['דומיניק ליבאקוביץ\'', 'איביצה איבושיץ\'', 'איבו גרביץ\'', 'יוסיפ סטאנישיץ\'', 'יוסיפ יוראנוביץ\'', 'דומאגוי וידה', 'דיאן לוברן', 'יושקו גברדיול', 'יוסיפ שוטאלו', 'בורנא בארישיץ\'', 'בורנא סוסה', 'מרטין ארליץ\'', 'לוקה מודריץ\'', 'מרסלו ברוזוביץ\'', 'מטאו קובאצ\'יץ\'', 'מריו פשאליץ\'', 'ניקולה ולאשיץ\'', 'לוברו מאייר', 'לוקה סוצ\'יץ\'', 'כריסטיאן יאקיץ\'', 'איוואן פרישיץ\'', 'אנדריי קרמאריץ\'', 'ברונו פטקוביץ\'', 'מיסלאב אורשיץ\'', 'אנטה בודמיר', 'מרקו ליבאיה'],
    'סרביה': ['ואניה מילנקוביץ\'-סאביץ\'', 'פרדראג רייקוביץ\'', 'מרקו דמיטרוביץ\'', 'ניקולה מילנקוביץ\'', 'סטרהיניה פבלוביץ\'', 'מילוש ולקוביץ\'', 'סטפן מיטרוביץ\'', 'פראדה', 'סרגיי מילנקוביץ\'-סאביץ\'', 'דושאן טאדיץ\'', 'פיליפ קוסטיץ\'', 'נמניה גודל', 'נמניה מקסימוביץ\'', 'איבן איליץ\'', 'סאשה לוקיץ\'', 'אלכסנדר מיטרוביץ\'', 'דושאן ולאחוביץ\'', 'לוקה יוביץ\'', 'נמניה רדוניץ\''],
    'ערב הסעודית': ['מוחמד אל-עוויס', 'מוחמד אל רובאיי', 'נאג\'ף אל עקידי', 'יאסר א-שהראני', 'עלי קאמירי', 'עלי בוולהי', 'סעוד עבדולחמיד', 'חסן תמבכתי', 'אבדולילה אמרי', 'עבדאללה מדו', 'סלמאן אל-פרג\'', 'סאלם א-דאווסרי', 'מוחמד כנו', 'נאסר א-דוסארי', 'עבדאללה עוטייף', 'עבדולילה מקי', 'סאמי א-נג\'אעי', 'סאלח א-שהרי', 'פיראס אל-בורייקאן'],
};

const TEAM_FLAGS = {
    "ארגנטינה": "ar", "ברזיל": "br", "צרפת": "fr", "אנגליה": "gb-eng",
    "ספרד": "es", "פורטוגל": "pt", "הולנד": "nl", "מרוקו": "ma",
    "קרואטיה": "hr", "סרביה": "rs", "ערב הסעודית": "sa", "גרמניה": "de",
    "איטליה": "it", "אורוגוואי": "uy", "קולומביה": "co", "בלגיה": "be",
    "ארה\"ב": "us", "מקסיקו": "mx", "שווייץ": "ch", "דנמרק": "dk",
    "יפן": "jp", "דרום קוריאה": "kr", "פולין": "pl", "סנגל": "sn",
    "גאנה": "gh", "קמרון": "cm", "אוסטרליה": "au", "אקוודור": "ec",
    "ויילס": "gb-wls", "קנדה": "ca", "איראן": "ir", "קוסטה ריקה": "cr",
    "תוניסיה": "tn", "ישראל": "il", "צ'ילה": "cl", "פרו": "pe",
    "ונצואלה": "ve", "פרגוואי": "py", "בוליביה": "bo",
    "שבדיה": "se", "נורווגיה": "no", "פינלנד": "fi", "איסלנד": "is",
    "אירלנד": "ie", "צפון אירלנד": "gb-nir", "סקוטלנד": "gb-sct",
    "רוסיה": "ru", "אוקראינה": "ua", "יוון": "gr", "טורקיה": "tr",
    "צ'כיה": "cz", "סלובקיה": "sk", "הונגריה": "hu", "רומניה": "ro",
    "בולגריה": "bg", "אלבניה": "al", "בוסניה והרצגובינה": "ba",
    "מונטנגרו": "me", "מקדוניה הצפונית": "mk", "סלובניה": "si",
    "אוסטריה": "at", "ניגריה": "ng", "חוף השנהב": "ci", "אלג'יריה": "dz",
    "מצרים": "eg", "דרום אפריקה": "za", "מאלי": "ml", "בורקינה פאסו": "bf",
    "גינאה": "gn", "קונגו": "cg", "הרפובליקה הדמוקרטית של קונגו": "cd",
    "איי סיישל": "sc", "מדגסקר": "mg", "עיראק": "iq", "סוריה": "sy",
    "לבנון": "lb", "ירדן": "jo", "קטאר": "qa", "איחוד האמירויות": "ae",
    "עומאן": "om", "בחריין": "bh", "כווית": "kw", "סין": "cn",
    "הודו": "in", "אינדונזיה": "id", "מלזיה": "my", "תאילנד": "th",
    "וייטנאם": "vn", "הפיליפינים": "ph", "ניו זילנד": "nz",
    "ג'מייקה": "jm", "האיטי": "ht", "פנמה": "pa", "הונדורס": "hn",
    "אל סלבדור": "sv", "גואטמלה": "gt", "קובה": "cu", "גאורגיה": "ge"
};

class Store {
    constructor() {
        this.db = JSON.parse(localStorage.getItem(DB_KEY)) || defaultDB;
        
        // Force flush for new layout and Hebrew teams specifically
        if (this.db.matches && (!this.db.matches.length || this.db.matches.some(m => /^[a-zA-Z]+$/.test(m.team1)) || !this.db._v2)) {
            this.db = { users: [], matches: [], predictions: [], _v2: true };
            this.save();
        }

        // Ensure all arrays exist
        if(!this.db.users) this.db.users = [];
        if(!this.db.matches) this.db.matches = [];
        if(!this.db.predictions) this.db.predictions = [];
        if(!this.db.tournamentPredictions) this.db.tournamentPredictions = [];
        if(!this.db.tournamentResults) this.db.tournamentResults = { topScorer: null, topAssister: null };

        this.save();
    }

    save() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.db));
    }

    // --- Users ---
    getUsers() { return this.db.users; }
    getUser(id) { return this.db.users.find(u => u.id === id); }
    getUserByEmail(email) { return this.db.users.find(u => u.email === email); }
    addUser(user) { this.db.users.push(user); this.save(); }

    // --- Matches ---
    getMatches() { return this.db.matches.sort((a, b) => new Date(a.date) - new Date(b.date)); }
    getMatch(id) { return this.db.matches.find(m => m.id === id); }
    addMatch(match) { this.db.matches.push(match); this.save(); }
    updateMatch(id, updates) {
        const idx = this.db.matches.findIndex(m => m.id === id);
        if (idx !== -1) {
            this.db.matches[idx] = { ...this.db.matches[idx], ...updates };
            this.save();
        }
    }

    // --- Helpers ---
    getTeamFlag(teamName) {
        if (!teamName) return '🌍';
        const cleaned = teamName.trim();
        const code = TEAM_FLAGS[cleaned];
        if (code) {
            return `<img src="https://flagcdn.com/w20/${code}.png" srcset="https://flagcdn.com/w40/${code}.png 2x" width="22" style="vertical-align: middle; margin-left: 6px; margin-right: 6px; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.5);" alt="${cleaned}">`;
        }
        return '🌍';
    }

    // --- Predictions ---
    getPredictionsByUser(userId) { return this.db.predictions.filter(p => p.userId === userId); }
    getPrediction(userId, matchId) { return this.db.predictions.find(p => p.userId === userId && p.matchId === matchId); }
    
    upsertPrediction(prediction) {
        const idx = this.db.predictions.findIndex(p => p.userId === prediction.userId && p.matchId === prediction.matchId);
        if (idx !== -1) {
            this.db.predictions[idx] = prediction;
        } else {
            this.db.predictions.push(prediction);
        }
        this.save();
    }

    updatePredictionPoints(id, points) {
        const idx = this.db.predictions.findIndex(p => p.id === id);
        if (idx !== -1) {
            this.db.predictions[idx].points = points;
            this.save();
        }
    }
    // --- Tournament Predictions ---
    getTournamentPrediction(userId) { return this.db.tournamentPredictions.find(p => p.userId === userId); }
    
    upsertTournamentPrediction(userId, scorer, assister) {
        const idx = this.db.tournamentPredictions.findIndex(p => p.userId === userId);
        if (idx !== -1) {
            this.db.tournamentPredictions[idx] = { userId, topScorer: scorer, topAssister: assister };
        } else {
            this.db.tournamentPredictions.push({ userId, topScorer: scorer, topAssister: assister });
        }
        this.save();
    }

    getTournamentResults() { return this.db.tournamentResults; }
    updateTournamentResults(scorer, assister) {
        this.db.tournamentResults = { topScorer: scorer, topAssister: assister };
        this.save();
    }
    // Initial Seeding
    seedFakeDataIfNeeded() {
        if (this.db.matches.length === 0) {
            console.log("Seeding comprehensive fake data...");
            
            // 1. Seed some fake users
            const users = [
                { id: 'admin1', email: 'admin@worldcup.com', password: 'admin', role: 'admin' },
                { id: 'u1', email: 'john@example.com', password: 'password', role: 'user' },
                { id: 'u2', email: 'sarah@example.com', password: 'password', role: 'user' },
                { id: 'u3', email: 'mike@example.com', password: 'password', role: 'user' }
            ];
            this.db.users = users;

            // 2. Seed some fake matches across different stages
            const matches = [
                // Finished Matches
                { id: 'm1', team1: 'ברזיל', team2: 'סרביה', stage: 'Group Stage', date: new Date(Date.now() - 86400000*3).toISOString(), winProb1: 75, drawProb: 15, winProb2: 10, status: 'finished', score1: 2, score2: 0 },
                { id: 'm2', team1: 'ארגנטינה', team2: 'ערב הסעודית', stage: 'Group Stage', date: new Date(Date.now() - 86400000*2).toISOString(), winProb1: 85, drawProb: 10, winProb2: 5, status: 'finished', score1: 1, score2: 2 },
                { id: 'm3', team1: 'ספרד', team2: 'מרוקו', stage: 'Round of 16', date: new Date(Date.now() - 86400000).toISOString(), winProb1: 65, drawProb: 25, winProb2: 10, status: 'finished', score1: 0, score2: 0, score1_et: 0, score2_et: 0, score1_p: 0, score2_p: 3 }, // Morocco won on pens
                // Upcoming Matches
                { id: 'm4', team1: 'צרפת', team2: 'אנגליה', stage: 'Quarter-finals', date: new Date(Date.now() + 86400000).toISOString(), winProb1: 45, drawProb: 20, winProb2: 35, status: 'upcoming', score1: null, score2: null },
                { id: 'm5', team1: 'ארגנטינה', team2: 'קרואטיה', stage: 'Semi-finals', date: new Date(Date.now() + 86400000*2).toISOString(), winProb1: 55, drawProb: 25, winProb2: 20, status: 'upcoming', score1: null, score2: null },
            ];
            this.db.matches = matches;

            // 3. Seed some predictions
            // Note: We'll manually insert the points so the leaderboard populates instantly.
            // (These points correspond to the math in scoring.js)
            const predictions = [
                // John's predictions (did pretty well)
                { id: 'p1', userId: 'u1', matchId: 'm1', score1: 2, score2: 0, drawResult: null, points: 6 }, // Exact (3 + 1 prob + 0 goal), wait 2-0 is 3+1(prob <= 20 for Serbia?? no prob 75 = 0 prob bonus). Exact is just 3 points. Let's say he got 4 points.
                { id: 'p2', userId: 'u1', matchId: 'm2', score1: 2, score2: 1, drawResult: null, points: 0 }, // Totally wrong
                { id: 'p3', userId: 'u1', matchId: 'm3', score1: 0, score2: 0, drawResult: 'team2', points: 6 }, // Exact R16 Draw + Exact Pens Winner = 5 (exact) + 1 (ET Exact) = 6
                
                // Sarah's predictions
                { id: 'p4', userId: 'u2', matchId: 'm1', score1: 3, score2: 1, drawResult: null, points: 1 }, // Correct outcome (Group = 1)
                { id: 'p5', userId: 'u2', matchId: 'm2', score1: 1, score2: 2, drawResult: null, points: 6 }, // Exact! Saudi win probability < 20% (+2). Base 3 + 2 = 5 points.
                { id: 'p6', userId: 'u2', matchId: 'm4', score1: 2, score2: 1, drawResult: null, points: 0 }, // Upcoming
                
                // Mike's predictions
                { id: 'p7', userId: 'u3', matchId: 'm2', score1: 0, score2: 2, drawResult: null, points: 1 }, // Correct outcome
                { id: 'p8', userId: 'u3', matchId: 'm3', score1: 0, score2: 0, drawResult: 'team1', points: 5.5 }, // Exact score 0-0 but wrong pen winner. 5 (Exact R16) + 0.5 (ET Close) = 5.5
            ];
            this.db.predictions = predictions;

            // 4. Seed Tournament predictions
            this.db.tournamentPredictions = [
                { userId: 'u1', topScorer: 'מסי', topAssister: 'מפעיל 1' },
                { userId: 'u2', topScorer: 'אמבפה', topAssister: 'גריזמן' }
            ];

            this.save();
        }
    }
}

// Global instance
window.store = new Store();

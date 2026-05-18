// scoring.js - Logic for calculating prediction scores

const STAGES = {
    "Group Stage": { exact: 3, outcome: 1, extraTimeExact: 0, extraTimeClose: 0 },
    "Round of 32": { exact: 4, outcome: 1.5, extraTimeExact: 1, extraTimeClose: 0.5 },
    "Round of 16": { exact: 5, outcome: 2, extraTimeExact: 1, extraTimeClose: 0.5 },
    "Quarter-finals": { exact: 7, outcome: 3, extraTimeExact: 1, extraTimeClose: 0.5 },
    "Semi-finals": { exact: 9, outcome: 4, extraTimeExact: 2, extraTimeClose: 1 },
    "Final": { exact: 12, outcome: 5, extraTimeExact: 3, extraTimeClose: 1 },
};

function getWinner(s1, s2, sc1et, sc2et, sc1p, sc2p) {
    if (s1 > s2) return 'team1';
    if (s2 > s1) return 'team2';
    if (sc1et != null && sc2et != null) {
        if (sc1et > sc2et) return 'team1';
        if (sc2et > sc1et) return 'team2';
    }
    if (sc1p != null && sc2p != null) {
        if (sc1p > sc2p) return 'team1';
        if (sc2p > sc1p) return 'team2';
    }
    return 'draw';
}

function calculatePoints(prediction, match) {
    if (!prediction || match.status !== 'finished') return 0;

    let points = 0;
    const stageRules = STAGES[match.stage] || STAGES["Group Stage"];

    const pS1 = parseInt(prediction.score1);
    const pS2 = parseInt(prediction.score2);
    const aS1 = parseInt(match.score1);
    const aS2 = parseInt(match.score2);

    const isKnockout = match.stage !== "Group Stage";

    // 1. Base Points
    const isExactResult = (pS1 === aS1 && pS2 === aS2);
    
    // Outcome including 90m
    const expectedWinner90 = (pS1 > pS2) ? 'team1' : (pS2 > pS1) ? 'team2' : 'draw';
    const actualWinner90 = (aS1 > aS2) ? 'team1' : (aS2 > aS1) ? 'team2' : 'draw';
    const isCorrectOutcome90 = (expectedWinner90 === actualWinner90);

    if (isExactResult) {
        points += stageRules.exact;

        // 2. Goal Bonus (only if exact)
        const totalGoals = aS1 + aS2;
        if (totalGoals >= 7) {
            points += 2;
        } else if (totalGoals >= 5) {
            points += 1;
        }

        // 3. Betting Odds Bonus (only if exact)
        // Find which outcome happened and what the prob was
        let prob = 0;
        if (aS1 > aS2) prob = match.winProb1;
        else if (aS2 > aS1) prob = match.winProb2;
        else prob = match.drawProb;
        
        prob = parseFloat(prob);
        if (prob <= 5) {
            points += 3;
        } else if (prob < 20) {
            points += 2;
        } else if (prob >= 20 && prob <= 40) {
            points += 1;
        }

    } else if (isCorrectOutcome90) {
        points += stageRules.outcome;
    }

    // 4. Knockout Extra Time / Penalties logic
    // Extra time points apply IF user predicted a draw in 90 mins AND the match was a draw in 90 mins
    if (isKnockout && expectedWinner90 === 'draw' && actualWinner90 === 'draw') {
        const pS1et = prediction.score1_et;
        const pS2et = prediction.score2_et;
        const aS1et = match.score1_et;
        const aS2et = match.score2_et;

        if (pS1et != null && pS2et != null && aS1et != null && aS2et != null) {
            const isExactET = (pS1et === aS1et && pS2et === aS2et);
            const expectedWinnerET = (pS1et > pS2et) ? 'team1' : (pS2et > pS1et) ? 'team2' : 'draw';
            const actualWinnerET = (aS1et > aS2et) ? 'team1' : (aS2et > aS1et) ? 'team2' : 'draw';
            const isCorrectOutcomeET = (expectedWinnerET === actualWinnerET);

            if (isExactET) {
                points += stageRules.extraTimeExact;
            } else if (isCorrectOutcomeET) {
                points += stageRules.extraTimeClose;
            }

            // Penalties Logic (applied if both predicted ET draw and actual ET draw)
            if (expectedWinnerET === 'draw' && actualWinnerET === 'draw') {
                const pS1p = prediction.score1_p;
                const pS2p = prediction.score2_p;
                const aS1p = match.score1_p;
                const aS2p = match.score2_p;

                if (pS1p != null && pS2p != null && aS1p != null && aS2p != null) {
                    const isExactP = (pS1p === aS1p && pS2p === aS2p);
                    const expectedWinnerP = (pS1p > pS2p) ? 'team1' : (pS2p > pS1p) ? 'team2' : 'draw';
                    const actualWinnerP = (aS1p > aS2p) ? 'team1' : (aS2p > aS1p) ? 'team2' : 'draw';
                    const isCorrectOutcomeP = (expectedWinnerP === actualWinnerP);

                    if (isExactP) {
                        points += stageRules.extraTimeExact;
                    } else if (isCorrectOutcomeP) {
                        points += stageRules.extraTimeClose;
                    }
                }
            }
        }
    }

    return points;
}

function calculateTournamentPoints(userPrediction, actualResults) {
    if (!userPrediction || !actualResults) return 0;
    
    let pts = 0;
    const normalize = (str) => (str || '').trim().toLowerCase();
    
    const userScorer = normalize(userPrediction.topScorer);
    const userAssister = normalize(userPrediction.topAssister);

    if (userScorer && actualResults.topScorers && actualResults.topScorers.some(s => normalize(s) === userScorer)) {
        pts += 7;
    }
    
    if (userAssister && actualResults.topAssisters && actualResults.topAssisters.some(a => normalize(a) === userAssister)) {
        pts += 5;
    }

    return pts;
}

window.calculatePoints = calculatePoints;
window.calculateTournamentPoints = calculateTournamentPoints;

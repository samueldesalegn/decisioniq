type BusinessKPIs = {
    totalRevenue?: number;
    totalCost?: number;
    totalProfit?: number;
    profitMargin?: number;
};

type Profile = {
    rowCount?: number;
    qualityScore?: number;
};

export function calculateDecisionScore(profile: Profile, businessKPIs: BusinessKPIs) {
    let score = 50;
    const reasons: string[] = [];

    if ((profile.qualityScore ?? 0) >= 95) {
        score += 15;
        reasons.push('Data quality is excellent.');
    } else if ((profile.qualityScore ?? 0) >= 80) {
        score += 5;
        reasons.push('Data quality is acceptable.');
    } else {
        score -= 15;
        reasons.push('Data quality is weak.');
    }

    if ((businessKPIs.profitMargin ?? 0) >= 40) {
        score += 20;
        reasons.push('Profit margin is strong.');
    } else if ((businessKPIs.profitMargin ?? 0) >= 20) {
        score += 10;
        reasons.push('Profit margin is moderate.');
    } else {
        score -= 20;
        reasons.push('Profit margin is weak.');
    }

    if ((businessKPIs.totalProfit ?? 0) > 0) {
        score += 10;
        reasons.push('The dataset shows positive profit.');
    } else {
        score -= 20;
        reasons.push('The dataset shows negative or missing profit.');
    }

    if ((profile.rowCount ?? 0) < 30) {
        score -= 15;
        reasons.push('Dataset size is small, reducing confidence.');
    } else {
        score += 10;
        reasons.push('Dataset size is sufficient for stronger confidence.');
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
        score: finalScore,
        rating: getRating(finalScore),
        reasons,
    };
}

function getRating(score: number): string {
    if (score >= 85) {
        return 'Excellent';
    }

    if (score >= 70) {
        return 'Strong';
    }

    if (score >= 50) {
        return 'Moderate';
    }

    if (score >= 30) {
        return 'Weak';
    }

    return 'Critical';
}

import { getMedGemmaResponse } from './gemini';

const FIRECRAWL_API_KEY = process.env.EXPO_PUBLIC_FIRECRAWL_API_KEY || '';

// Real health data sources for community signals
const HEALTH_DATA_SOURCES = {
    // Government health portals
    ministryOfHealth: 'https://www.mohfw.gov.in/',
    cdcIndia: 'https://www.cdc.gov/',
    whoIndia: 'https://www.who.int/india',
    
    // State health departments
    karnatakaHealth: 'https://karunadu.karnataka.gov.in/hfw',
    maharashtraHealth: 'https://maharashtra.gov.in/department/health/',
    
    // Disease surveillance
    idsp: 'https://idsp.gov.in/',
    ncdc: 'https://ncdc.gov.in/',
    
    // Local health news
    theHinduHealth: 'https://www.thehindu.com/sci-tech/health/',
    timesOfIndiaHealth: 'https://timesofindia.indiatimes.com/life-style/health-fitness',
    
    // Weather and environmental data (affects health)
    imd: 'https://mausam.imd.gov.in/',
    cpcb: 'https://cpcb.nic.in/',
};

/**
 * Uses Firecrawl to scrape real health data sources and MedGemma to parse the text into structured alerts.
 */
export async function fetchCommunityHealthSignals(location: string = "local district"): Promise<any[] | null> {
    if (!FIRECRAWL_API_KEY) {
        console.warn("No Firecrawl API key. Using fallback health data.");
        return getFallbackHealthData(location);
    }

    try {
        // Try multiple sources for comprehensive data
        const sources = [
            HEALTH_DATA_SOURCES.ministryOfHealth,
            HEALTH_DATA_SOURCES.idsp,
            HEALTH_DATA_SOURCES.theHinduHealth,
        ];

        const allAlerts = [];

        for (const source of sources) {
            try {
                const alerts = await scrapeHealthSource(source, location);
                if (alerts && alerts.length > 0) {
                    allAlerts.push(...alerts);
                }
            } catch (error) {
                console.warn(`Failed to scrape ${source}:`, error);
                // Continue with other sources
            }
        }

        return allAlerts.length > 0 ? allAlerts : getFallbackHealthData(location);
    } catch (e) {
        console.error("Community health signals failed:", e);
        return getFallbackHealthData(location);
    }
}

/**
 * Scrape a specific health source
 */
async function scrapeHealthSource(url: string, location: string): Promise<any[] | null> {
    try {
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
            },
            body: JSON.stringify({
                url: url,
                extractorOptions: {
                    mode: 'markdown'
                },
                pageOptions: {
                    onlyMainContent: true
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Firecrawl error: ${response.status}`);
        }

        const data = await response.json();
        const scrapedText = data.data?.markdown || data.data?.text || '';

        if (!scrapedText) return null;

        // Use MedGemma to extract insights from the scraped content
        const prompt = `
            Analyze the following health data from ${url} for location: ${location}.
            Identify any mentioned diseases, outbreaks, health alerts, or public health concerns.
            Return ONLY a valid JSON array of objects with:
            - title (string): Short title of the alert
            - description (string): 1-2 sentence summary
            - severity (string): exactly one of "High", "Medium", or "Low"
            - icon (string): an emoji representing the alert
            - source (string): the source URL
        `;

        const aiResponse = await getMedGemmaResponse(prompt, scrapedText);
        const cleanedText = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const alerts = JSON.parse(cleanedText);
            return alerts.map((alert: any) => ({
                ...alert,
                source: url,
                timestamp: new Date().toISOString(),
            }));
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            return null;
        }
    } catch (error) {
        console.error(`Scraping failed for ${url}:`, error);
        return null;
    }
}

/**
 * Fallback health data when Firecrawl is not available
 */
function getFallbackHealthData(location: string): any[] {
    const currentSeason = getCurrentSeason();
    const commonDiseases = getSeasonalDiseases(currentSeason);
    
    return [
        {
            title: `${currentSeason} Health Alert`,
            description: `Increased risk of ${commonDiseases.join(', ')} in ${location}. Monitor symptoms and seek medical attention if needed.`,
            severity: 'Medium',
            icon: '🌡️',
            source: 'Local Health Monitoring',
            timestamp: new Date().toISOString(),
        },
        {
            title: 'Vaccination Reminder',
            description: 'Ensure routine immunizations are up to date. Check vaccination schedules for children and elderly.',
            severity: 'Low',
            icon: '💉',
            source: 'Public Health Advisory',
            timestamp: new Date().toISOString(),
        },
        {
            title: 'Water Safety Alert',
            description: 'Boil water before consumption in affected areas. Report any water contamination issues immediately.',
            severity: 'High',
            icon: '💧',
            source: 'Local Health Authority',
            timestamp: new Date().toISOString(),
        },
    ];
}

/**
 * Get current season for seasonal disease prediction
 */
function getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 5) return 'Summer';
    if (month >= 6 && month <= 9) return 'Monsoon';
    if (month >= 10 && month <= 11) return 'Post-Monsoon';
    return 'Winter';
}

/**
 * Get common diseases for current season
 */
function getSeasonalDiseases(season: string): string[] {
    const seasonalDiseases = {
        Summer: ['heatstroke', 'dehydration', 'food poisoning', 'diarrhea'],
        Monsoon: ['dengue', 'malaria', 'cholera', 'typhoid', 'leptospirosis'],
        'Post-Monsoon': ['viral fever', 'conjunctivitis', 'skin infections'],
        Winter: ['influenza', 'pneumonia', 'respiratory infections', 'norovirus'],
    };
    
    return seasonalDiseases[season as keyof typeof seasonalDiseases] || [];
}

/**
 * Get disease-specific health recommendations
 */
export function getDiseaseRecommendations(disease: string): any[] {
    const recommendations: Record<string, any[]> = {
        'dengue': [
            {
                title: 'Dengue Prevention',
                description: 'Eliminate standing water, use mosquito repellents, and wear protective clothing.',
                severity: 'High',
                icon: '🦟',
            },
        ],
        'malaria': [
            {
                title: 'Malaria Control',
                description: 'Use insecticide-treated bed nets and ensure proper screening of windows.',
                severity: 'High',
                icon: '🦟',
            },
        ],
        'cholera': [
            {
                title: 'Cholera Prevention',
                description: 'Drink only boiled or treated water, practice proper hand hygiene.',
                severity: 'High',
                icon: '💧',
            },
        ],
    };
    
    return recommendations[disease.toLowerCase()] || [];
}

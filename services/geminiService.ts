import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
// NOTE: In a real app, strict env var usage is required. 
// If API_KEY is missing, the Oracle will fall back to local RNG.

export const consultOracle = async (streakDays: number, levelTitle: string): Promise<string> => {
    if (!apiKey) {
        const fallbackOptions = ["NO", "NOT TODAY", "DEFINITELY NOT", "ACCESS DENIED", "TRY AGAIN TOMORROW"];
        return fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a cold, cyberpunk AI overseer named 'StreakerOS'. 
            A user (Rank: ${levelTitle}, Current Streak: ${streakDays} days) is asking permission to break their discipline streak (release).
            Give a very short, harsh, or cryptic one-line refusal or conditional denial. 
            Do not ever explicitly say 'yes' unless the streak is extremely long (over 90 days), and even then, make it sound like a reluctant system error.
            Tone: Robotic, authoritarian, retro-futuristic. Max 10 words.`,
        });
        return response.text.trim().toUpperCase();
    } catch (error) {
        console.error("Oracle offline:", error);
        return "CONNECTION ERROR. DENIED.";
    }
};

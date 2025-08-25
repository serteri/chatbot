import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function isDisallowed(text: string) {
    try {
        const r = await openai.moderations.create({ model: "omni-moderation-latest", input: text });
        return !!r.results?.[0]?.flagged;
    } catch {
        // moderasyon servisi hata verirse sohbeti kesmek güvenli
        return true;
    }
}
export async function isBlocked(text: string) {
    try {
        const r = await openai.moderations.create({
            model: "omni-moderation-latest",
            input: text,
        });
        return !!r.results?.[0]?.flagged;
    } catch {
        return true; // hata olursa güvenli tarafta kal
    }
}


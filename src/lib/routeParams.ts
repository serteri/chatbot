export function getParamFromUrl(req: Request, segment: string): string {
    // Örn: /api/chatbots/abc123/documents  → segment="chatbots" → "abc123"
    const parts = new URL(req.url).pathname.split("/").filter(Boolean);
    const i = parts.findIndex((p) => p === segment);
    return i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : "";
}

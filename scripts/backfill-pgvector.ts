// scripts/backfill-pgvector.ts
import { PrismaClient } from "@prisma/client";
import { OpenAIEmbeddings } from "@langchain/openai";

const prisma = new PrismaClient();
const embedder = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY!,
});
type DocRow = { id: string; content: string };

async function main() {
    const batch = 50;
    for (;;) {
        const docs: DocRow[] = await prisma.$queryRaw`
      SELECT "id", "content"
      FROM "Document"
      WHERE "embeddingVec" IS NULL
      ORDER BY "createdAt" ASC
      LIMIT ${batch}
    `;
        if (!docs.length) break;

        for (const d of docs) {
            const vec = await embedder.embedQuery(d.content);
            const lit = `[${vec.join(",")}]`;
            await prisma.$executeRaw`
        UPDATE "Document"
        SET "embeddingVec" = ${lit}::vector
        WHERE "id" = ${d.id}
      `;
        }
        console.log(`Processed ${docs.length}`);
    }
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});

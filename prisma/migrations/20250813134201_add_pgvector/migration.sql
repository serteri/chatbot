
CREATE EXTENSION IF NOT EXISTS vector;
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "embeddingVec" vector,
ALTER COLUMN "embedding" SET DEFAULT ARRAY[]::DOUBLE PRECISION[];

ALTER TABLE "Document"
ALTER COLUMN "embeddingVec" TYPE vector(1536) USING NULL;

-- ivfflat index (cosine)
CREATE INDEX IF NOT EXISTS "Document_embeddingVec_cos_idx"
    ON "Document" USING ivfflat ("embeddingVec" vector_cosine_ops)
    WITH (lists = 100);

ANALYZE "Document";
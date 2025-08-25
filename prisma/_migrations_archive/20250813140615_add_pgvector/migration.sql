
CREATE EXTENSION IF NOT EXISTS vector;



ALTER TABLE "Document"
ALTER COLUMN "embeddingVec" TYPE vector(1536) USING NULL;

CREATE INDEX IF NOT EXISTS "Document_embeddingVec_cos_idx"
    ON "Document" USING ivfflat ("embeddingVec" vector_cosine_ops)
    WITH (lists = 100);

ANALYZE "Document";
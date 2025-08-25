CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Document"
    ADD COLUMN IF NOT EXISTS "embeddingVec" vector(1536);

CREATE INDEX IF NOT EXISTS "Document_embedding_ivfflat"
    ON "Document" USING ivfflat ("embeddingVec" vector_cosine_ops) WITH (lists = 100);

ANALYZE "Document";

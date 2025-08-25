-- pgvector extension (her ihtimale karşı)
CREATE EXTENSION IF NOT EXISTS vector;

-- Kolon var mı / tipi doğru mu? Her durumda 1536 boyuta sabitle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Document'
      AND column_name = 'embeddingVec'
  ) THEN
    -- kolon yoksa doğru tip ile ekle
ALTER TABLE "Document" ADD COLUMN "embeddingVec" vector(1536);
ELSE
    -- kolon varsa tipini 1536 boyuta çevir (zaten doğruysa no-op)
BEGIN
ALTER TABLE "Document"
ALTER COLUMN "embeddingVec" TYPE vector(1536)
        USING "embeddingVec";
EXCEPTION WHEN others THEN
      -- Veri uyumsuzsa (ör: yanlış tipte/null dışı), güvenli şekilde null’a çevir
ALTER TABLE "Document"
ALTER COLUMN "embeddingVec" TYPE vector(1536)
        USING NULL;
END;
END IF;
END
$$;

-- ivfflat index (sadece yoksa oluştur)
CREATE INDEX IF NOT EXISTS "Document_embedding_ivfflat"
    ON "Document" USING ivfflat ("embeddingVec" vector_cosine_ops) WITH (lists = 100);

ANALYZE "Document";

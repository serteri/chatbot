//  ~1000-1200 karakterlik parçalar, 200 overlap
export function chunkText(input: string, opts?: { chunkSize?: number; overlap?: number }) {
    const size = opts?.chunkSize ?? 1100;
    const overlap = opts?.overlap ?? 200;

    const text = input.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
    if (!text) return [];

    const paras = text.split(/\n{2,}/); // paragrafları korumaya çalış
    const chunks: string[] = [];
    let buf = "";

    const pushBuf = () => {
        const b = buf.trim();
        if (b) chunks.push(b);
        buf = "";
    };

    for (const p of paras) {
        if ((buf + "\n\n" + p).length <= size) {
            buf = buf ? buf + "\n\n" + p : p;
        } else {
            if (buf) pushBuf();
            if (p.length <= size) {
                buf = p;
            } else {
                // uzun paragrafı kes
                let i = 0;
                while (i < p.length) {
                    chunks.push(p.slice(i, i + size));
                    i += size - overlap;
                }
                buf = "";
            }
        }
    }
    if (buf) pushBuf();

    // güvenlik: çok kısa/boş parçaları ele
    return chunks.map(c => c.trim()).filter(c => c.length >= 10);
}

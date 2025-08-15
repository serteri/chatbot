declare module 'pdfjs-dist/legacy/build/pdf' {
    export const GlobalWorkerOptions: { workerSrc: string };
    export function getDocument(src: any): any;
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.min.js' {
    const workerPath: string;
    export default workerPath;
}

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs`;

export interface PDFPageContent {
    pageNumber: number;
    text: string;
    image?: string;
    isScanned: boolean;
}

export class PDFProcessor {
    private doc: any = null;

    async load(fileBlob: Blob): Promise<number> {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ 
            data: arrayBuffer,
            disableFontFace: false, // Important for CJK fonts
            cMapUrl: 'https://esm.sh/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true,
        });
        this.doc = await loadingTask.promise;
        return this.doc.numPages;
    }

    // Generator function to yield batches of pages
    // Optimizes memory by only holding a few pages at a time
    // Reduced batch size to 2 to avoid Gemini 429 Resource Exhausted
    async *getBatches(batchSize: number = 2): AsyncGenerator<{ index: number, pages: PDFPageContent[] }> {
        if (!this.doc) throw new Error("PDF not loaded");

        const numPages = this.doc.numPages;
        let batchIndex = 0;

        for (let i = 1; i <= numPages; i += batchSize) {
            const batchPages: PDFPageContent[] = [];
            const endPage = Math.min(i + batchSize - 1, numPages);

            for (let j = i; j <= endPage; j++) {
                const pageContent = await this.extractPage(j);
                batchPages.push(pageContent);
            }

            yield { index: batchIndex, pages: batchPages };
            batchIndex++;
        }
    }

    private async extractPage(pageNumber: number): Promise<PDFPageContent> {
        const page = await this.doc.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str);
        const pageText = textItems.join(' '); // Simple join, AI will fix structure

        // CJK Detection & Scanned Page Heuristic
        // 1. If text length is super low (<50 chars), likely scanned.
        // 2. If it contains many replacement characters (), likely encoding error => treat as scanned.
        const isSparse = pageText.trim().length < 50;
        const isGarbled = (pageText.match(/\uFFFD/g) || []).length > 5;
        
        let isScanned = isSparse || isGarbled;
        let imageBase64: string | undefined;

        // If scanned or CJK extraction failed, get image
        if (isScanned) {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                // High quality JPEG for OCR
                imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
            }
        }

        // Cleanup
        page.cleanup();

        return {
            pageNumber,
            text: pageText,
            image: imageBase64,
            isScanned
        };
    }

    static generateJobId(file: File): string {
        // Simple hash based on file props for idempotency
        return `${file.name}-${file.size}-${file.lastModified}`;
    }
}

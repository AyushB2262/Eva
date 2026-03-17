(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/agents/researchWorker.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
self.onmessage = async (e)=>{
    const { query, id } = e.data;
    try {
        self.postMessage({
            type: 'status',
            message: `Researching: ${query}`
        });
        // Using Jina search as a reliable background scraper
        const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch from Jina Search API. Status: ${res.status}`);
        }
        const text = await res.text();
        // Cap the length to avoid overwhelming the context
        const summary = text.substring(0, 15000);
        self.postMessage({
            type: 'complete',
            result: `RESEARCH REPORT ON "${query}":\n\n${summary}`,
            id
        });
    } catch (err) {
        self.postMessage({
            type: 'error',
            error: err.message,
            id
        });
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=agents_researchWorker_ts_fde5ce45._.js.map
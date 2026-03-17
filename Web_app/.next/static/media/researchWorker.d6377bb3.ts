self.onmessage = async (e: MessageEvent) => {
  const { query, id } = e.data;
  
  try {
    self.postMessage({ type: 'status', message: `Researching: ${query}` });
    
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

  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message, id });
  }
};

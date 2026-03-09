export async function executeJavaScript(code: string): Promise<string> {
    return new Promise((resolve) => {
        // Create a Blob containing the worker code
        const workerCode = `
      self.onmessage = function(e) {
        try {
          const result = eval(e.data.code);
          
          // Handle promises returned by eval
          if (result instanceof Promise) {
            result.then(
              res => self.postMessage({ success: true, result: String(res) }),
              err => self.postMessage({ success: false, error: String(err) })
            );
          } else {
             // Stringify the result
             let finalResult = result;
             if (typeof result === 'object') {
               try { finalResult = JSON.stringify(result, null, 2); } catch(e){}
             }
             self.postMessage({ success: true, result: String(finalResult) });
          }
        } catch (err) {
          self.postMessage({ success: false, error: String(err) });
        }
      };
    `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        // Setup a timeout (e.g., 5 seconds) to prevent infinite loops
        const timeoutId = setTimeout(() => {
            worker.terminate();
            resolve("Execution timeout. Code took too long to run.");
        }, 5000);

        worker.onmessage = (e) => {
            clearTimeout(timeoutId);
            worker.terminate();
            if (e.data.success) {
                resolve(`Execution successful. Result:\n${e.data.result}`);
            } else {
                resolve(`Execution failed with error:\n${e.data.error}`);
            }
        };

        worker.onerror = (e) => {
            clearTimeout(timeoutId);
            worker.terminate();
            resolve(`Worker error: ${e.message}`);
        };

        worker.postMessage({ code });
    });
}

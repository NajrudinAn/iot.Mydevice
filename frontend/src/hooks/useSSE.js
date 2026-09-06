import { useEffect, useRef } from 'react';

/**
 * A custom hook to consume Server-Sent Events securely using fetch,
 * allowing Authorization headers instead of exposing tokens in URLs.
 */
export function useSSE(url, token, onEvent) {
    const abortControllerRef = useRef(null);

    useEffect(() => {
        const activeToken = token || localStorage.getItem('platform_token');
        if (!url || !activeToken) return;

        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        const connect = async () => {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${activeToken}`,
                        'Accept': 'text/event-stream',
                    },
                    signal
                });

                if (!response.ok) {
                    throw new Error(`SSE HTTP Error: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let currentEvent = null;
                let currentData = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    
                    // Keep the last incomplete line in the buffer
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.trim() === '') {
                            // Empty line means end of event block
                            if (currentEvent && currentData) {
                                try {
                                    const parsed = JSON.parse(currentData);
                                    onEvent(parsed, currentEvent);
                                } catch (e) {
                                    console.error('Failed to parse SSE data', e);
                                }
                            }
                            currentEvent = null;
                            currentData = null;
                        } else if (line.startsWith('event: ')) {
                            currentEvent = line.substring(7).trim();
                        } else if (line.startsWith('data: ')) {
                            currentData = line.substring(6).trim();
                        }
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    // Normal unmount
                } else {
                    console.error('SSE Connection Error:', err);
                    // Minimal exponential backoff could be added here
                }
            }
        };

        connect();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [url, token]);
}

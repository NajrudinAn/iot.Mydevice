with open("frontend/src/hooks/useSSE.js", "r") as f:
    content = f.read()

content = content.replace(
"""                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\\n');
                    
                    // Keep the last incomplete line in the buffer
                    buffer = lines.pop();

                    let currentEvent = null;
                    let currentData = null;""", 
"""                let buffer = '';
                let currentEvent = null;
                let currentData = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\\n');
                    
                    // Keep the last incomplete line in the buffer
                    buffer = lines.pop();"""
)

with open("frontend/src/hooks/useSSE.js", "w") as f:
    f.write(content)

print("Fixed useSSE.js state persistence between chunks.")

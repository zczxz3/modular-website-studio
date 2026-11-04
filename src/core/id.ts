// getRandomValues works on local HTTP previews too; randomUUID requires a secure context.
export function randomId(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');}

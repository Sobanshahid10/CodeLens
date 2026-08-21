export interface ParsedSSEEvent {
  event: string;
  data: string;
}

/**
 * Parses raw Server-Sent Events (SSE) chunks from a ReadableStreamDefaultReader.
 * Correctly buffers incoming chunk fragments across TCP packet boundaries and yields
 * distinct events separated by double newlines (\n\n).
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<ParsedSSEEvent, void, unknown> {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    if (signal?.aborted) {
      break;
    }

    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = 'message';
      const dataLines: string[] = [];

      for (const line of part.split('\n')) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length > 0) {
        yield {
          event: eventType,
          data: dataLines.join('\n'),
        };
      }
    }
  }

  if (buffer.trim()) {
    let eventType = 'message';
    const dataLines: string[] = [];
    for (const line of buffer.split('\n')) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length > 0) {
      yield {
        event: eventType,
        data: dataLines.join('\n'),
      };
    }
  }
}

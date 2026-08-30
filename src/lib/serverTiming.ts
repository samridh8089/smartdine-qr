/**
 * Server-Timing instrumentation helper.
 * Tracks timing for authentication, database operations, and total execution.
 * Formats standard HTTP Server-Timing header (e.g. `Server-Timing: auth=12; db=45; total=62`).
 */

export class ServerTimer {
  private timings: Record<string, number> = {};
  private startTimes: Record<string, number> = {};

  start(name: string) {
    this.startTimes[name] = performance.now();
  }

  end(name: string) {
    const start = this.startTimes[name];
    if (start !== undefined) {
      const elapsed = Math.round(performance.now() - start);
      this.timings[name] = (this.timings[name] || 0) + elapsed;
    }
  }

  getHeaderString(totalStart?: number): string {
    const entries: string[] = [];
    for (const [key, val] of Object.entries(this.timings)) {
      entries.push(`${key};dur=${val}`);
    }
    if (totalStart !== undefined) {
      const totalElapsed = Math.round(performance.now() - totalStart);
      entries.push(`total;dur=${totalElapsed}`);
    }
    return entries.join(', ');
  }
}

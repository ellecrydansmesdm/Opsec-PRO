class GhostTrackerService {
  private cache: Map<string, number> = new Map();

  track(username: string): number {
    const key = username.toLowerCase();
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const now = Date.now();
    this.cache.set(key, now);
    return now;
  }

  remove(username: string): void {
    this.cache.delete(username.toLowerCase());
  }

  get(username: string): number | undefined {
    return this.cache.get(username.toLowerCase());
  }

  clear(): void {
    this.cache.clear();
  }
}

export const ghostTracker = new GhostTrackerService();

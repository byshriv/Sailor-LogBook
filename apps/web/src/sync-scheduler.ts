export type ReviewResult = { kind: 'done' } | { kind: 'stop' } | { kind: 'retry'; after?: number };

// Only schedules review requests. The caller owns preview, cancellation and all writes.
export class ReviewScheduler {
  private enabled = false;
  private eligible = false;
  private disposed = false;
  private running = false;
  private failures = 0;
  private retryUntil = 0;
  private next = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private review: () => Promise<ReviewResult>;
  private paused: () => void;
  private clock: () => number;
  private timers: {
    set: (fn: () => void, delay: number) => ReturnType<typeof setTimeout>;
    clear: (id: ReturnType<typeof setTimeout>) => void;
  };
  constructor(
    review: () => Promise<ReviewResult>,
    paused: () => void,
    clock = () => performance.now(),
    timers = {
      set: (fn: () => void, delay: number) => globalThis.setTimeout(fn, delay),
      clear: (id: ReturnType<typeof setTimeout>) => globalThis.clearTimeout(id),
    },
  ) {
    this.review = review;
    this.paused = paused;
    this.clock = clock;
    this.timers = timers;
  }
  update(enabled: boolean, eligible: boolean) {
    if (this.disposed) return;
    if (!enabled) {
      this.failures = 0;
      this.retryUntil = 0;
      this.next = 0;
    } else if (!this.enabled) this.next = this.clock() + 3000;
    this.enabled = enabled;
    this.eligible = eligible;
    this.arm();
  }
  request() {
    if (!this.enabled || this.disposed) return;
    // Edit/online/focus bursts cannot bypass a provider's backoff deadline.
    this.next = Math.max(this.clock() + 3000, this.retryUntil);
    this.arm();
  }
  dispose() {
    this.disposed = true;
    this.cancelTimer();
  }
  private cancelTimer() {
    if (this.timer !== undefined) this.timers.clear(this.timer);
    this.timer = undefined;
  }
  private arm() {
    this.cancelTimer();
    if (!this.enabled || !this.eligible || this.running || this.disposed) return;
    this.timer = this.timers.set(() => void this.tick(), Math.max(0, this.next - this.clock()));
  }
  private async tick() {
    this.timer = undefined;
    if (!this.enabled || !this.eligible || this.running || this.disposed) return;
    this.running = true;
    let result: ReviewResult;
    try {
      result = await this.review();
    } catch {
      result = { kind: 'stop' };
    }
    this.running = false;
    if (this.disposed || !this.enabled) return;
    if (
      result.kind === 'stop' ||
      (result.kind === 'retry' && (++this.failures > 3 || (result.after ?? 0) > 300000))
    ) {
      this.enabled = false;
      this.cancelTimer();
      this.paused();
      return;
    }
    if (result.kind === 'retry') {
      const backoff = [5000, 15000, 60000][this.failures - 1]!;
      const after = Number.isFinite(result.after) ? Math.max(0, result.after!) : 0;
      this.retryUntil = this.clock() + Math.max(backoff, Math.min(300000, after));
      this.next = this.retryUntil;
    } else {
      this.failures = 0;
      this.retryUntil = 0;
      this.next = this.clock() + 60000;
    }
    this.arm();
  }
}

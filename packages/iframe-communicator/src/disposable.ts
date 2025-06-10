export class Disposable {
  private disposables: Set<() => void> = new Set();
  private isDisposed: boolean = false;

  public add(...disposables: Array<() => void | undefined>): number {
    if (this.isDisposed) {
      throw new Error('Cannot add disposables to a disposed instance');
    }

    disposables.filter((d): d is () => void => typeof d === 'function').forEach(d => this.disposables.add(d));

    return this.disposables.size;
  }

  public dispose(): void {
    if (this.isDisposed) return;

    this.disposables.forEach(dispose => {
      try {
        dispose();
      } catch (error) {
        console.error('Error executing disposable:', error);
      }
    });

    this.disposables.clear();
    this.isDisposed = true;
  }

  public static from(...disposables: Array<() => void | undefined>): Disposable {
    const disposable = new Disposable();
    disposable.add(...disposables);
    return disposable;
  }
}

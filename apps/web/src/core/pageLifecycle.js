// Create a page-scoped lifecycle manager.
/** Creates create page lifecycle. */
export function createPageLifecycle() {
  const destroyFns = [];
  return {
    add(destroyFn) {
      if (typeof destroyFn === 'function') {
        destroyFns.push(destroyFn);
      }
    },
    destroy() {
      for (const fn of destroyFns) {
        try {
          fn();
        } catch {
        }
      }
      destroyFns.length = 0;
    },
  };
}


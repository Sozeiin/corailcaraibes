/**
 * Utilities for safe DOM manipulation to prevent "removeChild" errors
 */

/**
 * Safely removes a child element from its parent
 * @param child - The element to remove
 * @param parent - Optional parent element. If not provided, uses child.parentNode
 * @returns true if successful, false if failed
 */
export function safeRemoveChild(child: Element | Node | null, parent?: Element | Node | null): boolean {
  if (!child) return false;
  
  const targetParent = parent || child.parentNode;
  
  if (!targetParent) return false;
  
  // Verify child is actually a child of the parent
  if (!targetParent.contains(child)) return false;
  
  try {
    targetParent.removeChild(child);
    return true;
  } catch (error) {
    console.warn('Failed to remove child element:', error);
    return false;
  }
}

/**
 * Safely removes an element by ID
 * @param id - Element ID to remove
 * @returns true if successful, false if failed
 */
export function safeRemoveById(id: string): boolean {
  const element = document.getElementById(id);
  return safeRemoveChild(element);
}

/**
 * Safely removes all children matching a selector
 * @param selector - CSS selector
 * @param parent - Parent element to search within (default: document)
 * @returns number of elements removed
 */
export function safeRemoveBySelector(selector: string, parent: Document | Element = document): number {
  const elements = parent.querySelectorAll(selector);
  let removedCount = 0;
  
  elements.forEach(element => {
    if (safeRemoveChild(element)) {
      removedCount++;
    }
  });
  
  return removedCount;
}

/**
 * Creates a cleanup function that safely removes multiple elements
 * @param elements - Array of elements or element getters
 * @returns cleanup function
 */
export function createSafeCleanup(elements: Array<Element | Node | (() => Element | Node | null)>): () => void {
  return () => {
    elements.forEach(element => {
      const el = typeof element === 'function' ? element() : element;
      safeRemoveChild(el);
    });
  };
}

/**
 * Safely appends a child with automatic cleanup on error
 * @param parent - Parent element
 * @param child - Child element to append
 * @returns cleanup function
 */
export function safeAppendChild(parent: Element | Node, child: Element | Node): () => void {
  try {
    parent.appendChild(child);
    return () => safeRemoveChild(child, parent);
  } catch (error) {
    console.warn('Failed to append child element:', error);
    return () => {};
  }
}
/**
 * Utility functions for generating stable keys for React lists
 */

/**
 * Generate a stable key for list items
 * Uses a combination of index and unique identifier
 */
export const generateKey = (
  item: any,
  index: number,
  prefix: string = 'item'
): string => {
  // Priority order for generating keys:
  // 1. Use 'id' property if it exists
  if (item?.id !== undefined) {
    return `${prefix}-${item.id}`;
  }

  // 2. Use 'key' property if it exists
  if (item?.key !== undefined) {
    return `${prefix}-${item.key}`;
  }

  // 3. Use 'name' property if it exists and is unique enough
  if (item?.name !== undefined) {
    return `${prefix}-${item.name}-${index}`;
  }

  // 4. Use 'value' for primitive items
  if (typeof item === 'string' || typeof item === 'number') {
    return `${prefix}-${item}-${index}`;
  }

  // 5. Use content hash for objects (stable across re-renders)
  if (typeof item === 'object' && item !== null) {
    const hash = generateHashFromObject(item);
    return `${prefix}-${hash}-${index}`;
  }

  // 6. Fallback to index only
  return `${prefix}-${index}`;
};

/**
 * Generate a simple hash from an object for stable keys
 */
const generateHashFromObject = (obj: any): string => {
  try {
    // Create a simple hash from object properties
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  } catch {
    // If object can't be stringified, use timestamp
    return Date.now().toString(36);
  }
};

/**
 * Generate keys for a list of items
 */
export const generateKeys = <T>(
  items: T[],
  prefix: string = 'item'
): Map<T, string> => {
  const keyMap = new Map<T, string>();
  items.forEach((item, index) => {
    keyMap.set(item, generateKey(item, index, prefix));
  });
  return keyMap;
};

/**
 * Hook-like function to get stable keys for items
 */
export const useStableKeys = <T>(
  items: T[],
  prefix: string = 'item'
): string[] => {
  return items.map((item, index) => generateKey(item, index, prefix));
};
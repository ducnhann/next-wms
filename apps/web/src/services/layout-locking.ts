/**
 * Locking Service
 *
 * Computes which racks should be locked based on inventory data.
 * A rack is locked if ANY of its bins contain inventory (qty > 0).
 *
 * This prevents moving racks that contain goods, avoiding data inconsistency
 * with the external WMS (Warehouse Management System).
 */

import type { Bin, Rack } from "@/lib/types/layout-editor";

/**
 * Inventory data structure from external WMS
 */
export interface InventoryData {
  /** Stock keeping unit identifier */
  sku: string;
  /** Quantity in bin (>0 triggers lock) */
  qty: number;
  /** Optional unit of measurement */
  unit?: string;
  /** Optional reserved quantity */
  reserved?: number;
}

/**
 * Map of bin IDs to their inventory data
 */
export type InventoryMap = Record<string, InventoryData>;

/**
 * Compute which racks should be locked based on current inventory.
 *
 * Algorithm:
 * 1. Iterate through all racks
 * 2. For each rack, check all its shelves
 * 3. For each shelf, check all its bins
 * 4. If any bin has inventory (qty > 0), mark the parent rack as locked
 *
 * @param racks - Map of all racks in the warehouse
 * @param shelves - Map of all shelves in the warehouse
 * @param bins - Map of all bins in the warehouse
 * @param rackShelves - Index mapping rack IDs to their shelf IDs
 * @param shelfBins - Index mapping shelf IDs to their bin IDs
 * @param inventoryMap - External inventory data (bin ID -> inventory)
 * @returns Set of rack IDs that should be locked
 */
export function computeLockStatus(
  racks: Map<string, Rack>,
  bins: Map<string, Bin>,
  rackShelves: Map<string, Set<string>>,
  shelfBins: Map<string, Set<string>>,
  inventoryMap: InventoryMap,
): Set<string> {
  const lockedRackIds = new Set<string>();

  // Iterate through all racks
  for (const [rackId, _rack] of racks) {
    const rackShelfIds = rackShelves.get(rackId);

    if (!rackShelfIds || rackShelfIds.size === 0) {
      continue; // Rack has no shelves, cannot be locked
    }

    // Check all shelves in this rack
    let hasInventory = false;
    for (const shelfId of rackShelfIds) {
      const binIds = shelfBins.get(shelfId);

      if (!binIds || binIds.size === 0) {
        continue; // Shelf has no bins
      }

      // Check all bins in this shelf
      for (const binId of binIds) {
        const bin = bins.get(binId);
        if (!bin) continue;

        // Check if this bin has inventory in the external map
        const inventory = inventoryMap[binId];

        if (inventory && inventory.qty > 0) {
          hasInventory = true;
          break; // Found inventory, this rack is locked
        }
      }

      if (hasInventory) {
        break; // No need to check more shelves
      }
    }

    if (hasInventory) {
      lockedRackIds.add(rackId);
    }
  }

  return lockedRackIds;
}

/**
 * Check if a specific rack is locked based on inventory.
 *
 * @param rackId - The rack ID to check
 * @param lockedRacks - Set of currently locked rack IDs
 * @returns true if the rack is locked
 */
export function isRackLocked(
  rackId: string,
  lockedRacks: Set<string>,
): boolean {
  return lockedRacks.has(rackId);
}

/**
 * Get the count of inventory items in a specific rack.
 * Useful for displaying lock status details.
 *
 * @param rackId - The rack ID to analyze
 * @param rackShelves - Index mapping rack IDs to shelf IDs
 * @param shelfBins - Index mapping shelf IDs to bin IDs
 * @param inventoryMap - External inventory data
 * @returns Total inventory quantity in the rack
 */
export function getRackInventoryCount(
  rackId: string,
  rackShelves: Map<string, Set<string>>,
  shelfBins: Map<string, Set<string>>,
  inventoryMap: InventoryMap,
): number {
  let totalQty = 0;

  const rackShelfIds = rackShelves.get(rackId);
  if (!rackShelfIds) return 0;

  for (const shelfId of rackShelfIds) {
    const binIds = shelfBins.get(shelfId);
    if (!binIds) continue;

    for (const binId of binIds) {
      const inventory = inventoryMap[binId];
      if (inventory) {
        totalQty += inventory.qty;
      }
    }
  }

  return totalQty;
}

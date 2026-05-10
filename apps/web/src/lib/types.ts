import type { Doc, Id } from "@wms/backend/convex/_generated/dataModel";

export type SystemLookups = Doc<"system_lookups">;

export type Supplier = Doc<"suppliers">;

export type User = Doc<"users">;

export type NotificationItem = Doc<"notifications"> & {
  category: SystemLookups | null;
  priority: SystemLookups | null;
};

// ============================================================================
// PURCHASE ORDER TYPES
// ============================================================================

/**
 * Purchase order list item - used in the purchase orders table
 */
export type PurchaseOrderListItem = {
  _id: Id<"purchase_orders">;
  code: string;
  orderedAt: number;
  expectedDeliveryAt: number | null;
  supplier: Pick<Supplier, "name"> | null;
  purchaseOrderStatus: Pick<SystemLookups, "lookupValue" | "lookupCode"> | null;
};

/**
 * Purchase order detailed item - line item in a purchase order detail view
 */
export type PurchaseOrderDetailedItem = {
  _id: Id<"purchase_order_details">;
  skuCode: string;
  productName: string | null;
  quantityOrdered: number;
  location: string | null;
};

/**
 * Purchase order with full details - used in the detail view dialog
 */
export type PurchaseOrderDetailed = {
  _id: Id<"purchase_orders">;
  code: string;
  orderedAt: number;
  expectedDeliveryAt: number | null;
  createdByUser: Pick<User, "fullName"> | null;
  supplier: {
    name: string;
    phone: string;
  } | null;
  purchaseOrderStatus: Pick<SystemLookups, "lookupValue"> | null;
  items: PurchaseOrderDetailedItem[];
  totalItems: number;
  totalQuantityOrdered: number;
};

/**
 * Purchase order product item - used when adding products to a new PO
 */
export type PurchaseOrderProductItem = {
  id: string;
  variantId: Id<"product_variants">;
  skuCode: string;
  description: string;
  quantity: number;
  zoneId?: Id<"storage_zones">;
  zoneName?: string;
};

// ============================================================================
// RETURN REQUEST TYPES
// ============================================================================

/**
 * Return request list item - used in the return requests table
 */
export type ReturnRequestListItem = {
  _id: Id<"return_requests">;
  requestCode: string;
  requestedAt: number;
  supplier: Pick<Supplier, "name"> | null;
  requestedByUser: Pick<User, "fullName"> | null;
  returnStatus: Pick<SystemLookups, "lookupValue"> | null;
  totalSKUs: number;
  totalItems: number;
};

/**
 * Return request detail item - line item in a return request
 */
export type ReturnRequestDetailItem = {
  _id: Id<"return_request_details">;
  skuCode: string;
  productName: string | null;
  quantityToReturn: number;
  expectedCreditAmount: number;
  reason: Pick<SystemLookups, "lookupValue"> | null;
  customReasonNotes?: string;
  batchId: string;
};

/**
 * Return request with full details - used in the detail view
 */
export type ReturnRequestWithDetails = {
  _id: Id<"return_requests">;
  requestCode: string;
  requestedAt: number;
  supplier: Pick<Supplier, "name"> | null;
  requestedByUser: Pick<User, "fullName"> | null;
  returnStatus: Pick<SystemLookups, "lookupValue"> | null;
  totalSKUs: number;
  totalExpectedQuantity: number;
  totalExpectedCredit: number;
  details: ReturnRequestDetailItem[];
};

// ============================================================================
// CYCLE COUNT TYPES
// ============================================================================

/**
 * Cycle count session list item - used in the cycle count sessions table
 */
export type CycleCountSessionListItem = {
  _id: Id<"work_sessions">;
  sessionCode: string;
  name: string;
  cycleCountType: Pick<SystemLookups, "lookupValue"> | null;
  sessionStatus: Pick<SystemLookups, "lookupValue"> | null;
  createdByUser: Pick<User, "fullName"> | null;
  zonesCount: number;
  createdAt: number;
};

/**
 * Cycle count stats - summary statistics for the cycle count dashboard
 */
export type CycleCountStats = {
  activeSessions: number;
  totalZones: number;
  completedSessions: number;
  verificationRate: number;
};

/**
 * Cycle count session line item - individual product count in a session
 */
export type CycleCountLineItem = {
  _id: Id<"session_line_items">;
  productId: string;
  productName: string;
  expectedQuantity: number;
  actualQuantity: number;
  variance: number;
};

/**
 * Cycle count zone detail - zone information with assigned worker and line items
 */
export type CycleCountZoneDetail = {
  zoneId: string;
  zoneName: string;
  assignedWorker: Pick<User, "fullName"> | null;
  lineItems: CycleCountLineItem[];
  matchedCount: number;
  totalCount: number;
};

/**
 * Cycle count session with full details - used in the detail view dialog
 */
export type CycleCountSessionWithDetails = {
  _id: Id<"work_sessions">;
  sessionCode: string;
  name: string;
  cycleCountType: Pick<SystemLookups, "lookupValue"> | null;
  sessionStatus: Pick<SystemLookups, "lookupValue"> | null;
  createdByUser: Pick<User, "fullName"> | null;
  createdAt: number;
  zones: CycleCountZoneDetail[];
};

export type Product = Omit<Doc<"products">, "_id" | "organizationId"> & {
  storageRequirementType: Pick<SystemLookups, "lookupValue"> | null;
  trackingMethodType: Pick<SystemLookups, "lookupValue"> | null;
};

export type Brand = Doc<"brands">;

export type BrandWithProductCount = Brand & {
  productCount: number;
};

/**
 * Product list item - used in the products table with enriched data
 */
export type ProductListItem = {
  _id: Id<"products">;
  name: string;
  description: string;
  isActive: boolean;
  shelfLifeDays?: number;
  reorderPoint?: number;
  category: { _id: Id<"categories">; name: string } | null;
  brand: { _id: Id<"brands">; name: string } | null;
  storageRequirement: Pick<SystemLookups, "lookupValue"> | null;
  trackingMethod: Pick<SystemLookups, "lookupValue"> | null;
  variantCount: number;
  defaultVariant: {
    _id: Id<"product_variants">;
    skuCode: string;
    costPrice: number;
    sellingPrice: number;
  } | null;
};

export type Branch = Doc<"branches">;

// ============================================================
// Receive Session Types
// ============================================================

/**
 * Receive Session - General view for table listing
 * Omits IDs of related entities and replaces with enriched data
 */
export type ReceiveSessionGeneral = Omit<
  Doc<"receive_sessions">,
  "purchaseOrderId" | "branchId" | "receiveSessionStatusTypeId"
> & {
  receiveSessionStatus: Pick<
    SystemLookups,
    "lookupValue" | "lookupCode"
  > | null;
  purchaseOrder: {
    code: string;
    expectedDeliveryAt?: number;
  } | null;
  supplier: Pick<Supplier, "name"> | null;
  // Computed fields for display
  totalItems: number;
  totalExpected: number;
  totalReceived: number;
  progressPercentage: number;
};

/**
 * Receive Session List Item - used in the receive sessions table
 * Matches the response from listReceiveSessions API
 */
export type ReceiveSessionListItem = {
  _id: Id<"receive_sessions">;
  receiveSessionCode: string;
  supplierName: string;
  receivedAt: number;
  status: string; // "Complete" | "In Progress" | "Pending" | "Returned"
  statusCode: string; // "COMPLETE" | "IN_PROGRESS" | "PENDING" | "RETURNED"
  totalItems: number; // Number of SKUs
  totalExpected: number; // Total expected quantity
  totalReceived: number; // Total received quantity
  progressPercentage: number;
};

/**
 * Receive Session Detail Item - Individual SKU item in a receive session
 * Omits IDs and replaces with enriched data
 */
export type ReceiveSessionDetailItem = Omit<
  Doc<"receive_sessions_details">,
  | "receiveSessionId"
  | "skuId"
  | "recommendedZoneId"
  | "receiveSessionItemStatusTypeId"
> & {
  sku: {
    skuCode: string;
    productName: string;
  } | null;
  recommendedZone: Pick<Doc<"storage_zones">, "name"> | null;
  itemStatus: Pick<SystemLookups, "lookupValue" | "lookupCode"> | null;
  // Optional attachment support
  attachmentUrl?: string;
};

/**
 * Work Session Info - Linked work session details for receive session detail view
 */
export type WorkSessionInfo = Pick<
  Doc<"work_sessions">,
  "_id" | "sessionCode" | "startedAt" | "completedAt"
> & {
  assignedUser: Pick<User, "fullName"> | null;
  sessionStatus: Pick<SystemLookups, "lookupValue"> | null;
};

/**
 * Receive Session - Detailed view for individual session page
 * Contains all information including work session and items
 */
export type ReceiveSessionDetailed = Omit<
  Doc<"receive_sessions">,
  "branchId" | "receiveSessionStatusTypeId"
> & {
  receiveSessionStatus: Pick<
    SystemLookups,
    "lookupValue" | "lookupCode"
  > | null;
  purchaseOrder: {
    _id: string;
    code: string;
  } | null;
  supplier: Pick<Supplier, "name"> | null;
  workSession: WorkSessionInfo | null;
  summary: {
    totalSku: number;
    totalExpectedQuantity: number;
    totalReceivedQuantity: number;
  };
  items: ReceiveSessionDetailItem[];
};

/**
 * Pending Purchase Order - For dropdown selection when creating receive session
 * Contains minimal information needed for the dropdown
 */
export type PendingPurchaseOrder = Pick<
  Doc<"purchase_orders">,
  "_id" | "code" | "orderedAt" | "expectedDeliveryAt"
> & {
  supplier: Pick<Supplier, "name"> | null;
  purchaseOrderStatus: Pick<SystemLookups, "lookupValue"> | null;
};

export type StorageZone = Doc<"storage_zones">;

// ============================================================
// Receive Session Verifying Page Types
// ============================================================

/**
 * Receive Session Progress Item - Individual item in the verifying page
 * Matches the response from getReceiveSessionProgress API
 */
export type ReceiveSessionProgressItem = {
  detailId: Id<"receive_sessions_details">;
  skuId: Id<"product_variants">;
  skuCode: string;
  productName: string;
  quantityExpected: number;
  quantityReceived: number;
  remainingQuantity: number;
  notes?: string;
  status: string;
  statusCode: string;
  isComplete: boolean;
};

/**
 * Receive Session Progress - Data structure for the verifying page
 * Matches the response from getReceiveSessionProgress API
 */
export type ReceiveSessionProgress = {
  receiveSessionCode: string;
  purchaseOrderCode: string;
  status: string;
  statusCode: string;
  totalExpectedQuantity: number;
  totalReceivedQuantity: number;
  progressPercentage: number;
  totalItems: number;
  completedItems: number;
  items: ReceiveSessionProgressItem[];
};

// ============================================================================
// OUTBOUND ORDER TYPES
// ============================================================================

/**
 * Outbound order list item - used in the outbound orders table
 */
export type OutboundOrderListItem = {
  _id: Id<"outbound_orders">;
  orderCode: string;
  orderDate: number;
  requestedShipDate: number | null;
  trackingNumber: string | null;
  vehicleArrivedAt: number | null;
  createdByUser: Pick<User, "fullName"> | null;
  outboundStatus: Pick<SystemLookups, "lookupValue" | "lookupCode"> | null;
};

/**
 * Outbound order detailed item - line item in an outbound order detail view
 */
export type OutboundOrderDetailedItem = {
  _id: Id<"outbound_order_details">;
  skuCode: string;
  productName: string | null;
  quantityRequested: number;
  quantityPicked: number;
  quantityPacked: number;
};

/**
 * Outbound order with full details - used in the detail view dialog
 */
export type OutboundOrderDetailed = {
  _id: Id<"outbound_orders">;
  orderCode: string;
  orderDate: number;
  requestedShipDate: number | null;
  trackingNumber: string | null;
  createdByUser: Pick<User, "fullName"> | null;
  outboundStatus: Pick<SystemLookups, "lookupValue"> | null;
  items: OutboundOrderDetailedItem[];
  totalItems: number;
  totalQuantityRequested: number;
  totalQuantityPicked: number;
  totalQuantityPacked: number;
};

// ============================================================================
// REPORT TYPES
// ============================================================================

/**
 * Inbound report summary KPIs
 */
export type InboundReportKPIs = {
  totalSessions: number;
  totalItemsReceived: number;
  avgItemsPerSession: number;
  overallAccuracyRate: number;
};

/**
 * Inbound report session item for the table
 */
export type InboundReportSession = {
  _id: Id<"receive_sessions">;
  receiveSessionCode: string;
  receivedAt: number;
  purchaseOrderCode: string;
  supplierName: string;
  status: string;
  statusCode: string;
  itemCount: number;
  totalReceived: number;
  totalExpected: number;
  variance: number;
  accuracyRate: number;
};

/**
 * Inventory report summary KPIs
 */
export type InventoryReportKPIs = {
  totalSKUs: number;
  totalQuantity: number;
  totalValue: number;
  expiringSoonCount: number;
  expiredCount: number;
  lowStockCount: number;
};

/**
 * Inventory report item for the table
 */
export type InventoryReportItem = {
  _id: Id<"inventory_batches">;
  skuCode: string;
  productName: string;
  categoryName: string;
  zoneName: string;
  quantity: number;
  costPrice: number;
  value: number;
  expiresAt?: number;
  status: string;
  supplierBatchNumber?: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
  isLowStock: boolean;
};

/**
 * Outbound report summary KPIs
 */
export type OutboundReportKPIs = {
  totalOrders: number;
  totalItemsShipped: number;
  avgItemsPerOrder: number;
  overallFulfillmentRate: number;
  avgPickingTimeMinutes: number;
  totalPickingSessions: number;
};

/**
 * Outbound report order item for the table
 */
export type OutboundReportOrder = {
  _id: Id<"outbound_orders">;
  orderCode: string;
  orderDate: number;
  requestedShipDate?: number;
  trackingNumber?: string;
  createdByName: string;
  status: string;
  statusCode: string;
  itemCount: number;
  totalRequested: number;
  totalPicked: number;
  totalPacked: number;
  fulfillmentRate: number;
};

/**
 * Chart breakdown item (for status, category, etc.)
 */
export type ChartBreakdownItem = {
  name: string;
  value: number;
  code?: string;
};

/**
 * Daily trend data point
 */
export type DailyTrendPoint = {
  date: string;
  value: number;
};

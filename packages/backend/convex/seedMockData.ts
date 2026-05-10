import { mutation } from "./_generated/server";

/**
 * Seed comprehensive mock data for all database tables
 * Run this once to populate the database with test data
 */
export const seedAllTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    // ================================================================
    // 1. SYSTEM LOOKUPS (All lookup types needed across the system)
    // ================================================================

    // Purchase Order Status types
    const pendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "PurchaseOrderStatus",
      lookupCode: "Pending",
      lookupValue: "Pending",
      description: "Purchase order is pending approval",
      sortOrder: 1,
    });

    const approvedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "PurchaseOrderStatus",
      lookupCode: "Approved",
      lookupValue: "Approved",
      description: "Purchase order has been approved",
      sortOrder: 2,
    });

    const receivedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "PurchaseOrderStatus",
      lookupCode: "Received",
      lookupValue: "Received",
      description: "Purchase order has been received",
      sortOrder: 3,
    });

    const cancelledStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "PurchaseOrderStatus",
      lookupCode: "Cancelled",
      lookupValue: "Cancelled",
      description: "Purchase order has been cancelled",
      sortOrder: 4,
    });

    // Add Partial status for partially received POs
    const partialStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "PurchaseOrderStatus",
      lookupCode: "Partial",
      lookupValue: "Partial",
      description: "Purchase order has been partially received",
      sortOrder: 5,
    });

    // Outbound Order Status types
    const outboundPendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "OutboundOrderStatus",
      lookupCode: "PENDING",
      lookupValue: "Pending",
      description: "Outbound order is pending",
      sortOrder: 1,
    });

    const outboundProcessingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "OutboundOrderStatus",
      lookupCode: "PROCESSING",
      lookupValue: "Processing",
      description: "Outbound order is being processed",
      sortOrder: 2,
    });

    const outboundShippedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "OutboundOrderStatus",
      lookupCode: "SHIPPED",
      lookupValue: "Shipped",
      description: "Outbound order has been shipped",
      sortOrder: 3,
    });

    const outboundDeliveredStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "OutboundOrderStatus",
      lookupCode: "DELIVERED",
      lookupValue: "Delivered",
      description: "Outbound order has been delivered",
      sortOrder: 4,
    });

    // Transfer Order Status types
    const transferPendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "TransferOrderStatus",
      lookupCode: "PENDING",
      lookupValue: "Pending",
      description: "Transfer order is pending",
      sortOrder: 1,
    });

    const transferInTransitStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "TransferOrderStatus",
      lookupCode: "IN_TRANSIT",
      lookupValue: "In Transit",
      description: "Transfer order is in transit",
      sortOrder: 2,
    });

    const transferCompletedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "TransferOrderStatus",
      lookupCode: "COMPLETED",
      lookupValue: "Completed",
      description: "Transfer order has been completed",
      sortOrder: 3,
    });

    // Session Status types
    const sessionPendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "SessionStatus",
      lookupCode: "PENDING",
      lookupValue: "Pending",
      description: "Session is pending",
      sortOrder: 1,
    });

    const sessionInProgressStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "SessionStatus",
      lookupCode: "IN_PROGRESS",
      lookupValue: "In Progress",
      description: "Session is in progress",
      sortOrder: 2,
    });

    const sessionCompletedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "SessionStatus",
      lookupCode: "COMPLETED",
      lookupValue: "Completed",
      description: "Session has been completed",
      sortOrder: 3,
    });

    const sessionVerifiedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "SessionStatus",
      lookupCode: "VERIFIED",
      lookupValue: "Verified",
      description: "Session has been verified",
      sortOrder: 4,
    });

    // Session Type lookups
    const receiveSessionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "SessionType",
      lookupCode: "RECEIVE",
      lookupValue: "Receive",
      description: "Receiving session for inbound goods",
      sortOrder: 1,
    });

    const pickSessionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "SessionType",
      lookupCode: "PICK",
      lookupValue: "Pick",
      description: "Picking session for outbound orders",
      sortOrder: 2,
    });

    const cycleCountSessionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "SessionType",
      lookupCode: "CYCLE_COUNT",
      lookupValue: "Cycle Count",
      description: "Inventory cycle count session",
      sortOrder: 3,
    });

    // Cycle Count Type lookups
    const dailyCycleCountTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "CycleCountType",
      lookupCode: "DAILY",
      lookupValue: "Daily",
      description: "Daily cycle count",
      sortOrder: 1,
    });

    const weeklyCycleCountTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "CycleCountType",
      lookupCode: "WEEKLY",
      lookupValue: "Weekly",
      description: "Weekly cycle count",
      sortOrder: 2,
    });

    // Zone Assignment Status types (for cycle count zone assignments)
    const zoneAssignmentNotStartedId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneAssignmentStatus",
      lookupCode: "NOT_STARTED",
      lookupValue: "Not Started",
      description: "Zone assignment has not been started",
      sortOrder: 1,
    });

    const zoneAssignmentInProgressId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneAssignmentStatus",
      lookupCode: "IN_PROGRESS",
      lookupValue: "In Progress",
      description: "Worker is actively counting in this zone",
      sortOrder: 2,
    });

    const zoneAssignmentCompletedId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneAssignmentStatus",
      lookupCode: "COMPLETED",
      lookupValue: "Completed",
      description: "Zone count has been completed by the worker",
      sortOrder: 3,
    });

    // Batch Status types
    const batchActiveStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "BatchStatus",
      lookupCode: "ACTIVE",
      lookupValue: "Active",
      description: "Batch is active and available",
      sortOrder: 1,
    });

    const batchReservedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "BatchStatus",
      lookupCode: "RESERVED",
      lookupValue: "Reserved",
      description: "Batch is reserved for an order",
      sortOrder: 2,
    });

    const batchExpiredStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "BatchStatus",
      lookupCode: "EXPIRED",
      lookupValue: "Expired",
      description: "Batch has expired",
      sortOrder: 3,
    });

    // Serial Number Status types
    const serialAvailableStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "SerialStatus",
      lookupCode: "AVAILABLE",
      lookupValue: "Available",
      description: "Serial number is available",
      sortOrder: 1,
    });

    const serialSoldStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "SerialStatus",
      lookupCode: "SOLD",
      lookupValue: "Sold",
      description: "Serial number has been sold",
      sortOrder: 2,
    });

    // Inventory Transaction Types
    const receiveTransactionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "InventoryTransactionType",
      lookupCode: "RECEIVE",
      lookupValue: "Receive",
      description: "Inventory received from purchase order",
      sortOrder: 1,
    });

    const pickTransactionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "InventoryTransactionType",
      lookupCode: "PICK",
      lookupValue: "Pick",
      description: "Inventory picked for outbound order",
      sortOrder: 2,
    });

    const adjustTransactionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "InventoryTransactionType",
      lookupCode: "ADJUST",
      lookupValue: "Adjustment",
      description: "Inventory adjustment",
      sortOrder: 3,
    });

    const transferTransactionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "InventoryTransactionType",
      lookupCode: "TRANSFER",
      lookupValue: "Transfer",
      description: "Inventory transferred between branches",
      sortOrder: 4,
    });

    // Adjustment Status types
    const adjustmentPendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentStatus",
      lookupCode: "PENDING",
      lookupValue: "Pending",
      description: "Adjustment is pending approval",
      sortOrder: 1,
    });

    const adjustmentApprovedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentStatus",
      lookupCode: "APPROVED",
      lookupValue: "Approved",
      description: "Adjustment has been approved",
      sortOrder: 2,
    });

    const adjustmentRejectedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentStatus",
      lookupCode: "REJECTED",
      lookupValue: "Rejected",
      description: "Adjustment has been rejected",
      sortOrder: 3,
    });

    // Adjustment Type lookups
    const quantityAdjustmentTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentType",
      lookupCode: "QUANTITY",
      lookupValue: "Quantity Adjustment",
      description: "Quantity adjustment type",
      sortOrder: 1,
    });

    const locationAdjustmentTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentType",
      lookupCode: "LOCATION",
      lookupValue: "Location Adjustment",
      description: "Location adjustment type",
      sortOrder: 2,
    });

    // Adjustment Reason types
    const damagedReasonTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentReason",
      lookupCode: "DAMAGED",
      lookupValue: "Damaged",
      description: "Item was damaged",
      sortOrder: 1,
    });

    const countDiscrepancyReasonTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentReason",
      lookupCode: "COUNT_DISCREPANCY",
      lookupValue: "Count Discrepancy",
      description: "Count discrepancy found during cycle count",
      sortOrder: 2,
    });

    const expiredReasonTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AdjustmentReason",
      lookupCode: "EXPIRED",
      lookupValue: "Expired",
      description: "Item has expired",
      sortOrder: 3,
    });

    // Return Status types
    const returnPendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "ReturnStatus",
      lookupCode: "PENDING",
      lookupValue: "Pending",
      description: "Return request is pending",
      sortOrder: 1,
    });

    const returnApprovedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "ReturnStatus",
      lookupCode: "APPROVED",
      lookupValue: "Approved",
      description: "Return request has been approved",
      sortOrder: 2,
    });

    const returnRejectedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "ReturnStatus",
      lookupCode: "REJECTED",
      lookupValue: "Rejected",
      description: "Return request has been rejected",
      sortOrder: 3,
    });

    const returnCompletedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "ReturnStatus",
      lookupCode: "COMPLETED",
      lookupValue: "Completed",
      description: "Return has been completed",
      sortOrder: 4,
    });

    // Return Reason types
    const defectiveReturnReasonId = await ctx.db.insert("system_lookups", {
      lookupType: "ReturnReason",
      lookupCode: "DEFECTIVE",
      lookupValue: "Defective",
      description: "Product is defective",
      sortOrder: 1,
    });

    const wrongItemReturnReasonId = await ctx.db.insert("system_lookups", {
      lookupType: "ReturnReason",
      lookupCode: "WRONG_ITEM",
      lookupValue: "Wrong Item",
      description: "Wrong item was received",
      sortOrder: 2,
    });

    // Receive Session Status types
    const receiveSessionPendingStatusId = await ctx.db.insert(
      "system_lookups",
      {
        lookupType: "ReceiveSessionStatus",
        lookupCode: "PENDING",
        lookupValue: "Pending",
        description: "Receive session is pending",
        sortOrder: 1,
      },
    );

    const receiveSessionInProgressStatusId = await ctx.db.insert(
      "system_lookups",
      {
        lookupType: "ReceiveSessionStatus",
        lookupCode: "IN_PROGRESS",
        lookupValue: "In Progress",
        description: "Receive session is in progress",
        sortOrder: 2,
      },
    );

    const receiveSessionCompleteStatusId = await ctx.db.insert(
      "system_lookups",
      {
        lookupType: "ReceiveSessionStatus",
        lookupCode: "COMPLETE",
        lookupValue: "Complete",
        description: "Receive session is complete",
        sortOrder: 3,
      },
    );

    // Receive Session Item Status types
    const receiveItemPendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "ReceiveSessionItemStatus",
      lookupCode: "PENDING",
      lookupValue: "Pending",
      description: "Item is pending receiving",
      sortOrder: 1,
    });

    const receiveItemPartialStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "ReceiveSessionItemStatus",
      lookupCode: "PARTIAL",
      lookupValue: "Partial",
      description: "Item is partially received",
      sortOrder: 2,
    });

    const receiveItemCompleteStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "ReceiveSessionItemStatus",
      lookupCode: "COMPLETE",
      lookupValue: "Complete",
      description: "Item is fully received",
      sortOrder: 3,
    });

    const receiveItemReturnRequestedStatusId = await ctx.db.insert(
      "system_lookups",
      {
        lookupType: "ReceiveSessionItemStatus",
        lookupCode: "RETURN_REQUESTED",
        lookupValue: "Return Requested",
        description: "Return has been requested for this item",
        sortOrder: 4,
      },
    );

    // Invitation Status types
    const invitationPendingStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "InvitationStatus",
      lookupCode: "PENDING",
      lookupValue: "Pending",
      description: "Invitation is pending",
      sortOrder: 1,
    });

    const invitationAcceptedStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "InvitationStatus",
      lookupCode: "ACCEPTED",
      lookupValue: "Accepted",
      description: "Invitation has been accepted",
      sortOrder: 2,
    });

    const invitationExpiredStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "InvitationStatus",
      lookupCode: "EXPIRED",
      lookupValue: "Expired",
      description: "Invitation has expired",
      sortOrder: 3,
    });

    // Assignment Status types
    const assignmentActiveStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "AssignmentStatus",
      lookupCode: "ACTIVE",
      lookupValue: "Active",
      description: "Assignment is active",
      sortOrder: 1,
    });

    const assignmentInactiveStatusId = await ctx.db.insert("system_lookups", {
      lookupType: "AssignmentStatus",
      lookupCode: "INACTIVE",
      lookupValue: "Inactive",
      description: "Assignment is inactive",
      sortOrder: 2,
    });

    // Zone Type lookups
    const receivingZoneTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneType",
      lookupCode: "RECEIVING",
      lookupValue: "Receiving",
      description: "Receiving zone for inbound goods",
      sortOrder: 1,
    });

    const storageZoneTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneType",
      lookupCode: "STORAGE",
      lookupValue: "Storage",
      description: "Main storage zone",
      sortOrder: 2,
    });

    const pickingZoneTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneType",
      lookupCode: "PICKING",
      lookupValue: "Picking",
      description: "Picking zone for order fulfillment",
      sortOrder: 3,
    });

    const shippingZoneTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneType",
      lookupCode: "SHIPPING",
      lookupValue: "Shipping",
      description: "Shipping zone for outbound orders",
      sortOrder: 4,
    });

    // Notification Category types
    const alertNotificationCategoryId = await ctx.db.insert("system_lookups", {
      lookupType: "NotificationCategory",
      lookupCode: "ALERT",
      lookupValue: "Alert",
      description: "Important alert notifications",
      sortOrder: 1,
    });

    const infoNotificationCategoryId = await ctx.db.insert("system_lookups", {
      lookupType: "NotificationCategory",
      lookupCode: "INFO",
      lookupValue: "Information",
      description: "Informational notifications",
      sortOrder: 2,
    });

    const reminderNotificationCategoryId = await ctx.db.insert(
      "system_lookups",
      {
        lookupType: "NotificationCategory",
        lookupCode: "REMINDER",
        lookupValue: "Reminder",
        description: "Reminder notifications",
        sortOrder: 3,
      },
    );

    // Priority types
    const lowPriorityTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "Priority",
      lookupCode: "LOW",
      lookupValue: "Low",
      description: "Low priority",
      sortOrder: 1,
    });

    const mediumPriorityTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "Priority",
      lookupCode: "MEDIUM",
      lookupValue: "Medium",
      description: "Medium priority",
      sortOrder: 2,
    });

    const highPriorityTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "Priority",
      lookupCode: "HIGH",
      lookupValue: "High",
      description: "High priority",
      sortOrder: 3,
    });

    // Forecast Type lookups
    const demandForecastTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "ForecastType",
      lookupCode: "DEMAND",
      lookupValue: "Demand Forecast",
      description: "Demand forecast type",
      sortOrder: 1,
    });

    const seasonalForecastTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "ForecastType",
      lookupCode: "SEASONAL",
      lookupValue: "Seasonal Forecast",
      description: "Seasonal forecast type",
      sortOrder: 2,
    });

    // Sharing Scope types
    const privateShareScopeId = await ctx.db.insert("system_lookups", {
      lookupType: "SharingScope",
      lookupCode: "PRIVATE",
      lookupValue: "Private",
      description: "Private - visible only to owner",
      sortOrder: 1,
    });

    const organizationShareScopeId = await ctx.db.insert("system_lookups", {
      lookupType: "SharingScope",
      lookupCode: "ORGANIZATION",
      lookupValue: "Organization",
      description: "Visible to entire organization",
      sortOrder: 2,
    });

    // Audit Action types
    const createActionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AuditAction",
      lookupCode: "CREATE",
      lookupValue: "Create",
      description: "Record created",
      sortOrder: 1,
    });

    const updateActionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AuditAction",
      lookupCode: "UPDATE",
      lookupValue: "Update",
      description: "Record updated",
      sortOrder: 2,
    });

    const deleteActionTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "AuditAction",
      lookupCode: "DELETE",
      lookupValue: "Delete",
      description: "Record deleted",
      sortOrder: 3,
    });

    // Barcode Type lookups
    const ean13BarcodeTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "BarcodeType",
      lookupCode: "EAN13",
      lookupValue: "EAN-13",
      description: "EAN-13 barcode format",
      sortOrder: 1,
    });

    const qrBarcodeTypeId = await ctx.db.insert("system_lookups", {
      lookupType: "BarcodeType",
      lookupCode: "QR",
      lookupValue: "QR Code",
      description: "QR code format",
      sortOrder: 2,
    });

    // Unit of Measure types
    const unitPieceId = await ctx.db.insert("system_lookups", {
      lookupType: "UnitOfMeasure",
      lookupCode: "PCS",
      lookupValue: "Piece",
      description: "Individual piece/unit",
      sortOrder: 1,
    });

    const unitBoxId = await ctx.db.insert("system_lookups", {
      lookupType: "UnitOfMeasure",
      lookupCode: "BOX",
      lookupValue: "Box",
      description: "Box/carton unit",
      sortOrder: 2,
    });

    const unitKgId = await ctx.db.insert("system_lookups", {
      lookupType: "UnitOfMeasure",
      lookupCode: "KG",
      lookupValue: "Kilogram",
      description: "Weight in kilograms",
      sortOrder: 3,
    });

    // Storage Requirement types
    const normalStorageId = await ctx.db.insert("system_lookups", {
      lookupType: "StorageRequirement",
      lookupCode: "NORMAL",
      lookupValue: "Normal",
      description: "Standard storage conditions",
      sortOrder: 1,
    });

    const coldStorageId = await ctx.db.insert("system_lookups", {
      lookupType: "StorageRequirement",
      lookupCode: "COLD",
      lookupValue: "Cold Storage",
      description: "Refrigerated storage required",
      sortOrder: 2,
    });

    const freezerStorageId = await ctx.db.insert("system_lookups", {
      lookupType: "StorageRequirement",
      lookupCode: "FREEZER",
      lookupValue: "Freezer",
      description: "Frozen storage required",
      sortOrder: 3,
    });

    // Tracking Method types
    const fifoTrackingId = await ctx.db.insert("system_lookups", {
      lookupType: "TrackingMethod",
      lookupCode: "FIFO",
      lookupValue: "FIFO",
      description: "First In First Out tracking",
      sortOrder: 1,
    });

    const fefoTrackingId = await ctx.db.insert("system_lookups", {
      lookupType: "TrackingMethod",
      lookupCode: "FEFO",
      lookupValue: "FEFO",
      description: "First Expired First Out tracking",
      sortOrder: 2,
    });

    const serialTrackingId = await ctx.db.insert("system_lookups", {
      lookupType: "TrackingMethod",
      lookupCode: "SERIAL",
      lookupValue: "Serial Number",
      description: "Serial number tracking",
      sortOrder: 3,
    });

    // ================================================================
    // 2. ORGANIZATIONS
    // ================================================================
    // NOTE: In production, organizations should be created via Better Auth
    // These are test/seed data with mock auth IDs

    const organizationId = await ctx.db.insert("organizations", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_org_test_warehouse_001",
      slug: "test-warehouse-corp",
      logo: undefined,
      authMetadata: JSON.stringify({ seed: true, createdBy: "seedMockData" }),
      authCreatedAt: now,

      // Application-specific fields
      name: "Test Warehouse Corp",
      address: "123 Warehouse Street, District 1, Ho Chi Minh City",
      contactInfo: {
        phone: "+84 28 1234 5678",
        email: "contact@testwarehouse.com",
      },
      isActive: true,
      isDeleted: false,
    });

    const organization2Id = await ctx.db.insert("organizations", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_org_secondary_dist_002",
      slug: "secondary-distribution-inc",
      logo: undefined,
      authMetadata: JSON.stringify({ seed: true, createdBy: "seedMockData" }),
      authCreatedAt: now,

      // Application-specific fields
      name: "Secondary Distribution Inc",
      address: "456 Logistics Avenue, District 7, Ho Chi Minh City",
      contactInfo: {
        phone: "+84 28 9876 5432",
        email: "info@secondarydist.com",
      },
      isActive: true,
      isDeleted: false,
    });

    // Organization Settings
    await ctx.db.insert("organization_settings", {
      organizationId,
      settingKey: "default_currency",
      settingValue: { currency: "VND", symbol: "₫" },
    });

    await ctx.db.insert("organization_settings", {
      organizationId,
      settingKey: "timezone",
      settingValue: { timezone: "Asia/Ho_Chi_Minh", offset: "+07:00" },
    });

    await ctx.db.insert("organization_settings", {
      organizationId,
      settingKey: "inventory_settings",
      settingValue: {
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        autoReorderEnabled: true,
      },
    });

    // ================================================================
    // 3. BRANCHES
    // ================================================================

    const branchId = await ctx.db.insert("branches", {
      organizationId,
      name: "Main Warehouse Branch",
      address: "456 Storage Road, District 7, Ho Chi Minh City",
      phoneNumber: "+84 28 8765 4321",
      isActive: true,
      isDeleted: false,
    });

    const branch2Id = await ctx.db.insert("branches", {
      organizationId,
      name: "Secondary Branch",
      address: "789 Logistics Ave, District 2, Ho Chi Minh City",
      phoneNumber: "+84 28 1111 2222",
      isActive: true,
      isDeleted: false,
    });

    const branch3Id = await ctx.db.insert("branches", {
      organizationId,
      name: "North Distribution Center",
      address: "321 Industrial Park, Binh Duong Province",
      phoneNumber: "+84 274 3333 4444",
      isActive: true,
      isDeleted: false,
    });

    // Branch Settings
    await ctx.db.insert("branch_settings", {
      branchId,
      settingKey: "working_hours",
      settingValue: {
        start: "08:00",
        end: "18:00",
        workDays: [1, 2, 3, 4, 5, 6],
      },
    });

    await ctx.db.insert("branch_settings", {
      branchId,
      settingKey: "receiving_dock_count",
      settingValue: { docks: 5, maxCapacity: 20 },
    });

    await ctx.db.insert("branch_settings", {
      branchId: branch2Id,
      settingKey: "working_hours",
      settingValue: { start: "07:00", end: "19:00", workDays: [1, 2, 3, 4, 5] },
    });

    // ================================================================
    // 4. USERS
    // ================================================================
    // NOTE: In production, users should be created via Better Auth first,
    // then linked to Convex. These are test/seed data with mock auth IDs.
    // Passwords are managed by Better Auth, not stored here.

    const userId = await ctx.db.insert("users", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_user_testuser_001",
      emailVerified: true,
      image: undefined,
      authCreatedAt: now,
      authUpdatedAt: now,

      // Application-specific fields
      username: "testuser",
      fullName: "Test User",
      email: "testuser@testwarehouse.com",
      isActive: true,
      preferences: { theme: "light", language: "en" },
      isDeleted: false,
    });

    const adminUserId = await ctx.db.insert("users", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_user_admin_002",
      emailVerified: true,
      image: undefined,
      authCreatedAt: now,
      authUpdatedAt: now,

      // Application-specific fields
      username: "admin",
      fullName: "Admin User",
      email: "admin@testwarehouse.com",
      isActive: true,
      preferences: { theme: "dark", language: "vi" },
      isDeleted: false,
    });

    const managerUserId = await ctx.db.insert("users", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_user_manager_003",
      emailVerified: true,
      image: undefined,
      authCreatedAt: now,
      authUpdatedAt: now,

      // Application-specific fields
      username: "manager",
      fullName: "Warehouse Manager",
      email: "manager@testwarehouse.com",
      isActive: true,
      preferences: { theme: "light", language: "vi" },
      isDeleted: false,
    });

    const receiverUserId = await ctx.db.insert("users", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_user_receiver_004",
      emailVerified: true,
      image: undefined,
      authCreatedAt: now,
      authUpdatedAt: now,

      // Application-specific fields
      username: "receiver",
      fullName: "Goods Receiver",
      email: "receiver@testwarehouse.com",
      isActive: true,
      preferences: { theme: "light", language: "en" },
      isDeleted: false,
    });

    const pickerUserId = await ctx.db.insert("users", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_user_picker_005",
      emailVerified: true,
      image: undefined,
      authCreatedAt: now,
      authUpdatedAt: now,

      // Application-specific fields
      username: "picker",
      fullName: "Order Picker",
      email: "picker@testwarehouse.com",
      isActive: true,
      preferences: { theme: "light", language: "en" },
      isDeleted: false,
    });

    const auditorUserId = await ctx.db.insert("users", {
      // Auth fields (normally synced from Better Auth)
      authId: "seed_user_auditor_006",
      emailVerified: true,
      image: undefined,
      authCreatedAt: now,
      authUpdatedAt: now,

      // Application-specific fields
      username: "auditor",
      fullName: "Inventory Auditor",
      email: "auditor@testwarehouse.com",
      isActive: true,
      preferences: { theme: "system", language: "en" },
      isDeleted: false,
    });

    // ================================================================
    // 5. MEMBERS (Link users to organizations)
    // ================================================================

    await ctx.db.insert("members", {
      userId,
      organizationId,
      userAuthId: "seed_user_testuser_001",
      organizationAuthId: "seed_org_test_warehouse_001",
    });

    await ctx.db.insert("members", {
      userId: adminUserId,
      organizationId,
      userAuthId: "seed_user_admin_002",
      organizationAuthId: "seed_org_test_warehouse_001",
    });

    await ctx.db.insert("members", {
      userId: managerUserId,
      organizationId,
      userAuthId: "seed_user_manager_003",
      organizationAuthId: "seed_org_test_warehouse_001",
    });

    await ctx.db.insert("members", {
      userId: receiverUserId,
      organizationId,
      userAuthId: "seed_user_receiver_004",
      organizationAuthId: "seed_org_test_warehouse_001",
    });

    await ctx.db.insert("members", {
      userId: pickerUserId,
      organizationId,
      userAuthId: "seed_user_picker_005",
      organizationAuthId: "seed_org_test_warehouse_001",
    });

    await ctx.db.insert("members", {
      userId: auditorUserId,
      organizationId,
      userAuthId: "seed_user_auditor_006",
      organizationAuthId: "seed_org_test_warehouse_001",
    });

    // ================================================================
    // 6. ROLES & PERMISSIONS
    // ================================================================

    const adminRoleId = await ctx.db.insert("roles", {
      organizationId,
      name: "Administrator",
      description: "Full system access with all permissions",
      isSystemDefault: true,
    });

    const managerRoleId = await ctx.db.insert("roles", {
      organizationId,
      name: "Warehouse Manager",
      description: "Manage warehouse operations and staff",
      isSystemDefault: true,
    });

    const receiverRoleId = await ctx.db.insert("roles", {
      organizationId,
      name: "Receiver",
      description: "Handle inbound goods receiving",
      isSystemDefault: true,
    });

    const pickerRoleId = await ctx.db.insert("roles", {
      organizationId,
      name: "Picker",
      description: "Pick and pack orders for shipping",
      isSystemDefault: true,
    });

    const auditorRoleId = await ctx.db.insert("roles", {
      organizationId,
      name: "Auditor",
      description: "Perform inventory audits and cycle counts",
      isSystemDefault: false,
    });

    const viewerRoleId = await ctx.db.insert("roles", {
      organizationId,
      name: "Viewer",
      description: "Read-only access to warehouse data",
      isSystemDefault: false,
    });

    // Role Permissions
    await ctx.db.insert("role_permissions", {
      roleId: adminRoleId,
      permissionCategory: "inventory",
      permissionBits: 0xffffffff, // All permissions
      scopeType: "organization",
    });

    await ctx.db.insert("role_permissions", {
      roleId: adminRoleId,
      permissionCategory: "orders",
      permissionBits: 0xffffffff,
      scopeType: "organization",
    });

    await ctx.db.insert("role_permissions", {
      roleId: adminRoleId,
      permissionCategory: "users",
      permissionBits: 0xffffffff,
      scopeType: "organization",
    });

    await ctx.db.insert("role_permissions", {
      roleId: managerRoleId,
      permissionCategory: "inventory",
      permissionBits: 0x0f, // Read, write, update
      scopeType: "branch",
    });

    await ctx.db.insert("role_permissions", {
      roleId: managerRoleId,
      permissionCategory: "orders",
      permissionBits: 0x0f,
      scopeType: "branch",
    });

    await ctx.db.insert("role_permissions", {
      roleId: receiverRoleId,
      permissionCategory: "receiving",
      permissionBits: 0x07, // Read, write, update
      scopeType: "branch",
    });

    await ctx.db.insert("role_permissions", {
      roleId: pickerRoleId,
      permissionCategory: "picking",
      permissionBits: 0x07,
      scopeType: "branch",
    });

    await ctx.db.insert("role_permissions", {
      roleId: auditorRoleId,
      permissionCategory: "inventory",
      permissionBits: 0x03, // Read, write
      scopeType: "branch",
    });

    await ctx.db.insert("role_permissions", {
      roleId: viewerRoleId,
      permissionCategory: "inventory",
      permissionBits: 0x01, // Read only
      scopeType: "branch",
    });

    // User Role Assignments
    await ctx.db.insert("user_role_assignments", {
      userId: adminUserId,
      roleId: adminRoleId,
      assignedAt: now,
    });

    await ctx.db.insert("user_role_assignments", {
      userId: managerUserId,
      roleId: managerRoleId,
      branchId,
      assignedAt: now,
    });

    await ctx.db.insert("user_role_assignments", {
      userId: receiverUserId,
      roleId: receiverRoleId,
      branchId,
      assignedAt: now,
    });

    await ctx.db.insert("user_role_assignments", {
      userId: pickerUserId,
      roleId: pickerRoleId,
      branchId,
      assignedAt: now,
    });

    await ctx.db.insert("user_role_assignments", {
      userId: auditorUserId,
      roleId: auditorRoleId,
      branchId,
      assignedAt: now,
    });

    await ctx.db.insert("user_role_assignments", {
      userId,
      roleId: viewerRoleId,
      branchId,
      assignedAt: now,
    });

    // User Branch Assignments
    await ctx.db.insert("user_branch_assignments", {
      userId: managerUserId,
      branchId,
      assignmentStatusTypeId: assignmentActiveStatusId,
      assignedAt: now,
    });

    await ctx.db.insert("user_branch_assignments", {
      userId: receiverUserId,
      branchId,
      assignmentStatusTypeId: assignmentActiveStatusId,
      assignedAt: now,
    });

    await ctx.db.insert("user_branch_assignments", {
      userId: pickerUserId,
      branchId,
      assignmentStatusTypeId: assignmentActiveStatusId,
      assignedAt: now,
    });

    await ctx.db.insert("user_branch_assignments", {
      userId: auditorUserId,
      branchId,
      assignmentStatusTypeId: assignmentActiveStatusId,
      assignedAt: now,
    });

    await ctx.db.insert("user_branch_assignments", {
      userId: managerUserId,
      branchId: branch2Id,
      assignmentStatusTypeId: assignmentActiveStatusId,
      assignedAt: now,
    });

    // // Workspace Invitations
    // const invitationId = await ctx.db.insert("workspace_invitations", {
    //   organizationId,
    //   invitationCode: "INV-2026-001",
    //   createdByAuthUserId: adminUserId,
    //   expiresAt: now + oneWeek,
    //   statusTypeId: invitationPendingStatusId,
    // });

    // await ctx.db.insert("workspace_invitations", {
    //   organizationId,
    //   invitationCode: "INV-2026-002",
    //   createdByAuthUserId: adminUserId,
    //   expiresAt: now + oneWeek * 2,
    //   statusTypeId: invitationPendingStatusId,
    // });

    // ================================================================
    // 6. BRANDS
    // ================================================================

    const brand1Id = await ctx.db.insert("brands", {
      organizationId: organizationId as unknown as string,
      name: "TechGear Electronics",
      isActive: true,
    });

    const brand2Id = await ctx.db.insert("brands", {
      organizationId: organizationId as unknown as string,
      name: "HomeEssentials",
      isActive: true,
    });

    const brand3Id = await ctx.db.insert("brands", {
      organizationId: organizationId as unknown as string,
      name: "OfficeMax Pro",
      isActive: true,
    });

    const brand4Id = await ctx.db.insert("brands", {
      organizationId: organizationId as unknown as string,
      name: "SportZone",
      isActive: true,
    });

    const brand5Id = await ctx.db.insert("brands", {
      organizationId: organizationId as unknown as string,
      name: "FreshFoods Co",
      isActive: true,
    });

    // ================================================================
    // 7. CATEGORIES
    // ================================================================

    const electronicsCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Electronics",
      path: "electronics",
      isActive: true,
      isDeleted: false,
    });

    const computerPeripheralsCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Computer Peripherals",
      path: "electronics.peripherals",
      isActive: true,
      isDeleted: false,
    });

    const audioVideoCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Audio & Video",
      path: "electronics.audio_video",
      isActive: true,
      isDeleted: false,
    });

    const homeCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Home & Living",
      path: "home_living",
      isActive: true,
      isDeleted: false,
    });

    const furnitureCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Furniture",
      path: "home_living.furniture",
      isActive: true,
      isDeleted: false,
    });

    const lightingCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Lighting",
      path: "home_living.lighting",
      isActive: true,
      isDeleted: false,
    });

    const officeCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Office Supplies",
      path: "office",
      isActive: true,
      isDeleted: false,
    });

    const sportsCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Sports & Fitness",
      path: "sports",
      isActive: true,
      isDeleted: false,
    });

    const foodBeverageCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Food & Beverage",
      path: "food_beverage",
      isActive: true,
      isDeleted: false,
    });

    // Category Settings
    await ctx.db.insert("category_settings", {
      categoryId: electronicsCategory,
      settingKey: "requires_serial_tracking",
      settingValue: { enabled: true, format: "SKU-SERIAL" },
    });

    await ctx.db.insert("category_settings", {
      categoryId: foodBeverageCategory,
      settingKey: "expiry_tracking",
      settingValue: { enabled: true, warningDays: 30 },
    });

    // ================================================================
    // 8. PRODUCTS
    // ================================================================

    const product1Id = await ctx.db.insert("products", {
      organizationId,
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse with USB receiver",
      categoryId: computerPeripheralsCategory,
      brandId: brand1Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      reorderPoint: 50,
      isActive: true,
      isDeleted: false,
    });

    const product2Id = await ctx.db.insert("products", {
      organizationId,
      name: "Mechanical Keyboard",
      description: "RGB mechanical keyboard with Cherry MX switches",
      categoryId: computerPeripheralsCategory,
      brandId: brand1Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      reorderPoint: 30,
      isActive: true,
      isDeleted: false,
    });

    const product3Id = await ctx.db.insert("products", {
      organizationId,
      name: "USB-C Hub",
      description: "7-in-1 USB-C hub with HDMI and SD card reader",
      categoryId: computerPeripheralsCategory,
      brandId: brand1Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      reorderPoint: 40,
      isActive: true,
      isDeleted: false,
    });

    const product4Id = await ctx.db.insert("products", {
      organizationId,
      name: "Desk Lamp",
      description: "LED desk lamp with adjustable brightness",
      categoryId: lightingCategory,
      brandId: brand2Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      reorderPoint: 25,
      isActive: true,
      isDeleted: false,
    });

    const product5Id = await ctx.db.insert("products", {
      organizationId,
      name: "Bluetooth Speaker",
      description: "Portable Bluetooth speaker with 20-hour battery life",
      categoryId: audioVideoCategory,
      brandId: brand1Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      reorderPoint: 35,
      isActive: true,
      isDeleted: false,
    });

    const product6Id = await ctx.db.insert("products", {
      organizationId,
      name: "Office Chair",
      description: "Ergonomic office chair with lumbar support",
      categoryId: furnitureCategory,
      brandId: brand3Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      reorderPoint: 15,
      isActive: true,
      isDeleted: false,
    });

    const product7Id = await ctx.db.insert("products", {
      organizationId,
      name: "Yoga Mat",
      description: "Premium non-slip yoga mat 6mm thick",
      categoryId: sportsCategory,
      brandId: brand4Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      reorderPoint: 20,
      isActive: true,
      isDeleted: false,
    });

    const product8Id = await ctx.db.insert("products", {
      organizationId,
      name: "Protein Powder",
      description: "Whey protein powder 2kg chocolate flavor",
      categoryId: foodBeverageCategory,
      brandId: brand5Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fefoTrackingId,
      shelfLifeDays: 365,
      reorderPoint: 30,
      isActive: true,
      isDeleted: false,
    });

    const product9Id = await ctx.db.insert("products", {
      organizationId,
      name: "Standing Desk",
      description: "Electric height-adjustable standing desk 160cm",
      categoryId: furnitureCategory,
      brandId: brand3Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      reorderPoint: 10,
      isActive: true,
      isDeleted: false,
    });

    const product10Id = await ctx.db.insert("products", {
      organizationId,
      name: "Webcam HD",
      description: "1080p HD webcam with built-in microphone",
      categoryId: computerPeripheralsCategory,
      brandId: brand1Id,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      reorderPoint: 45,
      isActive: true,
      isDeleted: false,
    });

    // Product Type Templates

    // ================================================================
    // 9. PRODUCT VARIANTS (SKUs)
    // ================================================================

    const variant1Id = await ctx.db.insert("product_variants", {
      productId: product1Id,
      skuCode: "WM-BLK-001",
      description: "Wireless Mouse - Black",
      costPrice: 15.0,
      sellingPrice: 29.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.1,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const variant2Id = await ctx.db.insert("product_variants", {
      productId: product1Id,
      skuCode: "WM-WHT-001",
      description: "Wireless Mouse - White",
      costPrice: 15.0,
      sellingPrice: 29.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.1,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const variant3Id = await ctx.db.insert("product_variants", {
      productId: product2Id,
      skuCode: "KB-RGB-001",
      description: "Mechanical Keyboard - RGB",
      costPrice: 45.0,
      sellingPrice: 89.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.8,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const variant4Id = await ctx.db.insert("product_variants", {
      productId: product3Id,
      skuCode: "HUB-7IN1-001",
      description: "USB-C Hub 7-in-1",
      costPrice: 25.0,
      sellingPrice: 49.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.15,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const variant5Id = await ctx.db.insert("product_variants", {
      productId: product4Id,
      skuCode: "LAMP-LED-001",
      description: "LED Desk Lamp - White",
      costPrice: 18.0,
      sellingPrice: 39.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.5,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const variant6Id = await ctx.db.insert("product_variants", {
      productId: product5Id,
      skuCode: "SPK-BT-001",
      description: "Bluetooth Speaker - Black",
      costPrice: 35.0,
      sellingPrice: 69.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.4,
      temperatureSensitive: false,
      customFields: { color: "black", waterResistant: true },
      isActive: true,
      isDeleted: false,
    });

    const variant7Id = await ctx.db.insert("product_variants", {
      productId: product6Id,
      skuCode: "CHAIR-ERG-001",
      description: "Ergonomic Office Chair - Black",
      costPrice: 120.0,
      sellingPrice: 249.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 15.0,
      volumeM3: 0.5,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const variant8Id = await ctx.db.insert("product_variants", {
      productId: product7Id,
      skuCode: "YOGA-MAT-001",
      description: "Yoga Mat - Purple 6mm",
      costPrice: 12.0,
      sellingPrice: 29.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.2,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const variant9Id = await ctx.db.insert("product_variants", {
      productId: product8Id,
      skuCode: "PROT-CHO-2KG",
      description: "Protein Powder Chocolate 2kg",
      costPrice: 25.0,
      sellingPrice: 49.99,
      unitOfMeasureId: unitKgId,
      weightKg: 2.0,
      temperatureSensitive: false,
      customFields: { flavor: "chocolate", servings: 66 },
      isActive: true,
      isDeleted: false,
    });

    const variant10Id = await ctx.db.insert("product_variants", {
      productId: product9Id,
      skuCode: "DESK-STD-160",
      description: "Standing Desk 160cm - White",
      costPrice: 250.0,
      sellingPrice: 499.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 35.0,
      volumeM3: 0.8,
      temperatureSensitive: false,
      customFields: { heightRange: "70-120cm", motorType: "dual" },
      isActive: true,
      isDeleted: false,
    });

    const variant11Id = await ctx.db.insert("product_variants", {
      productId: product10Id,
      skuCode: "CAM-HD-1080",
      description: "Webcam HD 1080p",
      costPrice: 30.0,
      sellingPrice: 59.99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.2,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    // Product Barcodes
    await ctx.db.insert("product_barcodes", {
      skuId: variant1Id,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5901234123457",
    });

    await ctx.db.insert("product_barcodes", {
      skuId: variant2Id,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5901234123464",
    });

    await ctx.db.insert("product_barcodes", {
      skuId: variant3Id,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5901234123471",
    });

    await ctx.db.insert("product_barcodes", {
      skuId: variant4Id,
      barcodeTypeId: qrBarcodeTypeId,
      barcodeValue: "HUB7IN1001QR",
    });

    await ctx.db.insert("product_barcodes", {
      skuId: variant6Id,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5901234123488",
    });

    // ================================================================
    // 10. SUPPLIERS
    // ================================================================

    const supplier1Id = await ctx.db.insert("suppliers", {
      organizationId,
      brandId: brand1Id,
      name: "TechGear Vietnam Supplier",
      contactPerson: "Nguyen Van A",
      email: "supplier@techgear.vn",
      phone: "+84 909 123 456",
      defaultLeadTimeDays: 7,
      isActive: true,
      isDeleted: false,
    });

    const supplier2Id = await ctx.db.insert("suppliers", {
      organizationId,
      brandId: brand2Id,
      name: "HomeEssentials Distribution",
      contactPerson: "Tran Thi B",
      email: "orders@homeessentials.vn",
      phone: "+84 908 654 321",
      defaultLeadTimeDays: 5,
      isActive: true,
      isDeleted: false,
    });

    const supplier3Id = await ctx.db.insert("suppliers", {
      organizationId,
      brandId: brand3Id,
      name: "Office Furniture Direct",
      contactPerson: "Le Van C",
      email: "sales@officedirect.vn",
      phone: "+84 907 111 222",
      defaultLeadTimeDays: 14,
      isActive: true,
      isDeleted: false,
    });

    const supplier4Id = await ctx.db.insert("suppliers", {
      organizationId,
      brandId: brand4Id,
      name: "SportZone Wholesale",
      contactPerson: "Pham Thi D",
      email: "wholesale@sportzone.vn",
      phone: "+84 906 333 444",
      defaultLeadTimeDays: 10,
      isActive: true,
      isDeleted: false,
    });

    const supplier5Id = await ctx.db.insert("suppliers", {
      organizationId,
      brandId: brand5Id,
      name: "FreshFoods Distributor",
      contactPerson: "Hoang Van E",
      email: "orders@freshfoods.vn",
      phone: "+84 905 555 666",
      defaultLeadTimeDays: 3,
      isActive: true,
      isDeleted: false,
    });

    // ================================================================
    // 11. STORAGE ZONES
    // ================================================================

    const receivingZone1Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Receiving Dock A",
      path: "receiving.dock_a",
      zoneTypeId: receivingZoneTypeId,
      storageBlockType: "FLOOR",
      zoneAttributes: { capacity: 100, temperatureControlled: false },
      isDeleted: false,
    });

    const receivingZone2Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Receiving Dock B",
      path: "receiving.dock_b",
      zoneTypeId: receivingZoneTypeId,
      storageBlockType: "FLOOR",
      zoneAttributes: { capacity: 80, temperatureControlled: false },
      isDeleted: false,
    });

    const storageZone1Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "General Storage A",
      path: "storage.general_a",
      zoneTypeId: storageZoneTypeId,
      storageBlockType: "RACK",
      zoneAttributes: {
        capacity: 500,
        temperatureControlled: false,
        rackLevels: 5,
        aisles: 10,
      },
      isDeleted: false,
    });

    const storageZone2Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "General Storage B",
      path: "storage.general_b",
      zoneTypeId: storageZoneTypeId,
      storageBlockType: "RACK",
      zoneAttributes: {
        capacity: 400,
        temperatureControlled: false,
        rackLevels: 4,
        aisles: 8,
      },
      isDeleted: false,
    });

    const storageZone3Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "High Value Storage",
      path: "storage.high_value",
      zoneTypeId: storageZoneTypeId,
      storageBlockType: "SECURE_RACK",
      zoneAttributes: {
        capacity: 100,
        temperatureControlled: false,
        securityLevel: "high",
      },
      isDeleted: false,
    });

    const pickingZone1Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Picking Zone A",
      path: "picking.zone_a",
      zoneTypeId: pickingZoneTypeId,
      storageBlockType: "FLOW_RACK",
      zoneAttributes: { capacity: 200, pickFaces: 100 },
      isDeleted: false,
    });

    const pickingZone2Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Picking Zone B",
      path: "picking.zone_b",
      zoneTypeId: pickingZoneTypeId,
      storageBlockType: "FLOW_RACK",
      zoneAttributes: { capacity: 150, pickFaces: 75 },
      isDeleted: false,
    });

    const shippingZone1Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Shipping Dock 1",
      path: "shipping.dock_1",
      zoneTypeId: shippingZoneTypeId,
      storageBlockType: "FLOOR",
      zoneAttributes: { capacity: 50, dockDoors: 3 },
      isDeleted: false,
    });

    const shippingZone2Id = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Shipping Dock 2",
      path: "shipping.dock_2",
      zoneTypeId: shippingZoneTypeId,
      storageBlockType: "FLOOR",
      zoneAttributes: { capacity: 40, dockDoors: 2 },
      isDeleted: false,
    });

    // Storage zones for branch 2
    const branch2StorageZoneId = await ctx.db.insert("storage_zones", {
      branchId: branch2Id,
      name: "Branch 2 Main Storage",
      path: "storage.main",
      zoneTypeId: storageZoneTypeId,
      storageBlockType: "RACK",
      zoneAttributes: { capacity: 300, rackLevels: 4 },
      isDeleted: false,
    });

    // ================================================================
    // 12. PURCHASE ORDERS
    // ================================================================

    const purchaseOrder1Id = await ctx.db.insert("purchase_orders", {
      organizationId,
      branchId,
      code: "PO-2026-001",
      supplierId: supplier1Id,
      orderedAt: now - oneWeek,
      expectedDeliveryAt: now + oneDay * 3,
      createdByUserId: managerUserId,
      purchaseOrderStatusTypeId: approvedStatusId,
      isDeleted: false,
    });

    const purchaseOrder2Id = await ctx.db.insert("purchase_orders", {
      organizationId,
      branchId,
      code: "PO-2026-002",
      supplierId: supplier2Id,
      orderedAt: now - oneDay * 3,
      expectedDeliveryAt: now + oneDay * 5,
      createdByUserId: managerUserId,
      purchaseOrderStatusTypeId: partialStatusId, // Has in-progress receive session
      isDeleted: false,
    });

    const purchaseOrder3Id = await ctx.db.insert("purchase_orders", {
      organizationId,
      branchId,
      code: "PO-2026-003",
      supplierId: supplier3Id,
      orderedAt: now - oneWeek * 2,
      expectedDeliveryAt: now - oneDay * 3,
      createdByUserId: adminUserId,
      purchaseOrderStatusTypeId: receivedStatusId,
      isDeleted: false,
    });

    const purchaseOrder4Id = await ctx.db.insert("purchase_orders", {
      organizationId,
      branchId: branch2Id,
      code: "PO-2026-004",
      supplierId: supplier1Id,
      orderedAt: now - oneDay * 5,
      expectedDeliveryAt: now + oneDay * 2,
      createdByUserId: managerUserId,
      purchaseOrderStatusTypeId: approvedStatusId,
      isDeleted: false,
    });

    const purchaseOrder5Id = await ctx.db.insert("purchase_orders", {
      organizationId,
      branchId,
      code: "PO-2026-005",
      supplierId: supplier5Id,
      orderedAt: now - oneWeek * 3,
      createdByUserId: adminUserId,
      purchaseOrderStatusTypeId: cancelledStatusId,
      isDeleted: false,
    });

    // PO-2026-006: Pending PO with NO receive session (for testing dropdown selection)
    const purchaseOrder6Id = await ctx.db.insert("purchase_orders", {
      organizationId,
      branchId,
      code: "PO-2026-006",
      supplierId: supplier4Id,
      orderedAt: now - oneDay,
      expectedDeliveryAt: now + oneDay * 7,
      createdByUserId: managerUserId,
      purchaseOrderStatusTypeId: pendingStatusId,
      isDeleted: false,
    });

    // PO-2026-007: Another pending PO without receive session (for additional testing)
    const purchaseOrder7Id = await ctx.db.insert("purchase_orders", {
      organizationId,
      branchId,
      code: "PO-2026-007",
      supplierId: supplier1Id,
      orderedAt: now,
      expectedDeliveryAt: now + oneDay * 10,
      createdByUserId: adminUserId,
      purchaseOrderStatusTypeId: pendingStatusId,
      isDeleted: false,
    });

    // Purchase Order Details
    const poDetail1Id = await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder1Id,
      skuId: variant1Id,
      quantityOrdered: 100,
      unitCost: 15.0,
      quantityReceived: 0,
    });

    const poDetail2Id = await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder1Id,
      skuId: variant3Id,
      quantityOrdered: 50,
      unitCost: 45.0,
      quantityReceived: 0,
    });

    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder2Id,
      skuId: variant5Id,
      quantityOrdered: 75,
      unitCost: 18.0,
      quantityReceived: 0,
    });

    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder3Id,
      skuId: variant7Id,
      quantityOrdered: 20,
      unitCost: 120.0,
      quantityReceived: 20,
    });

    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder3Id,
      skuId: variant10Id,
      quantityOrdered: 10,
      unitCost: 250.0,
      quantityReceived: 10,
    });

    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder4Id,
      skuId: variant4Id,
      quantityOrdered: 60,
      unitCost: 25.0,
      quantityReceived: 0,
    });

    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder5Id,
      skuId: variant9Id,
      quantityOrdered: 50,
      unitCost: 25.0,
      quantityReceived: 0,
    });

    // Details for PO-2026-006 (pending, no receive session)
    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder6Id,
      skuId: variant8Id,
      quantityOrdered: 40,
      unitCost: 12.0,
      quantityReceived: 0,
    });

    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder6Id,
      skuId: variant6Id,
      quantityOrdered: 25,
      unitCost: 35.0,
      quantityReceived: 0,
    });

    // Details for PO-2026-007 (pending, no receive session)
    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder7Id,
      skuId: variant2Id,
      quantityOrdered: 60,
      unitCost: 15.0,
      quantityReceived: 0,
    });

    await ctx.db.insert("purchase_order_details", {
      purchaseOrderId: purchaseOrder7Id,
      skuId: variant11Id,
      quantityOrdered: 35,
      unitCost: 30.0,
      quantityReceived: 0,
    });

    // ================================================================
    // 13. INVENTORY BATCHES
    // ================================================================

    const batch1Id = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant1Id,
      zoneId: storageZone1Id,
      quantity: 150,
      branchId,
      supplierBatchNumber: "TECH-2025-1201",
      internalBatchNumber: "INT-001",
      receivedAt: now - oneWeek * 2,
      manufacturingDate: now - oneWeek * 4,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    const batch2Id = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant2Id,
      zoneId: storageZone1Id,
      quantity: 80,
      branchId,
      supplierBatchNumber: "TECH-2025-1202",
      internalBatchNumber: "INT-002",
      receivedAt: now - oneWeek * 2,
      manufacturingDate: now - oneWeek * 4,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    const batch3Id = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant3Id,
      zoneId: storageZone2Id,
      quantity: 45,
      branchId,
      supplierBatchNumber: "TECH-2025-1203",
      internalBatchNumber: "INT-003",
      receivedAt: now - oneWeek,
      manufacturingDate: now - oneWeek * 3,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    const batch4Id = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant5Id,
      zoneId: storageZone2Id,
      quantity: 60,
      branchId,
      supplierBatchNumber: "HOME-2025-0501",
      internalBatchNumber: "INT-004",
      receivedAt: now - oneDay * 10,
      manufacturingDate: now - oneWeek * 3,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    const batch5Id = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant7Id,
      zoneId: storageZone3Id,
      quantity: 20,
      branchId,
      supplierBatchNumber: "OFF-2025-0301",
      internalBatchNumber: "INT-005",
      receivedAt: now - oneDay * 3,
      manufacturingDate: now - oneWeek * 2,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    const batch6Id = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant9Id,
      zoneId: storageZone1Id,
      quantity: 40,
      branchId,
      supplierBatchNumber: "FOOD-2025-1001",
      internalBatchNumber: "INT-006",
      receivedAt: now - oneWeek,
      manufacturingDate: now - oneDay * 30,
      expiresAt: now + oneDay * 335, // expires in ~11 months
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    const batch7Id = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant8Id,
      zoneId: storageZone2Id,
      quantity: 100,
      branchId,
      supplierBatchNumber: "SPORT-2025-0801",
      internalBatchNumber: "INT-007",
      receivedAt: now - oneWeek * 3,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    const reservedBatchId = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant4Id,
      zoneId: pickingZone1Id,
      quantity: 25,
      branchId,
      supplierBatchNumber: "TECH-2025-1204",
      internalBatchNumber: "INT-008",
      receivedAt: now - oneDay * 5,
      batchStatusTypeId: batchReservedStatusId,
      isDeleted: false,
    });

    // Branch 2 inventory
    const branch2BatchId = await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: variant1Id,
      zoneId: branch2StorageZoneId,
      quantity: 50,
      branchId: branch2Id,
      supplierBatchNumber: "TECH-2025-1205",
      internalBatchNumber: "INT-B2-001",
      receivedAt: now - oneDay * 10,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // ================================================================
    // 14. SERIAL NUMBERS
    // ================================================================

    const serial1Id = await ctx.db.insert("serial_numbers", {
      organizationId,
      serialNumber: "SPK-BT-001-SN00001",
      skuId: variant6Id,
      zoneId: storageZone3Id,
      serialStatusTypeId: serialAvailableStatusId,
      warrantyExpiresAt: now + oneDay * 365,
    });

    const serial2Id = await ctx.db.insert("serial_numbers", {
      organizationId,
      serialNumber: "SPK-BT-001-SN00002",
      skuId: variant6Id,
      zoneId: storageZone3Id,
      serialStatusTypeId: serialAvailableStatusId,
      warrantyExpiresAt: now + oneDay * 365,
    });

    const serial3Id = await ctx.db.insert("serial_numbers", {
      organizationId,
      serialNumber: "DESK-STD-160-SN00001",
      skuId: variant10Id,
      batchId: batch5Id,
      zoneId: storageZone3Id,
      serialStatusTypeId: serialAvailableStatusId,
      warrantyExpiresAt: now + oneDay * 730, // 2 years warranty
      purchaseOrderId: purchaseOrder3Id,
    });

    const serial4Id = await ctx.db.insert("serial_numbers", {
      organizationId,
      serialNumber: "DESK-STD-160-SN00002",
      skuId: variant10Id,
      batchId: batch5Id,
      zoneId: storageZone3Id,
      serialStatusTypeId: serialSoldStatusId,
      warrantyExpiresAt: now + oneDay * 730,
      purchaseOrderId: purchaseOrder3Id,
    });

    // ================================================================
    // 15. OUTBOUND ORDERS
    // ================================================================

    const outboundOrder1Id = await ctx.db.insert("outbound_orders", {
      organizationId,
      branchId,
      orderCode: "OUT-2026-001",
      orderDate: now - oneDay * 2,
      requestedShipDate: now + oneDay,
      createdByUserId: managerUserId,
      outboundStatusTypeId: outboundProcessingStatusId,
      isDeleted: false,
    });

    const outboundOrder2Id = await ctx.db.insert("outbound_orders", {
      organizationId,
      branchId,
      orderCode: "OUT-2026-002",
      orderDate: now - oneDay * 5,
      requestedShipDate: now - oneDay * 2,
      trackingNumber: "VN1234567890",
      createdByUserId: managerUserId,
      outboundStatusTypeId: outboundShippedStatusId,
      isDeleted: false,
    });

    const outboundOrder3Id = await ctx.db.insert("outbound_orders", {
      organizationId,
      branchId,
      orderCode: "OUT-2026-003",
      orderDate: now,
      requestedShipDate: now + oneDay * 3,
      createdByUserId: adminUserId,
      outboundStatusTypeId: outboundPendingStatusId,
      isDeleted: false,
    });

    const outboundOrder4Id = await ctx.db.insert("outbound_orders", {
      organizationId,
      branchId,
      orderCode: "OUT-2026-004",
      orderDate: now - oneWeek,
      trackingNumber: "VN0987654321",
      createdByUserId: managerUserId,
      outboundStatusTypeId: outboundDeliveredStatusId,
      isDeleted: false,
    });

    // Outbound Order Details
    const outboundDetail1Id = await ctx.db.insert("outbound_order_details", {
      outboundOrderId: outboundOrder1Id,
      skuId: variant1Id,
      quantityRequested: 20,
      quantityPicked: 15,
      quantityPacked: 10,
    });

    await ctx.db.insert("outbound_order_details", {
      outboundOrderId: outboundOrder1Id,
      skuId: variant3Id,
      quantityRequested: 10,
      quantityPicked: 10,
      quantityPacked: 5,
    });

    await ctx.db.insert("outbound_order_details", {
      outboundOrderId: outboundOrder2Id,
      skuId: variant5Id,
      quantityRequested: 15,
      quantityPicked: 15,
      quantityPacked: 15,
    });

    await ctx.db.insert("outbound_order_details", {
      outboundOrderId: outboundOrder3Id,
      skuId: variant8Id,
      quantityRequested: 25,
      quantityPicked: 0,
      quantityPacked: 0,
    });

    await ctx.db.insert("outbound_order_details", {
      outboundOrderId: outboundOrder4Id,
      skuId: variant7Id,
      quantityRequested: 5,
      quantityPicked: 5,
      quantityPacked: 5,
    });

    // ================================================================
    // 16. TRANSFER ORDERS
    // ================================================================

    const transferOrder1Id = await ctx.db.insert("transfer_orders", {
      organizationId,
      transferCode: "TR-2026-001",
      sourceBranchId: branchId,
      destinationBranchId: branch2Id,
      createdByUserId: managerUserId,
      expectedDeliveryAt: now + oneDay * 2,
      transferStatusTypeId: transferInTransitStatusId,
      isDeleted: false,
    });

    const transferOrder2Id = await ctx.db.insert("transfer_orders", {
      organizationId,
      transferCode: "TR-2026-002",
      sourceBranchId: branch2Id,
      destinationBranchId: branchId,
      createdByUserId: adminUserId,
      expectedDeliveryAt: now + oneDay * 5,
      transferStatusTypeId: transferPendingStatusId,
      isDeleted: false,
    });

    const transferOrder3Id = await ctx.db.insert("transfer_orders", {
      organizationId,
      transferCode: "TR-2026-003",
      sourceBranchId: branchId,
      destinationBranchId: branch3Id,
      createdByUserId: managerUserId,
      expectedDeliveryAt: now - oneDay * 2,
      actualDeliveryAt: now - oneDay,
      trackingNumber: "TR-VN-001",
      transferStatusTypeId: transferCompletedStatusId,
      isDeleted: false,
    });

    // Transfer Order Details
    const transferDetail1Id = await ctx.db.insert("transfer_order_details", {
      transferOrderId: transferOrder1Id,
      skuId: variant1Id,
      quantityRequested: 30,
      quantityShipped: 30,
      quantityReceived: 0,
    });

    await ctx.db.insert("transfer_order_details", {
      transferOrderId: transferOrder1Id,
      skuId: variant2Id,
      quantityRequested: 20,
      quantityShipped: 20,
      quantityReceived: 0,
    });

    await ctx.db.insert("transfer_order_details", {
      transferOrderId: transferOrder2Id,
      skuId: variant4Id,
      quantityRequested: 15,
      quantityShipped: 0,
      quantityReceived: 0,
    });

    await ctx.db.insert("transfer_order_details", {
      transferOrderId: transferOrder3Id,
      skuId: variant3Id,
      quantityRequested: 10,
      quantityShipped: 10,
      quantityReceived: 10,
    });

    // ================================================================
    // 17. WORK SESSIONS
    // ================================================================

    const receiveSession1Id = await ctx.db.insert("work_sessions", {
      organizationId,
      branchId,
      sessionTypeId: receiveSessionTypeId,
      sessionCode: "RCV-2026-001",
      name: "PO-2026-003 Receiving",
      description: "Receiving session for purchase order PO-2026-003",
      assignedUserId: receiverUserId,
      sessionStatusTypeId: sessionCompletedStatusId,
      startedAt: now - oneDay * 3 - 3600000,
      completedAt: now - oneDay * 3,
      verifiedAt: now - oneDay * 3 + 1800000,
      verifiedByUserId: managerUserId,
      purchaseOrderId: purchaseOrder3Id,
    });

    const receiveSession2Id = await ctx.db.insert("work_sessions", {
      organizationId,
      branchId,
      sessionTypeId: receiveSessionTypeId,
      sessionCode: "RCV-2026-002",
      name: "PO-2026-001 Receiving",
      description: "Receiving session for purchase order PO-2026-001",
      assignedUserId: receiverUserId,
      sessionStatusTypeId: sessionPendingStatusId,
      purchaseOrderId: purchaseOrder1Id,
    });

    const pickSession1Id = await ctx.db.insert("work_sessions", {
      organizationId,
      branchId,
      sessionTypeId: pickSessionTypeId,
      sessionCode: "PICK-2026-001",
      name: "Order OUT-2026-001 Picking",
      description: "Picking session for outbound order OUT-2026-001",
      assignedUserId: pickerUserId,
      sessionStatusTypeId: sessionInProgressStatusId,
      startedAt: now - 3600000,
      outboundOrderId: outboundOrder1Id,
    });

    const pickSession2Id = await ctx.db.insert("work_sessions", {
      organizationId,
      branchId,
      sessionTypeId: pickSessionTypeId,
      sessionCode: "PICK-2026-002",
      name: "Order OUT-2026-002 Picking",
      description: "Picking session for outbound order OUT-2026-002",
      assignedUserId: pickerUserId,
      sessionStatusTypeId: sessionCompletedStatusId,
      startedAt: now - oneDay * 5,
      completedAt: now - oneDay * 5 + 7200000,
      verifiedAt: now - oneDay * 5 + 9000000,
      verifiedByUserId: managerUserId,
      outboundOrderId: outboundOrder2Id,
    });

    const cycleCountSession1Id = await ctx.db.insert("work_sessions", {
      organizationId,
      branchId,
      sessionTypeId: cycleCountSessionTypeId,
      sessionCode: "CC-2026-001",
      name: "Daily Cycle Count - Zone A",
      description: "Daily cycle count for General Storage A",
      cycleCountTypeId: dailyCycleCountTypeId,
      assignedUserId: auditorUserId,
      sessionStatusTypeId: sessionVerifiedStatusId,
      startedAt: now - oneDay,
      completedAt: now - oneDay + 5400000,
      verifiedAt: now - oneDay + 7200000,
      verifiedByUserId: managerUserId,
    });

    const cycleCountSession2Id = await ctx.db.insert("work_sessions", {
      organizationId,
      branchId,
      sessionTypeId: cycleCountSessionTypeId,
      sessionCode: "CC-2026-002",
      name: "Weekly Cycle Count - High Value",
      description: "Weekly cycle count for high value storage zone",
      cycleCountTypeId: weeklyCycleCountTypeId,
      assignedUserId: auditorUserId,
      sessionStatusTypeId: sessionPendingStatusId,
    });

    // Session Line Items
    await ctx.db.insert("session_line_items", {
      sessionId: pickSession1Id,
      skuId: variant1Id,
      expectedQuantity: 20,
      actualQuantity: 15,
      zoneId: pickingZone1Id,
      batchId: batch1Id,
      scannedAt: now - 1800000,
      notes: "5 units out of stock",
    });

    await ctx.db.insert("session_line_items", {
      sessionId: pickSession1Id,
      skuId: variant3Id,
      expectedQuantity: 10,
      actualQuantity: 10,
      zoneId: pickingZone1Id,
      batchId: batch3Id,
      scannedAt: now - 900000,
    });

    await ctx.db.insert("session_line_items", {
      sessionId: cycleCountSession1Id,
      skuId: variant1Id,
      expectedQuantity: 150,
      actualQuantity: 148,
      zoneId: storageZone1Id,
      batchId: batch1Id,
      scannedAt: now - oneDay + 3600000,
      notes: "Minor variance found",
    });

    await ctx.db.insert("session_line_items", {
      sessionId: cycleCountSession1Id,
      skuId: variant2Id,
      expectedQuantity: 80,
      actualQuantity: 80,
      zoneId: storageZone1Id,
      batchId: batch2Id,
      scannedAt: now - oneDay + 4500000,
    });

    await ctx.db.insert("session_line_items", {
      sessionId: receiveSession1Id,
      skuId: variant7Id,
      expectedQuantity: 20,
      actualQuantity: 20,
      zoneId: receivingZone1Id,
      scannedAt: now - oneDay * 3 - 1800000,
    });

    // Session Zone Assignments
    await ctx.db.insert("session_zone_assignments", {
      sessionId: cycleCountSession1Id,
      zoneId: storageZone1Id,
      assignedUserId: auditorUserId,
    });

    await ctx.db.insert("session_zone_assignments", {
      sessionId: cycleCountSession2Id,
      zoneId: storageZone3Id,
      assignedUserId: auditorUserId,
    });

    // Session Metrics
    await ctx.db.insert("session_metrics", {
      sessionId: receiveSession1Id,
      totalTimeSeconds: 3600,
      totalItemsProcessed: 30,
      accuracyRate: 100,
      calculatedAt: now - oneDay * 3,
    });

    await ctx.db.insert("session_metrics", {
      sessionId: pickSession2Id,
      totalTimeSeconds: 7200,
      totalItemsProcessed: 15,
      accuracyRate: 100,
      calculatedAt: now - oneDay * 5 + 7200000,
    });

    await ctx.db.insert("session_metrics", {
      sessionId: cycleCountSession1Id,
      totalTimeSeconds: 5400,
      totalItemsProcessed: 230,
      accuracyRate: 98.7,
      calculatedAt: now - oneDay + 5400000,
    });

    // ================================================================
    // 17.5 RECEIVE SESSIONS (linked to work_sessions and purchase_orders)
    // ================================================================

    // Receive session for PO-2026-003 (completed - received status)
    const receiveSessionRS1Id = await ctx.db.insert("receive_sessions", {
      receiveSessionCode: "RS-20260101-0001",
      purchaseOrderId: purchaseOrder3Id,
      branchId,
      receivedAt: now - oneDay * 3,
      receiveSessionStatusTypeId: receiveSessionCompleteStatusId,
    });

    // Link the work session to the receive session
    await ctx.db.patch(receiveSession1Id, {
      receiveSessionId: receiveSessionRS1Id,
    });

    // Receive session for PO-2026-001 (pending - just created)
    const receiveSessionRS2Id = await ctx.db.insert("receive_sessions", {
      receiveSessionCode: "RS-20260104-0001",
      purchaseOrderId: purchaseOrder1Id,
      branchId,
      receivedAt: now,
      receiveSessionStatusTypeId: receiveSessionPendingStatusId,
    });

    // Link the pending work session to this receive session
    await ctx.db.patch(receiveSession2Id, {
      receiveSessionId: receiveSessionRS2Id,
    });

    // Receive session for PO-2026-002 (in progress)
    const receiveSessionRS3Id = await ctx.db.insert("receive_sessions", {
      receiveSessionCode: "RS-20260103-0001",
      purchaseOrderId: purchaseOrder2Id,
      branchId,
      receivedAt: now - oneDay,
      receiveSessionStatusTypeId: receiveSessionInProgressStatusId,
    });

    // ================================================================
    // 17.6 RECEIVE SESSION DETAILS
    // ================================================================

    // Details for RS-20260101-0001 (completed receive session for PO-2026-003)
    await ctx.db.insert("receive_sessions_details", {
      receiveSessionId: receiveSessionRS1Id,
      skuId: variant7Id,
      quantityExpected: 20,
      quantityReceived: 20,
      notes: "All items received in good condition",
      recommendedZoneId: storageZone3Id,
      receiveSessionItemStatusTypeId: receiveItemCompleteStatusId,
    });

    await ctx.db.insert("receive_sessions_details", {
      receiveSessionId: receiveSessionRS1Id,
      skuId: variant10Id,
      quantityExpected: 10,
      quantityReceived: 10,
      recommendedZoneId: storageZone2Id,
      receiveSessionItemStatusTypeId: receiveItemCompleteStatusId,
    });

    // Details for RS-20260104-0001 (pending receive session for PO-2026-001)
    await ctx.db.insert("receive_sessions_details", {
      receiveSessionId: receiveSessionRS2Id,
      skuId: variant1Id,
      quantityExpected: 100,
      quantityReceived: 0,
      receiveSessionItemStatusTypeId: receiveItemPendingStatusId,
    });

    await ctx.db.insert("receive_sessions_details", {
      receiveSessionId: receiveSessionRS2Id,
      skuId: variant3Id,
      quantityExpected: 50,
      quantityReceived: 0,
      receiveSessionItemStatusTypeId: receiveItemPendingStatusId,
    });

    // Details for RS-20260103-0001 (in progress receive session for PO-2026-002)
    await ctx.db.insert("receive_sessions_details", {
      receiveSessionId: receiveSessionRS3Id,
      skuId: variant5Id,
      quantityExpected: 75,
      quantityReceived: 45,
      notes: "Partial receipt - remaining items expected tomorrow",
      recommendedZoneId: storageZone2Id,
      receiveSessionItemStatusTypeId: receiveItemPartialStatusId,
    });

    // ================================================================
    // 18. INVENTORY TRANSACTIONS
    // ================================================================

    await ctx.db.insert("inventory_transactions", {
      organizationId,
      batchId: batch1Id,
      quantityBefore: 0,
      quantityChange: 150,
      quantityAfter: 150,
      inventoryTransactionTypeId: receiveTransactionTypeId,
      createdByUserId: receiverUserId,
      notes: "Initial stock received",
      workSessionId: receiveSession1Id,
    });

    await ctx.db.insert("inventory_transactions", {
      organizationId,
      batchId: batch1Id,
      quantityBefore: 150,
      quantityChange: -15,
      quantityAfter: 135,
      inventoryTransactionTypeId: pickTransactionTypeId,
      createdByUserId: pickerUserId,
      notes: "Picked for order OUT-2026-001",
      outboundOrderDetailId: outboundDetail1Id,
      workSessionId: pickSession1Id,
    });

    await ctx.db.insert("inventory_transactions", {
      organizationId,
      batchId: batch1Id,
      quantityBefore: 135,
      quantityChange: -2,
      quantityAfter: 133,
      inventoryTransactionTypeId: adjustTransactionTypeId,
      createdByUserId: auditorUserId,
      notes: "Cycle count adjustment",
      workSessionId: cycleCountSession1Id,
    });

    await ctx.db.insert("inventory_transactions", {
      organizationId,
      batchId: batch1Id,
      quantityBefore: 133,
      quantityChange: -30,
      quantityAfter: 103,
      inventoryTransactionTypeId: transferTransactionTypeId,
      createdByUserId: managerUserId,
      notes: "Transfer to Branch 2",
      transferOrderDetailId: transferDetail1Id,
    });

    await ctx.db.insert("inventory_transactions", {
      organizationId,
      serialNumberId: serial4Id,
      quantityBefore: 1,
      quantityChange: -1,
      quantityAfter: 0,
      inventoryTransactionTypeId: pickTransactionTypeId,
      createdByUserId: pickerUserId,
      notes: "Serial number sold",
    });

    // ================================================================
    // 19. ADJUSTMENT REQUESTS
    // ================================================================

    const adjustmentRequest1Id = await ctx.db.insert("adjustment_requests", {
      organizationId: organizationId as unknown as string,
      branchId: branchId as unknown as string,
      requestCode: "ADJ-2026-001",
      adjustmentTypeId: quantityAdjustmentTypeId as unknown as string,
      requestedByUserId: auditorUserId as unknown as string,
      requestedAt: now - oneDay,
      approvedByUserId: managerUserId as unknown as string,
      approvedAt: now - oneDay + 3600000,
      adjustmentStatusTypeId: adjustmentApprovedStatusId as unknown as string,
      resolutionNotes: "Approved after physical count verification",
    });

    const adjustmentRequest2Id = await ctx.db.insert("adjustment_requests", {
      organizationId: organizationId as unknown as string,
      branchId: branchId as unknown as string,
      requestCode: "ADJ-2026-002",
      adjustmentTypeId: locationAdjustmentTypeId as unknown as string,
      requestedByUserId: pickerUserId as unknown as string,
      requestedAt: now - oneDay * 2,
      adjustmentStatusTypeId: adjustmentPendingStatusId as unknown as string,
    });

    const adjustmentRequest3Id = await ctx.db.insert("adjustment_requests", {
      organizationId: organizationId as unknown as string,
      branchId: branchId as unknown as string,
      requestCode: "ADJ-2026-003",
      adjustmentTypeId: quantityAdjustmentTypeId as unknown as string,
      requestedByUserId: auditorUserId as unknown as string,
      requestedAt: now - oneWeek,
      approvedByUserId: managerUserId as unknown as string,
      approvedAt: now - oneWeek + 7200000,
      adjustmentStatusTypeId: adjustmentRejectedStatusId as unknown as string,
      resolutionNotes: "Rejected - insufficient documentation",
    });

    // Adjustment Request Details
    await ctx.db.insert("adjustment_request_details", {
      adjustmentRequestId: adjustmentRequest1Id,
      batchId: batch1Id as unknown as string,
      skuId: variant1Id as unknown as string,
      expectedQuantity: 150,
      actualQuantity: 148,
      varianceQuantity: -2,
      costImpact: -30.0,
      reasonTypeId: countDiscrepancyReasonTypeId as unknown as string,
      customReasonNotes: "Found 2 units damaged during count",
    });

    await ctx.db.insert("adjustment_request_details", {
      adjustmentRequestId: adjustmentRequest2Id,
      batchId: batch3Id as unknown as string,
      skuId: variant3Id as unknown as string,
      expectedQuantity: 45,
      actualQuantity: 45,
      varianceQuantity: 0,
      costImpact: 0,
      reasonTypeId: countDiscrepancyReasonTypeId as unknown as string,
      fromZoneId: storageZone2Id as unknown as string,
      toZoneId: pickingZone1Id as unknown as string,
      quantity: 15,
    });

    // ================================================================
    // 20. RETURN REQUESTS
    // ================================================================

    const returnRequest1Id = await ctx.db.insert("return_requests", {
      organizationId: organizationId as unknown as string,
      branchId: branchId as unknown as string,
      requestCode: "RET-2026-001",
      supplierId: supplier1Id as unknown as string,
      requestedByUserId: managerUserId as unknown as string,
      requestedAt: now - oneDay * 3,
      returnStatusTypeId: returnApprovedStatusId as unknown as string,
      isDeleted: false,
    });

    const returnRequest2Id = await ctx.db.insert("return_requests", {
      organizationId: organizationId as unknown as string,
      branchId: branchId as unknown as string,
      requestCode: "RET-2026-002",
      supplierId: supplier3Id as unknown as string,
      requestedByUserId: receiverUserId as unknown as string,
      requestedAt: now - oneDay,
      returnStatusTypeId: returnPendingStatusId as unknown as string,
      isDeleted: false,
    });

    // Return Request Details
    await ctx.db.insert("return_request_details", {
      returnRequestId: returnRequest1Id,
      batchId: batch1Id as unknown as string,
      skuId: variant1Id as unknown as string,
      quantityToReturn: 5,
      reasonTypeId: defectiveReturnReasonId as unknown as string,
      customReasonNotes: "5 units have defective scroll wheels",
      expectedCreditAmount: 75.0,
    });

    await ctx.db.insert("return_request_details", {
      returnRequestId: returnRequest2Id,
      batchId: batch5Id as unknown as string,
      skuId: variant7Id as unknown as string,
      quantityToReturn: 2,
      reasonTypeId: wrongItemReturnReasonId as unknown as string,
      customReasonNotes: "Received wrong color variant",
      expectedCreditAmount: 240.0,
    });

    // ================================================================
    // 21. NOTIFICATIONS
    // ================================================================

    await ctx.db.insert("notifications", {
      organizationId,
      notificationCategoryTypeId: alertNotificationCategoryId,
      notificationType: "LOW_STOCK",
      recipientUserId: managerUserId,
      title: "Low Stock Alert",
      message:
        "Wireless Mouse (WM-BLK-001) is below reorder point. Current: 45, Reorder Point: 50",
      priorityTypeId: highPriorityTypeId,
      actionUrl: "/inventory/products/WM-BLK-001",
      relatedEntityType: "product_variants",
      relatedEntityId: variant1Id as unknown as string,
    });

    await ctx.db.insert("notifications", {
      organizationId,
      notificationCategoryTypeId: infoNotificationCategoryId,
      notificationType: "PO_APPROVED",
      recipientUserId: receiverUserId,
      title: "Purchase Order Approved",
      message:
        "Purchase order PO-2026-001 has been approved and is ready for receiving",
      priorityTypeId: mediumPriorityTypeId,
      actionUrl: "/purchase-orders/PO-2026-001",
      relatedEntityType: "purchase_orders",
      relatedEntityId: purchaseOrder1Id as unknown as string,
      readAt: now - oneDay,
    });

    await ctx.db.insert("notifications", {
      organizationId,
      notificationCategoryTypeId: reminderNotificationCategoryId,
      notificationType: "SESSION_ASSIGNED",
      recipientUserId: auditorUserId,
      title: "Cycle Count Assigned",
      message:
        "You have been assigned a weekly cycle count session for the high value storage zone",
      priorityTypeId: mediumPriorityTypeId,
      actionUrl: "/sessions/CC-2026-002",
      relatedEntityType: "work_sessions",
      relatedEntityId: cycleCountSession2Id as unknown as string,
    });

    await ctx.db.insert("notifications", {
      organizationId,
      notificationCategoryTypeId: alertNotificationCategoryId,
      notificationType: "EXPIRY_WARNING",
      recipientUserId: managerUserId,
      title: "Product Expiry Warning",
      message: "Protein Powder batch INT-006 will expire in 30 days",
      priorityTypeId: highPriorityTypeId,
      relatedEntityType: "inventory_batches",
      relatedEntityId: batch6Id as unknown as string,
    });

    await ctx.db.insert("notifications", {
      organizationId,
      notificationCategoryTypeId: infoNotificationCategoryId,
      notificationType: "TRANSFER_SHIPPED",
      recipientUserId: managerUserId,
      title: "Transfer Order Shipped",
      message:
        "Transfer order TR-2026-001 has been shipped to Secondary Branch",
      priorityTypeId: lowPriorityTypeId,
      relatedEntityType: "transfer_orders",
      relatedEntityId: transferOrder1Id as unknown as string,
      readAt: now - 3600000,
      dismissedAt: now - 1800000,
    });

    // ================================================================
    // 22. DEMAND FORECASTS
    // ================================================================

    await ctx.db.insert("demand_forecasts", {
      organizationId,
      skuId: variant1Id,
      forecastDate: now + oneDay * 30,
      forecastTypeId: demandForecastTypeId,
      predictedDemand: 200,
      confidenceInterval: 0.85,
      calculationMethod: "Moving Average",
    });

    await ctx.db.insert("demand_forecasts", {
      organizationId,
      skuId: variant3Id,
      forecastDate: now + oneDay * 30,
      forecastTypeId: demandForecastTypeId,
      predictedDemand: 75,
      confidenceInterval: 0.78,
      calculationMethod: "Exponential Smoothing",
    });

    await ctx.db.insert("demand_forecasts", {
      organizationId,
      skuId: variant8Id,
      forecastDate: now + oneDay * 60,
      forecastTypeId: seasonalForecastTypeId,
      predictedDemand: 150,
      confidenceInterval: 0.72,
      calculationMethod: "Seasonal Decomposition",
    });

    // ================================================================
    // 23. REPORT TEMPLATES
    // ================================================================

    await ctx.db.insert("report_templates", {
      organizationId,
      templateName: "Daily Inventory Summary",
      description:
        "Summary of inventory levels, movements, and alerts for the day",
      ownerUserId: adminUserId,
      templateConfig: {
        sections: ["inventory_levels", "movements", "alerts"],
        groupBy: "category",
        includeCharts: true,
      },
      sharingScopeTypeId: organizationShareScopeId,
    });

    await ctx.db.insert("report_templates", {
      organizationId,
      templateName: "Purchase Order Analysis",
      description: "Analysis of purchase orders by supplier and status",
      ownerUserId: managerUserId,
      templateConfig: {
        sections: ["po_summary", "supplier_breakdown", "lead_time_analysis"],
        dateRange: "last_30_days",
        includeCharts: true,
      },
      sharingScopeTypeId: organizationShareScopeId,
    });

    await ctx.db.insert("report_templates", {
      organizationId,
      templateName: "Personal Performance Report",
      description: "My personal picking and receiving performance metrics",
      ownerUserId: pickerUserId,
      templateConfig: {
        sections: ["sessions_completed", "accuracy_rate", "items_processed"],
        dateRange: "last_7_days",
      },
      sharingScopeTypeId: privateShareScopeId,
    });

    // ================================================================
    // 24. ATTACHMENTS
    // ================================================================

    await ctx.db.insert("attachments", {
      organizationId,
      fileName: "PO-2026-001-invoice.pdf",
      filePath: "/attachments/invoices/PO-2026-001-invoice.pdf",
      fileSizeBytes: 256000,
      mimeType: "application/pdf",
      uploadedByUserId: managerUserId,
      uploadedAt: now - oneWeek,
      entityType: "purchase_orders",
      entityId: 1,
      notes: "Supplier invoice for PO-2026-001",
    });

    await ctx.db.insert("attachments", {
      organizationId,
      fileName: "damage-report-001.jpg",
      filePath: "/attachments/reports/damage-report-001.jpg",
      fileSizeBytes: 1024000,
      mimeType: "image/jpeg",
      uploadedByUserId: receiverUserId,
      uploadedAt: now - oneDay * 3,
      entityType: "adjustment_requests",
      entityId: 1,
      notes: "Photo evidence of damaged wireless mouse units",
    });

    await ctx.db.insert("attachments", {
      organizationId,
      fileName: "product-manual-chair.pdf",
      filePath: "/attachments/manuals/product-manual-chair.pdf",
      fileSizeBytes: 512000,
      mimeType: "application/pdf",
      uploadedByUserId: adminUserId,
      uploadedAt: now - oneWeek * 2,
      entityType: "products",
      entityId: 6,
      notes: "Assembly and user manual for ergonomic office chair",
    });

    // ================================================================
    // 25. AUDIT LOGS
    // ================================================================

    await ctx.db.insert("audit_logs", {
      organizationId,
      userId: adminUserId,
      actionTypeId: createActionTypeId,
      entityType: "purchase_orders",
      entityId: purchaseOrder1Id as unknown as string,
      notes: "Created purchase order PO-2026-001",
      ipAddress: "192.168.1.100",
    });

    await ctx.db.insert("audit_logs", {
      organizationId,
      userId: managerUserId,
      actionTypeId: updateActionTypeId,
      entityType: "purchase_orders",
      entityId: purchaseOrder1Id as unknown as string,
      fieldName: "purchaseOrderStatusTypeId",
      oldValue: { status: "PENDING" },
      newValue: { status: "APPROVED" },
      notes: "Approved purchase order",
      ipAddress: "192.168.1.101",
    });

    await ctx.db.insert("audit_logs", {
      organizationId,
      userId: auditorUserId,
      actionTypeId: createActionTypeId,
      entityType: "adjustment_requests",
      entityId: adjustmentRequest1Id as unknown as string,
      notes: "Created adjustment request ADJ-2026-001",
      ipAddress: "192.168.1.102",
    });

    await ctx.db.insert("audit_logs", {
      organizationId,
      userId: managerUserId,
      actionTypeId: updateActionTypeId,
      entityType: "inventory_batches",
      entityId: batch1Id as unknown as string,
      fieldName: "quantity",
      oldValue: { quantity: 150 },
      newValue: { quantity: 148 },
      notes: "Quantity adjusted after cycle count",
      ipAddress: "192.168.1.101",
    });

    await ctx.db.insert("audit_logs", {
      organizationId,
      userId: adminUserId,
      actionTypeId: deleteActionTypeId,
      entityType: "purchase_orders",
      entityId: purchaseOrder5Id as unknown as string,
      notes: "Cancelled purchase order PO-2026-005",
      ipAddress: "192.168.1.100",
    });

    // ================================================================
    // RETURN CREATED IDS FOR TESTING
    // ================================================================

    return {
      success: true,
      message:
        "All mock data seeded successfully! Database populated with comprehensive test data.",
      summary: {
        organizations: 2,
        branches: 3,
        users: 6,
        roles: 6,
        brands: 5,
        categories: 9,
        products: 10,
        productVariants: 11,
        suppliers: 5,
        storageZones: 10,
        purchaseOrders: 7,
        outboundOrders: 4,
        transferOrders: 3,
        inventoryBatches: 9,
        serialNumbers: 4,
        workSessions: 6,
        receiveSessions: 3,
        notifications: 5,
        systemLookups: "55+",
      },
      ids: {
        // Organizations
        organizationId,
        organization2Id,

        // Branches
        branchId,
        branch2Id,
        branch3Id,

        // Users
        userId,
        adminUserId,
        managerUserId,
        receiverUserId,
        pickerUserId,
        auditorUserId,

        // Roles
        adminRoleId,
        managerRoleId,
        receiverRoleId,
        pickerRoleId,
        auditorRoleId,
        viewerRoleId,

        // Brands
        brand1Id,
        brand2Id,
        brand3Id,
        brand4Id,
        brand5Id,

        // Categories
        electronicsCategory,
        computerPeripheralsCategory,
        audioVideoCategory,
        homeCategory,
        furnitureCategory,
        lightingCategory,
        officeCategory,
        sportsCategory,
        foodBeverageCategory,

        // Products
        product1Id,
        product2Id,
        product3Id,
        product4Id,
        product5Id,
        product6Id,
        product7Id,
        product8Id,
        product9Id,
        product10Id,

        // Variants
        variant1Id,
        variant2Id,
        variant3Id,
        variant4Id,
        variant5Id,
        variant6Id,
        variant7Id,
        variant8Id,
        variant9Id,
        variant10Id,
        variant11Id,

        // Suppliers
        supplier1Id,
        supplier2Id,
        supplier3Id,
        supplier4Id,
        supplier5Id,

        // Storage Zones
        storageZones: {
          receivingZone1Id,
          receivingZone2Id,
          storageZone1Id,
          storageZone2Id,
          storageZone3Id,
          pickingZone1Id,
          pickingZone2Id,
          shippingZone1Id,
          shippingZone2Id,
          branch2StorageZoneId,
        },

        // Purchase Orders
        purchaseOrders: {
          purchaseOrder1Id,
          purchaseOrder2Id,
          purchaseOrder3Id,
          purchaseOrder4Id,
          purchaseOrder5Id,
          purchaseOrder6Id,
          purchaseOrder7Id,
        },

        // Outbound Orders
        outboundOrders: {
          outboundOrder1Id,
          outboundOrder2Id,
          outboundOrder3Id,
          outboundOrder4Id,
        },

        // Transfer Orders
        transferOrders: {
          transferOrder1Id,
          transferOrder2Id,
          transferOrder3Id,
        },

        // Inventory Batches
        batches: {
          batch1Id,
          batch2Id,
          batch3Id,
          batch4Id,
          batch5Id,
          batch6Id,
          batch7Id,
          reservedBatchId,
          branch2BatchId,
        },

        // Work Sessions
        workSessions: {
          receiveSession1Id,
          receiveSession2Id,
          pickSession1Id,
          pickSession2Id,
          cycleCountSession1Id,
          cycleCountSession2Id,
        },

        // Receive Sessions
        receiveSessions: {
          receiveSessionRS1Id,
          receiveSessionRS2Id,
          receiveSessionRS3Id,
        },

        // System Lookups - Status Types
        purchaseOrderStatuses: {
          pendingStatusId,
          approvedStatusId,
          receivedStatusId,
          cancelledStatusId,
          partialStatusId,
        },
        outboundStatuses: {
          outboundPendingStatusId,
          outboundProcessingStatusId,
          outboundShippedStatusId,
          outboundDeliveredStatusId,
        },
        transferStatuses: {
          transferPendingStatusId,
          transferInTransitStatusId,
          transferCompletedStatusId,
        },
        sessionStatuses: {
          sessionPendingStatusId,
          sessionInProgressStatusId,
          sessionCompletedStatusId,
          sessionVerifiedStatusId,
        },
        batchStatuses: {
          batchActiveStatusId,
          batchReservedStatusId,
          batchExpiredStatusId,
        },

        // System Lookups - Other Types
        unitOfMeasures: {
          unitPieceId,
          unitBoxId,
          unitKgId,
        },
        storageRequirements: {
          normalStorageId,
          coldStorageId,
          freezerStorageId,
        },
        trackingMethods: {
          fifoTrackingId,
          fefoTrackingId,
          serialTrackingId,
        },
        zoneTypes: {
          receivingZoneTypeId,
          storageZoneTypeId,
          pickingZoneTypeId,
          shippingZoneTypeId,
        },
        sessionTypes: {
          receiveSessionTypeId,
          pickSessionTypeId,
          cycleCountSessionTypeId,
        },
      },
    };
  },
});

/**
 * Clear all test data (use with caution!)
 * This clears all seeded tables in dependency order.
 */
export const clearAllTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in reverse order of dependencies (child tables first, parent tables last)
    const tables = [
      // Audit & Logs
      "audit_logs",

      // Attachments
      "attachments",

      // Reports & Analytics
      "report_templates",
      "demand_forecasts",

      // Notifications
      "notifications",

      // Transfer Orders
      "transfer_order_details",
      "transfer_orders",

      // Return Requests
      "return_request_details",
      "return_requests",

      // Adjustment Requests
      "adjustment_request_details",
      "adjustment_requests",

      // Outbound Orders
      "outbound_order_details",
      "outbound_orders",

      // Inventory Transactions & Tracking
      "inventory_transactions",
      "serial_numbers",
      "inventory_batches",

      // Receive Sessions (delete before work_sessions)
      "receive_sessions_details",
      "receive_sessions",

      // Work Sessions
      "session_metrics",
      "session_zone_assignments",
      "session_line_items",
      "work_sessions",

      // Purchase Orders
      "purchase_order_details",
      "purchase_orders",

      // Storage & Zones
      "storage_zones",

      // Products & Variants
      "product_barcodes",
      "product_variants",
      "products",

      // Suppliers
      "suppliers",

      // Categories & Brands
      "category_settings",
      "categories",
      "brands",

      // User Management
      "user_role_assignments",
      "role_permissions",
      "roles",
      "user_branch_assignments",
      "users",

      // Workspace Invitations
      // "workspace_invitations",

      // Branch Settings
      "branch_settings",
      "branches",

      // Organization Settings
      "organization_settings",
      "organizations",

      // System Lookups (delete last as many tables reference it)
      "system_lookups",
    ] as const;

    const deletedCounts: Record<string, number> = {};
    let totalDeleted = 0;

    for (const table of tables) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
      deletedCounts[table] = records.length;
      totalDeleted += records.length;
    }

    return {
      success: true,
      message: `All test data cleared! Total records deleted: ${totalDeleted}`,
      deletedCounts,
      totalDeleted,
    };
  },
});

/**
 * Clear ALL database data (use with extreme caution!)
 * This removes ALL records from ALL tables in the database.
 * Useful for completely resetting the database before seeding.
 */
export const clearAllDatabaseData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in reverse order of dependencies (child tables first, parent tables last)
    // Order matters to avoid foreign key constraint issues
    const tables = [
      // Audit & Logs (no dependencies on other tables)
      "audit_logs",

      // Attachments
      "attachments",

      // Reports & Analytics
      "report_templates",
      "demand_forecasts",

      // Notifications
      "notifications",

      // Transfer Orders
      "transfer_order_details",
      "transfer_orders",

      // Return Requests
      "return_request_details",
      "return_requests",

      // Adjustment Requests
      "adjustment_request_details",
      "adjustment_requests",

      // Outbound Orders
      "outbound_order_details",
      "outbound_orders",

      // Inventory Transactions & Tracking
      "inventory_transactions",
      "serial_numbers",
      "inventory_batches",

      // Receive Sessions (delete before work_sessions)
      "receive_sessions_details",
      "receive_sessions",

      // Work Sessions
      "session_metrics",
      "session_zone_assignments",
      "session_line_items",
      "work_sessions",

      // Purchase Orders
      "purchase_order_details",
      "purchase_orders",

      // Storage & Zones
      "storage_zones",

      // Products & Variants
      "product_barcodes",
      "product_variants",
      "products",

      // Suppliers
      "suppliers",

      // Categories & Brands
      "category_settings",
      "categories",
      "brands",

      // User Management
      "user_role_assignments",
      "role_permissions",
      "roles",
      "user_branch_assignments",
      "users",

      // Workspace Invitations
      // "workspace_invitations",

      // Branch Settings
      "branch_settings",
      "branches",

      // Organization Settings
      "organization_settings",
      "organizations",

      // System Lookups (delete last as many tables reference it)
      "system_lookups",
    ] as const;

    const deletedCounts: Record<string, number> = {};
    let totalDeleted = 0;

    for (const table of tables) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
      deletedCounts[table] = records.length;
      totalDeleted += records.length;
    }

    return {
      success: true,
      message: `All database data cleared! Total records deleted: ${totalDeleted}`,
      deletedCounts,
      totalDeleted,
    };
  },
});

/**
 * Seed product inventory data for an existing organization and branch
 * Use this to populate products, variants, batches, etc. for testing the Product Inventory page
 */
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const seedProductInventoryData = mutation({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const { organizationId, branchId } = args;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Verify organization and branch exist
    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const branch = await ctx.db.get(branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // ================================================================
    // 1. GET OR CREATE SYSTEM LOOKUPS
    // ================================================================

    // Helper function to get or create lookup
    const getOrCreateLookup = async (
      lookupType: string,
      lookupCode: string,
      lookupValue: string,
      description: string,
      sortOrder: number,
    ) => {
      const existing = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType_lookupCode", (q) =>
          q.eq("lookupType", lookupType).eq("lookupCode", lookupCode),
        )
        .first();

      if (existing) return existing._id;

      return await ctx.db.insert("system_lookups", {
        lookupType,
        lookupCode,
        lookupValue,
        description,
        sortOrder,
      });
    };

    // Storage Requirements
    const normalStorageId = await getOrCreateLookup(
      "StorageRequirement",
      "NORMAL",
      "Normal",
      "Standard storage conditions",
      1,
    );
    const coldStorageId = await getOrCreateLookup(
      "StorageRequirement",
      "COLD",
      "Cold Storage",
      "Refrigerated storage required",
      2,
    );
    const freezerStorageId = await getOrCreateLookup(
      "StorageRequirement",
      "FREEZER",
      "Freezer",
      "Frozen storage required",
      3,
    );

    // Tracking Methods
    const fifoTrackingId = await getOrCreateLookup(
      "TrackingMethod",
      "FIFO",
      "FIFO",
      "First In First Out tracking",
      1,
    );
    const fefoTrackingId = await getOrCreateLookup(
      "TrackingMethod",
      "FEFO",
      "FEFO",
      "First Expired First Out tracking",
      2,
    );
    const serialTrackingId = await getOrCreateLookup(
      "TrackingMethod",
      "SERIAL",
      "Serial Number",
      "Serial number tracking",
      3,
    );

    // Unit of Measures
    const unitPieceId = await getOrCreateLookup(
      "UnitOfMeasure",
      "PCS",
      "Piece",
      "Individual piece/unit",
      1,
    );
    const unitBoxId = await getOrCreateLookup(
      "UnitOfMeasure",
      "BOX",
      "Box",
      "Box/carton unit",
      2,
    );
    const unitKgId = await getOrCreateLookup(
      "UnitOfMeasure",
      "KG",
      "Kilogram",
      "Weight in kilograms",
      3,
    );
    const unitLiterId = await getOrCreateLookup(
      "UnitOfMeasure",
      "L",
      "Liter",
      "Volume in liters",
      4,
    );

    // Barcode Types
    const ean13BarcodeTypeId = await getOrCreateLookup(
      "BarcodeType",
      "EAN13",
      "EAN-13",
      "EAN-13 barcode format",
      1,
    );
    const qrBarcodeTypeId = await getOrCreateLookup(
      "BarcodeType",
      "QR",
      "QR Code",
      "QR code format",
      2,
    );

    // Batch Status
    const batchActiveStatusId = await getOrCreateLookup(
      "BatchStatus",
      "ACTIVE",
      "Active",
      "Batch is active and available",
      1,
    );
    const batchReservedStatusId = await getOrCreateLookup(
      "BatchStatus",
      "RESERVED",
      "Reserved",
      "Batch is reserved for an order",
      2,
    );

    // Zone Types
    const receivingZoneTypeId = await getOrCreateLookup(
      "ZoneType",
      "RECEIVING",
      "Receiving",
      "Receiving zone for inbound goods",
      1,
    );
    const storageZoneTypeId = await getOrCreateLookup(
      "ZoneType",
      "STORAGE",
      "Storage",
      "Main storage zone",
      2,
    );
    const pickingZoneTypeId = await getOrCreateLookup(
      "ZoneType",
      "PICKING",
      "Picking",
      "Picking zone for order fulfillment",
      3,
    );
    const coldZoneTypeId = await getOrCreateLookup(
      "ZoneType",
      "COLD_STORAGE",
      "Cold Storage",
      "Temperature controlled storage zone",
      4,
    );

    // ================================================================
    // 2. CREATE CATEGORIES
    // ================================================================

    const electronicsCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Electronics",
      path: "electronics",
      isActive: true,
      isDeleted: false,
    });

    const computersCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Computers & Laptops",
      path: "electronics.computers",
      isActive: true,
      isDeleted: false,
    });

    const phonesCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Phones & Tablets",
      path: "electronics.phones",
      isActive: true,
      isDeleted: false,
    });

    const accessoriesCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Accessories",
      path: "electronics.accessories",
      isActive: true,
      isDeleted: false,
    });

    const foodBeverageCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Food & Beverage",
      path: "food_beverage",
      isActive: true,
      isDeleted: false,
    });

    const drinksCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Beverages",
      path: "food_beverage.drinks",
      isActive: true,
      isDeleted: false,
    });

    const snacksCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Snacks",
      path: "food_beverage.snacks",
      isActive: true,
      isDeleted: false,
    });

    const householdCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Household",
      path: "household",
      isActive: true,
      isDeleted: false,
    });

    const cleaningCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Cleaning Supplies",
      path: "household.cleaning",
      isActive: true,
      isDeleted: false,
    });

    // ================================================================
    // 3. CREATE BRANDS
    // ================================================================

    const appleBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "Apple",
      isActive: true,
    });

    const samsungBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "Samsung",
      isActive: true,
    });

    const dellBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "Dell",
      isActive: true,
    });

    const sonyBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "Sony",
      isActive: true,
    });

    const cocaColaBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "Coca-Cola",
      isActive: true,
    });

    const nestleBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "Nestlé",
      isActive: true,
    });

    const pgBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "P&G",
      isActive: true,
    });

    const logitechBrand = await ctx.db.insert("brands", {
      organizationId: organizationId as string,
      name: "Logitech",
      isActive: true,
    });

    // ================================================================
    // 4. CREATE STORAGE ZONES
    // ================================================================

    const receivingZone = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Receiving Dock A",
      path: "receiving.dock_a",
      zoneTypeId: receivingZoneTypeId,
      storageBlockType: "FLOOR",
      zoneAttributes: { maxCapacity: 500, temperature: "ambient" },
      isDeleted: false,
    });

    const storageZoneA = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Storage Zone A",
      path: "storage.zone_a",
      zoneTypeId: storageZoneTypeId,
      storageBlockType: "RACK",
      zoneAttributes: { maxCapacity: 2000, aisles: 5, levels: 4 },
      isDeleted: false,
    });

    const storageZoneB = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Storage Zone B",
      path: "storage.zone_b",
      zoneTypeId: storageZoneTypeId,
      storageBlockType: "RACK",
      zoneAttributes: { maxCapacity: 1500, aisles: 4, levels: 3 },
      isDeleted: false,
    });

    const coldStorageZone = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Cold Storage",
      path: "storage.cold",
      zoneTypeId: coldZoneTypeId,
      storageBlockType: "SHELF",
      zoneAttributes: { maxCapacity: 500, temperature: "2-8C" },
      isDeleted: false,
    });

    const pickingZone = await ctx.db.insert("storage_zones", {
      branchId,
      name: "Picking Zone",
      path: "picking.main",
      zoneTypeId: pickingZoneTypeId,
      storageBlockType: "BIN",
      zoneAttributes: { maxCapacity: 300 },
      isDeleted: false,
    });

    // ================================================================
    // 5. CREATE PRODUCTS AND VARIANTS
    // ================================================================

    // Product 1: MacBook Pro
    const macbookPro = await ctx.db.insert("products", {
      organizationId,
      name: 'MacBook Pro 14"',
      description:
        "Apple MacBook Pro 14-inch with M3 Pro chip, professional laptop",
      categoryId: computersCategory,
      brandId: appleBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 5,
      isActive: true,
      isDeleted: false,
    });

    const macbookVariant1 = await ctx.db.insert("product_variants", {
      productId: macbookPro,
      skuCode: "MBP14-M3P-512-SG",
      description: "M3 Pro, 512GB SSD, Space Gray",
      costPrice: 1800,
      sellingPrice: 1999,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.55,
      volumeM3: 0.003,
      temperatureSensitive: false,
      stackingLimit: 5,
      isActive: true,
      isDeleted: false,
    });

    const macbookVariant2 = await ctx.db.insert("product_variants", {
      productId: macbookPro,
      skuCode: "MBP14-M3P-1TB-SL",
      description: "M3 Pro, 1TB SSD, Silver",
      costPrice: 2100,
      sellingPrice: 2499,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.55,
      volumeM3: 0.003,
      temperatureSensitive: false,
      stackingLimit: 5,
      isActive: true,
      isDeleted: false,
    });

    // Add barcodes for MacBook variants
    await ctx.db.insert("product_barcodes", {
      skuId: macbookVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "0194253721000",
    });
    await ctx.db.insert("product_barcodes", {
      skuId: macbookVariant2,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "0194253721017",
    });

    // Product 2: iPhone 15 Pro
    const iphone15Pro = await ctx.db.insert("products", {
      organizationId,
      name: "iPhone 15 Pro",
      description: "Apple iPhone 15 Pro with A17 Pro chip, titanium design",
      categoryId: phonesCategory,
      brandId: appleBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 20,
      isActive: true,
      isDeleted: false,
    });

    const iphoneVariant1 = await ctx.db.insert("product_variants", {
      productId: iphone15Pro,
      skuCode: "IP15P-128-NAT",
      description: "128GB, Natural Titanium",
      costPrice: 900,
      sellingPrice: 999,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.187,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const iphoneVariant2 = await ctx.db.insert("product_variants", {
      productId: iphone15Pro,
      skuCode: "IP15P-256-BLU",
      description: "256GB, Blue Titanium",
      costPrice: 1000,
      sellingPrice: 1099,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.187,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const iphoneVariant3 = await ctx.db.insert("product_variants", {
      productId: iphone15Pro,
      skuCode: "IP15P-512-BLK",
      description: "512GB, Black Titanium",
      costPrice: 1150,
      sellingPrice: 1299,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.187,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: iphoneVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "0194253820000",
    });
    await ctx.db.insert("product_barcodes", {
      skuId: iphoneVariant2,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "0194253820017",
    });

    // Product 3: Samsung Galaxy S24 Ultra
    const galaxyS24 = await ctx.db.insert("products", {
      organizationId,
      name: "Galaxy S24 Ultra",
      description: "Samsung Galaxy S24 Ultra with S Pen, AI features",
      categoryId: phonesCategory,
      brandId: samsungBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 15,
      isActive: true,
      isDeleted: false,
    });

    const galaxyVariant1 = await ctx.db.insert("product_variants", {
      productId: galaxyS24,
      skuCode: "SGS24U-256-BLK",
      description: "256GB, Titanium Black",
      costPrice: 1100,
      sellingPrice: 1299,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.232,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    const galaxyVariant2 = await ctx.db.insert("product_variants", {
      productId: galaxyS24,
      skuCode: "SGS24U-512-GRY",
      description: "512GB, Titanium Gray",
      costPrice: 1250,
      sellingPrice: 1419,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.232,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: galaxyVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "8806095349817",
    });

    // Product 4: Dell XPS 15
    const dellXps = await ctx.db.insert("products", {
      organizationId,
      name: "Dell XPS 15",
      description: "Dell XPS 15 laptop with InfinityEdge display",
      categoryId: computersCategory,
      brandId: dellBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 8,
      isActive: true,
      isDeleted: false,
    });

    const dellVariant1 = await ctx.db.insert("product_variants", {
      productId: dellXps,
      skuCode: "XPS15-I7-16-512",
      description: "Intel i7, 16GB RAM, 512GB SSD",
      costPrice: 1400,
      sellingPrice: 1599,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.86,
      temperatureSensitive: false,
      stackingLimit: 4,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: dellVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5397184590126",
    });

    // Product 5: Logitech MX Master 3S
    const mxMaster = await ctx.db.insert("products", {
      organizationId,
      name: "MX Master 3S Mouse",
      description: "Logitech MX Master 3S wireless mouse for professionals",
      categoryId: accessoriesCategory,
      brandId: logitechBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 25,
      isActive: true,
      isDeleted: false,
    });

    const mouseVariant1 = await ctx.db.insert("product_variants", {
      productId: mxMaster,
      skuCode: "MXM3S-BLK",
      description: "Graphite Black",
      costPrice: 85,
      sellingPrice: 99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.141,
      temperatureSensitive: false,
      stackingLimit: 20,
      isActive: true,
      isDeleted: false,
    });

    const mouseVariant2 = await ctx.db.insert("product_variants", {
      productId: mxMaster,
      skuCode: "MXM3S-WHT",
      description: "Pale Gray",
      costPrice: 85,
      sellingPrice: 99,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.141,
      temperatureSensitive: false,
      stackingLimit: 20,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: mouseVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5099206099784",
    });
    await ctx.db.insert("product_barcodes", {
      skuId: mouseVariant2,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5099206099791",
    });

    // Product 6: Sony WH-1000XM5
    const sonyHeadphones = await ctx.db.insert("products", {
      organizationId,
      name: "Sony WH-1000XM5",
      description: "Sony premium noise-canceling wireless headphones",
      categoryId: accessoriesCategory,
      brandId: sonyBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 12,
      isActive: true,
      isDeleted: false,
    });

    const headphoneVariant1 = await ctx.db.insert("product_variants", {
      productId: sonyHeadphones,
      skuCode: "WH1000XM5-BLK",
      description: "Black",
      costPrice: 320,
      sellingPrice: 399,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.25,
      temperatureSensitive: false,
      stackingLimit: 10,
      isActive: true,
      isDeleted: false,
    });

    const headphoneVariant2 = await ctx.db.insert("product_variants", {
      productId: sonyHeadphones,
      skuCode: "WH1000XM5-SLV",
      description: "Silver",
      costPrice: 320,
      sellingPrice: 399,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.25,
      temperatureSensitive: false,
      stackingLimit: 10,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: headphoneVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "4548736132610",
    });

    // Product 7: Coca-Cola (Cold Storage Item)
    const cocaCola = await ctx.db.insert("products", {
      organizationId,
      name: "Coca-Cola Classic",
      description: "Coca-Cola Classic carbonated soft drink",
      categoryId: drinksCategory,
      brandId: cocaColaBrand,
      storageRequirementTypeId: coldStorageId,
      trackingMethodTypeId: fefoTrackingId,
      shelfLifeDays: 180,
      reorderPoint: 100,
      isActive: true,
      isDeleted: false,
    });

    const cokeVariant1 = await ctx.db.insert("product_variants", {
      productId: cocaCola,
      skuCode: "COKE-330ML-CAN",
      description: "330ml Can",
      costPrice: 0.5,
      sellingPrice: 1.0,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.35,
      temperatureSensitive: true,
      stackingLimit: 24,
      isActive: true,
      isDeleted: false,
    });

    const cokeVariant2 = await ctx.db.insert("product_variants", {
      productId: cocaCola,
      skuCode: "COKE-1.5L-BTL",
      description: "1.5L Bottle",
      costPrice: 1.2,
      sellingPrice: 2.0,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.55,
      temperatureSensitive: true,
      stackingLimit: 6,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: cokeVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5449000000996",
    });
    await ctx.db.insert("product_barcodes", {
      skuId: cokeVariant2,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "5449000000439",
    });

    // Product 8: Nestlé KitKat
    const kitkat = await ctx.db.insert("products", {
      organizationId,
      name: "KitKat",
      description: "Nestlé KitKat chocolate wafer bar",
      categoryId: snacksCategory,
      brandId: nestleBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fefoTrackingId,
      shelfLifeDays: 365,
      reorderPoint: 50,
      isActive: true,
      isDeleted: false,
    });

    const kitkatVariant1 = await ctx.db.insert("product_variants", {
      productId: kitkat,
      skuCode: "KITKAT-4F-45G",
      description: "4 Finger 45g",
      costPrice: 0.8,
      sellingPrice: 1.5,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.045,
      temperatureSensitive: false,
      stackingLimit: 48,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: kitkatVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "7613034626837",
    });

    // Product 9: Tide Detergent (Low Stock Item - for testing)
    const tidePods = await ctx.db.insert("products", {
      organizationId,
      name: "Tide PODS",
      description: "P&G Tide PODS laundry detergent pacs",
      categoryId: cleaningCategory,
      brandId: pgBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: 730,
      reorderPoint: 30,
      isActive: true,
      isDeleted: false,
    });

    const tideVariant1 = await ctx.db.insert("product_variants", {
      productId: tidePods,
      skuCode: "TIDE-PODS-42CT",
      description: "42 Count Original",
      costPrice: 15,
      sellingPrice: 22,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.1,
      temperatureSensitive: false,
      stackingLimit: 8,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: tideVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "0037000509615",
    });

    // Product 10: AirPods Pro (Out of Stock Item - for testing)
    const airpodsPro = await ctx.db.insert("products", {
      organizationId,
      name: "AirPods Pro 2",
      description: "Apple AirPods Pro 2nd generation with USB-C",
      categoryId: accessoriesCategory,
      brandId: appleBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 15,
      isActive: true,
      isDeleted: false,
    });

    const airpodsVariant1 = await ctx.db.insert("product_variants", {
      productId: airpodsPro,
      skuCode: "APP2-USBC",
      description: "USB-C Charging Case",
      costPrice: 200,
      sellingPrice: 249,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.061,
      temperatureSensitive: false,
      stackingLimit: 30,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_barcodes", {
      skuId: airpodsVariant1,
      barcodeTypeId: ean13BarcodeTypeId,
      barcodeValue: "0194253939306",
    });

    // ================================================================
    // 6. CREATE INVENTORY BATCHES
    // ================================================================

    // MacBook Pro batches
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: macbookVariant1,
      zoneId: storageZoneA,
      quantity: 12,
      branchId,
      supplierBatchNumber: "APL-2024-001",
      internalBatchNumber: "IB-MBP-001",
      receivedAt: now - 30 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: macbookVariant2,
      zoneId: storageZoneA,
      quantity: 8,
      branchId,
      supplierBatchNumber: "APL-2024-002",
      internalBatchNumber: "IB-MBP-002",
      receivedAt: now - 20 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // iPhone batches
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: iphoneVariant1,
      zoneId: storageZoneA,
      quantity: 45,
      branchId,
      supplierBatchNumber: "APL-2024-010",
      internalBatchNumber: "IB-IP15-001",
      receivedAt: now - 15 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: iphoneVariant2,
      zoneId: storageZoneB,
      quantity: 30,
      branchId,
      supplierBatchNumber: "APL-2024-011",
      internalBatchNumber: "IB-IP15-002",
      receivedAt: now - 10 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: iphoneVariant3,
      zoneId: storageZoneB,
      quantity: 18,
      branchId,
      supplierBatchNumber: "APL-2024-012",
      internalBatchNumber: "IB-IP15-003",
      receivedAt: now - 5 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // Samsung Galaxy batches
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: galaxyVariant1,
      zoneId: storageZoneA,
      quantity: 25,
      branchId,
      supplierBatchNumber: "SAM-2024-001",
      internalBatchNumber: "IB-SGS24-001",
      receivedAt: now - 25 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: galaxyVariant2,
      zoneId: storageZoneA,
      quantity: 15,
      branchId,
      supplierBatchNumber: "SAM-2024-002",
      internalBatchNumber: "IB-SGS24-002",
      receivedAt: now - 18 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // Dell XPS batch
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: dellVariant1,
      zoneId: storageZoneB,
      quantity: 6,
      branchId,
      supplierBatchNumber: "DEL-2024-001",
      internalBatchNumber: "IB-XPS-001",
      receivedAt: now - 40 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // Logitech Mouse batches
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: mouseVariant1,
      zoneId: pickingZone,
      quantity: 50,
      branchId,
      supplierBatchNumber: "LOG-2024-001",
      internalBatchNumber: "IB-MXM-001",
      receivedAt: now - 45 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: mouseVariant2,
      zoneId: pickingZone,
      quantity: 35,
      branchId,
      supplierBatchNumber: "LOG-2024-002",
      internalBatchNumber: "IB-MXM-002",
      receivedAt: now - 30 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // Sony Headphones batch
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: headphoneVariant1,
      zoneId: storageZoneB,
      quantity: 20,
      branchId,
      supplierBatchNumber: "SNY-2024-001",
      internalBatchNumber: "IB-WH1K-001",
      receivedAt: now - 20 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: headphoneVariant2,
      zoneId: storageZoneB,
      quantity: 15,
      branchId,
      supplierBatchNumber: "SNY-2024-002",
      internalBatchNumber: "IB-WH1K-002",
      receivedAt: now - 15 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // Coca-Cola batches (with expiration dates)
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: cokeVariant1,
      zoneId: coldStorageZone,
      quantity: 480,
      branchId,
      supplierBatchNumber: "COKE-2024-001",
      internalBatchNumber: "IB-COKE-001",
      receivedAt: now - 60 * oneDay,
      manufacturingDate: now - 90 * oneDay,
      expiresAt: now + 90 * oneDay, // Expiring in 3 months
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: cokeVariant1,
      zoneId: coldStorageZone,
      quantity: 240,
      branchId,
      supplierBatchNumber: "COKE-2024-002",
      internalBatchNumber: "IB-COKE-002",
      receivedAt: now - 10 * oneDay,
      manufacturingDate: now - 30 * oneDay,
      expiresAt: now + 150 * oneDay, // Good for 5 months
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: cokeVariant2,
      zoneId: coldStorageZone,
      quantity: 120,
      branchId,
      supplierBatchNumber: "COKE-2024-003",
      internalBatchNumber: "IB-COKE-003",
      receivedAt: now - 5 * oneDay,
      manufacturingDate: now - 15 * oneDay,
      expiresAt: now + 165 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // KitKat batches (with expiration - one expiring soon)
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: kitkatVariant1,
      zoneId: storageZoneA,
      quantity: 200,
      branchId,
      supplierBatchNumber: "NES-2024-001",
      internalBatchNumber: "IB-KK-001",
      receivedAt: now - 100 * oneDay,
      manufacturingDate: now - 120 * oneDay,
      expiresAt: now + 20 * oneDay, // Expiring soon!
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: kitkatVariant1,
      zoneId: storageZoneA,
      quantity: 300,
      branchId,
      supplierBatchNumber: "NES-2024-002",
      internalBatchNumber: "IB-KK-002",
      receivedAt: now - 30 * oneDay,
      manufacturingDate: now - 45 * oneDay,
      expiresAt: now + 320 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // Tide PODS batch (LOW STOCK - below reorder point of 30)
    await ctx.db.insert("inventory_batches", {
      organizationId,
      skuId: tideVariant1,
      zoneId: storageZoneB,
      quantity: 15, // Low stock!
      branchId,
      supplierBatchNumber: "PG-2024-001",
      internalBatchNumber: "IB-TIDE-001",
      receivedAt: now - 60 * oneDay,
      manufacturingDate: now - 90 * oneDay,
      expiresAt: now + 640 * oneDay,
      batchStatusTypeId: batchActiveStatusId,
      isDeleted: false,
    });

    // AirPods Pro - NO BATCHES (OUT OF STOCK for testing)

    return {
      success: true,
      message: "Product inventory data seeded successfully!",
      data: {
        categories: 9,
        brands: 8,
        products: 10,
        variants: 17,
        barcodes: 14,
        zones: 5,
        batches: 18,
      },
    };
  },
});

/**
 * Seed supplier, product, product_variant, brand, category, and category_settings data
 * Uses fixed organization ID: m977byfpyb33cfpy2qmz376dgx7yty8r
 * Uses branch IDs: k97a6jbkr9esv8py3nvqnv9a817z2a3q, k972631gzedy6rwht69j2vftt17z3c4w, k972jv4q16arhyfjx3rf3pwze57z26e8
 */
export const seedSupplierProductData = mutation({
  args: {},
  handler: async (ctx) => {
    // Fixed organization ID (as string for brands, need to fetch for Id references)
    const ORGANIZATION_ID_STRING = "m977byfpyb33cfpy2qmz376dgx7yty8r";

    // Branch IDs to distribute data across
    const BRANCH_IDS = [
      "k97a6jbkr9esv8py3nvqnv9a817z2a3q",
      "k972631gzedy6rwht69j2vftt17z3c4w",
      "k972jv4q16arhyfjx3rf3pwze57z26e8",
    ];

    // First, find or create the organization with the specified ID pattern
    // We need a valid organization Id for products and suppliers
    let organizationDoc = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("authId"), ORGANIZATION_ID_STRING))
      .first();

    if (!organizationDoc) {
      // Create the organization if it doesn't exist
      const orgId = await ctx.db.insert("organizations", {
        authId: ORGANIZATION_ID_STRING,
        slug: "main-warehouse-org",
        logo: undefined,
        authMetadata: JSON.stringify({
          seed: true,
          createdBy: "seedSupplierProductData",
        }),
        authCreatedAt: Date.now(),
        name: "Main Warehouse Organization",
        address: "123 Warehouse Street, District 1, Ho Chi Minh City",
        contactInfo: {
          phone: "+84 28 1234 5678",
          email: "contact@mainwarehouse.com",
        },
        isActive: true,
        isDeleted: false,
      });
      organizationDoc = await ctx.db.get(orgId);
    }

    const organizationId = organizationDoc!._id;

    // ================================================================
    // FETCH SYSTEM LOOKUPS (assumed to exist from main seed)
    // ================================================================

    // Storage Requirement types
    const normalStorageLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "StorageRequirement").eq("lookupCode", "NORMAL"),
      )
      .first();

    const coldStorageLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "StorageRequirement").eq("lookupCode", "COLD"),
      )
      .first();

    // Tracking Method types
    const fifoTrackingLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "TrackingMethod").eq("lookupCode", "FIFO"),
      )
      .first();

    const serialTrackingLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "TrackingMethod").eq("lookupCode", "SERIAL"),
      )
      .first();

    // Unit of Measure types
    const unitPieceLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "UnitOfMeasure").eq("lookupCode", "PCS"),
      )
      .first();

    const unitBoxLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "UnitOfMeasure").eq("lookupCode", "BOX"),
      )
      .first();

    // Use fallback IDs if lookups don't exist (create them)
    let normalStorageId = normalStorageLookup?._id;
    let coldStorageId = coldStorageLookup?._id;
    let fifoTrackingId = fifoTrackingLookup?._id;
    let serialTrackingId = serialTrackingLookup?._id;
    let unitPieceId = unitPieceLookup?._id;
    let unitBoxId = unitBoxLookup?._id;

    // Create lookups if they don't exist
    if (!normalStorageId) {
      normalStorageId = await ctx.db.insert("system_lookups", {
        lookupType: "StorageRequirement",
        lookupCode: "NORMAL",
        lookupValue: "Normal",
        description: "Standard storage conditions",
        sortOrder: 1,
      });
    }

    if (!coldStorageId) {
      coldStorageId = await ctx.db.insert("system_lookups", {
        lookupType: "StorageRequirement",
        lookupCode: "COLD",
        lookupValue: "Cold Storage",
        description: "Refrigerated storage required",
        sortOrder: 2,
      });
    }

    if (!fifoTrackingId) {
      fifoTrackingId = await ctx.db.insert("system_lookups", {
        lookupType: "TrackingMethod",
        lookupCode: "FIFO",
        lookupValue: "FIFO",
        description: "First In First Out tracking",
        sortOrder: 1,
      });
    }

    if (!serialTrackingId) {
      serialTrackingId = await ctx.db.insert("system_lookups", {
        lookupType: "TrackingMethod",
        lookupCode: "SERIAL",
        lookupValue: "Serial Number",
        description: "Serial number tracking",
        sortOrder: 3,
      });
    }

    if (!unitPieceId) {
      unitPieceId = await ctx.db.insert("system_lookups", {
        lookupType: "UnitOfMeasure",
        lookupCode: "PCS",
        lookupValue: "Piece",
        description: "Individual piece/unit",
        sortOrder: 1,
      });
    }

    if (!unitBoxId) {
      unitBoxId = await ctx.db.insert("system_lookups", {
        lookupType: "UnitOfMeasure",
        lookupCode: "BOX",
        lookupValue: "Box",
        description: "Box/carton unit",
        sortOrder: 2,
      });
    }

    // ================================================================
    // 1. CATEGORIES (4 categories - one for each supplier type)
    // ================================================================

    const electronicsCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Electronics",
      path: "electronics",
      isActive: true,
      isDeleted: false,
    });

    const officeGoodsCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Office Goods",
      path: "office-goods",
      isActive: true,
      isDeleted: false,
    });

    const sportsHealthCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Sports & Health Care",
      path: "sports-health",
      isActive: true,
      isDeleted: false,
    });

    const householdFurnitureCategory = await ctx.db.insert("categories", {
      organizationId,
      name: "Household Furniture",
      path: "household-furniture",
      isActive: true,
      isDeleted: false,
    });

    // ================================================================
    // 2. CATEGORY SETTINGS (4 settings - one for each category)
    // ================================================================

    await ctx.db.insert("category_settings", {
      categoryId: electronicsCategory,
      settingKey: "warranty_required",
      settingValue: { enabled: true, defaultDays: 365 },
    });

    await ctx.db.insert("category_settings", {
      categoryId: officeGoodsCategory,
      settingKey: "bulk_discount",
      settingValue: { enabled: true, minQuantity: 50, discountPercent: 10 },
    });

    await ctx.db.insert("category_settings", {
      categoryId: sportsHealthCategory,
      settingKey: "safety_certification",
      settingValue: { required: true, certTypes: ["CE", "FDA"] },
    });

    await ctx.db.insert("category_settings", {
      categoryId: householdFurnitureCategory,
      settingKey: "assembly_required",
      settingValue: { defaultAssembly: true, instructionsIncluded: true },
    });

    // ================================================================
    // 3. BRANDS (4 brands - one for each supplier type)
    // ================================================================

    const electronicsBrand = await ctx.db.insert("brands", {
      organizationId: ORGANIZATION_ID_STRING,
      name: "TechVision Electronics",
      isActive: true,
    });

    const officeGoodsBrand = await ctx.db.insert("brands", {
      organizationId: ORGANIZATION_ID_STRING,
      name: "OfficePro Supplies",
      isActive: true,
    });

    const sportsHealthBrand = await ctx.db.insert("brands", {
      organizationId: ORGANIZATION_ID_STRING,
      name: "FitLife Sports",
      isActive: true,
    });

    const householdFurnitureBrand = await ctx.db.insert("brands", {
      organizationId: ORGANIZATION_ID_STRING,
      name: "HomeStyle Furniture",
      isActive: true,
    });

    // ================================================================
    // 4. SUPPLIERS (4 suppliers - one for each type)
    // ================================================================

    const electronicsSupplier = await ctx.db.insert("suppliers", {
      brandId: electronicsBrand,
      organizationId,
      name: "TechVision Electronics Co., Ltd.",
      contactPerson: "Nguyen Van Tech",
      email: "sales@techvision.vn",
      phone: "+84 28 1234 0001",
      defaultLeadTimeDays: 7,
      isActive: true,
      isDeleted: false,
    });

    const officeGoodsSupplier = await ctx.db.insert("suppliers", {
      brandId: officeGoodsBrand,
      organizationId,
      name: "OfficePro Supplies Vietnam",
      contactPerson: "Tran Thi Office",
      email: "contact@officepro.vn",
      phone: "+84 28 1234 0002",
      defaultLeadTimeDays: 5,
      isActive: true,
      isDeleted: false,
    });

    const sportsHealthSupplier = await ctx.db.insert("suppliers", {
      brandId: sportsHealthBrand,
      organizationId,
      name: "FitLife Sports & Health",
      contactPerson: "Le Van Fit",
      email: "orders@fitlife.vn",
      phone: "+84 28 1234 0003",
      defaultLeadTimeDays: 10,
      isActive: true,
      isDeleted: false,
    });

    const householdFurnitureSupplier = await ctx.db.insert("suppliers", {
      brandId: householdFurnitureBrand,
      organizationId,
      name: "HomeStyle Furniture Manufacturing",
      contactPerson: "Pham Thi Home",
      email: "sales@homestyle.vn",
      phone: "+84 28 1234 0004",
      defaultLeadTimeDays: 14,
      isActive: true,
      isDeleted: false,
    });

    // ================================================================
    // 5. PRODUCTS (4 products per supplier = 16 products total)
    // ================================================================

    // --- Electronics Products (4) ---
    const laptop = await ctx.db.insert("products", {
      organizationId,
      name: "Business Laptop Pro",
      description:
        "High-performance laptop for business users with 16GB RAM and 512GB SSD",
      categoryId: electronicsCategory,
      brandId: electronicsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 10,
      isActive: true,
      isDeleted: false,
    });

    const monitor = await ctx.db.insert("products", {
      organizationId,
      name: 'Ultra HD Monitor 27"',
      description: "4K Ultra HD monitor with IPS panel and USB-C connectivity",
      categoryId: electronicsCategory,
      brandId: electronicsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 15,
      isActive: true,
      isDeleted: false,
    });

    const keyboard = await ctx.db.insert("products", {
      organizationId,
      name: "Mechanical Keyboard RGB",
      description:
        "Mechanical gaming keyboard with RGB backlighting and Cherry MX switches",
      categoryId: electronicsCategory,
      brandId: electronicsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 25,
      isActive: true,
      isDeleted: false,
    });

    const webcam = await ctx.db.insert("products", {
      organizationId,
      name: "HD Webcam 1080p",
      description: "Full HD webcam with auto-focus and built-in microphone",
      categoryId: electronicsCategory,
      brandId: electronicsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 20,
      isActive: true,
      isDeleted: false,
    });

    // --- Office Goods Products (4) ---
    const deskOrganizer = await ctx.db.insert("products", {
      organizationId,
      name: "Desktop Organizer Set",
      description:
        "Complete desk organization set with pen holder, file tray, and memo pad",
      categoryId: officeGoodsCategory,
      brandId: officeGoodsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 30,
      isActive: true,
      isDeleted: false,
    });

    const officeChair = await ctx.db.insert("products", {
      organizationId,
      name: "Ergonomic Office Chair",
      description:
        "Adjustable ergonomic office chair with lumbar support and armrests",
      categoryId: officeGoodsCategory,
      brandId: officeGoodsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 10,
      isActive: true,
      isDeleted: false,
    });

    const whiteboard = await ctx.db.insert("products", {
      organizationId,
      name: "Magnetic Whiteboard",
      description: "Large magnetic whiteboard with aluminum frame, 120x90cm",
      categoryId: officeGoodsCategory,
      brandId: officeGoodsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 8,
      isActive: true,
      isDeleted: false,
    });

    const paperShredder = await ctx.db.insert("products", {
      organizationId,
      name: "Cross-Cut Paper Shredder",
      description:
        "Heavy-duty paper shredder with 15-sheet capacity and auto-feed",
      categoryId: officeGoodsCategory,
      brandId: officeGoodsBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: serialTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 5,
      isActive: true,
      isDeleted: false,
    });

    // --- Sports & Health Care Products (4) ---
    const yogaMat = await ctx.db.insert("products", {
      organizationId,
      name: "Premium Yoga Mat",
      description:
        "Non-slip yoga mat with extra cushioning, 6mm thick, eco-friendly material",
      categoryId: sportsHealthCategory,
      brandId: sportsHealthBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 40,
      isActive: true,
      isDeleted: false,
    });

    const dumbbell = await ctx.db.insert("products", {
      organizationId,
      name: "Adjustable Dumbbell Set",
      description:
        "Adjustable dumbbell set with quick-change weight system, 2.5kg to 25kg",
      categoryId: sportsHealthCategory,
      brandId: sportsHealthBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 15,
      isActive: true,
      isDeleted: false,
    });

    const resistanceBands = await ctx.db.insert("products", {
      organizationId,
      name: "Resistance Bands Set",
      description:
        "Set of 5 resistance bands with different tension levels for home workouts",
      categoryId: sportsHealthCategory,
      brandId: sportsHealthBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 50,
      isActive: true,
      isDeleted: false,
    });

    const foamRoller = await ctx.db.insert("products", {
      organizationId,
      name: "Muscle Foam Roller",
      description:
        "High-density foam roller for muscle recovery and massage, 45cm length",
      categoryId: sportsHealthCategory,
      brandId: sportsHealthBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 30,
      isActive: true,
      isDeleted: false,
    });

    // --- Household Furniture Products (4) ---
    const bookshelf = await ctx.db.insert("products", {
      organizationId,
      name: "Modern Bookshelf",
      description:
        "5-tier modern bookshelf with metal frame and wooden shelves",
      categoryId: householdFurnitureCategory,
      brandId: householdFurnitureBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 10,
      isActive: true,
      isDeleted: false,
    });

    const coffeeTable = await ctx.db.insert("products", {
      organizationId,
      name: "Minimalist Coffee Table",
      description:
        "Scandinavian-style coffee table with storage compartment, oak finish",
      categoryId: householdFurnitureCategory,
      brandId: householdFurnitureBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 8,
      isActive: true,
      isDeleted: false,
    });

    const tvStand = await ctx.db.insert("products", {
      organizationId,
      name: "Entertainment TV Stand",
      description:
        'Modern TV stand for up to 65" TVs with cable management and storage',
      categoryId: householdFurnitureCategory,
      brandId: householdFurnitureBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 6,
      isActive: true,
      isDeleted: false,
    });

    const diningTable = await ctx.db.insert("products", {
      organizationId,
      name: "Extendable Dining Table",
      description:
        "Extendable dining table for 4-8 people, solid wood construction",
      categoryId: householdFurnitureCategory,
      brandId: householdFurnitureBrand,
      storageRequirementTypeId: normalStorageId,
      trackingMethodTypeId: fifoTrackingId,
      shelfLifeDays: undefined,
      reorderPoint: 4,
      isActive: true,
      isDeleted: false,
    });

    // ================================================================
    // 6. PRODUCT VARIANTS (2 variants per product = 32 variants total)
    // ================================================================

    // --- Electronics Variants ---
    // Laptop variants
    await ctx.db.insert("product_variants", {
      productId: laptop,
      skuCode: "TECH-LAP-001",
      description: "Business Laptop Pro - 16GB RAM / 512GB SSD",
      costPrice: 18000000,
      sellingPrice: 22000000,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.8,
      volumeM3: 0.003,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: laptop,
      skuCode: "TECH-LAP-002",
      description: "Business Laptop Pro - 32GB RAM / 1TB SSD",
      costPrice: 25000000,
      sellingPrice: 30000000,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.8,
      volumeM3: 0.003,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Monitor variants
    await ctx.db.insert("product_variants", {
      productId: monitor,
      skuCode: "TECH-MON-001",
      description: 'Ultra HD Monitor 27" - Standard',
      costPrice: 7000000,
      sellingPrice: 9500000,
      unitOfMeasureId: unitPieceId,
      weightKg: 5.5,
      volumeM3: 0.02,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: monitor,
      skuCode: "TECH-MON-002",
      description: 'Ultra HD Monitor 27" - Curved',
      costPrice: 9000000,
      sellingPrice: 12000000,
      unitOfMeasureId: unitPieceId,
      weightKg: 6.0,
      volumeM3: 0.025,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Keyboard variants
    await ctx.db.insert("product_variants", {
      productId: keyboard,
      skuCode: "TECH-KEY-001",
      description: "Mechanical Keyboard RGB - Blue Switch",
      costPrice: 1200000,
      sellingPrice: 1800000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.9,
      volumeM3: 0.002,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: keyboard,
      skuCode: "TECH-KEY-002",
      description: "Mechanical Keyboard RGB - Red Switch",
      costPrice: 1200000,
      sellingPrice: 1800000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.9,
      volumeM3: 0.002,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Webcam variants
    await ctx.db.insert("product_variants", {
      productId: webcam,
      skuCode: "TECH-CAM-001",
      description: "HD Webcam 1080p - Standard",
      costPrice: 800000,
      sellingPrice: 1200000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.15,
      volumeM3: 0.0003,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: webcam,
      skuCode: "TECH-CAM-002",
      description: "HD Webcam 1080p - with Ring Light",
      costPrice: 1100000,
      sellingPrice: 1600000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.25,
      volumeM3: 0.0005,
      temperatureSensitive: false,
      supplierId: electronicsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // --- Office Goods Variants ---
    // Desk Organizer variants
    await ctx.db.insert("product_variants", {
      productId: deskOrganizer,
      skuCode: "OFF-ORG-001",
      description: "Desktop Organizer Set - Black",
      costPrice: 150000,
      sellingPrice: 250000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.8,
      volumeM3: 0.005,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: deskOrganizer,
      skuCode: "OFF-ORG-002",
      description: "Desktop Organizer Set - White",
      costPrice: 150000,
      sellingPrice: 250000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.8,
      volumeM3: 0.005,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Office Chair variants
    await ctx.db.insert("product_variants", {
      productId: officeChair,
      skuCode: "OFF-CHR-001",
      description: "Ergonomic Office Chair - Mesh Back",
      costPrice: 2500000,
      sellingPrice: 3500000,
      unitOfMeasureId: unitPieceId,
      weightKg: 15.0,
      volumeM3: 0.3,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: officeChair,
      skuCode: "OFF-CHR-002",
      description: "Ergonomic Office Chair - Leather",
      costPrice: 3500000,
      sellingPrice: 4800000,
      unitOfMeasureId: unitPieceId,
      weightKg: 18.0,
      volumeM3: 0.35,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Whiteboard variants
    await ctx.db.insert("product_variants", {
      productId: whiteboard,
      skuCode: "OFF-WB-001",
      description: "Magnetic Whiteboard - 90x60cm",
      costPrice: 400000,
      sellingPrice: 650000,
      unitOfMeasureId: unitPieceId,
      weightKg: 4.5,
      volumeM3: 0.02,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: whiteboard,
      skuCode: "OFF-WB-002",
      description: "Magnetic Whiteboard - 120x90cm",
      costPrice: 600000,
      sellingPrice: 950000,
      unitOfMeasureId: unitPieceId,
      weightKg: 7.0,
      volumeM3: 0.035,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Paper Shredder variants
    await ctx.db.insert("product_variants", {
      productId: paperShredder,
      skuCode: "OFF-SHR-001",
      description: "Cross-Cut Paper Shredder - 10 Sheets",
      costPrice: 1800000,
      sellingPrice: 2500000,
      unitOfMeasureId: unitPieceId,
      weightKg: 8.0,
      volumeM3: 0.04,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: paperShredder,
      skuCode: "OFF-SHR-002",
      description: "Cross-Cut Paper Shredder - 15 Sheets Auto-Feed",
      costPrice: 2800000,
      sellingPrice: 3800000,
      unitOfMeasureId: unitPieceId,
      weightKg: 12.0,
      volumeM3: 0.06,
      temperatureSensitive: false,
      supplierId: officeGoodsSupplier,
      isActive: true,
      isDeleted: false,
    });

    // --- Sports & Health Care Variants ---
    // Yoga Mat variants
    await ctx.db.insert("product_variants", {
      productId: yogaMat,
      skuCode: "FIT-YOG-001",
      description: "Premium Yoga Mat - Blue 6mm",
      costPrice: 250000,
      sellingPrice: 450000,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.2,
      volumeM3: 0.008,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: yogaMat,
      skuCode: "FIT-YOG-002",
      description: "Premium Yoga Mat - Purple 8mm Extra Thick",
      costPrice: 320000,
      sellingPrice: 550000,
      unitOfMeasureId: unitPieceId,
      weightKg: 1.5,
      volumeM3: 0.01,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Dumbbell variants
    await ctx.db.insert("product_variants", {
      productId: dumbbell,
      skuCode: "FIT-DUM-001",
      description: "Adjustable Dumbbell Set - 2.5-15kg",
      costPrice: 1500000,
      sellingPrice: 2200000,
      unitOfMeasureId: unitPieceId,
      weightKg: 30.0,
      volumeM3: 0.015,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: dumbbell,
      skuCode: "FIT-DUM-002",
      description: "Adjustable Dumbbell Set - 2.5-25kg",
      costPrice: 2200000,
      sellingPrice: 3200000,
      unitOfMeasureId: unitPieceId,
      weightKg: 50.0,
      volumeM3: 0.02,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Resistance Bands variants
    await ctx.db.insert("product_variants", {
      productId: resistanceBands,
      skuCode: "FIT-BND-001",
      description: "Resistance Bands Set - 5 Bands Basic",
      costPrice: 120000,
      sellingPrice: 220000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.3,
      volumeM3: 0.001,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: resistanceBands,
      skuCode: "FIT-BND-002",
      description: "Resistance Bands Set - 8 Bands with Handles",
      costPrice: 200000,
      sellingPrice: 350000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.5,
      volumeM3: 0.002,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Foam Roller variants
    await ctx.db.insert("product_variants", {
      productId: foamRoller,
      skuCode: "FIT-ROL-001",
      description: "Muscle Foam Roller - 30cm Compact",
      costPrice: 150000,
      sellingPrice: 280000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.4,
      volumeM3: 0.002,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: foamRoller,
      skuCode: "FIT-ROL-002",
      description: "Muscle Foam Roller - 45cm with Massage Grid",
      costPrice: 220000,
      sellingPrice: 400000,
      unitOfMeasureId: unitPieceId,
      weightKg: 0.6,
      volumeM3: 0.003,
      temperatureSensitive: false,
      supplierId: sportsHealthSupplier,
      isActive: true,
      isDeleted: false,
    });

    // --- Household Furniture Variants ---
    // Bookshelf variants
    await ctx.db.insert("product_variants", {
      productId: bookshelf,
      skuCode: "HOME-BSH-001",
      description: "Modern Bookshelf - 5 Tier Black",
      costPrice: 1800000,
      sellingPrice: 2800000,
      unitOfMeasureId: unitPieceId,
      weightKg: 25.0,
      volumeM3: 0.15,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: bookshelf,
      skuCode: "HOME-BSH-002",
      description: "Modern Bookshelf - 5 Tier Oak",
      costPrice: 2000000,
      sellingPrice: 3200000,
      unitOfMeasureId: unitPieceId,
      weightKg: 28.0,
      volumeM3: 0.15,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Coffee Table variants
    await ctx.db.insert("product_variants", {
      productId: coffeeTable,
      skuCode: "HOME-CTB-001",
      description: "Minimalist Coffee Table - Oak",
      costPrice: 1200000,
      sellingPrice: 1900000,
      unitOfMeasureId: unitPieceId,
      weightKg: 15.0,
      volumeM3: 0.08,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: coffeeTable,
      skuCode: "HOME-CTB-002",
      description: "Minimalist Coffee Table - Walnut",
      costPrice: 1400000,
      sellingPrice: 2200000,
      unitOfMeasureId: unitPieceId,
      weightKg: 16.0,
      volumeM3: 0.08,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    // TV Stand variants
    await ctx.db.insert("product_variants", {
      productId: tvStand,
      skuCode: "HOME-TVS-001",
      description: 'Entertainment TV Stand - 55" Black',
      costPrice: 2000000,
      sellingPrice: 3000000,
      unitOfMeasureId: unitPieceId,
      weightKg: 35.0,
      volumeM3: 0.2,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: tvStand,
      skuCode: "HOME-TVS-002",
      description: 'Entertainment TV Stand - 65" Walnut',
      costPrice: 2500000,
      sellingPrice: 3800000,
      unitOfMeasureId: unitPieceId,
      weightKg: 42.0,
      volumeM3: 0.25,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    // Dining Table variants
    await ctx.db.insert("product_variants", {
      productId: diningTable,
      skuCode: "HOME-DIN-001",
      description: "Extendable Dining Table - 4-6 Seats Oak",
      costPrice: 4500000,
      sellingPrice: 6500000,
      unitOfMeasureId: unitPieceId,
      weightKg: 55.0,
      volumeM3: 0.4,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    await ctx.db.insert("product_variants", {
      productId: diningTable,
      skuCode: "HOME-DIN-002",
      description: "Extendable Dining Table - 6-8 Seats Walnut",
      costPrice: 5500000,
      sellingPrice: 8000000,
      unitOfMeasureId: unitPieceId,
      weightKg: 65.0,
      volumeM3: 0.5,
      temperatureSensitive: false,
      supplierId: householdFurnitureSupplier,
      isActive: true,
      isDeleted: false,
    });

    return {
      success: true,
      message: "Supplier and product data seeded successfully!",
      data: {
        organizationId: ORGANIZATION_ID_STRING,
        categories: 4,
        categorySettings: 4,
        brands: 4,
        suppliers: 4,
        products: 16,
        productVariants: 32,
      },
    };
  },
});

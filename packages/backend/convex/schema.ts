import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ================================================================
  // ORGANIZATION & WORKSPACE MANAGEMENT
  // ================================================================

  /**
   * Organizations table
   * Synced from Better Auth + Application-specific data
   */
  organizations: defineTable({
    // Better Auth fields (synced from Neon DB)
    authId: v.string(), // ID from Better Auth (Neon DB)
    slug: v.string(),
    logo: v.optional(v.string()),
    authMetadata: v.optional(v.string()), // JSON string from Better Auth
    authCreatedAt: v.number(), // timestamp from Better Auth

    // Application-specific fields
    name: v.string(),
    address: v.string(),
    contactInfo: v.optional(v.any()), // jsonb
    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("authId", ["authId"])
    .index("slug", ["slug"])
    .index("name", ["name"])
    .index("isActive", ["isActive"])
    .index("isDeleted", ["isDeleted"]),

  organization_settings: defineTable({
    organizationId: v.id("organizations"),
    settingKey: v.string(),
    settingValue: v.any(), // jsonb
  }).index("organizationId_settingKey", ["organizationId", "settingKey"]),

  branches: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    address: v.string(),
    phoneNumber: v.string(),
    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("isActive", ["isActive"])
    .index("isDeleted", ["isDeleted"]),

  branch_settings: defineTable({
    branchId: v.id("branches"),
    settingKey: v.string(),
    settingValue: v.any(), // jsonb
  }).index("branchId_settingKey", ["branchId", "settingKey"]),

  // ================================================================
  // USER MANAGEMENT & AUTHENTICATION
  // ================================================================

  /**
   * Users table
   * Synced from Better Auth + Application-specific data
   * Note: Password management is handled by Better Auth in Neon DB
   */
  users: defineTable({
    // Better Auth fields (synced from Neon DB)
    authId: v.string(), // ID from Better Auth (Neon DB)
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    authCreatedAt: v.number(), // timestamp from Better Auth
    authUpdatedAt: v.number(), // timestamp from Better Auth

    // Application-specific fields
    username: v.string(),
    fullName: v.string(),
    email: v.string(),
    isActive: v.boolean(),
    preferences: v.optional(v.any()), // jsonb
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("authId", ["authId"])
    .index("username", ["username"])
    .index("email", ["email"])
    .index("isActive", ["isActive"])
    .index("isDeleted", ["isDeleted"]),

  /**
   * Members table
   * Represents organization membership (many-to-many between users and organizations)
   * Synced from Better Auth membership data
   */
  members: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    userAuthId: v.string(), // Better Auth user ID for sync
    organizationAuthId: v.string(), // Better Auth organization ID for sync
  })
    .index("userId", ["userId"])
    .index("organizationId", ["organizationId"])
    .index("userAuthId", ["userAuthId"])
    .index("organizationAuthId", ["organizationAuthId"])
    .index("userId_organizationId", ["userId", "organizationId"])
    .index("userAuthId_organizationAuthId", [
      "userAuthId",
      "organizationAuthId",
    ]),

  user_branch_assignments: defineTable({
    userId: v.id("users"),
    branchId: v.id("branches"),
    assignmentStatusTypeId: v.id("system_lookups"),
    assignedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("branchId", ["branchId"])
    .index("userId_branchId", ["userId", "branchId"]),

  roles: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    isSystemDefault: v.boolean(),
  })
    .index("organizationId", ["organizationId"])
    .index("isSystemDefault", ["isSystemDefault"]),

  role_permissions: defineTable({
    roleId: v.id("roles"),
    permissionCategory: v.string(),
    permissionBits: v.number(), // bigint as number
    scopeType: v.string(),
  })
    .index("roleId", ["roleId"])
    .index("permissionCategory", ["permissionCategory"]),

  user_role_assignments: defineTable({
    userId: v.id("users"),
    roleId: v.id("roles"),
    branchId: v.optional(v.id("branches")),
    assignedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("roleId", ["roleId"])
    .index("branchId", ["branchId"]),

  // ================================================================
  // MASTER DATA MANAGEMENT
  // ================================================================

  categories: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    path: v.string(), // ltree as string
    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("isActive", ["isActive"])
    .index("isDeleted", ["isDeleted"]),

  category_settings: defineTable({
    categoryId: v.id("categories"),
    settingKey: v.string(),
    settingValue: v.any(), // jsonb
  }).index("categoryId_settingKey", ["categoryId", "settingKey"]),

  brands: defineTable({
    organizationId: v.string(),
    name: v.string(),
    isActive: v.boolean(),
  })
    .index("organizationId", ["organizationId"])
    .index("isActive", ["isActive"]),

  products: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    brandId: v.id("brands"),
    storageRequirementTypeId: v.id("system_lookups"),
    trackingMethodTypeId: v.id("system_lookups"),
    shelfLifeDays: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    reorderPointOverride: v.optional(v.number()),
    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("categoryId", ["categoryId"])
    .index("brandId", ["brandId"])
    .index("isActive", ["isActive"])
    .index("isDeleted", ["isDeleted"]),

  product_variants: defineTable({
    productId: v.id("products"),
    skuCode: v.string(),
    description: v.string(),
    costPrice: v.number(),
    sellingPrice: v.number(),
    unitOfMeasureId: v.id("system_lookups"),
    weightKg: v.optional(v.number()),
    volumeM3: v.optional(v.number()),
    temperatureSensitive: v.boolean(),
    stackingLimit: v.optional(v.number()),
    supplierId: v.optional(v.id("suppliers")),
    customFields: v.optional(v.any()), // jsonb
    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("supplierId", ["supplierId"])
    .index("productId", ["productId"])
    .index("skuCode", ["skuCode"])
    .index("isActive", ["isActive"])
    .index("isDeleted", ["isDeleted"]),

  product_barcodes: defineTable({
    skuId: v.id("product_variants"),
    barcodeTypeId: v.optional(v.id("system_lookups")),
    barcodeValue: v.string(),
  })
    .index("skuId", ["skuId"])
    .index("barcodeValue", ["barcodeValue"]),

  suppliers: defineTable({
    brandId: v.id("brands"),
    organizationId: v.id("organizations"),
    name: v.string(),
    contactPerson: v.string(),
    email: v.string(),
    phone: v.string(),
    defaultLeadTimeDays: v.number(),
    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("brandId", ["brandId"])
    .index("isActive", ["isActive"])
    .index("isDeleted", ["isDeleted"]),

  // ================================================================
  // WAREHOUSE LAYOUT & STORAGE
  // ================================================================

  storage_zones: defineTable({
    branchId: v.id("branches"),
    name: v.string(),
    parentId: v.optional(v.id("storage_zones")),
    path: v.string(), // ltree as string
    zoneTypeId: v.optional(v.id("system_lookups")),
    storageBlockType: v.string(),
    zoneAttributes: v.optional(v.record(v.string(), v.any())), // object with dynamic attributes
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("branchId", ["branchId"])
    .index("zoneTypeId", ["zoneTypeId"])
    .index("isDeleted", ["isDeleted"]),

  // ================================================================
  // PURCHASE ORDER MANAGEMENT
  // ================================================================

  purchase_orders: defineTable({
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    code: v.string(),
    supplierId: v.id("suppliers"),
    orderedAt: v.number(),
    expectedDeliveryAt: v.optional(v.number()),
    createdByUserId: v.id("users"),
    purchaseOrderStatusTypeId: v.id("system_lookups"),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("branchId", ["branchId"])
    .index("code", ["code"])
    .index("supplierId", ["supplierId"])
    .index("purchaseOrderStatusTypeId", ["purchaseOrderStatusTypeId"])
    .index("isDeleted", ["isDeleted"]),

  purchase_order_details: defineTable({
    purchaseOrderId: v.id("purchase_orders"),
    skuId: v.id("product_variants"),
    quantityOrdered: v.number(),
    unitCost: v.number(),
    quantityReceived: v.number(),
    recommendedZoneId: v.optional(v.id("storage_zones")),
  })
    .index("purchaseOrderId", ["purchaseOrderId"])
    .index("skuId", ["skuId"]),

  // ================================================================
  // Receive SESSIONS
  // ================================================================
  receive_sessions: defineTable({
    receiveSessionCode: v.string(),
    purchaseOrderId: v.id("purchase_orders"),
    branchId: v.id("branches"),
    receivedAt: v.number(),
    receiveSessionStatusTypeId: v.id("system_lookups"),
    assignedWorkerId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("assignedWorkerId", ["assignedWorkerId"])
    .index("purchaseOrderId", ["purchaseOrderId"])
    .index("branchId", ["branchId"])
    .index("receiveSessionCode", ["receiveSessionCode"])
    .index("receiveSessionStatusTypeId", ["receiveSessionStatusTypeId"]),

  receive_sessions_details: defineTable({
    receiveSessionId: v.id("receive_sessions"),
    skuId: v.id("product_variants"),
    quantityReceived: v.number(),
    quantityExpected: v.number(),
    notes: v.optional(v.string()),
    recommendedZoneId: v.optional(v.id("storage_zones")),
    receiveSessionItemStatusTypeId: v.id("system_lookups"),
    returnTypeId: v.optional(v.id("system_lookups")),
  })
    .index("receiveSessionId", ["receiveSessionId"])
    .index("skuId", ["skuId"])
    .index("receiveSessionItemStatusTypeId", [
      "receiveSessionItemStatusTypeId",
    ]),
  // ================================================================
  // WORK SESSIONS
  // ================================================================

  work_sessions: defineTable({
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    sessionTypeId: v.id("system_lookups"),
    sessionCode: v.string(),
    name: v.optional(v.string()), // Session display name
    description: v.optional(v.string()), // Session description
    cycleCountTypeId: v.optional(v.id("system_lookups")), // Daily/Weekly cycle count type
    assignedUserId: v.id("users"),
    sessionStatusTypeId: v.id("system_lookups"),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    verifiedByUserId: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    receiveSessionId: v.optional(v.id("receive_sessions")),
    purchaseOrderId: v.optional(v.id("purchase_orders")),
    outboundOrderId: v.optional(v.id("outbound_orders")),
    transferOrderId: v.optional(v.id("transfer_orders")),
  })
    .index("organizationId", ["organizationId"])
    .index("branchId", ["branchId"])
    .index("sessionCode", ["sessionCode"])
    .index("assignedUserId", ["assignedUserId"])
    .index("sessionStatusTypeId", ["sessionStatusTypeId"])
    .index("receiveSessionId", ["receiveSessionId"])
    .index("purchaseOrderId", ["purchaseOrderId"])
    .index("outboundOrderId", ["outboundOrderId"])
    .index("transferOrderId", ["transferOrderId"]),

  session_line_items: defineTable({
    sessionId: v.id("work_sessions"),
    skuId: v.id("product_variants"),
    expectedQuantity: v.number(),
    actualQuantity: v.number(),
    zoneId: v.optional(v.id("storage_zones")),
    batchId: v.optional(v.id("inventory_batches")),
    scannedAt: v.optional(v.number()),
    scannedByUserId: v.optional(v.id("users")), // Track who scanned this item
    notes: v.optional(v.string()),
  })
    .index("sessionId", ["sessionId"])
    .index("skuId", ["skuId"])
    .index("batchId", ["batchId"])
    .index("zoneId", ["zoneId"]),

  session_metrics: defineTable({
    sessionId: v.id("work_sessions"),
    totalTimeSeconds: v.number(),
    totalItemsProcessed: v.number(),
    accuracyRate: v.number(),
    calculatedAt: v.number(),
  }).index("sessionId", ["sessionId"]),

  session_zone_assignments: defineTable({
    sessionId: v.id("work_sessions"),
    zoneId: v.id("storage_zones"),
    assignedUserId: v.id("users"),
    assignmentStatusTypeId: v.optional(v.id("system_lookups")), // not_started/in_progress/completed
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("sessionId", ["sessionId"])
    .index("zoneId", ["zoneId"])
    .index("assignedUserId", ["assignedUserId"])
    .index("assignmentStatusTypeId", ["assignmentStatusTypeId"]),

  // ================================================================
  // INVENTORY TRACKING
  // ================================================================

  inventory_batches: defineTable({
    organizationId: v.id("organizations"),
    skuId: v.id("product_variants"),
    zoneId: v.id("storage_zones"),
    quantity: v.number(),
    branchId: v.id("branches"),
    supplierBatchNumber: v.optional(v.string()),
    internalBatchNumber: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
    manufacturingDate: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    batchStatusTypeId: v.id("system_lookups"),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("skuId", ["skuId"])
    .index("zoneId", ["zoneId"])
    .index("batchStatusTypeId", ["batchStatusTypeId"])
    .index("isDeleted", ["isDeleted"])
    .index("branchId", ["branchId"])
    .index("expiresAt", ["expiresAt"]),

  serial_numbers: defineTable({
    organizationId: v.id("organizations"),
    serialNumber: v.string(),
    skuId: v.id("product_variants"),
    batchId: v.optional(v.id("inventory_batches")),
    zoneId: v.optional(v.id("storage_zones")),
    serialStatusTypeId: v.id("system_lookups"),
    warrantyExpiresAt: v.optional(v.number()),
    purchaseOrderId: v.optional(v.id("purchase_orders")),
  })
    .index("organizationId", ["organizationId"])
    .index("serialNumber", ["serialNumber"])
    .index("skuId", ["skuId"])
    .index("batchId", ["batchId"])
    .index("serialStatusTypeId", ["serialStatusTypeId"]),

  inventory_transactions: defineTable({
    organizationId: v.id("organizations"),
    batchId: v.optional(v.id("inventory_batches")),
    serialNumberId: v.optional(v.id("serial_numbers")),
    quantityBefore: v.number(),
    quantityChange: v.number(),
    quantityAfter: v.number(),
    inventoryTransactionTypeId: v.id("system_lookups"),
    createdByUserId: v.id("users"),
    notes: v.optional(v.string()),
    purchaseOrderDetailId: v.optional(v.id("purchase_order_details")),
    transferOrderDetailId: v.optional(v.id("transfer_order_details")),
    workSessionId: v.optional(v.id("work_sessions")),
    adjustmentRequestDetailId: v.optional(v.id("adjustment_request_details")),
    outboundOrderDetailId: v.optional(v.id("outbound_order_details")),
  })
    .index("organizationId", ["organizationId"])
    .index("batchId", ["batchId"])
    .index("serialNumberId", ["serialNumberId"])
    .index("inventoryTransactionTypeId", ["inventoryTransactionTypeId"])
    .index("createdByUserId", ["createdByUserId"]),

  // ================================================================
  // OUTBOUND OPERATIONS
  // ================================================================

  outbound_orders: defineTable({
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    orderCode: v.string(),
    orderDate: v.number(),
    requestedShipDate: v.optional(v.number()),
    trackingNumber: v.optional(v.string()),
    vehicleArrivedAt: v.optional(v.number()),
    createdByUserId: v.id("users"),
    outboundStatusTypeId: v.id("system_lookups"),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    assignedWorkerId: v.optional(v.id("users")),
  })
    .index("assignedWorkerId", ["assignedWorkerId"])
    .index("organizationId", ["organizationId"])
    .index("branchId", ["branchId"])
    .index("orderCode", ["orderCode"])
    .index("outboundStatusTypeId", ["outboundStatusTypeId"])
    .index("isDeleted", ["isDeleted"]),

  outbound_order_details: defineTable({
    outboundOrderId: v.id("outbound_orders"),
    skuId: v.id("product_variants"),
    quantityRequested: v.number(),
    quantityPicked: v.number(),
    quantityPacked: v.number(),
  })
    .index("outboundOrderId", ["outboundOrderId"])
    .index("skuId", ["skuId"]),

  // ================================================================
  // PICKING SESSIONS
  // ================================================================

  picking_sessions: defineTable({
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    outboundOrderId: v.id("outbound_orders"),
    sessionCode: v.string(),
    assignedUserId: v.optional(v.id("users")),
    statusTypeId: v.optional(v.id("system_lookups")),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("branchId", ["branchId"])
    .index("outboundOrderId", ["outboundOrderId"])
    .index("sessionCode", ["sessionCode"])
    .index("assignedUserId", ["assignedUserId"])
    .index("statusTypeId", ["statusTypeId"])
    .index("isDeleted", ["isDeleted"]),

  picking_session_details: defineTable({
    pickingSessionId: v.id("picking_sessions"),
    skuId: v.id("product_variants"),
    batchId: v.optional(v.id("inventory_batches")),
    quantityRequired: v.number(),
    quantityPicked: v.number(),
  })
    .index("pickingSessionId", ["pickingSessionId"])
    .index("skuId", ["skuId"])
    .index("batchId", ["batchId"]),

  // ================================================================
  // INVENTORY ADJUSTMENTS
  // ================================================================

  adjustment_requests: defineTable({
    organizationId: v.string(),
    branchId: v.string(),
    requestCode: v.string(),
    adjustmentTypeId: v.string(), // "quantity" or "location" adjustment type
    requestedByUserId: v.string(),
    requestedAt: v.number(),
    approvedByUserId: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    adjustmentStatusTypeId: v.string(),
    resolutionNotes: v.optional(v.string()),
  })
    .index("organizationId", ["organizationId"])
    .index("branchId", ["branchId"])
    .index("requestCode", ["requestCode"])
    .index("adjustmentTypeId", ["adjustmentTypeId"])
    .index("requestedByUserId", ["requestedByUserId"])
    .index("adjustmentStatusTypeId", ["adjustmentStatusTypeId"]),

  adjustment_request_details: defineTable({
    adjustmentRequestId: v.id("adjustment_requests"),
    batchId: v.string(),
    skuId: v.string(),
    expectedQuantity: v.number(),
    actualQuantity: v.number(),
    varianceQuantity: v.number(),
    costImpact: v.number(),
    reasonTypeId: v.string(),
    customReasonNotes: v.optional(v.string()),
    // Location adjustment fields
    fromZoneId: v.optional(v.string()), // Source zone for location adjustments
    toZoneId: v.optional(v.string()), // Destination zone for location adjustments
    quantity: v.optional(v.number()), // Quantity to move for location adjustments
  })
    .index("adjustmentRequestId", ["adjustmentRequestId"])
    .index("batchId", ["batchId"])
    .index("skuId", ["skuId"])
    .index("reasonTypeId", ["reasonTypeId"]),

  // ================================================================
  // SUPPLIER RETURNS
  // ================================================================

  return_requests: defineTable({
    organizationId: v.string(),
    branchId: v.string(),
    requestCode: v.string(),
    supplierId: v.string(),
    requestedByUserId: v.string(),
    requestedAt: v.number(),
    returnStatusTypeId: v.string(),
    purchaseOrderId: v.optional(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("branchId", ["branchId"])
    .index("requestCode", ["requestCode"])
    .index("supplierId", ["supplierId"])
    .index("requestedByUserId", ["requestedByUserId"])
    .index("returnStatusTypeId", ["returnStatusTypeId"])
    .index("isDeleted", ["isDeleted"])
    .index("purchaseOrderId", ["purchaseOrderId"]),

  return_request_details: defineTable({
    returnRequestId: v.id("return_requests"),
    batchId: v.optional(v.string()),
    skuId: v.string(),
    quantityToReturn: v.number(),
    reasonTypeId: v.string(),
    customReasonNotes: v.optional(v.string()),
    expectedCreditAmount: v.optional(v.number()),
    receiveSessionDetailId: v.optional(v.id("receive_sessions_details")),
  })
    .index("returnRequestId", ["returnRequestId"])
    .index("batchId", ["batchId"])
    .index("skuId", ["skuId"])
    .index("reasonTypeId", ["reasonTypeId"])
    .index("receiveSessionDetailId", ["receiveSessionDetailId"]),

  // ================================================================
  // INTERNAL TRANSFERS
  // ================================================================

  transfer_orders: defineTable({
    organizationId: v.id("organizations"),
    transferCode: v.string(),
    sourceBranchId: v.id("branches"),
    destinationBranchId: v.id("branches"),
    createdByUserId: v.id("users"),
    expectedDeliveryAt: v.optional(v.number()),
    actualDeliveryAt: v.optional(v.number()),
    trackingNumber: v.optional(v.string()),
    transferStatusTypeId: v.id("system_lookups"),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("transferCode", ["transferCode"])
    .index("sourceBranchId", ["sourceBranchId"])
    .index("destinationBranchId", ["destinationBranchId"])
    .index("transferStatusTypeId", ["transferStatusTypeId"])
    .index("isDeleted", ["isDeleted"]),

  transfer_order_details: defineTable({
    transferOrderId: v.id("transfer_orders"),
    skuId: v.id("product_variants"),
    quantityRequested: v.number(),
    quantityShipped: v.number(),
    quantityReceived: v.number(),
  })
    .index("transferOrderId", ["transferOrderId"])
    .index("skuId", ["skuId"]),

  // ================================================================
  // NOTIFICATIONS & ALERTS
  // ================================================================
  notifications: defineTable({
    organizationId: v.id("organizations"),
    notificationCategoryTypeId: v.id("system_lookups"),
    notificationType: v.string(),
    recipientUserId: v.id("users"),
    title: v.string(),
    message: v.string(),
    priorityTypeId: v.id("system_lookups"),
    actionUrl: v.optional(v.string()),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    readAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
  })
    .index("organizationId", ["organizationId"])
    .index("recipientUserId", ["recipientUserId"])
    .index("notificationCategoryTypeId", ["notificationCategoryTypeId"])
    .index("readAt", ["readAt"]),
  // ================================================================
  // REPORTING & ANALYTICS
  // ================================================================

  demand_forecasts: defineTable({
    organizationId: v.id("organizations"),
    skuId: v.id("product_variants"),
    forecastDate: v.number(),
    forecastTypeId: v.id("system_lookups"),
    predictedDemand: v.number(),
    confidenceInterval: v.number(),
    calculationMethod: v.string(),
  })
    .index("organizationId", ["organizationId"])
    .index("skuId", ["skuId"])
    .index("forecastDate", ["forecastDate"]),

  report_templates: defineTable({
    organizationId: v.id("organizations"),
    templateName: v.string(),
    description: v.string(),
    ownerUserId: v.id("users"),
    templateConfig: v.any(), // jsonb
    sharingScopeTypeId: v.id("system_lookups"),
  })
    .index("organizationId", ["organizationId"])
    .index("ownerUserId", ["ownerUserId"]),

  // ================================================================
  // ATTACHMENTS & DOCUMENTS
  // ================================================================

  attachments: defineTable({
    organizationId: v.id("organizations"),
    fileName: v.string(),
    filePath: v.string(),
    fileSizeBytes: v.number(),
    mimeType: v.string(),
    uploadedByUserId: v.id("users"),
    uploadedAt: v.number(),
    entityType: v.string(),
    entityId: v.number(),
    notes: v.optional(v.string()),
  })
    .index("organizationId", ["organizationId"])
    .index("uploadedByUserId", ["uploadedByUserId"])
    .index("entityType_entityId", ["entityType", "entityId"]),

  // ================================================================
  // AUDIT & COMPLIANCE
  // ================================================================

  audit_logs: defineTable({
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    actionTypeId: v.id("system_lookups"),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    fieldName: v.optional(v.string()),
    oldValue: v.optional(v.any()), // jsonb
    newValue: v.optional(v.any()), // jsonb
    ipAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("organizationId", ["organizationId"])
    .index("userId", ["userId"])
    .index("actionTypeId", ["actionTypeId"])
    .index("entityType_entityId", ["entityType", "entityId"]),

  // ================================================================
  // SYSTEM LOOKUPS
  // ================================================================

  system_lookups: defineTable({
    organizationId: v.optional(v.id("organizations")),
    lookupType: v.string(),
    lookupCode: v.string(),
    lookupValue: v.string(),
    description: v.string(),
    sortOrder: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_type", ["organizationId", "lookupType"])
    .index("by_organization_type_code", [
      "organizationId",
      "lookupType",
      "lookupCode",
    ])
    .index("lookupType", ["lookupType"])
    .index("lookupType_lookupCode", ["lookupType", "lookupCode"]),
});

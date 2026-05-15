# Fault Tree Analysis — Notification: Kênh thông báo thời gian thực

## 1. Quality Attribute Scenario Recap

| Element | Description |
|---|---|
| *Stimulus* | Một sự kiện quan trọng xảy ra trong hệ thống (phê duyệt, hoàn tất phiên, cảnh báo tồn kho…) và cần được gửi qua kênh thông báo |
| *Stimulus Source* | Các module nghiệp vụ trong hệ thống phát sinh sự kiện cần thông báo tới người dùng liên quan |
| *Environment* | Hệ thống đang hoạt động liên tục 24/7, bao gồm cả các thời điểm tải cao hoặc có sự cố mạng tạm thời |
| *Artifact* | Module Thông báo — kênh thông báo thời gian thực (Convex Reactive Query) |
| *Response* | Kênh thông báo được thiết kế hoạt động liên tục, có cơ chế tự động kết nối lại (auto-reconnect) khi bị gián đoạn. Các thông báo phát sinh trong thời gian kênh bị gián đoạn được lưu vào hàng đợi (message queue) và gửi lại ngay khi kết nối được khôi phục. Hệ thống giám sát trạng thái kênh thông báo liên tục và cảnh báo vận hành nếu phát hiện gián đoạn kéo dài |
| *Response Measure* | Kênh thông báo duy trì hoạt động liên tục, đảm bảo không bỏ sót bất kỳ sự kiện quan trọng nào. Mọi thông báo phát sinh trong thời gian gián đoạn đều được gửi bù ngay khi kênh khôi phục. Tỷ lệ phân phối thông báo thành công đạt ≥ 99.9% trên toàn thời gian hoạt động |

---

## 2. Notification Architecture in next-wms

Dựa trên mã nguồn thực tế, hệ thống Notification của next-wms hoạt động theo kiến trúc sau:

mermaid
graph TB
    subgraph "Client Layer (Next.js App)"
        A["Header Bell Icon<br/>notifications.tsx"] --> B["Notifications Page<br/>notifications/page.tsx"]
        B --> C["useQuery() + convexQuery()<br/>TanStack Query + Convex"]
        C --> D["notifications.listDetailed()"]
        E["NotificationItem<br/>notification-item.tsx"] --> F["markAsRead()<br/>notifications.ts"]
    end

    subgraph "Convex Reactive Layer"
        G["Convex Client SDK<br/>WebSocket (auto-managed)"]
        H["Reactive Query Engine<br/>Real-time subscription"]
        I["Auto-Reconnect<br/>Built-in retry & queue"]
    end

    subgraph "Business Logic Layer (Convex Mutations)"
        J["receiveSessions.ts<br/>createReceiveSession()"]
        K["outboundOrders.ts<br/>createOutboundOrder()"]
        L["inventory.ts<br/>checkInventoryExpiration()"]
        M["notifications.ts<br/>create() mutation"]
    end

    subgraph "Persistence Layer (Convex DB)"
        N["notifications table<br/>organizationId, recipientUserId, ..."]
        O["system_lookups table<br/>NotificationCategory, Priority"]
    end

    D --> G --> H
    J --> M
    K --> M
    L --> M
    M --> N
    H --> N
    F --> G
    N -.->|"Reactive Update"| H -.->|"Auto-push"| C

### Các thành phần chính:

| Node | Component | File | Vai trò |
|---|---|---|---|
| | *Client Layer (Next.js App)* | | |
| A | Header Bell Icon | [notifications.tsx](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/apps/web/src/components/notifications.tsx) | Hiển thị icon chuông trên Header, link đến trang thông báo |
| B | Notifications Page | [page.tsx](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/apps/web/src/app/(protected)/[workspace]/(main)/notifications/page.tsx) | Trang danh sách thông báo, sử dụng convexQuery với TanStack Query để nhận real-time updates |
| C | useQuery() + convexQuery() | [page.tsx](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/apps/web/src/app/(protected)/[workspace]/(main)/notifications/page.tsx) | TanStack Query kết hợp Convex adapter, tạo reactive subscription đến server |
| D | notifications.listDetailed() | [notifications.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/notifications.ts) | Query lấy danh sách thông báo kèm category & priority, lọc theo userId + organizationId |
| E | NotificationItem | [notification-item.tsx](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/apps/web/src/components/notification-item.tsx) | Render từng thông báo: tiêu đề, nội dung, thời gian, trạng thái đã đọc (blue dot) |
| F | markAsRead() | [notifications.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/notifications.ts) | Mutation đánh dấu thông báo đã đọc: ctx.db.patch(id, { readAt: Date.now() }) |
| | *Convex Reactive Layer* | | |
| G | Convex Client SDK | Convex SDK (built-in) | WebSocket auto-managed, kênh truyền tải giữa client và Convex server |
| H | Reactive Query Engine | Convex Server (built-in) | Theo dõi thay đổi trên bảng notifications, tự động push data mới đến client đang subscribe |
| I | Auto-Reconnect | Convex SDK (built-in) | Cơ chế retry & queue tích hợp sẵn, exponential backoff khi mất kết nối |
| | *Business Logic Layer (Convex Mutations)* | | |
| J | receiveSessions.createReceiveSession() | [receiveSessions.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/receiveSessions.ts) | Gửi thông báo RECEIVE_SESSION_ASSIGNED khi gán worker vào phiên nhận hàng |
| K | outboundOrders.createOutboundOrder() | [outboundOrders.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/outboundOrders.ts) | Gửi thông báo OUTBOUND_ORDER_ASSIGNED khi gán worker vào đơn xuất hàng |
| L | inventory.checkInventoryExpiration() | [inventory.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/inventory.ts) | Cron job gửi thông báo Inventory Expiration cho tất cả members khi lô hàng sắp hết hạn (< 90 ngày) |
| M | notifications.create() | [notifications.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/notifications.ts) | Core mutation: gọi createNotification() helper để insert thông báo vào DB |
| | *Persistence Layer (Convex DB)* | | |
| N | notifications table | [schema.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/schema.ts) | Bảng lưu trữ thông báo với index: organizationId, recipientUserId, notificationCategoryTypeId, readAt |
| O | system_lookups table | [schema.ts](file:///c:/UIT/HK6/Kiến%20trúc%20phần%20mềm/next-wms/packages/backend/convex/schema.ts) | Bảng tra cứu loại thông báo (NotificationCategory: ALERT/INFO/REMINDER) và mức ưu tiên (Priority: HIGH/MEDIUM/LOW) |

---

## 3. Luồng hoạt động chi tiết

### 3.1 Luồng tạo & phân phối thông báo

mermaid
sequenceDiagram
    participant BM as Business Module<br/>(receiveSessions / outboundOrders / inventory)
    participant NM as Notification Module<br/>(notifications.ts)
    participant DB as Convex Database<br/>(notifications table)
    participant RQ as Convex Reactive Engine
    participant CL as Client Browser<br/>(Next.js + TanStack Query)

    Note over BM: Sự kiện nghiệp vụ xảy ra<br/>(VD: gán worker vào phiên nhận hàng)
    BM->>BM: Tra cứu system_lookups<br/>(NotificationCategory: INFO, Priority: HIGH)
    BM->>NM: createNotification(ctx, {<br/>  organizationId, recipientUserId,<br/>  notificationType, title, message,<br/>  priorityTypeId, actionUrl, ...})
    NM->>DB: ctx.db.insert("notifications", {...})
    DB-->>RQ: Trigger reactive subscription
    RQ-->>CL: Auto-push updated data<br/>(qua WebSocket nội bộ Convex)
    CL->>CL: TanStack Query cache invalidated<br/>→ UI re-render với thông báo mới

### 3.2 Luồng đọc & đánh dấu thông báo

mermaid
sequenceDiagram
    participant U as User
    participant UI as Notifications Page
    participant TQ as TanStack Query<br/>+ convexQuery
    participant API as notifications.listDetailed()
    participant DB as Convex Database
    participant MR as notifications.markAsRead()

    U->>UI: Mở trang Notifications
    UI->>TQ: useQuery(convexQuery(<br/>api.notifications.listDetailed,<br/>{userId, organizationId}))
    TQ->>API: Subscribe reactive query
    API->>DB: Query notifications<br/>by recipientUserId (index)<br/>filter by organizationId<br/>order desc, take(limit)
    DB-->>API: Raw notifications
    API->>API: Join category & priority<br/>từ system_lookups
    API-->>TQ: Enriched notifications[]
    TQ-->>UI: Render danh sách
    U->>UI: Click vào notification
    UI->>MR: markAsRead({notificationId})
    MR->>DB: ctx.db.patch(id, {readAt: Date.now()})
    DB-->>TQ: Reactive update → UI refresh

---

## 4. Cơ chế đảm bảo độ tin cậy (Availability)

### 4.1 Auto-Reconnect (Convex SDK)

Convex SDK tích hợp sẵn cơ chế *WebSocket auto-reconnect* với exponential backoff. Khi kết nối bị gián đoạn:

mermaid
graph LR
    A["Kết nối WebSocket<br/>bị gián đoạn"] --> B["Convex SDK phát hiện<br/>connection lost"]
    B --> C["Exponential Backoff<br/>Retry (1s → 2s → 4s → ...)"]
    C --> D["Kết nối lại thành công"]
    D --> E["Re-subscribe tất cả<br/>reactive queries"]
    E --> F["Fetch lại dữ liệu mới nhất<br/>từ server"]
    F --> G["UI cập nhật đầy đủ<br/>không mất thông báo"]

### 4.2 Persistence-first (Không mất thông báo)

| Đặc điểm | Mô tả |
|---|---|
| *Write-first* | Thông báo được insert vào DB trước khi push real-time. Nếu client offline, dữ liệu vẫn tồn tại trong DB |
| *Query-on-reconnect* | Khi client reconnect, Convex re-execute query → lấy toàn bộ thông báo mới (bao gồm những thông báo trong thời gian offline) |
| *Không cần message queue riêng* | Convex DB đóng vai trò là source-of-truth. Reactive query engine đảm bảo client luôn đồng bộ với trạng thái mới nhất |
| *Index-based query* | Sử dụng index recipientUserId để truy vấn hiệu quả, đảm bảo hiệu năng ngay cả khi lượng thông báo lớn |

### 4.3 Các loại thông báo trong hệ thống

| Notification Type | Trigger Source | Category | Priority | Mô tả |
|---|---|---|---|---|
| RECEIVE_SESSION_ASSIGNED | receiveSessions.ts | INFO | HIGH | Worker được gán vào phiên nhận hàng |
| OUTBOUND_ORDER_ASSIGNED | outboundOrders.ts | INFO | HIGH | Worker được gán vào đơn xuất hàng |
| Inventory Expiration | inventory.ts (cron) | ALERT | HIGH | Cảnh báo lô hàng sắp hết hạn (< 90 ngày) |
| LOW_STOCK | Seed data | ALERT | — | Cảnh báo tồn kho thấp |
| PO_APPROVED | Seed data | INFO | — | Đơn mua hàng được phê duyệt |
| SESSION_ASSIGNED | Seed data | REMINDER | — | Phiên làm việc được phân công |
| EXPIRY_WARNING | Seed data | ALERT | — | Cảnh báo hạn sử dụng |
| TRANSFER_SHIPPED | Seed data | INFO | — | Đơn chuyển kho đã vận chuyển |

---

# Testcase Module 9 — Reports (UC52–UC54 | BR175–BR186)

## UC52: Inbound Report

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RPT-001 | BR175 | Inbound report loads KPIs | Vao trang Reports, chon tab Inbound | KPI tong so session, so item da nhan, accuracy rate hien thi |
| RPT-002 | BR176 | Detail table loads session data | Cuon xuong bang chi tiet | Bang chi tiet session hien thi du lieu |
| RPT-003 | BR177 | Dashboard shows KPI cards + charts | Quan sat dashboard | KPI cards, charts, bang chi tiet hien thi day du |
| RPT-004 | BR178 | Time range filter reloads data | Doi khoang thoi gian | Du lieu KPI + bang duoc cap nhat |

## UC53: Inventory Report

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RPT-005 | BR179 | Inventory report loads KPIs | Chon Inventory report | KPI tong SKU, tong so luong, tong gia tri, sap het han, het han, low stock hien thi |
| RPT-006 | BR180 | Detail table loads product data | Cuon xuong bang chi tiet | Bang chi tiet san pham hien thi |
| RPT-007 | BR181 | Dashboard shows alerts for expiring/low stock | Quan sat dashboard | Canh bao hang sap het han + low stock hien thi |
| RPT-008 | BR182 | Time range filter reloads data | Doi khoang thoi gian | Du lieu KPI + bang duoc cap nhat |

## UC54: Outbound Report

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RPT-009 | BR183 | Outbound report loads KPIs | Chon Outbound report | KPI tong don, so item da giao, completion rate, avg pick time hien thi |
| RPT-010 | BR184 | Detail table loads order data | Cuon xuong bang chi tiet | Bang chi tiet don xuat hien thi |
| RPT-011 | BR185 | Dashboard shows picking performance charts | Quan sat dashboard | Bieu do hieu suat picking + top products hien thi |
| RPT-012 | BR186 | Time range filter reloads data | Doi khoang thoi gian | Du lieu KPI + bang duoc cap nhat |

---
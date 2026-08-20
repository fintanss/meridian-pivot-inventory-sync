# Assignment 2: Scope Delta Analysis

## Client: Northstar Retail Co. (Sprint 2)
**Architectural Pivot:** Transition from 5-Minute Polling to Real-Time Webhook Push Sync

---

## 1. Feature Backlog Adjustments

| Backlog Item | Action | Justification / Technical Details |
| :--- | :--- | :--- |
| **5-Min Interval Poller** | **DROPPED** | Obsolete due to Northstar API sunset. Discontinued active HTTP polling loop. |
| **Polling Rate Limiter** | **DROPPED** | Unnecessary in a event-driven push architecture. |
| **HMAC Signature Verifier**| **ADDED** | Required to validate payload authenticity on incoming webhook POST requests. |
| **Webhook Receiver Route** | **ADDED** | Exposed `/api/v1/webhooks/inventory` to receive instant push updates. |
| **In-Memory Stock Cache** | **MODIFIED** | Shifted from interval-overwritten cache to real-time key-value updates per SKU. |
| **Query Endpoint** | **RETAINED** | Kept `GET /api/v1/inventory/:sku` intact so customer support tools still resolve queries. |

---

## 2. Architectural Integrity & Trade-off Analysis

* **Regression Prevention:** The core `GET /api/v1/inventory/:sku` endpoint contract remains unchanged, ensuring downstream support tools suffer zero breaking changes.
* **Deprecation Strategy:** Legacy polling functions were marked as `[DEPRECATED]` and disabled on server boot to prevent accidental parallel polling execution.
* **Trade-offs:** Swapped outbound network overhead for inbound endpoint security requirements (HMAC computation).
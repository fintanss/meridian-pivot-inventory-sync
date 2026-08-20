# Incident Post-Mortem & Production Guardrails Report

## Executive Summary
During Sprint 2 testing, duplicate webhook events and unthrottled payloads caused state inconsistency across inventory caches. This document outlines the root cause analysis, mitigation strategies, and architectural guardrails implemented to prevent reoccurrence.

---

## 1. Incident Timeline & Root Cause Analysis

* **Trigger:** Upstream webhook provider retried delivered packets without updating payload identifiers, flooding the receiver endpoint.
* **Root Cause:** The endpoint lacked timestamp tolerance verification and nonce tracking, rendering it vulnerable to replay attacks and high-volume burst traffic.
* **Impact:** Inconsistent inventory levels recorded due to duplicate state writes.

---

## 2. Implemented Guardrails & Defenses

| Guardrail Layer | Threat Prevented | Technical Implementation |
| :--- | :--- | :--- |
| **Timestamp Validation** | Stale / Intercepted Replays | Rejects payloads where `Math.abs(Now - x-timestamp) > 5 mins`. |
| **Nonce Tracking** | Duplicate Packet Replays | Maintains in-memory `Set` of processed `x-nonce` UUIDs; rejects duplicates with `409 Conflict`. |
| **Rate Limiter Middleware** | Endpoint Flooding / Denial of Service | Throttles incoming IP addresses to a max of 10 requests/min; returns `429 Too Many Requests`. |
| **HMAC Signature Digest** | Data Tampering & Impersonation | Re-computes SHA256 digest across `timestamp + nonce + rawBody`. |
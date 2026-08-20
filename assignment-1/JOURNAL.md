# Assignment 1: Independent Learning & Blocker Journal

## 1. Selected Concept & Strategy
- Tool: Webhook Verification & HMAC Signature Validation
- Target Timebox: Planned 4 Hours | Actual Time Taken: 3 Hours
- Core Objective: Verify HTTP POST webhooks using HMAC SHA256 signatures to ensure payload integrity before accepting data.

## 2. Resources Consulted
- Node.js Crypto Module Documentation (`crypto.createHmac`, `crypto.timingSafeEqual`)
- Express `body-parser` Reference (`express.json` verify callback)

## 3. Blocker & Error Resolution Log

| Error / Issue Description | Exact Error Message / Behavior | Root Cause Identified | Resolution Steps & Applied Fix |
| :--- | :--- | :--- | :--- |
| **Signature Verification Failure** | `403 Forbidden: Invalid payload signature` | Computing HMAC over `JSON.stringify(req.body)` altered property key order and formatting relative to original request payload. | Implemented `express.json({ verify: ... })` middleware callback to capture unparsed raw request buffer (`req.rawBody`). |
| **Missing Module File** | `Error: Cannot find module 'D:\webhook-prototype\sender.js'` | Terminal commands were running in the parent directory while scripts lived in the nested subfolder (`webhook-prototype\webhook-prototype`). | Used `dir` to inspect folder contents, then navigated into active directory using `cd webhook-prototype` before running `node sender.js`. |
| **Missing Dependency** | `Error: Cannot find module 'express'` | Script executed before package installation completed in target directory. | Executed `npm install express` inside project subfolder to populate `node_modules`. |
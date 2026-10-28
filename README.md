# AICTE Security Deposit & FDR Lifecycle Management Portal
### Smart India Hackathon 2026 — Problem Statement ID: 26265
**Title:** Streamline of Security Deposit / FDR Portal  
**Target Organization:** All India Council for Technical Education (AICTE), Ministry of Education, Government of India  
**Bureau:** AICTE Regulation Bureau & Directorate of Technical Education  

---

## 1. Executive Summary

Technical institutions applying for AICTE approval, course introduction, intake expansion, or institutional setup are mandated under the **AICTE Approval Process Handbook (APH)** to maintain Security Deposits in the form of Fixed Deposit Receipts (FDRs) or Bank Guarantees jointly endorsed with the **Member Secretary, AICTE**.

Historically, these deposits were tracked across manual physical files, correspondence registers, and fragmented spreadsheets. This created critical regulatory vulnerabilities:
- Risk of undetected maturity or unauthorized withdrawal before statutory lock-in completion (typically 5 to 10 years).
- Mismatches between institutional claims and actual Core Banking records.
- Delays in verifying bank lien endorsements.
- Lack of immutable audit trails for deposit releases or rollovers.

The **AICTE Security Deposit & FDR Lifecycle Management Portal** is a centralized, production-grade enterprise platform engineered to provide end-to-end digital lifecycle governance for every institutional security deposit.

---

## 2. Core Operational Lifecycle

```text
INSTITUTION REGISTRATION
       │
       ▼
FDR DIGITAL SUBMISSION (Multi-Step Wizard + Document Scan)
       │
       ▼
BANK CBS / SFMS INDEPENDENT VERIFICATION (Cross-Checking 5 Key Parameters)
       ├── [MISMATCH / DEFICIENCY] ──► DISCREPANCY REGISTER ──► INSTITUTION CLARIFICATION
       │
       ▼ [100% MATCH]
REGULATORY APPROVAL & ACTIVE CUSTODY
       │
       ▼
AUTOMATED MATURITY SURVEILLANCE ENGINE (60d, 30d, 15d Alerts & Overdue Escalation)
       ├── [RENEWAL / ROLLOVER] ──► SUCCESSOR FDR LODGED (Old FDR -> REPLACED, New -> ACTIVE)
       │
       ▼ [10-YEAR MATURITY OR PROGRAM CLOSURE]
FORMAL LIEN RELEASE PETITION
       │
       ▼
OFFICER SCRUTINY & RECOMMENDATION
       │
       ▼
COMPETENT APPROVING AUTHORITY SANCTION ORDER
       │
       ▼
LIEN DISCHARGED / SANCTION ORDER ISSUED / AUDIT TRAIL ARCHIVED
```

---

## 3. Key Modules & Functional Architecture

1. **Executive Regulation Bureau Dashboard**
   - Live metrics: Total Institutions, Total Deposit Value in Custody, Active Compliant FDRs, Pending Scrutiny Queue, Expiring Soon, Matured, Overdue, and Open Discrepancies.
   - Urgent **"Action Required & Regulatory Alert Console"**: 1-click drilldowns into pending queues.
   - Interactive SVG analytics: Lifecycle Status Breakdown, Top Depository Scheduled Banks, Regional Office Distribution.

2. **Central FDR Repository**
   - Searchable by FDR number, institution name, depository bank, or AICTE Permanent ID.
   - Comprehensive status pills (Active, Expiring Soon, Matured, Overdue, Correction Required, Replaced, Release Requested, Released).
   - Server-side and client-side pagination, sorting, and 1-click CSV dataset export.

3. **Multi-Step Digital Submission Wizard**
   - Step 1: Institutional Attribution & Permanent ID binding.
   - Step 2: Banking Instrument Specifics (FDR Number, Bank, Branch, IFSC, Amount, Issue Date, Maturity Date, Validity, Joint Lien Mandate).
   - Step 3: Document Attachments with MIME type and file size constraints (Max 10MB).
   - Step 4: Summary review and formal regulatory undertaking declaration.

4. **Side-by-Side Scrutiny & CBS Verification Desk**
   - Direct field-by-field comparative analysis: **Institution Claimed Data** vs. **Independently Verified CBS Data**.
   - Parameter match indicators: FDR No., Bank Name, Principal Amount, Issue Date, Maturity Date.
   - Regulatory Actions: Verify & Approve, Request Correction, Reject with mandatory reason.

5. **Prototype Bank Verification Abstraction Layer**
   - Simulated Core Banking Solution (CBS) / RBI Structured Financial Messaging System (SFMS) interface.
   - Supports test simulation modes in Admin Settings:
     - `NORMAL`: 100% parameter match with CBS reference number generation.
     - `SIMULATE_MISMATCH`: Simulates amount deficit to test discrepancy resolution.
     - `SIMULATE_UNAVAILABLE`: Tests network fault tolerance and fallback alerting.

6. **Discrepancy Surveillance Desk**
   - Tracks amount mismatches, bank mismatches, non-scheduled institutions, missing lien letters, and expired instruments.
   - Multi-tier workflow: Institutional clarification submission &rarr; Scrutiny officer resolution.

7. **Automated Validity & Maturity Monitoring Engine**
   - Real-time time-delta calculations (e.g. 26 days left, 40 days overdue).
   - Configurable alert thresholds (Default: 60 days, 30 days, 15 days, 7 days overdue escalation).
   - Manual **"Run Scheduler"** button for live evaluation and test demonstrations.

8. **Renewal & Replacement Lineage Architecture**
   - Maintains unbroken parent-child instrument relationships.
   - Old predecessor FDR is **never deleted**; shifted to `REPLACED` while successor FDR becomes `ACTIVE`.

9. **Security Deposit Release & Refund Mandate**
   - Multi-tier governance: Institution petition &rarr; Scrutiny officer recommendation &rarr; Competent Authority approval &rarr; Official Sanction Order generation (`AICTE/RB/REL/...`).

10. **Institutions Directory & Comprehensive Profiles**
    - 15 seeded technical institutions across 7 AICTE administrative regions (Western, Northern, Southern, Eastern, Central, South-Western, North-Western).
    - Linked dossier with all associated security deposits, compliance standing, and authorized signatory contacts.

11. **Regulatory Reports & Audit Exports**
    - 9 real-time database query reports: Status Master, Upcoming Maturities, Matured & Overdue, Scrutiny Queue, Discrepancies, Renewals, Release Petitions, Institution-wise Custody, and Audit Logs.
    - Export to CSV format or clean printable PDF-ready layout.

12. **Cryptographic Audit Trail Register**
    - Immutable activity logging recording: Actor, Role, Timestamp (IST), Action, Entity, Entity ID, IP Address, and Before/After Diff Values.

13. **Security Surveillance & Admin Settings**
    - Active sessions, access control status, encryption status, and privilege action logs.
    - Configurable reminder days, file upload rules, and one-click "Reset Seed Data" for clean demonstrations.

---

## 4. Role-Based Access Control (RBAC) & Demo Personas

The portal includes 5 pre-configured demo personas accessible via the top-bar role switcher:

| Role | Demo User Name | Designation / Bureau | Capabilities |
|---|---|---|---|
| **INSTITUTION** | Dr. Ramesh K. Patil | Principal, PICT Pune | View own FDRs, submit new FDR, upload documents, respond to discrepancies, petition release. |
| **OFFICER** | Dr. S. K. Sharma | Assistant Director, Scrutiny Officer | Full scrutiny desk access, bank verification, raise discrepancies, request correction, recommend release. |
| **APPROVER** | Prof. R. K. Verma | Advisor & Bureau Head, AICTE | Final approval authority, review officer recommendations, issue official Sanction Orders for release. |
| **ADMIN** | Amitabh Sengupta | Chief System Admin, IT Cell / NeGD | Configure reminder periods, CBS simulation modes, view security logs, reset seed data. |
| **AUDITOR** | V. S. Narayanan | Senior Audit Officer, CAG | Read-only inspection of repository, reports generation, full immutable audit trail inspection. |

---

## 5. Technology Stack

- **Frontend Framework:** React 19 + TypeScript (Strict Mode)
- **Styling & Design System:** Tailwind CSS 4 with Government of India design standards (Inter & IBM Plex Sans typography, zero-pill discipline, high-contrast badges)
- **Icons:** Lucide React
- **Build Tool:** Vite
- **Data & Storage Layer:** LocalStorage backed reactive datastore with automated seed baseline and custom event-driven synchronization
- **Testing & Verification:** TypeScript Compiler (`tsc --noEmit`), Vite production build

---

## 6. Local Installation & Development Instructions

### Prerequisites
- Node.js (version 18+ or 20+)
- npm or bun

### Setup Commands
```bash
# Clone the repository
git clone https://github.com/root-chinmay/SIH_2026_NEW.git
cd SIH_2026_NEW

# Install all dependencies
npm install

# Start the development server
npm run dev
```

The portal will be accessible at: `http://localhost:3000`

---

## 7. Demo Walkthrough Script for SIH Evaluators

1. **Scenario 1 — Institution Lodges New FDR**
   - Switch role to **Institution User** (Dr. Ramesh K. Patil).
   - Click **Submit New FDR** in the sidebar.
   - Enter FDR Receipt No. `SBI/2026/778899`, Amount `₹20,00,000`, Bank `State Bank of India`.
   - Complete Step 3 (Upload document) & Step 4 (Declaration). Click **Submit**.
   - Expected status: `PENDING VERIFICATION`.

2. **Scenario 2 — Scrutiny Officer Verifies via Core Banking System**
   - Switch role to **AICTE Officer** (Dr. S. K. Sharma).
   - Navigate to **Scrutiny & Verification Desk**.
   - Select the newly submitted FDR in the queue.
   - Review side-by-side comparison. Click **Verify & Approve Deposit**.
   - Core Banking CBS confirmation matches 100%. Status updates to `ACTIVE`.

3. **Scenario 3 — Discrepancy Detection & Resolution**
   - Open **Discrepancy Desk**.
   - Inspect discrepancy `DISC-2026-001` (COEP Technological University amount mismatch).
   - Switch to Institution to file clarification &rarr; switch to Officer to click **Resolve Case**.

4. **Scenario 4 — Maturity Surveillance & Scheduler**
   - Navigate to **Expiry & Maturity Alerts**.
   - Inspect the upcoming maturity cards (&le; 30 Days, Matured, Overdue).
   - Click **Re-evaluate Maturity Rules** to trigger live status checks.

5. **Scenario 5 — Successor Renewal Rollover**
   - Open **Renewal & Replacement**.
   - Inspect the Thapar Institute predecessor-successor lineage card.
   - For an expiring FDR, click **Process Rollover** to witness old FDR shifting to `REPLACED` and new FDR becoming `ACTIVE`.

6. **Scenario 6 — Sanction Order for Lien Release**
   - Switch to **Approving Authority** (Prof. R. K. Verma).
   - Navigate to **Release / Refund Workflow**.
   - Inspect PSG College of Technology's recommended petition. Click **Accord Formal Sanction**.
   - Download or inspect the issued official AICTE Sanction Order (`AICTE/RB/REL/...`).

7. **Scenario 7 — Cryptographic Audit Trail Inspection**
   - Switch to **Auditor** (CAG).
   - Open **Audit Trail Register** to view the chronological, immutable record of every single action executed above.

---

## 8. Git Repository Information

- **Target Repository:** `https://github.com/root-chinmay/SIH_2026_NEW_GAIS.git`
- **Branch:** `main`
- **Author:** `root-chinmay <chinmayamodkar25@gmail.com>`

---
*Developed for Smart India Hackathon 2026 • AICTE Regulation Bureau*


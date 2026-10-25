# RupeeFlow Security Gate & PIN Lock System

A client-side security layer that protects financial data and transaction records with a custom ID, 4–6 digit PIN lock, 15-minute inactivity auto-lock, and security question recovery.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed during the interactive clarification phase:

- **Confirmed Decision 1 (Auth Method)**: Quick 4–6 digit security PIN lock with custom User ID / Name.
- **Confirmed Decision 2 (Auto-Lock Cadence)**: Automatic lock after 15 minutes of inactivity or whenever the browser tab is closed/reopened.
- **Confirmed Decision 3 (Account Recovery)**: Security question and answer verification flow allowing users to reset their PIN without wiping ledger data.
- **Default State on Fresh Launch**: First-time setup wizard prompting user to set their User ID, 4–6 digit security PIN, and a security question with answer before granting access to the financial dashboard.

---

## 1. Overview & Core Concept

### What It Does
Protects the user's sensitive multi-account bank balances, cash reserves, and transaction ledger behind a financial vault lock screen. Until the user authenticates with their User ID and PIN, all ledger components, balance cards, and analytics remain unrendered and secured.

### Target Persona & Context
Personal finance users who track multi-bank balances (`BOI`, `Cash`, `Axis`, `SBI`, etc.) on shared computers, work laptops, or mobile devices and require immediate privacy protection whenever stepping away.

### Key Value
- **Zero Inadvertent Exposure**: Financial figures and transactions are strictly shielded from curious eyes or shoulder-surfers.
- **Frictionless Entry**: 4–6 digit numeric PIN with interactive numeric keypad or physical keyboard support for 2-second access.
- **Session Protection**: Auto-lock triggers after 15 minutes of inactivity, plus a manual "Lock Vault" button in the top bar.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[ First Time Launch ] ───► [ Setup Vault Wizard ] ───► [ Set ID, PIN & Security Question ] ───► [ Access RupeeFlow ]
                                                                                                        │
[ Returning Session ] ───► [ Vault Lock Screen ] ─────► [ Enter 4-6 Digit PIN ] ─────────────► [ Dashboard Unlocked ]
                                    │                                                                   │
                                    ├───► [ 3 Failed Attempts: Rate Limit & Hint ]                      ▼
                                    └───► [ "Forgot PIN?": Answer Security Question ] ──► [ Set New PIN ]
                                                                                                        │
                                    ◄─── [ 15-min Inactivity Timer or "Lock Now" ] ─────────────────────┘
```

1. **First-Time Setup Flow**:
   - Welcome card explaining vault encryption and privacy.
   - Step 1: Enter User Display ID / Name (e.g., "Daksh").
   - Step 2: Choose and confirm a 4–6 digit PIN with dot masking.
   - Step 3: Select a security question (e.g., "What was the name of your first school?", "What city were you born in?") and set the hashed answer.
   - Success transition immediately unlocking the dashboard.

2. **Daily Unlock Flow**:
   - Clean, centered dark-slate vault screen (`bg-slate-950`).
   - Displays User ID / greeting ("Welcome back, Daksh").
   - 4–6 PIN dot indicators with smooth fill animations.
   - Interactive on-screen numeric keypad (1–9, 0, Backspace, Clear) plus native hardware keyboard listener (`0`–`9`, `Backspace`, `Enter`).
   - Subtle shake animation on incorrect PIN entry with attempt counter.

3. **Auto-Lock & Manual Lock**:
   - User activity tracker listening to mouse moves, keypresses, and touch events with a 15-minute debounced inactivity timer.
   - "Lock Vault" button in the TopBar navigation next to Privacy Mode.
   - Tab closure / page unload invalidates the session unlock token in `sessionStorage` (while hashed credentials stay securely in `localStorage`).

4. **Forgot PIN & Recovery Flow**:
   - Clicking "Forgot PIN?" presents the registered security question.
   - Answering correctly allows creating a new 4–6 digit PIN without clearing transactions or account history.

### Visual Identity & Theme
- **Aesthetic Direction**: High-security financial vault; dark slate (`#0B132B`, `#0F172A`), hairline borders, emerald accent (`#10B981` / `#34D399`) for successful verification, and muted red (`#EF4444`) for invalid attempts.
- **Typography**: `Plus Jakarta Sans` for titles and labels; `JetBrains Mono` with `tabular-nums` for PIN digits and keypad numerals.
- **Micro-Interactions**:
  - Filled PIN dots with subtle scale-up on entry.
  - Smooth keypress feedback on numeric buttons.
  - Clean slide-up transition upon successful unlock.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side SHA-256 Hashing vs Plaintext Storage**
  - *Chosen Approach*: Hash the PIN, User ID, and normalized security answer with a client-generated cryptographic salt before writing to browser storage. Never store plaintext PINs.
  - *Why*: Prevents shoulder-surfers or inspection tools from reading the raw PIN directly from storage.
  - *Trade-off*: Client-side hashing protects against casual inspection on local machines without requiring mandatory backend server setup.

- **Decision 2: `sessionStorage` Session Token vs `localStorage`**
  - *Chosen Approach*: Persistent settings (hashed PIN, salt, security question) live in `localStorage`, but the active `isUnlocked` session flag lives in `sessionStorage`.
  - *Why*: Closing the tab or browser automatically locks the app; reopening requires entering the PIN again.

- **Decision 3: Dedicated Keypad + Hardware Keyboard Input**
  - *Chosen Approach*: Provide both an on-screen numeric keypad (optimized for touch and mouse) and physical keyboard listeners (`onKeyDown`).
  - *Why*: Fast on mobile touchscreens and desktop keyboards alike.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App.tsx                                   │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐ │
│  │       SecurityProvider        │  │        FinanceProvider         │ │
│  │  (Lock State / Inactivity)    │  │  (Accounts / Transactions)     │ │
│  └───────────────┬───────────────┘  └────────────────┬───────────────┘ │
└──────────────────┼───────────────────────────────────┼─────────────────┘
                   │                                   │
         ┌─────────┴─────────┐                         │
   Is Vault Locked?          │                         │
         ├────── Yes ────────┴──────────────┐          │
         │                                  │          │
         ▼                                  ▼          ▼
┌──────────────────┐               ┌─────────────────────────────────────┐
│  VaultLockModal  │               │       RupeeFlow Main Layout         │
│  - Setup Mode    │               │  - TopBar (with "Lock Vault" button)│
│  - PIN Keypad    │  (On Unlock)  │  - Liquidity Grid ("Balance")       │
│  - Recovery Form │──────────────►│  - Cash Flow & Monthly Table        │
└──────────────────┘               │  - Transaction Ledger & Excel Sync  │
                                   └─────────────────────────────────────┘
```

### Component & State Mapping

1. `src/context/SecurityContext.tsx`:
   - State: `isLocked`, `isConfigured`, `userId`, `securityQuestion`, `inactivityMinutes`.
   - Methods: `unlockVault(pin)`, `lockVault()`, `setupVault(id, pin, question, answer)`, `verifySecurityAnswer(answer)`, `resetPin(newPin)`.
   - Inactivity Listener: Global listeners on `mousemove`, `keydown`, `touchstart`, `scroll` resetting a 15-minute timer.
2. `src/components/VaultLockModal.tsx`:
   - Interactive PIN Keypad: 0–9, Backspace, Clear.
   - State machine: `'UNLOCK' | 'SETUP' | 'RECOVERY' | 'CHANGE_PIN'`.
   - Dot indicators: 4 to 6 slots showing filled or empty state.
3. `src/components/TopBar.tsx`:
   - Add a "Lock Vault" icon button (`Lock` icon) next to Privacy Mode allowing instant manual locking when stepping away.
4. `src/components/SecuritySettingsModal.tsx`:
   - Accessible from settings to change PIN, update User ID, or modify the security question while unlocked.

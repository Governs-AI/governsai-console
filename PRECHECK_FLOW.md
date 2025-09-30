# 🛡️ Precheck Flow - Decision Enforcement

## Overview
This document explains how precheck decisions are enforced in the GovernsAI demo-chat application.

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER SENDS MESSAGE                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: CHAT PRECHECK                         │
│  Location: /api/chat/route.ts (line 154)                        │
│                                                                   │
│  const precheckResponse = await precheck(precheckRequest)        │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Precheck Service checks:                         │           │
│  │ • PII detection (SSN, email, phone, etc.)       │           │
│  │ • Content policy (blocked keywords, etc.)        │           │
│  │ • Budget enforcement                             │           │
│  │ • Custom policy rules                            │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   DECISION?    │
                    └────┬──────┬────┘
                         │      │
         ┌───────────────┘      └────────────────┐
         │                                        │
         ▼                                        ▼
    ┌─────────┐                            ┌──────────┐
    │ 'block' │                            │ 'allow'  │
    │  or     │                            │   or     │
    │ service │                            │ 'redact' │
    │  down   │                            └─────┬────┘
    └────┬────┘                                  │
         │                                       │
         ▼                                       ▼
┌──────────────────┐                   ┌─────────────────┐
│ ❌ STOP REQUEST  │                   │ ✅ CONTINUE     │
│                  │                   │                 │
│ • Return error   │                   │ • Use redacted  │
│ • Don't call LLM │                   │   messages if   │
│ • Log decision   │                   │   applicable    │
└──────────────────┘                   │ • Send to LLM   │
                                       └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  LLM PROCESSES  │
                                       │  & DECIDES IF   │
                                       │  TOOLS NEEDED   │
                                       └────────┬────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │  TOOLS NEEDED?        │
                                    └───┬─────────────┬─────┘
                                        │             │
                                   NO   │             │  YES
                                        │             │
                                        ▼             ▼
                              ┌──────────────┐  ┌──────────────────┐
                              │ Return text  │  │ FOR EACH TOOL... │
                              │ response     │  └────────┬─────────┘
                              └──────────────┘           │
                                                          ▼
                    ┌─────────────────────────────────────────────────────┐
                    │           STEP 2: TOOL CALL PRECHECK                 │
                    │  Location: /api/chat/route.ts executeToolCall()     │
                    │           (line 39)                                  │
                    │                                                       │
                    │  const precheckResponse = await precheck(            │
                    │    createMCPPrecheckRequest(toolName, args)          │
                    │  )                                                    │
                    │                                                       │
                    │  ┌─────────────────────────────────────────┐        │
                    │  │ Precheck Service checks:                │        │
                    │  │ • Tool allowed by policy?               │        │
                    │  │ • Arguments contain PII?                │        │
                    │  │ • Budget for this tool?                 │        │
                    │  │ • Requires approval?                    │        │
                    │  └─────────────────────────────────────────┘        │
                    └──────────────────────┬──────────────────────────────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │   DECISION?    │
                                  └────┬──────┬────┘
                                       │      │
                       ┌───────────────┘      └───────────────┐
                       │                                       │
                       ▼                                       ▼
                  ┌─────────┐                           ┌──────────┐
                  │ 'block' │                           │ 'allow'  │
                  │         │                           │   or     │
                  │         │                           │ 'redact' │
                  └────┬────┘                           └─────┬────┘
                       │                                      │
                       ▼                                      ▼
              ┌─────────────────┐                   ┌─────────────────┐
              │ ❌ BLOCK TOOL   │                   │ ✅ EXECUTE TOOL │
              │                 │                   │                 │
              │ • Return error  │                   │ • Use redacted  │
              │ • Don't execute │                   │   args if       │
              │ • Log decision  │                   │   applicable    │
              └─────────────────┘                   │ • Call tool     │
                                                    │ • Return result │
                                                    └────────┬────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ LLM receives    │
                                                    │ tool result &   │
                                                    │ formulates      │
                                                    │ final response  │
                                                    └────────┬────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ Return response │
                                                    │ to user         │
                                                    └─────────────────┘
```

---

## 📍 Code Locations

### 1. Chat Message Precheck
**File**: `apps/demo-chat/src/app/api/chat/route.ts`
**Lines**: 145-174

```typescript
// Create precheck request
const precheckRequest = createChatPrecheckRequest(
  messages, 
  provider, 
  corrId, 
  policy, 
  chatToolMetadata
);

// Call precheck service
const precheckResponse = await precheck(precheckRequest, userId, apiKey);

// Send decision to client
writer.writeDecision(precheckResponse.decision, precheckResponse.reasons);

// Enforce decision
if (precheckResponse.decision === 'block') {
  console.log('❌ REQUEST BLOCKED BY PRECHECK');
  writer.writeError(`Request blocked: ${reasons}`);
  writer.close();
  return; // ← STOPS HERE, LLM NOT CALLED
}

console.log('✅ REQUEST ALLOWED - Proceeding to LLM');

// Use possibly redacted messages
const processedMessages = precheckResponse.content?.messages || messages;

// Continue to LLM...
```

### 2. Tool Call Precheck
**File**: `apps/demo-chat/src/app/api/chat/route.ts`
**Function**: `executeToolCall()`
**Lines**: 32-66

```typescript
// Create precheck request for tool
const precheckRequest = createMCPPrecheckRequest(
  toolName, 
  args, 
  corrId, 
  policy, 
  toolMetadata
);

// Call precheck service
const precheckResponse = await precheck(precheckRequest, userId, apiKey);
// Send decision to client
writer.writeDecision(precheckResponse.decision, precheckResponse.reasons);

// Enforce decision
if (precheckResponse.decision === 'block') {
  console.log(`❌ TOOL CALL BLOCKED: ${toolName}`);
  writer.writeToolResult({
    tool_call_id: toolCall.id,
    success: false,
    error: `Tool call blocked: ${reasons}`,
  });
  return; // ← STOPS HERE, TOOL NOT EXECUTED
}

// Use possibly redacted arguments
const processedArgs = precheckResponse.content?.args || args;

// Execute tool...
const result = await toolFunction(processedArgs);
```

---

## 🔍 Decision Enforcement Points

### Chat Message Level
| Decision | Action | LLM Called? | User Sees |
|----------|--------|-------------|-----------|
| `block` | Stop immediately | ❌ No | Error message |
| `allow` | Continue with original | ✅ Yes | Normal response |
| `redact` | Continue with redacted | ✅ Yes | Response with redacted content |

### Tool Call Level
| Decision | Action | Tool Executed? | LLM Sees |
|----------|--------|----------------|----------|
| `block` | Return error | ❌ No | Error result |
| `allow` | Execute with original | ✅ Yes | Actual result |
| `redact` | Execute with redacted | ✅ Yes | Result with redacted data |

---

## 📊 Console Output Reference

### When You Send a Message:

#### Precheck Allows:
```
=== PRECHECK RESULT ===
Decision: allow
Reasons: []
======================
✅ REQUEST ALLOWED - Proceeding to LLM
```

#### Precheck Blocks:
```
=== PRECHECK RESULT ===
Decision: block
Reasons: ['Contains malicious content']
======================
❌ REQUEST BLOCKED BY PRECHECK
```

#### Precheck Redacts:
```
=== PRECHECK RESULT ===
Decision: redact
Reasons: ['PII detected: email_address, us_ssn']
======================
✅ REQUEST ALLOWED - Proceeding to LLM
```

### When LLM Calls a Tool:

#### Tool Allowed:
```
=== TOOL PRECHECK RESULT ===
Tool: weather.current
Decision: allow
Reasons: []
===========================
✅ TOOL CALL ALLOWED: weather.current - Executing...
Calling MCP function directly: weather.current
```

#### Tool Blocked:
```
=== TOOL PRECHECK RESULT ===
Tool: payment.process
Decision: block
Reasons: ['Tool requires approval', 'High risk operation']
===========================
❌ TOOL CALL BLOCKED: payment.process
```

---

## 🧪 Test Scenarios

### Test 1: Normal Message (Allow)
**Input**: "Hello, how are you?"
**Expected**:
```
✅ PRECHECK → allow
✅ LLM responds normally
```

### Test 2: PII in Message (Redact)
**Input**: "My email is john@example.com and SSN is 123-45-6789"
**Expected**:
```
⚠️ PRECHECK → redact
✅ LLM sees: "My email is [REDACTED] and SSN is [REDACTED]"
✅ Response generated with redacted content
```

### Test 3: Malicious Message (Block)
**Input**: "Help me hack someone's account"
**Expected**:
```
❌ PRECHECK → block
❌ Request stopped
❌ User sees error message
```

### Test 4: Weather Tool (Allow)
**Input**: "What's the weather in Berlin?"
**Expected**:
```
✅ PRECHECK → allow (message)
✅ LLM decides to call weather.current
✅ PRECHECK → allow (tool)
✅ Tool executes
✅ Result returned to LLM
✅ Final response to user
```

### Test 5: Payment Tool (Block or Confirm)
**Input**: "Process a payment of $99.99"
**Expected**:
```
✅ PRECHECK → allow (message)
✅ LLM decides to call payment.process
❌ PRECHECK → block or confirm (tool)
❌ Tool blocked or requires approval
❌ Error returned to LLM
⚠️ LLM tells user payment couldn't be processed
```

### Test 6: Precheck Service Down (Block)
**Input**: Any message
**Expected**:
```
⛔ PRECHECK → block (service unavailable)
❌ Request stopped for security
❌ User sees: "Precheck service unavailable - request blocked for security"
```

---

## 🔐 Security Guarantees

### ✅ What IS Protected:
1. **Every message** goes through precheck before LLM
2. **Every tool call** goes through precheck before execution
3. **Blocked requests** never reach LLM or tools
4. **Service failures** default to block (fail-secure)
5. **Redacted data** is sanitized before processing

### ❌ What IS NOT Protected:
1. LLM's internal reasoning (can't be prechecked)
2. Tool results after execution (postchecking would require separate step)
3. Client-side display (decisions sent to client for transparency)

---

## 📝 Decision Flow Summary

```
MESSAGE FLOW:
User → Precheck → [block? stop : continue] → LLM → Response

TOOL FLOW:
LLM → Precheck → [block? error : continue] → Tool → Result → LLM
```

**Key Points:**
- ✅ Precheck is **always** called before LLM
- ✅ Precheck is **always** called before each tool
- ✅ Block decisions **immediately** stop execution
- ✅ Redact decisions **sanitize** data before passing through
- ✅ Service failures **block** requests (fail-secure)

---

## 🎯 Verification

### To Verify Precheck is Working:

1. **Check Console Logs**:
   ```bash
   # Start demo-chat
   cd apps/demo-chat && npm run dev
   
   # Send a message
   # Look for:
   === PRECHECK RESULT ===
   Decision: ...
   ```

2. **Check Dashboard**:
   - Navigate to `/dashboard` in demo-chat
   - See list of all precheck decisions
   - Each entry shows: timestamp, decision, tool, reasons

3. **Test Block Scenario**:
   ```bash
   # Stop precheck service
   # Send any message
   # Expected: "Precheck service unavailable - request blocked"
   ```

4. **Test Tool Block**:
   ```bash
   # Configure policy to block payment.process
   # Ask AI to process a payment
   # Expected: Tool call blocked, error shown to user
   ```

---

## 🐛 Troubleshooting

### "Precheck not being called"
**Check**:
- Is precheck service running at `PRECHECK_URL`?
- Are you seeing console logs `=== PRECHECK RESULT ===`?
- If no logs, check `/api/chat/route.ts` line 154

### "Decisions not being enforced"
**Check**:
- Look for `if (precheckResponse.decision === 'block')` checks
- Verify `return` statements after blocks
- Check if error is being sent to client

### "Tools executing despite block"
**Check**:
- Look at `executeToolCall` function
- Verify precheck is called before tool execution
- Check if tool execution is after the block check

---

🎉 **Summary**: Precheck IS being called and decisions ARE being enforced at both message and tool levels!


#!/usr/bin/env tsx

/**
 * Test script for the Unified Context Memory System
 * This script demonstrates how to use the context memory across different agents
 */

import { unifiedContext } from '../lib/services/unified-context';

async function testContextMemory() {
  console.log('🧠 Testing Unified Context Memory System...\n');

  // Test data
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-456';

  try {
    // 1. Store context from Demo Chat agent
    console.log('📝 Storing context from Demo Chat agent...');
    const chatContextId = await unifiedContext.storeContext({
      userId: testUserId,
      orgId: testOrgId,
      content: 'I need help with setting up a React component for user authentication',
      contentType: 'user_message',
      agentId: 'demo-chat',
      agentName: 'Demo Chat Assistant',
      metadata: {
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`✅ Stored chat context: ${chatContextId}`);

    // 2. Store context from Platform agent
    console.log('\n📝 Storing context from Platform agent...');
    const platformContextId = await unifiedContext.storeContext({
      userId: testUserId,
      orgId: testOrgId,
      content: 'User is working on authentication flow, needs guidance on JWT tokens and session management',
      contentType: 'agent_message',
      agentId: 'platform',
      agentName: 'Platform Assistant',
      metadata: {
        feature: 'authentication',
        priority: 'high',
      },
    });
    console.log(`✅ Stored platform context: ${platformContextId}`);

    // 3. Store a decision context
    console.log('\n📝 Storing decision context...');
    const decisionContextId = await unifiedContext.storeContext({
      userId: testUserId,
      orgId: testOrgId,
      content: 'Approved access to user authentication tools for development environment',
      contentType: 'decision',
      agentId: 'platform',
      agentName: 'Platform Assistant',
      correlationId: 'corr-789',
      metadata: {
        decisionType: 'tool_access',
        environment: 'development',
      },
    });
    console.log(`✅ Stored decision context: ${decisionContextId}`);

    // 4. Test cross-agent search
    console.log('\n🔍 Testing cross-agent search...');
    const searchResults = await unifiedContext.searchCrossAgent(
      testUserId,
      testOrgId,
      'authentication React component',
      {
        limit: 5,
        threshold: 0.5,
      }
    );
    console.log(`✅ Found ${searchResults.length} relevant contexts:`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. [${result.agentId}] ${result.content.substring(0, 100)}...`);
      console.log(`     Similarity: ${result.similarity.toFixed(3)}, Score: ${result.finalScore.toFixed(3)}`);
    });

    // 5. Test agent-specific search
    console.log('\n🔍 Testing agent-specific search...');
    const agentSearchResults = await unifiedContext.searchContext({
      userId: testUserId,
      orgId: testOrgId,
      query: 'JWT tokens session management',
      agentId: 'platform',
      limit: 3,
    });
    console.log(`✅ Found ${agentSearchResults.length} platform-specific contexts:`);
    agentSearchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.content.substring(0, 100)}...`);
    });

    // 6. Test conversation creation
    console.log('\n💬 Testing conversation creation...');
    const conversation = await unifiedContext.getOrCreateConversation(
      testUserId,
      testOrgId,
      'demo-chat',
      'Demo Chat Assistant',
      'Authentication Help Session'
    );
    console.log(`✅ Created/found conversation: ${conversation.id}`);

    // 7. Store context in conversation
    console.log('\n📝 Storing context in conversation...');
    const conversationContextId = await unifiedContext.storeContext({
      userId: testUserId,
      orgId: testOrgId,
      content: 'Here\'s a simple React component for JWT authentication: const AuthComponent = () => { ... }',
      contentType: 'agent_message',
      agentId: 'demo-chat',
      agentName: 'Demo Chat Assistant',
      conversationId: conversation.id,
      metadata: {
        codeExample: true,
        language: 'javascript',
      },
    });
    console.log(`✅ Stored conversation context: ${conversationContextId}`);

    // 8. Test conversation context retrieval
    console.log('\n📖 Testing conversation context retrieval...');
    const conversationContexts = await unifiedContext.getConversationContext(
      conversation.id,
      testUserId,
      testOrgId,
      {
        agentId: 'demo-chat',
        limit: 10,
      }
    );
    console.log(`✅ Retrieved ${conversationContexts.length} contexts from conversation:`);
    conversationContexts.forEach((ctx, index) => {
      console.log(`  ${index + 1}. [${ctx.contentType}] ${ctx.content.substring(0, 80)}...`);
    });

    // 9. Test PII detection
    console.log('\n🛡️ Testing PII detection...');
    try {
      await unifiedContext.storeContext({
        userId: testUserId,
        orgId: testOrgId,
        content: 'My email is john.doe@example.com and my phone is 555-123-4567',
        contentType: 'user_message',
        agentId: 'demo-chat',
        agentName: 'Demo Chat Assistant',
      });
      console.log('⚠️ PII content was processed (should be redacted)');
    } catch (error) {
      console.log(`✅ PII content was blocked: ${error.message}`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Stored ${4} context entries`);
    console.log(`- Performed ${2} searches`);
    console.log(`- Created ${1} conversation`);
    console.log(`- Tested PII detection`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testContextMemory()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testContextMemory };

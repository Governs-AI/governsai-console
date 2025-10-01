import { AuthService } from './src/services/auth.js';

console.log('🧪 Testing orgId Resolution Directly');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const authService = new AuthService();

async function testOrgIdResolution() {
  try {
    console.log('🔍 Testing getUserOrg with demo-user-123...');
    
    const userOrg = await authService.getUserOrg('demo-user-123');
    
    if (userOrg) {
      console.log('✅ Found user org:', userOrg);
    } else {
      console.log('❌ No organization found for demo-user-123');
      console.log('🔍 This is expected if the user doesn\'t exist in the database');
    }
    
    // Test with a mock userId
    console.log('🔍 Testing getUserOrg with mock-user-123...');
    const mockUserOrg = await authService.getUserOrg('mock-user-123');
    
    if (mockUserOrg) {
      console.log('✅ Found mock user org:', mockUserOrg);
    } else {
      console.log('❌ No organization found for mock-user-123');
    }
    
  } catch (error) {
    console.error('❌ Error testing orgId resolution:', error);
  }
}

testOrgIdResolution().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

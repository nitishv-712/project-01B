import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/auth';

async function testAuthRoutes() {
  console.log('🧪 Testing Auth Routes\n');

  // Test 1: Register with missing fields
  console.log('1️⃣ Register - Missing fields');
  try {
    await axios.post(`${BASE_URL}/register`, { email: 'test@test.com' });
    console.log('❌ Should have failed\n');
  } catch (err: any) {
    console.log(`✅ ${err.response?.status || 'ERR'}: ${err.response?.data?.error || err.message}\n`);
  }

  // Test 2: Register successfully
  console.log('2️⃣ Register - Valid user');
  try {
    const res = await axios.post(`${BASE_URL}/register`, {
      name: 'Test User',
      email: `test${Date.now()}@test.com`,
      password: 'password123'
    });
    console.log(`✅ ${res.status}: User registered`);
    console.log(`   Token: ${res.data.data.token.substring(0, 20)}...\n`);
  } catch (err: any) {
    console.log(`❌ ${err.response?.status}: ${err.response?.data?.error || err.message}\n`);
  }

  // Test 3: Register duplicate email
  console.log('3️⃣ Register - Duplicate email');
  const duplicateEmail = `duplicate${Date.now()}@test.com`;
  try {
    await axios.post(`${BASE_URL}/register`, {
      name: 'User 1',
      email: duplicateEmail,
      password: 'password123'
    });
    await axios.post(`${BASE_URL}/register`, {
      name: 'User 2',
      email: duplicateEmail,
      password: 'password456'
    });
    console.log('❌ Should have failed\n');
  } catch (err: any) {
    console.log(`✅ ${err.response?.status || 'ERR'}: ${err.response?.data?.error || err.message}\n`);
  }

  // Test 4: Login with missing fields
  console.log('4️⃣ Login - Missing fields');
  try {
    await axios.post(`${BASE_URL}/login`, { email: 'test@test.com' });
    console.log('❌ Should have failed\n');
  } catch (err: any) {
    console.log(`✅ ${err.response?.status || 'ERR'}: ${err.response?.data?.error || err.message}\n`);
  }

  // Test 5: Login with invalid credentials
  console.log('5️⃣ Login - Invalid credentials');
  try {
    await axios.post(`${BASE_URL}/login`, {
      email: 'nonexistent@test.com',
      password: 'wrongpassword'
    });
    console.log('❌ Should have failed\n');
  } catch (err: any) {
    console.log(`✅ ${err.response?.status || 'ERR'}: ${err.response?.data?.error || err.message}\n`);
  }

  // Test 6: Login successfully
  console.log('6️⃣ Login - Valid credentials');
  const testEmail = `logintest${Date.now()}@test.com`;
  try {
    await axios.post(`${BASE_URL}/register`, {
      name: 'Login Test',
      email: testEmail,
      password: 'password123'
    });
    const res = await axios.post(`${BASE_URL}/login`, {
      email: testEmail,
      password: 'password123'
    });
    console.log(`✅ ${res.status}: Login successful`);
    console.log(`   Role: ${res.data.data.role}`);
    console.log(`   Token: ${res.data.data.token.substring(0, 20)}...\n`);
  } catch (err: any) {
    console.log(`❌ ${err.response?.status}: ${err.response?.data?.error || err.message}\n`);
  }

  // Test 7: Get /me without token
  console.log('7️⃣ Get /me - No token');
  try {
    await axios.get(`${BASE_URL}/me`);
    console.log('❌ Should have failed\n');
  } catch (err: any) {
    console.log(`✅ ${err.response?.status || 'ERR'}: ${err.response?.data?.error || err.message}\n`);
  }

  // Test 8: Get /me with valid token
  console.log('8️⃣ Get /me - Valid token');
  try {
    const registerRes = await axios.post(`${BASE_URL}/register`, {
      name: 'Me Test',
      email: `metest${Date.now()}@test.com`,
      password: 'password123'
    });
    const token = registerRes.data.data.token;
    const res = await axios.get(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ ${res.status}: User data retrieved`);
    console.log(`   Name: ${res.data.data.name}`);
    console.log(`   Email: ${res.data.data.email}\n`);
  } catch (err: any) {
    console.log(`❌ ${err.response?.status}: ${err.response?.data?.error || err.message}\n`);
  }

  console.log('✅ All tests completed');
}

testAuthRoutes().catch(console.error);

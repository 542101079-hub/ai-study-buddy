// 测试API错误信息
const testAPI = async () => {
  try {
    console.log('Testing /api/daily/generate...');
    
    const response = await fetch('http://localhost:3001/api/daily/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyMinutes: 60 }),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Request failed:', error);
  }
};

testAPI();

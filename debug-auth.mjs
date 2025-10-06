// 调试认证状态
const debugAuth = async () => {
  try {
    console.log('=== 认证状态调试 ===');
    
    // 测试API认证
    const response = await fetch('http://localhost:3001/api/daily/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyMinutes: 60 }),
    });
    
    console.log('API响应状态:', response.status);
    const data = await response.json();
    console.log('API响应数据:', JSON.stringify(data, null, 2));
    
    // 测试基础API
    const dailyResponse = await fetch('http://localhost:3001/api/daily');
    console.log('Daily API状态:', dailyResponse.status);
    const dailyData = await dailyResponse.json();
    console.log('Daily API数据:', JSON.stringify(dailyData, null, 2));
    
  } catch (error) {
    console.error('调试失败:', error);
  }
};

debugAuth();

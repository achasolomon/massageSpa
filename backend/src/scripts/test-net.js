require('dotenv').config();
const { testEmailConnection } = require('../services/emailService');

async function runTest() {
  console.log('Testing email configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');
  
  const result = await testEmailConnection();
  console.log('Test result:', result ? 'SUCCESS' : 'FAILED');
}

runTest();
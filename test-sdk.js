import SlyOS from '@beltoinc/slyos-sdk';

console.log('🔥 Testing SlyOS SDK from npm...\n');

async function test() {
  try {
    // 1. Initialize
    console.log('📡 Initializing SDK...');
    const sdk = new SlyOS({
      apiKey: process.env.SLYOS_API_KEY || 'your-api-key-here'
    });
    await sdk.initialize();
    console.log('✅ SDK initialized!\n');

    // 2. Load model
    console.log('📥 Loading AI model (this takes 1-2 min first time)...');
    await sdk.loadModel('quantum-1.7b');
    console.log('✅ Model loaded!\n');

    // 3. Generate response
    console.log('🤖 Generating AI response...\n');
    const response = await sdk.generate('quantum-1.7b', 
      'What is artificial intelligence? Explain in 2 sentences.',
      {
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9
      }
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 AI RESPONSE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ SUCCESS! SDK works perfectly!\n');
    console.log('🎉 Your npm package is ready for customers!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

test();

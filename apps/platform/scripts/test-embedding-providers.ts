#!/usr/bin/env tsx

/**
 * Test script for different embedding providers
 * This script demonstrates how to use various embedding providers
 * with the unified context memory system.
 */

import { createEmbeddingService, embeddingConfigs } from '../lib/services/embedding-service';

async function testEmbeddingProviders() {
  console.log('🧠 Testing Embedding Providers...\n');

  const testText = "I need help with setting up a React component for user authentication";

  // Test configurations
  const configs = [
    {
      name: 'OpenAI',
      config: embeddingConfigs.openai,
      env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
    },
    {
      name: 'Ollama (nomic-embed-text)',
      config: {
        ...embeddingConfigs.ollama,
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
      },
      env: {},
    },
    {
      name: 'Ollama (mxbai-embed-large)',
      config: {
        ...embeddingConfigs.ollama,
        baseUrl: 'http://localhost:11434',
        model: 'mxbai-embed-large',
      },
      env: {},
    },
    {
      name: 'Hugging Face',
      config: {
        ...embeddingConfigs.huggingface,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
      },
      env: { HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY },
    },
    {
      name: 'Cohere',
      config: embeddingConfigs.cohere,
      env: { COHERE_API_KEY: process.env.COHERE_API_KEY },
    },
  ];

  for (const { name, config, env } of configs) {
    console.log(`\n🔍 Testing ${name}...`);
    
    try {
      // Check if required environment variables are set
      const missingEnv = Object.entries(env).filter(([key, value]) => !value);
      if (missingEnv.length > 0) {
        console.log(`⚠️  Skipping ${name} - Missing environment variables: ${missingEnv.map(([key]) => key).join(', ')}`);
        continue;
      }

      // Create embedding service
      const embeddingService = createEmbeddingService(config);
      
      console.log(`   Provider: ${embeddingService.getProviderName()}`);
      console.log(`   Dimensions: ${embeddingService.getDimensions()}`);
      console.log(`   Max tokens: ${embeddingService.getMaxTokens()}`);

      // Generate embedding
      const startTime = Date.now();
      const embedding = await embeddingService.generateEmbedding(testText);
      const duration = Date.now() - startTime;

      console.log(`   ✅ Generated embedding in ${duration}ms`);
      console.log(`   Embedding length: ${embedding.length}`);
      console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log('\n🎉 Embedding provider testing completed!');
}

// Test similarity calculation between different providers
async function testSimilarityCalculation() {
  console.log('\n🔍 Testing Similarity Calculation...\n');

  const texts = [
    "I need help with React authentication",
    "How do I implement JWT tokens in React?",
    "What's the weather like today?",
    "Authentication is important for security",
  ];

  try {
    // Use Ollama for this test (most likely to be available)
    const embeddingService = createEmbeddingService({
      ...embeddingConfigs.ollama,
      baseUrl: 'http://localhost:11434',
      model: 'nomic-embed-text',
    });

    console.log('Generating embeddings for similarity test...');
    const embeddings = await Promise.all(
      texts.map(text => embeddingService.generateEmbedding(text))
    );

    // Calculate cosine similarity between all pairs
    console.log('\nSimilarity Matrix:');
    console.log('Text 1: "I need help with React authentication"');
    console.log('Text 2: "How do I implement JWT tokens in React?"');
    console.log('Text 3: "What\'s the weather like today?"');
    console.log('Text 4: "Authentication is important for security"');
    console.log('\nCosine Similarity Scores:');

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        console.log(`  ${i + 1} vs ${j + 1}: ${similarity.toFixed(4)}`);
      }
    }

    // Find most similar pair
    let maxSimilarity = 0;
    let maxPair = [0, 0];
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          maxPair = [i, j];
        }
      }
    }

    console.log(`\nMost similar pair: ${maxPair[0] + 1} vs ${maxPair[1] + 1} (${maxSimilarity.toFixed(4)})`);
    console.log(`Text ${maxPair[0] + 1}: "${texts[maxPair[0]]}"`);
    console.log(`Text ${maxPair[1] + 1}: "${texts[maxPair[1]]}"`);

  } catch (error) {
    console.log(`❌ Similarity test failed: ${error.message}`);
  }
}

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Run the tests
if (require.main === module) {
  testEmbeddingProviders()
    .then(() => testSimilarityCalculation())
    .then(() => {
      console.log('\n✅ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testEmbeddingProviders, testSimilarityCalculation };

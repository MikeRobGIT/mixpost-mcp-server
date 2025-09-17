#!/bin/bash
# Run all tests sequentially to avoid mock conflicts

echo "Running tests sequentially to avoid mock conflicts..."
echo ""

# Run each test suite separately
echo "Running tools tests..."
bun test tests/tools.test.ts || exit 1

echo "Running client tests..."
bun test tests/client.test.ts || exit 1

echo "Running performance tests..."
bun test tests/performance.test.ts || exit 1

echo "Running index tests..."
bun test tests/index.test.ts || exit 1

echo "Running integration tests..."
bun test tests/integration/ || exit 1

echo "Running core tests..."
bun test tests/core/ || exit 1

echo ""
echo "All tests passed!"
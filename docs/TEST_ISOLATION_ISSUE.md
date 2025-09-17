# Test Isolation Issue - Known Limitation

## Issue Description

The tests in `tests/core/client.test.ts` pass when run individually or when run with other specific test files, but fail when the entire test suite is run with `bun test`. The failures show `Number of calls: 0` for mocked functions, indicating that the mocks are not being properly called or isolated.

## Root Cause

This appears to be a limitation with Bun's test runner's mock isolation when tests run in parallel. Despite implementing dependency injection and creating isolated mock HTTP clients for each test, there's still interference between test files when they run together.

## Affected Tests

The following tests in `tests/core/client.test.ts` fail when run with the full suite:
- All Account Methods tests
- All Post Methods tests
- All Media Methods tests
- All Tag Methods tests
- All Error Handling tests

## Verification

The tests work correctly in these scenarios:
- Running `tests/core/client.test.ts` alone: ✅ All tests pass
- Running tests in `tests/core/` directory: ✅ All tests pass
- Running with `tests/client.test.ts`: ✅ All tests pass
- Running with `tests/performance.test.ts`: ✅ All tests pass
- Running with `tests/tools.test.ts`: ✅ All tests pass
- Running all tests together with `bun test`: ❌ 21 tests fail

## Workaround

### Option 1: Run Tests Sequentially (Recommended)

Use the provided script to run tests sequentially:

```bash
bun run test:sequential
```

This script runs each test file one at a time, avoiding the parallel execution issues.

### Option 2: Run Specific Test Groups

Run tests by directory or file pattern:

```bash
# Run core tests only
bun test tests/core

# Run specific test file
bun test tests/core/client.test.ts

# Run multiple specific files
bun test tests/client.test.ts tests/performance.test.ts
```

### Option 3: Exclude Problematic Tests

Temporarily skip the affected tests when running the full suite:

```bash
# Run all tests except core/client.test.ts
bun test --exclude tests/core/client.test.ts
```

## Attempted Solutions

The following approaches were tried to fix the isolation issue:

1. **Dependency Injection Pattern**: Implemented HTTP client abstraction layer to avoid global axios mocking
2. **Mock Restoration**: Added explicit mock.restore() calls in afterEach hooks
3. **Isolated Mock Creation**: Created fresh mocks in beforeEach with no shared state
4. **Synchronous Mock Functions**: Changed from async to sync functions returning promises
5. **Bare Mocks**: Created mocks without default implementations
6. **Auto-Mocking Pattern**: Implemented Jest-style auto-mocking with default behaviors

Despite these attempts, the issue persists when tests run in parallel.

## Future Considerations

1. **Bun Updates**: Check if future versions of Bun improve mock isolation
2. **Alternative Test Runners**: Consider using Jest or Vitest if the issue becomes blocking
3. **Test Restructuring**: Consider restructuring tests to avoid mocking the HTTP client entirely
4. **Serial Test Execution**: Configure Bun to run tests serially by default if supported in future versions

## Related Files

- `tests/core/client.test.ts` - The affected test file
- `src/http-client.ts` - HTTP client abstraction layer
- `src/client.ts` - MixpostClient with dependency injection support
- `tests/utils/mock-http-client.ts` - Mock utilities
- `package.json` - Contains the test:sequential script

## References

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Bun Mock Function Documentation](https://bun.sh/docs/test/mocks)
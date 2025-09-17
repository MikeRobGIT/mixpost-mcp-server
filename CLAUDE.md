# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **Bun** as the package manager and runtime. All commands should be run with Bun:

- **Install dependencies**: `bun install`
- **Build**: `bun run build` - Compiles TypeScript from src/ to dist/
- **Development mode**: `bun run dev` - Runs TypeScript directly using tsx
- **Direct execution**: `bun run src/index.ts` - Bun can execute TypeScript files directly
- **Prepublish**: `bun run prepublishOnly` - Runs before npm publish

Note: No test commands are currently configured.

## Architecture Overview

This is an MCP (Model Context Protocol) server that provides a bridge between Claude and the Mixpost social media management API.

### Core Structure

The codebase consists of 4 main TypeScript files in `src/`:

1. **index.ts**: Entry point and MCP server setup
   - Handles tool registration and request routing
   - Validates requests and manages error handling
   - Maps MCP tool calls to client methods

2. **client.ts**: Mixpost API client
   - Axios-based HTTP client with error interceptors
   - Implements all Mixpost API endpoints
   - Handles authentication via Bearer token

3. **types.ts**: TypeScript type definitions
   - Defines all request/response interfaces
   - API error types and pagination structures

4. **tools.ts**: MCP tool definitions
   - Defines available tools and their schemas
   - Documents parameters for each operation

### Key Patterns

**Environment Configuration**: The server requires these environment variables:
- `MIXPOST_BASE_URL`: Mixpost instance URL
- `MIXPOST_WORKSPACE_UUID`: Workspace identifier
- `MIXPOST_API_KEY`: Bearer token for authentication
- `MIXPOST_CORE_PATH`: Optional, defaults to "mixpost"

**Validation Flow**:
- UUID validation using `validateUuid()` method
- Date format validation (YYYY-MM-DD)
- Time format validation (HH:MM)
- Request structure validation before API calls

**Error Handling**:
- Custom `ApiError` type with status, message, and errors fields
- Response interceptor catches 4xx/5xx errors
- Network timeouts configured at 30 seconds

## Important Implementation Notes

### Account ID Quirk
Despite parameter names like `accountUuid`, account IDs in the Mixpost API are **integers, not UUIDs**. The `accounts` array and `account_id` fields in post versions must use numeric IDs. Use `mixpost_list_accounts` to get the correct numeric IDs.

### Post Creation Structure
When creating posts, the `versions` field expects an array of objects, where each object represents a version for a specific account:
```typescript
{
  "account_id": 1,  // Must be integer
  "is_original": true,
  "content": {
    "body": "Post content",
    "media": [],
    "urls": []
  }
}
```

### Content Formatting
Post content should use HTML tags for formatting (e.g., `<div>` for line breaks).

### Request Validation
The server performs strict validation on:
- Date format (YYYY-MM-DD)
- Time format (HH:MM)
- Required fields presence
- Array types for accounts and versions
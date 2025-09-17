# Mixpost MCP Server

A Model Context Protocol (MCP) server for interacting with the Mixpost social media management API. This server provides comprehensive access to Mixpost's functionality including accounts, posts, media, and tags management.

## Features

- **Account Management**: List and retrieve connected social media accounts
- **Post Management**: Create, update, schedule, approve, and delete social media posts
- **Media Management**: Upload, list, update, and delete media files
- **Tag Management**: Create, update, and manage content tags
- **Queue Management**: Add posts to publishing queues
- **Comprehensive Error Handling**: Detailed API error responses

## Installation

Install globally via npm to use with npx:

```bash
npm install -g mixpost-mcp-server
```

Or run directly with npx:

```bash
npx mixpost-mcp-server
```

## Configuration

The server requires the following environment variables:

- `MIXPOST_BASE_URL` - Your Mixpost instance base URL (e.g., `https://your-domain.com`)
- `MIXPOST_WORKSPACE_UUID` - The UUID of your Mixpost workspace
- `MIXPOST_API_KEY` - Your Mixpost API access token
- `MIXPOST_CORE_PATH` - (Optional) Custom core path, defaults to "mixpost"

### Getting Your API Token

1. Log into your Mixpost dashboard
2. Navigate to "Access Tokens"
3. Click "Create" to generate a new token
4. Copy the generated token for use as `MIXPOST_API_KEY`

## Usage with Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "mixpost": {
      "command": "npx",
      "args": ["mixpost-mcp-server"],
      "env": {
        "MIXPOST_BASE_URL": "https://your-mixpost-instance.com",
        "MIXPOST_WORKSPACE_UUID": "your-workspace-uuid",
        "MIXPOST_API_KEY": "your-api-token",
        "MIXPOST_CORE_PATH": "mixpost"
      }
    }
  }
}
```

## Available Tools

### Account Tools
- `mixpost_list_accounts` - List all connected social media accounts
- `mixpost_get_account` - Get details of a specific account

### Post Tools
- `mixpost_create_post` - Create a new social media post
- `mixpost_update_post` - Update an existing post
- `mixpost_approve_post` - Approve a post for publishing
- `mixpost_get_post` - Get details of a specific post
- `mixpost_list_posts` - List posts with optional filtering
- `mixpost_delete_post` - Delete a specific post
- `mixpost_delete_multiple_posts` - Delete multiple posts at once
- `mixpost_schedule_post` - Schedule a post for publishing
- `mixpost_add_post_to_queue` - Add a post to the publishing queue

### Media Tools
- `mixpost_list_media` - List media files
- `mixpost_get_media` - Get details of a specific media file
- `mixpost_update_media` - Update media file metadata
- `mixpost_delete_media` - Delete a media file

### Tag Tools
- `mixpost_list_tags` - List all tags
- `mixpost_get_tag` - Get details of a specific tag
- `mixpost_create_tag` - Create a new tag
- `mixpost_update_tag` - Update an existing tag
- `mixpost_delete_tag` - Delete a tag

## API Reference

This server implements the Mixpost API endpoints as documented at [https://docs.mixpost.app/api/](https://docs.mixpost.app/api/).

### Post Creation Example

```typescript
{
  "date": "2024-12-01",
  "time": "10:00",
  "timezone": "America/New_York",
  "schedule": true,
  "accounts": [1, 2, 3],  // Account IDs are integers, not UUIDs
  "tags": ["tag-uuid-1"],
  "versions": [
    {
      "account_id": 1,  // Account ID must be an integer
      "is_original": true,
      "content": {
        "body": "Hello, world! This is my social media post.",
        "media": [],
        "urls": ["https://example.com"]
      },
      "options": {}
    }
  ]
}
```

**Important Notes:**
- Account IDs in the `accounts` array and `account_id` fields must be integers, not UUIDs
- Use the `mixpost_list_accounts` tool to get the numeric IDs for your accounts
- Content should be formatted with HTML tags (e.g., `<div>` for line breaks)
- For draft posts, use `schedule: false` and `queue: false`
- The content structure for versions is an array of objects, not a single object

## Error Handling

The server provides comprehensive error handling with detailed messages for:
- Authentication failures (401)
- Access forbidden (403)
- Resource not found (404)
- Validation errors (422)
- Network and connection issues

## Development

### Building from Source

```bash
git clone <repository-url>
cd mixpost-mcp-server
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

Run tests using Bun:

```bash
# Run tests (uses sequential execution by default)
npm run test

# Run tests in parallel mode (may fail due to Bun test isolation issues)
npm run test:parallel

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

**Important:** Due to a known issue with Bun's test runner isolation when using mock functions in parallel execution, some tests may fail when running in parallel mode. This is not a code issue but a limitation of Bun's parallel test execution with mocks. The default `npm run test` command now runs tests sequentially to ensure reliable results. All 146 tests pass when run sequentially.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to the MCP server, please open an issue in this repository.
For Mixpost API questions, refer to the [official Mixpost documentation](https://docs.mixpost.app/).
# WordPress Plugin Fix Required

## Problem
The WordPress plugin is not accepting the API key from the backend service. The plugin returns:
```json
{
  "code": "missing_api_key",
  "message": "API key is required",
  "data": { "status": 401 }
}
```

## Root Cause
WordPress REST API has CORS restrictions that prevent custom headers from being passed to plugins. The `X-API-Key` header is being stripped before it reaches the plugin code.

## Testing Performed
Tested multiple approaches:
- ✗ `X-API-Key` header - Stripped by WordPress CORS
- ✗ `Authorization: Bearer` header - Not checked by plugin
- ✗ `HTTP_X_API_KEY` header - Not accessible
- ✗ `api_key` query parameter - Plugin not checking $_GET

## Solution Required

### Option 1: Accept API Key as Query Parameter (RECOMMENDED)
Update the WordPress plugin authentication to check for `api_key` in query parameters:

```php
// In your plugin's authentication function
function echo5_seo_authenticate_request($request) {
    // Check query parameter first
    $api_key = $request->get_param('api_key');
    
    // Fallback to header if needed
    if (empty($api_key)) {
        $api_key = $request->get_header('X-API-Key');
    }
    
    if (empty($api_key)) {
        return new WP_Error(
            'missing_api_key',
            'API key is required',
            array('status' => 401)
        );
    }
    
    // Validate API key...
}
```

### Option 2: Add CORS Headers to Allow X-API-Key
Add CORS configuration to allow custom headers:

```php
add_filter('rest_pre_serve_request', function($served, $result, $request, $server) {
    header('Access-Control-Allow-Headers: Authorization, X-WP-Nonce, Content-Disposition, Content-MD5, Content-Type, X-API-Key');
    return $served;
}, 10, 4);
```

## Backend Service Configuration
The backend service has been configured to send API key as query parameter:
- URL: `https://staff.echo5digital.com/wp-json/echo5-seo/v1/health?api_key=YOUR_KEY`
- Method: GET
- All endpoints: `/health`, `/content/all`, `/pages/{id}`, `/structure`

## Current Status
- ✅ Backend encryption and storage - Working
- ✅ API key configuration - Working
- ✅ Database integration - Working
- ✅ Frontend UI - Working
- ❌ WordPress plugin authentication - **NEEDS FIX**

## Testing After Fix
Run this command to test:
```bash
cd backend
node scripts/test-staff-plugin-integration.js
```

Expected output:
```
✅ Connection Test: SUCCESS
✅ Fetched 16 pages from WordPress plugin
```

## Files Modified
- `backend/services/wordpress-plugin.service.js` - Updated to use query parameters
- `backend/scripts/configure-staff-plugin.js` - Updated to accept API key as argument
- `backend/routes/client.routes.js` - Fixed status endpoint to check for API key

## Current API Key
The current API key configured for staff.echo5digital.com is:
```
echo5_065b077d2c425f9c38612a17d337c1b02401aa99af34b7866e9eaecb014bac8d
```

This key is encrypted and stored in MongoDB for the client with ID: `6925496671d6b3624d57139a`

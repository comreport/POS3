# Google Drive Integration Setup

This guide explains how to set up real Google Drive integration in MiniPOS for automatic data backup.

## Overview

MiniPOS includes Google Drive integration that allows you to:
- Backup your restaurant data to your personal Google Drive
- Export reports and data in JSON format
- Maintain data security and privacy
- Access your backups from anywhere

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "MiniPOS Integration")
4. Click "Create"

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - **Google Drive API**
   - **Google+ API** (for user profile information)

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, etc.)
   - Add your domain to authorized domains
   - Add scopes: `../auth/drive.file`, `../auth/userinfo.profile`, `../auth/userinfo.email`
4. For OAuth client ID:
   - Application type: "Web application"
   - Name: "MiniPOS Web Client"
   - Authorized JavaScript origins: Add your domain (e.g., `https://yourdomain.com`)
   - Authorized redirect URIs: Add your domain (e.g., `https://yourdomain.com`)
5. Click "Create" and save the Client ID

### Step 4: Create API Key

1. In "Credentials", click "Create Credentials" → "API key"
2. Copy the API key
3. (Optional) Restrict the key to specific APIs for security

### Step 5: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Fill in the required information:
   - App name: "MiniPOS"
   - User support email: Your email
   - App logo: Upload your restaurant logo (optional)
   - App domain: Your website domain
   - Authorized domains: Add your domain
3. Add scopes:
   - `../auth/drive.file` - See, edit, create, and delete only the specific Google Drive files you use with this app
   - `../auth/userinfo.profile` - See your personal info, including any personal info you've made publicly available
   - `../auth/userinfo.email` - See your primary Google Account email address
4. Add test users (for testing phase)
5. Save and continue

## Application Configuration

### Step 1: Set Environment Variables

Create a `.env` file in your project root:

```env
# Google Drive API Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

### Step 2: Update Domain Settings

If deploying to a custom domain, make sure to:

1. Add your domain to "Authorized JavaScript origins" in Google Cloud Console
2. Add your domain to "Authorized redirect URIs"
3. Add your domain to "Authorized domains" in OAuth consent screen

## Testing the Integration

### Development Testing

1. Start your development server
2. Go to Settings → Google Drive tab
3. Click "Login with Google Account"
4. Complete the OAuth flow
5. Try exporting data to verify it works

### Production Deployment

1. Update OAuth credentials with production domain
2. Deploy with environment variables set
3. Test the integration on production

## Security Considerations

### API Key Security

- Restrict API keys to specific APIs and domains
- Regularly rotate API keys
- Monitor API usage in Google Cloud Console

### OAuth Security

- Use HTTPS in production
- Regularly review OAuth consent screen settings
- Monitor authorized applications in Google Account settings

### Data Privacy

- Your app only accesses files it creates
- Users can revoke access at any time
- Data is stored in user's own Google Drive

## Troubleshooting

### Common Issues

**"Popup blocked" error**
- Solution: Allow popups for your domain

**"Invalid client ID" error**
- Solution: Check that VITE_GOOGLE_CLIENT_ID is correct
- Verify domain is added to authorized origins

**"API key not valid" error**
- Solution: Check that VITE_GOOGLE_API_KEY is correct
- Verify API key restrictions

**"Access denied" error**
- Solution: Check OAuth consent screen configuration
- Verify required scopes are added

**"Quota exceeded" error**
- Solution: Check API quotas in Google Cloud Console
- Consider requesting quota increases

### Debug Mode

Enable debug logging by adding to your `.env`:
```env
VITE_DEBUG_GOOGLE_DRIVE=true
```

## API Quotas and Limits

### Default Quotas

- Google Drive API: 1,000 requests per 100 seconds per user
- Google+ API: 10,000 requests per day

### Monitoring Usage

1. Go to Google Cloud Console → "APIs & Services" → "Quotas"
2. Monitor your API usage
3. Set up alerts for quota limits

### Requesting Increases

If you need higher quotas:
1. Go to "Quotas" page in Google Cloud Console
2. Select the quota you want to increase
3. Click "Edit Quotas" and submit a request

## Production Checklist

- [ ] OAuth consent screen configured and verified
- [ ] Production domain added to authorized origins
- [ ] Environment variables set correctly
- [ ] API keys restricted appropriately
- [ ] SSL/HTTPS enabled
- [ ] Error handling implemented
- [ ] User permissions documented
- [ ] Backup/recovery procedures documented

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify all setup steps are completed
3. Test with a simple API call first
4. Check Google Cloud Console for API errors
5. Review OAuth consent screen settings

For Google Cloud Console issues, refer to [Google Cloud Documentation](https://cloud.google.com/docs).

---

**Note**: This integration requires proper Google Cloud Console setup and is intended for production use with real Google accounts.
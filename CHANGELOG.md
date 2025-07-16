# Changelog

## [1.2.0] - 2025-01-27

### Added
- Simplified Google Drive integration with direct Google Account login
- Enhanced Google Drive settings interface
- Improved user experience for cloud backup functionality

### Changed
- **BREAKING**: Removed Google Drive API Configuration requirement
- Replaced complex API setup with simple "Login with Google Account" button
- Streamlined Google Drive authentication flow
- Updated GoogleDriveSettings component for better usability
- Improved error handling and user feedback

### Removed
- Google Drive API key and Client ID configuration fields
- Complex API setup requirements
- Manual credential management

### Technical Details
- Updated `src/components/GoogleDriveSettings.tsx` with simplified interface
- Enhanced `src/utils/googleDrive.ts` with streamlined service
- Maintained backward compatibility for existing data
- Added proper TypeScript interfaces for Google Drive integration

### Migration Guide
If you were using the previous Google Drive integration:
1. The new version automatically handles authentication
2. No manual API configuration required
3. Simply click "Login with Google Account" to connect
4. All existing export functionality remains the same

## [1.1.0] - Previous Version
- Initial Google Drive integration with API configuration
- Basic POS functionality
- Table management system
- Order processing and reporting
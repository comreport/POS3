# Deployment Guide for MiniPOS

This guide covers various deployment options for MiniPOS, from local development to production hosting.

## Quick Start

### Development
```bash
git clone https://github.com/eithinzarnyein/MiniPOS.git
cd MiniPOS
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## Deployment Options

### 1. Netlify (Recommended)

#### Automatic Deployment
1. Fork the repository to your GitHub account
2. Connect your GitHub account to Netlify
3. Create new site from Git
4. Select your forked repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Deploy site

#### Manual Deployment
1. Build the project locally:
   ```bash
   npm run build
   ```
2. Drag and drop the `dist` folder to Netlify

### 2. Vercel

#### GitHub Integration
1. Connect your GitHub account to Vercel
2. Import your repository
3. Vercel auto-detects Vite configuration
4. Deploy automatically

#### CLI Deployment
```bash
npm install -g vercel
npm run build
vercel --prod
```

### 3. GitHub Pages

#### Setup
1. Build the project:
   ```bash
   npm run build
   ```
2. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```
3. Add to package.json:
   ```json
   {
     "scripts": {
       "deploy": "gh-pages -d dist"
     },
     "homepage": "https://yourusername.github.io/MiniPOS"
   }
   ```
4. Deploy:
   ```bash
   npm run deploy
   ```

### 4. Traditional Web Hosting

#### Apache/Nginx
1. Build the project:
   ```bash
   npm run build
   ```
2. Upload `dist` folder contents to your web server
3. Configure server for SPA routing

#### Apache .htaccess
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

#### Nginx Configuration
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 5. Docker Deployment

#### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  minipos:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

#### Commands
```bash
docker build -t minipos .
docker run -p 80:80 minipos
```

## Environment Configuration

### Environment Variables
Create `.env` file for production:
```env
VITE_APP_TITLE=MiniPOS
VITE_APP_VERSION=1.2.0
VITE_GOOGLE_DRIVE_ENABLED=true
```

### Build Optimization
```bash
# Production build with optimization
npm run build

# Analyze bundle size
npm install --save-dev vite-bundle-analyzer
npx vite-bundle-analyzer
```

## Performance Optimization

### Build Settings
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          utils: ['jspdf', 'xlsx']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### Compression
Enable gzip/brotli compression on your server:

#### Nginx
```nginx
gzip on;
gzip_types text/css application/javascript application/json;
brotli on;
brotli_types text/css application/javascript application/json;
```

#### Apache
```apache
LoadModule deflate_module modules/mod_deflate.so
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/css application/javascript application/json
</IfModule>
```

## Security Considerations

### HTTPS
Always use HTTPS in production:
- Netlify/Vercel provide automatic HTTPS
- For custom servers, use Let's Encrypt or commercial certificates

### Headers
Add security headers:
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy strict-origin-when-cross-origin;
```

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

## Monitoring & Analytics

### Error Tracking
Consider integrating:
- Sentry for error tracking
- Google Analytics for usage analytics
- LogRocket for session replay

### Performance Monitoring
- Lighthouse CI for performance testing
- Web Vitals monitoring
- Bundle size tracking

## Backup & Recovery

### Data Backup
- LocalStorage data is client-side only
- Implement Google Drive backup for users
- Consider server-side backup for enterprise

### Disaster Recovery
- Keep deployment scripts in version control
- Document deployment procedures
- Test recovery procedures regularly

## Scaling Considerations

### CDN
Use CDN for static assets:
- Cloudflare
- AWS CloudFront
- Azure CDN

### Load Balancing
For high-traffic deployments:
- Multiple server instances
- Load balancer configuration
- Database clustering (if adding backend)

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Routing Issues
- Ensure SPA routing is configured
- Check .htaccess or nginx config
- Verify base URL in vite.config.ts

#### Performance Issues
- Enable compression
- Optimize images
- Use code splitting
- Implement lazy loading

### Debug Mode
```bash
# Build with source maps
npm run build -- --mode development
```

## Maintenance

### Updates
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
npm audit fix
```

### Monitoring
- Set up uptime monitoring
- Monitor error rates
- Track performance metrics
- Regular security scans

---

Choose the deployment method that best fits your needs and infrastructure. For most users, Netlify or Vercel provide the easiest deployment experience with automatic HTTPS and global CDN.
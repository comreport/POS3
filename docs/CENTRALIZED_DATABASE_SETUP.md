# Centralized Database Setup Guide

This guide explains how to set up the centralized database system for MiniPOS with real-time synchronization across multiple clients.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   POS Client 1  │    │   POS Client 2  │    │   POS Client N  │
│   (Browser)     │    │   (Browser)     │    │   (Browser)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              WebSocket Connections          │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼──────────────┐
                    │     WebSocket Server       │
                    │   (Node.js + Express)      │
                    └─────────────┬──────────────┘
                                 │
                    ┌─────────────▼──────────────┐
                    │   PostgreSQL Database      │
                    │   (Centralized Storage)    │
                    └────────────────────────────┘
```

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Step 1: Database Setup

### Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE minipos_db;
CREATE USER minipos_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE minipos_db TO minipos_user;
\q
```

## Step 2: Server Setup

### Install Dependencies

```bash
cd server
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=minipos_db
DB_USER=minipos_user
DB_PASSWORD=your_secure_password
PORT=8080
NODE_ENV=development
```

### Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will:
- Automatically create database tables
- Start WebSocket server on port 8080
- Provide health check endpoint at `/health`

## Step 3: Client Configuration

### Update Frontend Configuration

The frontend is already configured to use the real sync service. The WebSocket connection will automatically attempt to connect to:

- **Development**: `ws://localhost:8080/ws`
- **Production**: `wss://your-domain.com/ws`

### Environment Variables (Optional)

Create `.env` in the frontend root if you need custom configuration:

```env
VITE_WS_URL=ws://localhost:8080/ws
```

## Step 4: Testing the Setup

### 1. Start the Server
```bash
cd server
npm run dev
```

### 2. Start Multiple Clients
```bash
# Terminal 1
npm run dev

# Terminal 2 (different port)
npm run dev -- --port 5174
```

### 3. Test Synchronization

1. Open both clients in different browser windows
2. Check that both show "Connected to Server" in sync status
3. Make changes in one client (add table, update menu, etc.)
4. Verify changes appear immediately in the other client

## Production Deployment

### Server Deployment

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
cd server
pm2 start websocket-server.js --name "minipos-server"
pm2 save
pm2 startup
```

#### Using Docker

```bash
cd server
docker build -t minipos-server .
docker run -d -p 8080:8080 --env-file .env minipos-server
```

### Database Security

1. **Create dedicated database user:**
```sql
CREATE USER minipos_app WITH PASSWORD 'strong_password_here';
GRANT CONNECT ON DATABASE minipos_db TO minipos_app;
GRANT USAGE ON SCHEMA public TO minipos_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO minipos_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO minipos_app;
```

2. **Configure PostgreSQL security:**
```bash
# Edit postgresql.conf
listen_addresses = 'localhost'  # or specific IPs

# Edit pg_hba.conf
local   minipos_db    minipos_app                     md5
host    minipos_db    minipos_app    127.0.0.1/32     md5
```

### SSL/TLS Configuration

For production, use WSS (WebSocket Secure):

#### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Maintenance

### Health Monitoring

Check server health:
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "clients": 3
}
```

### Database Monitoring

```sql
-- Check active connections
SELECT * FROM pg_stat_activity WHERE datname = 'minipos_db';

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public';

-- Check sync log
SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 10;
```

### Backup Strategy

#### Automated Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U minipos_user minipos_db > backup_$DATE.sql
```

#### Restore from Backup
```bash
psql -h localhost -U minipos_user minipos_db < backup_20240127_103000.sql
```

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed
```
Error: WebSocket connection failed
```

**Solutions:**
- Check if server is running: `curl http://localhost:8080/health`
- Verify firewall settings
- Check WebSocket URL in client configuration

#### 2. Database Connection Error
```
Error: Connection to database failed
```

**Solutions:**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Test connection: `psql -h localhost -U minipos_user minipos_db`

#### 3. Sync Not Working
```
Changes not appearing on other clients
```

**Solutions:**
- Check WebSocket connections in browser dev tools
- Verify all clients show "Connected to Server"
- Check server logs for errors
- Restart server if needed

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npm run dev
```

### Performance Optimization

#### Database Indexes
```sql
-- Add indexes for better performance
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_order_history_date ON order_history(order_date);
CREATE INDEX idx_sync_log_timestamp ON sync_log(timestamp);
```

#### Connection Pooling
The server uses PostgreSQL connection pooling by default. Adjust pool size in server code:

```javascript
const pool = new Pool({
  // ... other config
  max: 20,          // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Best Practices

1. **Use strong passwords** for database users
2. **Enable SSL/TLS** for WebSocket connections in production
3. **Implement authentication** for WebSocket connections
4. **Regular security updates** for all dependencies
5. **Monitor access logs** for unusual activity
6. **Backup encryption** for sensitive data
7. **Network security** - restrict database access to application servers only

## Scaling Considerations

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer** for multiple server instances
2. **Database clustering** with read replicas
3. **Redis** for session management
4. **Message queues** for async processing

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets

This setup provides a robust, scalable foundation for your MiniPOS system with real-time synchronization across multiple clients.
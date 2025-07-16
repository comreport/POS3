# MiniPOS WebSocket Server

This is the backend server for MiniPOS that provides real-time synchronization across multiple clients using WebSocket connections and a centralized PostgreSQL database.

## Features

- Real-time data synchronization across multiple POS clients
- Centralized PostgreSQL database
- WebSocket-based communication
- Automatic reconnection handling
- Heartbeat monitoring
- Sync logging and audit trail
- RESTful API endpoints for data access

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone and setup the server:**
   ```bash
   cd server
   npm install
   ```

2. **Setup PostgreSQL database:**
   ```bash
   # Create database
   createdb minipos_db
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE minipos_db;
   \q
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## Configuration

### Environment Variables

- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: minipos_db)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment (development/production)

### Database Schema

The server automatically creates the following tables:

- `restaurants`: Restaurant settings and configuration
- `tables`: Table information and status
- `menu_items`: Menu items with prices and descriptions
- `categories`: Menu categories
- `order_history`: Completed orders history
- `sync_log`: Synchronization audit trail

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and connected clients count.

### Sync Data
```
GET /api/sync
```
Returns current state of all data (settings, tables, menu items, etc.).

## WebSocket Events

### Client to Server

- `CLIENT_CONNECTED`: Client registration
- `CLIENT_DISCONNECTED`: Client disconnection
- `HEARTBEAT`: Keep-alive ping
- `SYNC_REQUEST`: Request current data
- `UPDATE_TABLE`: Table status/data changes
- `UPDATE_MENU`: Menu items/categories changes
- `UPDATE_ORDER`: Order history changes
- `UPDATE_SETTINGS`: Restaurant settings changes

### Server to Client

- `SYNC_RESPONSE`: Current data state
- `UPDATE_TABLE`: Broadcast table changes
- `UPDATE_MENU`: Broadcast menu changes
- `UPDATE_ORDER`: Broadcast order changes
- `UPDATE_SETTINGS`: Broadcast settings changes
- `HEARTBEAT`: Heartbeat response

## Production Deployment

### Using PM2 (Recommended)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file:**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'minipos-server',
       script: 'websocket-server.js',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'development'
       },
       env_production: {
         NODE_ENV: 'production',
         PORT: 8080
       }
     }]
   };
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### Using Docker

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 8080
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   docker build -t minipos-server .
   docker run -d -p 8080:8080 --env-file .env minipos-server
   ```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
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
    
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        proxy_pass http://localhost:8080;
    }
}
```

## Monitoring

### Health Check
Monitor server health at: `http://your-server:8080/health`

### Logs
- Application logs: Check console output or PM2 logs
- Database logs: Check PostgreSQL logs
- Sync audit: Query `sync_log` table

### Performance Monitoring
- Monitor WebSocket connections count
- Track database query performance
- Monitor memory and CPU usage

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **WebSocket Connection Failed**
   - Check server is running on correct port
   - Verify firewall settings
   - Check client WebSocket URL configuration

3. **High Memory Usage**
   - Monitor connected clients count
   - Check for memory leaks in sync_log table
   - Consider implementing log rotation

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Security Considerations

- Use SSL/TLS in production (WSS instead of WS)
- Implement authentication for WebSocket connections
- Validate all incoming data
- Use environment variables for sensitive configuration
- Regular database backups
- Monitor for unusual connection patterns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
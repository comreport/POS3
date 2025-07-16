# MiniPOS - Restaurant Point of Sale System

A modern, feature-rich Point of Sale (POS) system built with React, TypeScript, and Tailwind CSS. Perfect for restaurants, cafes, and small businesses.

## 🚀 Features

### Core POS Functionality
- **Table Management**: Manage table status (available, occupied, reserved)
- **Order Processing**: Create, modify, and complete orders
- **Menu Management**: Add, edit, and organize menu items with categories
- **Real-time Updates**: Live table status and order tracking

### Advanced Features
- **Multi-language Support**: English and Myanmar (မြန်မာ)
- **Dark/Light Theme**: Customizable interface themes
- **User Management**: Role-based access control with permissions
- **Reports & Analytics**: Detailed sales reports and export functionality
- **Multi-Client Sync**: Real-time synchronization across multiple devices
- **Print Receipts**: Professional receipt printing
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Multi-Client Synchronization
- **Real-time Updates**: Changes sync instantly across all connected devices
- **Offline Support**: Continue working when disconnected, sync when reconnected
- **Client Management**: Track connected devices and sync status
- **Conflict Resolution**: Automatic handling of concurrent updates

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: LocalStorage (with cloud backup option)
- **Build Tool**: Vite
- **PDF Generation**: jsPDF
- **Excel Export**: XLSX

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/eithinzarnyein/MiniPOS.git
   cd MiniPOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Default Login Credentials
- **Admin**: Username: `admin`, Password: `admin`
- **Cashier**: Username: `cashier`, Password: `cashier`
- **Waiter**: Username: `waiter`, Password: `waiter`

### Google Drive Setup
1. Go to Settings → Google Drive tab
2. Click "Login with Google Account"
3. Authorize the application
4. Start backing up your data to Google Drive

## 📱 Usage

### Getting Started
1. Login with default credentials or create new users
2. Set up your restaurant information in Settings
3. Add menu items and categories in the Manage section
4. Configure tables for your restaurant layout
5. Start taking orders!

### Taking Orders
1. Select a table from the POS interface
2. Click "Start Order" to begin
3. Add menu items to the order
4. Review and complete the order
5. Print receipt if needed

### Managing Data
- **Menu Items**: Add/edit items with images, prices, and descriptions
- **Categories**: Organize menu items into categories
- **Tables**: Configure table numbers and seating capacity
- **Users**: Manage staff accounts and permissions
- **Reports**: View sales analytics and export data

## 🌐 Multi-language Support

The system supports:
- **English**: Full interface in English
- **Myanmar (မြန်မာ)**: Complete Myanmar language support with proper fonts

Switch languages in Settings → General Settings.

## 🎨 Customization

### Themes
- Light theme (default)
- Dark theme
- Automatic theme switching

### Restaurant Branding
- Upload custom logo
- Set restaurant name and description
- Configure currency and tax rates
- Customize service charges

## 📊 Reports & Analytics

### Available Reports
- **Order History**: Detailed transaction records
- **Revenue Analytics**: Sales summaries and totals
- **Table Status**: Real-time table availability
- **Export Options**: PDF, Excel, and Google Drive

### Export Formats
- **PDF**: Professional formatted reports
- **Excel**: Detailed spreadsheets with item breakdowns
- **JSON**: Complete data backup for Google Drive

## 🔐 Security & Permissions

### User Roles
- **Administrator**: Full system access
- **Manager**: Most features except system settings
- **Cashier**: POS and basic reporting
- **Waiter**: Order creation only

### Permission System
Granular permissions for:
- POS access and operations
- Menu and category management
- User and role management
- Reports and analytics
- System settings

## 🚀 Deployment

### Local Deployment
```bash
npm run build
npm run preview
```

### Production Deployment
The built files in the `dist` folder can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Apache/Nginx

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/eithinzarnyein/MiniPOS/issues) page
2. Create a new issue with detailed information
3. Contact the maintainer

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by real restaurant POS needs
- Community feedback and contributions
- Open source libraries and tools

## 📈 Roadmap

### Upcoming Features
- [ ] Kitchen display system
- [ ] Inventory management
- [ ] Customer management
- [ ] Online ordering integration
- [ ] Payment gateway integration
- [ ] Advanced analytics dashboard

---

**MiniPOS** - Making restaurant management simple and efficient! 🍽️
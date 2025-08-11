# iBracks Music Platform - Backend

A comprehensive music licensing and distribution platform built with modern technologies, designed to connect artists with music enthusiasts through a seamless digital experience.

## 🎵 Overview

iBracks Music Platform is a full-featured backend service that powers a music streaming and licensing platform. It provides artists with tools to upload, manage, and monetize their music while offering users an intuitive way to discover, purchase, and license tracks for various purposes.

## 🎨 Platform Design Showcase

*Experience the elegant and intuitive design of iBracks Music Platform*

### Homepage & Welcome Experience
<div align="center">
  <img src="docs/images/Home screen.jpg" alt="Homepage Interface" width="800"/>
  <p><em>Modern homepage with featured content and intuitive navigation</em></p>
</div>

### Authentication & Onboarding
<div align="center">
  <img src="docs/images/Login.jpg" alt="Sign In Interface" width="600"/>
  <p><em>Sleek sign-in interface with social authentication options</em></p>
</div>

<div align="center">
  <img src="docs/images/Sign up.jpg" alt="Sign Up Interface" width="600"/>
  <p><em>Streamlined user registration with comprehensive form validation</em></p>
</div>

### Music Discovery & Browsing
<div align="center">
  <img src="docs/images/Tracks.jpg" alt="Track Browsing" width="800"/>
  <p><em>Advanced music discovery with filtering, search, and new releases carousel</em></p>
</div>

<div align="center">
  <img src="docs/images/Products page.jpg" alt="Product Details" width="800"/>
  <p><em>Rich product pages with audio preview, licensing options, and detailed track information</em></p>
</div>

### Services & Content Management
<div align="center">
  <img src="docs/images/Services.jpg" alt="Services Overview" width="800"/>
  <p><em>Comprehensive music production services from idea to final track</em></p>
</div>

<div align="center">
  <img src="docs/images/Videos.jpg" alt="Video Library" width="800"/>
  <p><em>Educational content library with music composition tutorials and masterclasses</em></p>
</div>

### User Experience & Shopping
<div align="center">
  <img src="docs/images/Checkout.jpg" alt="Shopping Cart" width="700"/>
  <p><em>Intuitive shopping cart with secure payment processing</em></p>
</div>

<div align="center">
  <img src="docs/images/Checkout-1.jpg" alt="Purchase Success" width="600"/>
  <p><em>Confirmation flow ensuring smooth transaction completion</em></p>
</div>

### About & Brand Story
<div align="center">
  <img src="docs/images/About us page UI.jpg" alt="About Us" width="800"/>
  <p><em>Compelling brand story showcasing our mission and discography</em></p>
</div>

### Contact & Communication
<div align="center">
  <img src="docs/images/Contact.jpg" alt="Contact Form" width="800"/>
  <p><em>Professional contact interface for client inquiries and collaborations</em></p>
</div>

### Artist Dashboard (Admin Interface)
<div align="center">
  <img src="docs/images/Dashboard.jpg" alt="Artist Dashboard" width="900"/>
  <p><em>Comprehensive artist dashboard with analytics, track management, and upload capabilities</em></p>
</div>

> 🎨 **Complete Design System**: [View on Figma](https://www.figma.com/design/Ipjv7NZj35XEvHh3JGjMZD/ibracks_Music_website-design?node-id=0-1&p=f&m=dev)

## ✨ Features

### 🎨 Artist Features
- **Music Upload & Management**: Upload audio files with metadata and cover art
- **Content Publishing**: Schedule releases and manage publication status
- **Analytics Dashboard**: Track plays, likes, and engagement metrics
- **Revenue Management**: Monetize content through licensing options

### 🎧 User Features
- **Music Discovery**: Browse and search through extensive music catalog
- **User Engagement**: Like tracks and build personal music collections
- **Secure Authentication**: JWT-based authentication with role management
- **Profile Management**: Customizable user profiles with image uploads

### 💼 Business Features
- **Licensing System**: Flexible licensing packages for different use cases
- **Payment Processing**: Secure transaction handling and order management
- **Content Scheduling**: Automated publishing with cron-based scheduling
- **Multi-format Support**: Advanced audio processing and metadata extraction

## 🛠️ Technology Stack

### Backend Framework
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **Prisma** - Database ORM and migration tool
- **PostgreSQL** - Primary database

### Authentication & Security
- **JWT (JSON Web Tokens)** - Authentication mechanism
- **bcrypt** - Password hashing
- **express-validator** - Input validation and sanitization

### File Processing
- **Multer** - File upload handling
- **music-metadata** - Audio metadata extraction
- **node-ffprobe** - Audio file analysis

### Additional Tools
- **CORS** - Cross-origin resource sharing
- **node-cron** - Scheduled task automation
- **axios** - HTTP client for external API calls

## 🗂️ Project Structure

```
musicapp/
├── src/
│   ├── controllers/         # Request handlers and business logic
│   ├── services/           # Business logic and data processing
│   ├── routes/             # API route definitions
│   ├── middlewares/        # Authentication and validation
│   ├── utils/              # Helper functions and utilities
│   ├── uploads/            # File storage (audio and images)
│   └── app.js              # Application entry point
├── prisma/
│   ├── schema.prisma       # Database schema definition
│   └── migrations/         # Database migration history
└── package.json            # Project dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd musicapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with the following variables:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/musicapp"
   JWT_SECRET="your-jwt-secret-key"
   PORT=3000
   ```

4. **Database Setup**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📊 Database Schema

The application uses a robust PostgreSQL schema with the following core entities:

- **Users**: Artist and listener profiles with authentication
- **Songs**: Music tracks with metadata, pricing, and status management
- **Orders**: Purchase transactions and licensing agreements
- **Likes**: User engagement tracking
- **License Packs**: Flexible licensing options for different use cases

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run test suite (when configured)

### Database Operations
- `npx prisma studio` - Open Prisma Studio for database visualization
- `npx prisma migrate dev` - Create and apply new migrations
- `npx prisma generate` - Regenerate Prisma client

## 🏗️ Architecture

The application follows a modular architecture pattern:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and data processing
- **Middlewares**: Provide authentication, validation, and error handling
- **Utils**: Helper functions for file processing and scheduled tasks

## 🔒 Security Features

- JWT-based authentication with role-based access control
- Password hashing using bcrypt
- Input validation and sanitization
- File upload restrictions and validation
- CORS configuration for cross-origin requests

## 📁 File Management

The platform supports:
- Audio file uploads (MP3 and other formats)
- Cover image management
- Metadata extraction and processing
- Automatic file organization and storage

## 🎯 Business Logic

### Music Licensing
- Multiple licensing packages with different pricing tiers
- Order management with transaction tracking
- Automated license delivery upon purchase completion

### Content Management
- Draft, scheduled, and published content states
- Automated publishing with cron jobs
- Play count and engagement metrics tracking

## 🚀 Deployment

The application is containerizable and can be deployed on various platforms:
- Traditional server hosting
- Cloud platforms (AWS, Google Cloud, Azure)
- Container orchestration (Docker, Kubernetes)

## 📈 Monitoring & Analytics

- Built-in play count tracking
- User engagement metrics
- Order and revenue analytics
- System performance monitoring capabilities

## 🎨 Design Philosophy

Our platform embodies modern music industry aesthetics with:

### Visual Identity
- **Premium Purple Gradient Theme**: Sophisticated color palette that reflects creativity and professionalism
- **Golden Accent Elements**: Luxury touches that highlight premium features and call-to-action buttons
- **Clean Typography**: Clear hierarchy ensuring excellent readability across all devices
- **Consistent Iconography**: Intuitive visual language throughout the platform

### User Experience Principles
- **Seamless Navigation**: Intuitive menu structure with quick access to key features
- **Responsive Design**: Flawless experience across desktop, tablet, and mobile devices
- **Accessibility First**: WCAG compliant design ensuring inclusivity for all users
- **Performance Optimized**: Fast loading times and smooth interactions

### Key Design Features
- **Audio Visualization**: Interactive waveforms and music players
- **Advanced Filtering**: Sophisticated search and categorization systems
- **Social Integration**: Easy sharing and discovery mechanisms
- **Secure Checkout**: Trust-building payment interfaces with multiple options

### Brand Elements
- **Crown Logo**: Symbolic representation of premium music royalty
- **Dynamic Animations**: Subtle motion design enhancing user engagement
- **Professional Photography**: High-quality imagery showcasing music production
- **Consistent Branding**: Cohesive visual identity across all touchpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🛠️ Support

For technical support and questions, please contact the development team.

---

*Built with ❤️ for the music community*

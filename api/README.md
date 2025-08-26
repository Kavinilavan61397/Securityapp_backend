# Visitor Management System API

> Professional Backend API for Visitor Management System (SECURITYCHECK)

## 🚀 Features

- **Secure Authentication** - JWT-based authentication with role-based access control
- **Visitor Management** - Complete visitor registration, approval, and tracking system
- **Employee Management** - Admin, Employee, Resident, and Visitor role management
- **Real-time Notifications** - System-wide notification and messaging system
- **Dynamic Configuration** - Environment-based configuration for easy deployment
- **Industry Standards** - Follows Node.js/Express best practices

## 🛠️ Tech Stack

- **Runtime**: Node.js (>=16.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Logging**: Morgan

## 📁 Project Structure

```
api/
├── src/
│   ├── controllers/     # Route handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── config/          # Configuration files
│   └── validations/     # Input validation schemas
├── tests/               # Test files
├── docs/                # API documentation
├── .env.example         # Environment template
├── .gitignore           # Git ignore patterns
├── package.json         # Dependencies and scripts
├── server.js            # Main Express server
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js (>=16.0.0)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd visitor_management_systems/api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:5000/health
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `BASE_URL` | Base URL for the API | `http://localhost:5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/visitor_management_dev` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key-here` |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000,http://localhost:8080` |

### Database Setup

1. **Local MongoDB**
   ```bash
   # Install MongoDB locally
   # Start MongoDB service
   # Create database
   ```

2. **MongoDB Atlas (Cloud)**
   - Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create cluster and get connection string
   - Update `MONGODB_URI` in `.env`

## 📚 API Endpoints

### Health Check
- `GET /health` - Server health status

### API Information
- `GET /api` - API overview and available endpoints

### Authentication (Coming Soon)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification

### Visitor Management (Coming Soon)
- `POST /api/visitors` - Create visitor
- `GET /api/visitors` - Get all visitors
- `PUT /api/visitors/:id` - Update visitor
- `DELETE /api/visitors/:id` - Delete visitor

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample data

### Code Quality

- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting (recommended)
- **Jest** - Testing framework
- **Supertest** - API testing

## 🚀 Deployment

### Environment Setup

1. **Production Environment**
   ```bash
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-production-mongodb-uri>
   JWT_SECRET=<your-production-jwt-secret>
   ```

2. **Platforms**
   - **AWS**: EC2, Lambda, ECS
   - **Vercel**: Serverless deployment
   - **Heroku**: Easy deployment
   - **Docker**: Containerized deployment

### Docker (Optional)

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Create an issue on GitHub
- **Questions**: Check the project discussions

---

**Built with ❤️ for secure visitor management systems**

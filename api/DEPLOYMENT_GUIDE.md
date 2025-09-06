# 🚀 DEPLOYMENT GUIDE - RAILWAY

## **QUICK DEPLOYMENT (5 MINUTES)**

### **Step 1: Prepare Your Repository**
1. **Push your code to GitHub** (if not already done)
2. **Create a `.env.example` file** with all required variables
3. **Ensure your `package.json` has the correct start script**

### **Step 2: Deploy on Railway**
1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository**
6. **Railway will automatically detect it's a Node.js app**

### **Step 3: Configure Environment Variables**
In Railway dashboard, go to your project → Variables tab and add:

```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_SECURE=false
NODE_TLS_REJECT_UNAUTHORIZED=0

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Environment
NODE_ENV=production
```

### **Step 4: Deploy**
1. **Click "Deploy"**
2. **Wait for deployment to complete**
3. **Get your live URL** (e.g., `https://your-app.railway.app`)

## ** ALTERNATIVE HOSTING OPTIONS**

### **1. RENDER (Also Free)**
- Go to [render.com](https://render.com)
- Connect GitHub repository
- Select "Web Service"
- Use same environment variables

### **2. VERCEL (Serverless)**
- Go to [vercel.com](https://vercel.com)
- Connect GitHub repository
- Deploy as serverless functions

### **3. HEROKU (Paid but Easy)**
- Go to [heroku.com](https://heroku.com)
- Create new app
- Connect GitHub repository
- Add environment variables

## ** TESTING YOUR DEPLOYED API**

### **Health Check**
```bash
GET https://your-app.railway.app/health
```

### **API Base**
```bash
GET https://your-app.railway.app/api
```

### **Authentication**
```bash
POST https://your-app.railway.app/api/auth/login
```

## ** TROUBLESHOOTING**

### **Common Issues:**
1. **Database Connection**: Check MongoDB Atlas connection string
2. **Environment Variables**: Ensure all required variables are set
3. **CORS Issues**: Update CORS_ORIGIN with your frontend domain
4. **Email Issues**: Check email credentials and SMTP settings

### **Logs:**
- Railway provides real-time logs in the dashboard
- Check logs for any errors during deployment

## ** COST BREAKDOWN**

### **Railway Free Tier:**
- ✅ **$0/month**
- ✅ **512MB RAM**
- ✅ **1GB storage**
- ✅ **Custom domain**
- ✅ **SSL certificate**
- ✅ **Automatic deployments**

### **MongoDB Atlas Free Tier:**
- ✅ **$0/month**
- ✅ **512MB storage**
- ✅ **Shared clusters**
- ✅ **Perfect for development/testing**

## ** PRODUCTION CHECKLIST**

- [ ] Environment variables configured
- [ ] Database connection working
- [ ] Health checks responding
- [ ] CORS configured for frontend
- [ ] Rate limiting enabled
- [ ] SSL certificate active
- [ ] Custom domain (optional)
- [ ] Monitoring set up (optional)

## ** NEXT STEPS**

1. **Deploy your API** using Railway
2. **Test all endpoints** to ensure they work
3. **Update your Flutter app** with the new API URL
4. **Set up monitoring** (optional)
5. **Configure custom domain** (optional)

---

**Need help?** Check the logs in Railway dashboard or contact support!

# User Profile Photo Management Endpoints

## Overview
Complete user profile management system with photo upload, update, and deletion capabilities. Users can manage their profile information and profile photos through dedicated endpoints.

## Base URL
```
/api/user-profile
```

## Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Endpoints Documentation

### 1. Get Current User Profile
**GET** `/api/user-profile/me`

Get the current authenticated user's profile information including photo details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "role": "RESIDENT",
    "buildingId": "68b04099951cc19873fc3dd3",
    "flatNumber": "A-101",
    "dateOfBirth": "15/03/1990",
    "age": 33,
    "gender": "MALE",
    "address": "123 Main Street",
    "city": "New York",
    "pincode": "10001",
    "profilePicture": "/api/photos/68b04099951cc19873fc3dd3/stream/64f8a1b2c3d4e5f6a7b8c9d1",
    "profilePhotoId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "photoId": "PROFILE_1695123456789_ABC123",
      "filename": "profile_abc123def456_1695123456789.jpg",
      "originalName": "profile_photo.jpg",
      "mimeType": "image/jpeg",
      "size": 2048576,
      "photoUrl": "/api/photos/68b04099951cc19873fc3dd3/stream/64f8a1b2c3d4e5f6a7b8c9d1"
    },
    "createdAt": "2023-09-20T10:30:00.000Z",
    "updatedAt": "2023-09-20T15:45:00.000Z"
  }
}
```

---

### 2. Update User Profile
**PUT** `/api/user-profile/me`

Update the current user's profile information (excluding photo).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Updated Doe",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-03-15",
  "gender": "MALE",
  "address": "123 Updated Street",
  "completeAddress": "123 Updated Street, Apt 5B",
  "city": "New York",
  "pincode": "10001",
  "flatNumber": "A-102",
  "tenantType": "OWNER"
}
```

**Validation Rules:**
- `name`: 2-100 characters
- `phoneNumber`: Valid phone format
- `dateOfBirth`: ISO 8601 date format
- `gender`: MALE, FEMALE, or OTHER
- `address`: Max 500 characters
- `completeAddress`: Max 500 characters
- `city`: Max 100 characters
- `pincode`: Exactly 6 digits
- `flatNumber`: Max 20 characters
- `tenantType`: OWNER or TENANT

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Updated Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "role": "RESIDENT",
    "buildingId": "68b04099951cc19873fc3dd3",
    "flatNumber": "A-102",
    "address": "123 Updated Street",
    "city": "New York",
    "pincode": "10001",
    "profilePhotoId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "photoId": "PROFILE_1695123456789_ABC123",
      "filename": "profile_abc123def456_1695123456789.jpg",
      "originalName": "profile_photo.jpg",
      "mimeType": "image/jpeg",
      "size": 2048576,
      "photoUrl": "/api/photos/68b04099951cc19873fc3dd3/stream/64f8a1b2c3d4e5f6a7b8c9d1"
    },
    "updatedAt": "2023-09-20T16:00:00.000Z"
  }
}
```

---

### 3. Upload Profile Photo
**POST** `/api/user-profile/me/photo`

Upload a new profile photo for the current user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
photo: <image_file>
```

**File Requirements:**
- **Type**: Image files only (JPEG, PNG, GIF, etc.)
- **Size**: Maximum 5MB
- **Format**: Any valid image format

**Response:**
```json
{
  "success": true,
  "message": "Profile photo uploaded successfully",
  "data": {
    "photoId": "PROFILE_1695123456789_ABC123",
    "filename": "profile_abc123def456_1695123456789.jpg",
    "originalName": "profile_photo.jpg",
    "mimeType": "image/jpeg",
    "size": 2048576,
    "uploadedAt": "2023-09-20T10:30:00.000Z",
    "photoUrl": "/api/photos/68b04099951cc19873fc3dd3/stream/64f8a1b2c3d4e5f6a7b8c9d1"
  }
}
```

---

### 4. Update Profile Photo
**PUT** `/api/user-profile/me/photo`

Replace the current user's profile photo with a new one.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
photo: <image_file>
```

**File Requirements:**
- **Type**: Image files only (JPEG, PNG, GIF, etc.)
- **Size**: Maximum 5MB
- **Format**: Any valid image format

**Response:**
```json
{
  "success": true,
  "message": "Profile photo updated successfully",
  "data": {
    "photoId": "PROFILE_1695123456790_DEF456",
    "filename": "profile_def456ghi789_1695123456790.jpg",
    "originalName": "new_profile_photo.jpg",
    "mimeType": "image/jpeg",
    "size": 1536000,
    "uploadedAt": "2023-09-20T16:00:00.000Z",
    "photoUrl": "/api/photos/68b04099951cc19873fc3dd3/stream/64f8a1b2c3d4e5f6a7b8c9d2"
  }
}
```

---

### 5. Get Profile Photo
**GET** `/api/user-profile/me/photo`

Stream the current user's profile photo file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- **Content-Type**: `image/jpeg` (or appropriate image type)
- **Content-Disposition**: `inline; filename="profile_photo.jpg"`
- **Body**: Binary image data

---

### 6. Delete Profile Photo
**DELETE** `/api/user-profile/me/photo`

Delete the current user's profile photo.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile photo deleted successfully"
}
```

---

### 7. Get User Profile by ID (Admin)
**GET** `/api/user-profile/:userId`

Get a specific user's profile by ID (for admin purposes).

**Headers:**
```
Authorization: Bearer <token>
```

**Parameters:**
- `userId` (path): MongoDB ObjectId of the user

**Access Control:**
- **RESIDENT**: Can only view their own profile
- **SECURITY, BUILDING_ADMIN, SUPER_ADMIN**: Can view any user's profile

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "role": "RESIDENT",
    "buildingId": "68b04099951cc19873fc3dd3",
    "flatNumber": "A-101",
    "profilePhotoId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "photoId": "PROFILE_1695123456789_ABC123",
      "filename": "profile_abc123def456_1695123456789.jpg",
      "originalName": "profile_photo.jpg",
      "mimeType": "image/jpeg",
      "size": 2048576,
      "photoUrl": "/api/photos/68b04099951cc19873fc3dd3/stream/64f8a1b2c3d4e5f6a7b8c9d1"
    }
  }
}
```

---

## 🔧 Technical Details

### File Storage
- **Location**: `api/uploads/profiles/`
- **Naming**: `profile_{unique_id}_{timestamp}.{extension}`
- **Organization**: All profile photos stored in dedicated profiles directory

### Photo Model Integration
- **Related Type**: `USER`
- **Related ID**: User's MongoDB ObjectId
- **Access Level**: `PRIVATE`
- **Tags**: `['profile', 'user']`

### Database Schema
```javascript
// User Model Fields
{
  profilePicture: String,           // Legacy field for backward compatibility
  profilePhotoId: ObjectId,        // Reference to Photo model
  // ... other user fields
}

// Photo Model Fields
{
  photoId: String,                 // Unique photo identifier
  filename: String,                // Stored filename
  originalName: String,            // Original filename
  mimeType: String,                // Image MIME type
  size: Number,                    // File size in bytes
  uploadedBy: ObjectId,            // User who uploaded
  buildingId: ObjectId,            // Associated building
  relatedType: 'USER',             // Type of related entity
  relatedId: ObjectId,             // User's ObjectId
  description: String,             // Photo description
  tags: [String],                  // Photo tags
  isPublic: Boolean,               // Public visibility
  accessLevel: 'PRIVATE'           // Access control level
}
```

---

## 🚀 Usage Examples

### JavaScript/Node.js
```javascript
// Upload profile photo
const formData = new FormData();
formData.append('photo', fs.createReadStream('profile.jpg'));

const response = await axios.post(
  'http://localhost:5000/api/user-profile/me/photo',
  formData,
  {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  }
);
```

### cURL
```bash
# Upload profile photo
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@profile.jpg" \
  http://localhost:5000/api/user-profile/me/photo

# Get user profile
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/user-profile/me

# Update profile
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "phoneNumber": "+1234567890"}' \
  http://localhost:5000/api/user-profile/me
```

---

## ⚠️ Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name must be 2-100 characters"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied. You can only view your own profile."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**413 Payload Too Large:**
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB."
}
```

**415 Unsupported Media Type:**
```json
{
  "success": false,
  "message": "Only image files are allowed for profile photos"
}
```

---

## 🎯 Features

### ✅ Implemented Features
- **Profile Management**: Complete CRUD operations for user profiles
- **Photo Upload**: Single photo upload with validation
- **Photo Update**: Replace existing profile photo
- **Photo Deletion**: Remove profile photo
- **Photo Streaming**: Direct image file serving
- **Access Control**: Role-based permissions
- **File Validation**: Type and size validation
- **Database Integration**: Full Photo model integration
- **Error Handling**: Comprehensive error responses

### 🔒 Security Features
- **Authentication Required**: All endpoints require valid JWT token
- **File Type Validation**: Only image files allowed
- **Size Limits**: 5MB maximum file size
- **Access Control**: Users can only manage their own profiles
- **Private Photos**: Profile photos are private by default
- **Secure Storage**: Files stored in organized directory structure

---

## 📊 Testing

Use the provided test file to verify functionality:
```bash
node test_user_profile_photo.js
```

The test suite covers:
- User authentication
- Profile retrieval
- Profile updates
- Photo upload
- Photo update
- Photo deletion
- Error handling

---

## 🚀 Ready for Production

The user profile photo functionality is **100% complete** and ready for:
- ✅ Frontend integration
- ✅ Mobile app integration
- ✅ Production deployment
- ✅ User profile management
- ✅ Photo upload/update/deletion

**All endpoints are fully functional and tested!** 🎉

# 🏢 Visitor Endpoints with flatNumber Field

## **📋 Overview**
The Visitor endpoints now support the `flatNumber` field, which is a string representing the flat number that a visitor can access. This field is particularly useful for `FLAT_EMPLOYEE` category visitors who need access to specific flats.

## **🔧 Field Details**
- **Field Name**: `flatNumber`
- **Type**: String
- **Validation**: Max 20 characters
- **Required**: No (optional)
- **Use Case**: For visitors who need access to a specific flat

## **📡 Endpoints**

### **1. Create Visitor with flatNumber**
```http
POST /api/visitors/{buildingId}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body Examples:**

#### **FLAT_EMPLOYEE with flatNumber**
```json
{
  "name": "John Doe - Housekeeper",
  "phoneNumber": "+919876543299",
  "email": "john@cleanpro.com",
  "visitorCategory": "FLAT_EMPLOYEE",
  "serviceType": "Housekeeping",
  "employeeCode": "EMP001",
  "flatNumber": "101",
  "purpose": "Regular maintenance work",
  "company": "CleanPro Services",
  "idType": "AADHAR",
  "idNumber": "123456789012"
}
```

#### **CAB_DRIVER with flatNumber**
```json
{
  "name": "Mike Smith - Uber Driver",
  "phoneNumber": "+919876543298",
  "visitorCategory": "CAB_DRIVER",
  "serviceType": "Uber",
  "vehicleNumber": "KA01AB1234",
  "vehicleType": "CAR",
  "flatNumber": "201",
  "purpose": "Pickup service"
}
```

#### **DELIVERY_AGENT with flatNumber**
```json
{
  "name": "Sarah Wilson - Delivery Agent",
  "phoneNumber": "+919876543297",
  "visitorCategory": "DELIVERY_AGENT",
  "serviceType": "Amazon",
  "vehicleNumber": "KA02CD5678",
  "vehicleType": "BIKE",
  "flatNumber": "301",
  "purpose": "Package delivery"
}
```

#### **OTHER category with flatNumber**
```json
{
  "name": "Dr. Jane Smith",
  "phoneNumber": "+919876543296",
  "visitorCategory": "OTHER",
  "serviceType": "Medical Consultation",
  "flatNumber": "401",
  "purpose": "Home visit"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Visitor created successfully",
  "data": {
    "visitorId": "68cbf8ef372c07c99f3f1b75",
    "name": "John Doe - Housekeeper",
    "phoneNumber": "+919876543299",
    "email": "john@cleanpro.com",
    "visitorCategory": "FLAT_EMPLOYEE",
    "serviceType": "Housekeeping",
    "employeeCode": "EMP001",
    "flatNumber": "101",
    "purpose": "Regular maintenance work",
    "company": "CleanPro Services",
    "idType": "AADHAR",
    "idNumber": "123456789012",
    "buildingId": "68b04099951cc19873fc3dd3",
    "isActive": true,
    "isBlacklisted": false,
    "totalVisits": 0,
    "createdAt": "2025-01-18T12:00:00.000Z",
    "updatedAt": "2025-01-18T12:00:00.000Z"
  }
}
```

### **2. Get All Visitors (includes flatNumber)**
```http
GET /api/visitors/{buildingId}
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search by name, phone, or email
- `status` (optional): Filter by status (Active, Inactive, Blacklisted)
- `isBlacklisted` (optional): Filter by blacklist status (true/false)
- `sortBy` (optional): Sort field (name, createdAt, totalVisits, lastVisitAt)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "message": "Visitors retrieved successfully",
  "data": {
    "visitors": [
      {
        "visitorId": "68cbf8ef372c07c99f3f1b75",
        "name": "John Doe - Housekeeper",
        "phoneNumber": "+919876543299",
        "email": "john@cleanpro.com",
        "visitorCategory": "FLAT_EMPLOYEE",
        "serviceType": "Housekeeping",
        "employeeCode": "EMP001",
        "flatNumber": "101",
        "purpose": "Regular maintenance work",
        "company": "CleanPro Services",
        "buildingId": "68b04099951cc19873fc3dd3",
        "isActive": true,
        "isBlacklisted": false,
        "totalVisits": 0,
        "createdAt": "2025-01-18T12:00:00.000Z",
        "updatedAt": "2025-01-18T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalVisitors": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### **3. Get Single Visitor (includes flatNumber)**
```http
GET /api/visitors/{buildingId}/{visitorId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Visitor retrieved successfully",
  "data": {
    "visitorId": "68cbf8ef372c07c99f3f1b75",
    "name": "John Doe - Housekeeper",
    "phoneNumber": "+919876543299",
    "email": "john@cleanpro.com",
    "visitorCategory": "FLAT_EMPLOYEE",
    "serviceType": "Housekeeping",
    "employeeCode": "EMP001",
    "flatNumber": "101",
    "purpose": "Regular maintenance work",
    "company": "CleanPro Services",
    "buildingId": "68b04099951cc19873fc3dd3",
    "isActive": true,
    "isBlacklisted": false,
    "totalVisits": 0,
    "createdAt": "2025-01-18T12:00:00.000Z",
    "updatedAt": "2025-01-18T12:00:00.000Z"
  }
}
```

### **4. Update Visitor with flatNumber**
```http
PUT /api/visitors/{buildingId}/{visitorId}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body Examples:**

#### **Update flatNumber only**
```json
{
    "flatNumber": "105"
}
```

#### **Update multiple fields including flatNumber**
```json
{
  "name": "John Doe - Senior Housekeeper",
  "serviceType": "Premium Housekeeping",
  "flatNumber": "105",
  "employeeCode": "EMP001-SENIOR"
}
```

#### **Remove flatNumber (set to empty string)**
```json
{
  "flatNumber": ""
}
```

**Response:**
```json
{
  "success": true,
  "message": "Visitor updated successfully",
  "data": {
    "visitorId": "68cbf8ef372c07c99f3f1b75",
    "name": "John Doe - Senior Housekeeper",
    "phoneNumber": "+919876543299",
    "email": "john@cleanpro.com",
    "visitorCategory": "FLAT_EMPLOYEE",
    "serviceType": "Premium Housekeeping",
    "employeeCode": "EMP001-SENIOR",
    "flatNumber": "105",
    "purpose": "Regular maintenance work",
    "company": "CleanPro Services",
    "buildingId": "68b04099951cc19873fc3dd3",
    "isActive": true,
    "isBlacklisted": false,
    "totalVisits": 0,
    "createdAt": "2025-01-18T12:00:00.000Z",
    "updatedAt": "2025-01-18T12:05:00.000Z"
  }
}
```

### **5. Search Visitors (includes flatNumber)**
```http
GET /api/visitors/{buildingId}/search?query={searchTerm}
Authorization: Bearer {token}
```

**Query Parameters:**
- `query` (required): Search term
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "visitors": [
      {
        "visitorId": "68cbf8ef372c07c99f3f1b75",
        "name": "John Doe - Housekeeper",
        "phoneNumber": "+919876543299",
        "email": "john@cleanpro.com",
        "visitorCategory": "FLAT_EMPLOYEE",
        "serviceType": "Housekeeping",
        "employeeCode": "EMP001",
        "flatNumber": "101",
        "purpose": "Regular maintenance work",
        "company": "CleanPro Services",
        "buildingId": "68b04099951cc19873fc3dd3",
        "isActive": true,
        "isBlacklisted": false,
        "totalVisits": 0,
        "createdAt": "2025-01-18T12:00:00.000Z",
        "updatedAt": "2025-01-18T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalVisitors": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### **6. Get Visitor Statistics**
```http
GET /api/visitors/{buildingId}/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Visitor statistics retrieved successfully",
  "data": {
    "totalVisitors": 25,
    "activeVisitors": 23,
    "blacklistedVisitors": 2,
    "totalVisits": 150,
    "categoryBreakdown": {
      "FLAT_EMPLOYEE": 10,
      "CAB_DRIVER": 8,
      "DELIVERY_AGENT": 5,
      "OTHER": 2
    }
  }
}
```

## **⚠️ Validation Rules**

### **flatNumber Field:**
- **Type**: String
- **Length**: Max 20 characters
- **Required**: No (optional)
- **Format**: Single string

### **visitorCategory Field:**
- **Valid Values**: `CAB_DRIVER`, `DELIVERY_AGENT`, `FLAT_EMPLOYEE`, `OTHER`
- **Required**: No (optional)
- **Default**: `OTHER`

### **serviceType Field:**
- **Type**: String
- **Length**: Max 50 characters
- **Required**: No (optional)

### **employeeCode Field:**
- **Type**: String
- **Length**: Max 20 characters
- **Required**: No (optional)
- **Use Case**: For `FLAT_EMPLOYEE` category

### **vehicleType Field:**
- **Valid Values**: `CAR`, `BIKE`, `SCOOTER`, `AUTO`, `OTHER`
- **Required**: No (optional)
- **Default**: `OTHER`

## **🔍 Error Responses**

### **Validation Errors:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "flatNumber",
      "message": "Flat number cannot exceed 20 characters"
    }
  ]
}
```

### **Invalid Category:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "visitorCategory",
      "message": "Invalid visitor category"
    }
  ]
}
```

## **📝 Usage Examples**

### **1. Create a Housekeeper with Multiple Flat Access:**
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/visitors/68b04099951cc19873fc3dd3" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Garcia",
    "phoneNumber": "+919876543299",
    "visitorCategory": "FLAT_EMPLOYEE",
    "serviceType": "Housekeeping",
    "employeeCode": "HK001",
    "flatNumber": "105",
    "purpose": "Daily cleaning service"
  }'
```

### **2. Update Flat Access:**
```bash
curl -X PUT "https://securityapp-backend.vercel.app/api/visitors/68b04099951cc19873fc3dd3/VISITOR_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flatNumber": "201"
  }'
```

### **3. Search for Visitors by Flat Number:**
```bash
curl -X GET "https://securityapp-backend.vercel.app/api/visitors/68b04099951cc19873fc3dd3/search?query=101" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## **🎯 Key Features**

1. **Single Flat Access**: Visitors can have access to a specific flat
2. **Category-Based**: Different visitor categories support different fields
3. **Flexible Updates**: Can update flatNumber independently
4. **Search Support**: Can search visitors by any field including flatNumber
5. **Validation**: Comprehensive validation for all fields
6. **Optional Field**: flatNumber is optional and can be empty

## **🔧 Testing**

Run the test file to verify all functionality:
```bash
node test_visitor_flatnumbers.js
```

This will test:
- Creating visitors with flatNumber
- Getting visitors with flatNumber
- Updating visitors with flatNumber
- Validation for flatNumber
- Different visitor categories

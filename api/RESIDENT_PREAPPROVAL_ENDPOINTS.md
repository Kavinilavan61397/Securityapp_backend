# 🏠 Resident Pre-approval Endpoints

## **📋 Overview**
The Resident Pre-approval system allows residents to create and manage pre-approval requests for visitors before their arrival. This system includes the `flatNumber` field for specifying which flat the visitor is visiting.

## **🔧 Field Details**
- **Field Name**: `flatNumber`
- **Type**: String
- **Validation**: Max 20 characters
- **Required**: No (optional)
- **Use Case**: To specify which flat the visitor is visiting

## **📡 Authentication Required**
All endpoints require:
- **Authorization**: Bearer token
- **Role**: RESIDENT only
- **Building Access**: Must belong to the specified building

## **📡 Endpoints**

### **1. Create Pre-approval Request**
```http
POST /api/pre-approvals/{buildingId}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "visitorName": "John Doe",
  "visitorPhone": "+919876543210",
  "visitorEmail": "john@example.com",
  "purpose": "Business meeting",
  "expectedDate": "2025-01-20T10:00:00.000Z",
  "expectedTime": "10:00 AM",
  "notes": "Important client meeting",
  "residentMobileNumber": "+919876543211",
  "flatNumber": "101"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pre-approval request created successfully",
  "data": {
    "preApprovalId": "68cbf8ef372c07c99f3f1b75",
    "visitorName": "John Doe",
    "visitorPhone": "+919876543210",
    "visitorEmail": "john@example.com",
    "purpose": "Business meeting",
    "expectedDate": "2025-01-20T10:00:00.000Z",
    "expectedTime": "10:00 AM",
    "residentMobileNumber": "+919876543211",
    "flatNumber": "101",
    "status": "PENDING",
    "createdAt": "2025-01-18T12:00:00.000Z"
  }
}
```

### **2. Get All Pre-approvals**
```http
GET /api/pre-approvals/{buildingId}
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED, EXPIRED)

**Example:**
```http
GET /api/pre-approvals/68b04099951cc19873fc3dd3?page=1&limit=10&status=PENDING
```

**Response:**
```json
{
  "success": true,
  "message": "Pre-approvals retrieved successfully",
  "data": {
    "preApprovals": [
      {
        "preApprovalId": "68cbf8ef372c07c99f3f1b75",
        "visitorName": "John Doe",
        "visitorPhone": "+919876543210",
        "visitorEmail": "john@example.com",
        "purpose": "Business meeting",
        "expectedDate": "2025-01-20T10:00:00.000Z",
        "expectedTime": "10:00 AM",
        "residentMobileNumber": "+919876543211",
        "flatNumber": "101",
        "status": "PENDING",
        "createdAt": "2025-01-18T12:00:00.000Z",
        "updatedAt": "2025-01-18T12:00:00.000Z"
      },
      {
        "preApprovalId": "68cbf8ef372c07c99f3f1b76",
        "visitorName": "Jane Smith",
        "visitorPhone": "+919876543212",
        "visitorEmail": "jane@example.com",
        "purpose": "Family visit",
        "expectedDate": "2025-01-21T14:00:00.000Z",
        "expectedTime": "2:00 PM",
        "residentMobileNumber": "+919876543211",
        "flatNumber": "102",
        "status": "APPROVED",
        "createdAt": "2025-01-17T10:00:00.000Z",
        "updatedAt": "2025-01-17T15:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalPreApprovals": 2,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### **3. Get Single Pre-approval**
```http
GET /api/pre-approvals/{buildingId}/{preApprovalId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Pre-approval retrieved successfully",
  "data": {
    "preApprovalId": "68cbf8ef372c07c99f3f1b75",
    "visitorName": "John Doe",
    "visitorPhone": "+919876543210",
    "visitorEmail": "john@example.com",
    "purpose": "Business meeting",
    "expectedDate": "2025-01-20T10:00:00.000Z",
    "expectedTime": "10:00 AM",
    "notes": "Important client meeting",
    "residentMobileNumber": "+919876543211",
    "flatNumber": "101",
    "status": "PENDING",
    "createdAt": "2025-01-18T12:00:00.000Z",
    "updatedAt": "2025-01-18T12:00:00.000Z"
  }
}
```

### **4. Update Pre-approval**
```http
PUT /api/pre-approvals/{buildingId}/{preApprovalId}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "visitorName": "John Doe Updated",
  "visitorPhone": "+919876543213",
  "visitorEmail": "john.updated@example.com",
  "purpose": "Updated business meeting",
  "expectedDate": "2025-01-22T11:00:00.000Z",
  "expectedTime": "11:00 AM",
  "notes": "Updated meeting details",
  "residentMobileNumber": "+919876543214",
  "flatNumber": "103"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pre-approval updated successfully",
  "data": {
    "preApprovalId": "68cbf8ef372c07c99f3f1b75",
    "visitorName": "John Doe Updated",
    "visitorPhone": "+919876543213",
    "visitorEmail": "john.updated@example.com",
    "purpose": "Updated business meeting",
    "expectedDate": "2025-01-22T11:00:00.000Z",
    "expectedTime": "11:00 AM",
    "notes": "Updated meeting details",
    "residentMobileNumber": "+919876543214",
    "flatNumber": "103",
    "status": "PENDING",
    "createdAt": "2025-01-18T12:00:00.000Z",
    "updatedAt": "2025-01-18T14:30:00.000Z"
  }
}
```

### **5. Delete Pre-approval**
```http
DELETE /api/pre-approvals/{buildingId}/{preApprovalId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Pre-approval deleted successfully",
  "data": {
    "preApprovalId": "68cbf8ef372c07c99f3f1b75",
    "deletedAt": "2025-01-18T15:00:00.000Z"
  }
}
```

## **⚠️ Validation Rules**

### **Required Fields:**
- `visitorName`: 2-100 characters
- `visitorPhone`: 10-15 characters

### **Optional Fields:**
- `visitorEmail`: Valid email format
- `purpose`: Max 200 characters
- `expectedDate`: Valid ISO8601 date
- `expectedTime`: Max 50 characters
- `notes`: Max 500 characters
- `residentMobileNumber`: 10-15 characters
- `flatNumber`: Max 20 characters

### **Status Values:**
- `PENDING`: Awaiting approval
- `APPROVED`: Approved by admin
- `REJECTED`: Rejected by admin
- `EXPIRED`: Request expired

## **🔍 Error Responses**

### **Validation Errors:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "visitorName",
      "message": "Visitor name is required"
    },
    {
      "field": "visitorPhone",
      "message": "Phone number must be between 10 and 15 characters"
    }
  ]
}
```

### **Not Found:**
```json
{
  "success": false,
  "message": "Pre-approval not found"
}
```

### **Access Denied:**
```json
{
  "success": false,
  "message": "Access denied. You can only manage your own pre-approvals"
}
```

## **📝 Usage Examples**

### **1. Create a Pre-approval for Family Visit:**
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitorName": "Maria Garcia",
    "visitorPhone": "+919876543299",
    "visitorEmail": "maria@example.com",
    "purpose": "Family visit",
    "expectedDate": "2025-01-25T16:00:00.000Z",
    "expectedTime": "4:00 PM",
    "notes": "Weekend family gathering",
    "residentMobileNumber": "+919876543211",
    "flatNumber": "201"
  }'
```

### **2. Get All Pending Pre-approvals:**
```bash
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3?status=PENDING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **3. Update Flat Number:**
```bash
curl -X PUT "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/PREAPPROVAL_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flatNumber": "301"
  }'
```

### **4. Delete a Pre-approval:**
```bash
curl -X DELETE "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/PREAPPROVAL_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## **🎯 Key Features**

1. **Resident-Only Access**: Only residents can create and manage pre-approvals
2. **Flat Number Support**: Specify which flat the visitor is visiting
3. **Status Tracking**: Track approval status (PENDING, APPROVED, REJECTED, EXPIRED)
4. **Flexible Updates**: Update any field after creation
5. **Soft Delete**: Pre-approvals are soft deleted, not permanently removed
6. **Pagination**: Support for paginated results
7. **Status Filtering**: Filter pre-approvals by status

## **📊 Status Flow**

1. **PENDING** → Resident creates pre-approval
2. **APPROVED** → Admin approves the request
3. **REJECTED** → Admin rejects the request
4. **EXPIRED** → Request expires after a certain period

## **🔧 Testing**

Create a test file to verify all functionality:
```bash
node test_preapproval_endpoints.js
```

This will test:
- Creating pre-approvals with flatNumber
- Getting all pre-approvals
- Getting single pre-approval
- Updating pre-approvals
- Deleting pre-approvals
- Validation for all fields

## **📋 Complete Endpoint List**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pre-approvals/{buildingId}` | Create pre-approval |
| GET | `/api/pre-approvals/{buildingId}` | Get all pre-approvals |
| GET | `/api/pre-approvals/{buildingId}/{preApprovalId}` | Get single pre-approval |
| PUT | `/api/pre-approvals/{buildingId}/{preApprovalId}` | Update pre-approval |
| DELETE | `/api/pre-approvals/{buildingId}/{preApprovalId}` | Delete pre-approval |

**Total: 5 Resident Pre-approval endpoints**

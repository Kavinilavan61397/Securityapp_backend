# 🚀 PRE-APPROVAL ENDPOINTS TESTING GUIDE

## **Base URL**: `https://securityapp-backend.vercel.app/api`

---

## **🔐 AUTHENTICATION REQUIRED**
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## **📋 ENDPOINT 1: CREATE PRE-APPROVAL (AUTOMATIC VISITOR & VISIT CREATION)**

### **POST** `/pre-approvals/:buildingId`

**Description**: Creates a new pre-approval and automatically generates visitor and visit records.

**Roles**: `RESIDENT`, `SUPER_ADMIN`, `BUILDING_ADMIN`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building

**Request Body** (JSON):
```json
{
  "visitorName": "John Doe",
  "visitorPhone": "9876543210",
  "visitorEmail": "john.doe@email.com",
  "purpose": "Meeting with resident",
  "expectedDate": "2024-01-15T10:00:00.000Z",
  "expectedTime": "10:00 AM",
  "notes": "Business meeting",
  "residentMobileNumber": "9876543210",
  "flatNumber": "A-101"
}
```

**Required Fields**:
- `visitorName` (2-100 characters)
- `visitorPhone` (10-15 characters)

**Optional Fields**:
- `visitorEmail` (valid email)
- `purpose` (max 200 characters)
- `expectedDate` (ISO 8601 format)
- `expectedTime` (max 50 characters)
- `notes` (max 500 characters)
- `residentMobileNumber` (10-15 characters)
- `flatNumber` (max 20 characters)

**Example Request**:
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitorName": "Alice Smith",
    "visitorPhone": "9876543210",
    "visitorEmail": "alice@email.com",
    "purpose": "Family visit",
    "expectedDate": "2024-01-20T14:00:00.000Z",
    "expectedTime": "2:00 PM",
    "notes": "Weekend family gathering",
    "residentMobileNumber": "9876543210",
    "flatNumber": "B-205"
  }'
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Pre-approval request created successfully and visit generated",
  "data": {
    "preApprovalId": "68d1234567890abcdef12345",
    "visitorName": "Alice Smith",
    "visitorPhone": "9876543210",
    "visitorEmail": "alice@email.com",
    "purpose": "Family visit",
    "expectedDate": "2024-01-20T14:00:00.000Z",
    "expectedTime": "2:00 PM",
    "residentMobileNumber": "9876543210",
    "flatNumber": "B-205",
    "status": "PENDING",
    "fullIdentification": false,
    "visit": {
      "id": "68d1234567890abcdef12346",
      "visitId": "VIS-2024-001234",
      "status": "SCHEDULED",
      "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "qrCodeExpiresAt": "2024-01-21T14:00:00.000Z"
    },
    "visitor": {
      "id": "68d1234567890abcdef12347",
      "name": "Alice Smith",
      "phoneNumber": "9876543210"
    },
    "resident": {
      "id": "68d1234567890abcdef12348",
      "name": "Resident Name"
    },
    "building": {
      "id": "68b04099951cc19873fc3dd3",
      "name": "Sunrise Apartments"
    }
  }
}
```

---

## **📋 ENDPOINT 2: GET ALL PRE-APPROVALS**

### **GET** `/pre-approvals/:buildingId`

**Description**: Retrieves all pre-approvals for a building with pagination and filtering.

**Roles**: `RESIDENT`, `SUPER_ADMIN`, `BUILDING_ADMIN`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`)

**Example Request**:
```bash
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3?page=1&limit=10&status=PENDING" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Pre-approvals retrieved successfully",
  "data": {
    "preApprovals": [
      {
        "id": "68d1234567890abcdef12345",
        "visitorName": "Alice Smith",
        "visitorPhone": "9876543210",
        "visitorEmail": "alice@email.com",
        "purpose": "Family visit",
        "expectedDate": "2024-01-20T14:00:00.000Z",
        "expectedTime": "2:00 PM",
        "residentMobileNumber": "9876543210",
        "flatNumber": "B-205",
        "status": "PENDING",
        "fullIdentification": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalPreApprovals": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

## **📋 ENDPOINT 3: GET SINGLE PRE-APPROVAL**

### **GET** `/pre-approvals/:buildingId/:preApprovalId`

**Description**: Retrieves a specific pre-approval by ID.

**Roles**: `RESIDENT`, `SUPER_ADMIN`, `BUILDING_ADMIN`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building
- `preApprovalId`: MongoDB ObjectId of the pre-approval

**Example Request**:
```bash
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Pre-approval retrieved successfully",
  "data": {
    "id": "68d1234567890abcdef12345",
    "visitorName": "Alice Smith",
    "visitorPhone": "9876543210",
    "visitorEmail": "alice@email.com",
    "purpose": "Family visit",
    "expectedDate": "2024-01-20T14:00:00.000Z",
    "expectedTime": "2:00 PM",
    "residentMobileNumber": "9876543210",
    "flatNumber": "B-205",
    "status": "PENDING",
    "fullIdentification": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## **📋 ENDPOINT 4: UPDATE PRE-APPROVAL**

### **PUT** `/pre-approvals/:buildingId/:preApprovalId`

**Description**: Updates an existing pre-approval.

**Roles**: `RESIDENT`, `SUPER_ADMIN`, `BUILDING_ADMIN`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building
- `preApprovalId`: MongoDB ObjectId of the pre-approval

**Request Body** (JSON) - All fields optional:
```json
{
  "visitorName": "Alice Smith Updated",
  "visitorPhone": "9876543211",
  "visitorEmail": "alice.updated@email.com",
  "purpose": "Updated purpose",
  "expectedDate": "2024-01-21T15:00:00.000Z",
  "expectedTime": "3:00 PM",
  "notes": "Updated notes",
  "residentMobileNumber": "9876543211",
  "flatNumber": "B-206"
}
```

**Example Request**:
```bash
curl -X PUT "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitorName": "Alice Smith Updated",
    "purpose": "Updated family visit",
    "expectedTime": "3:00 PM"
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Pre-approval updated successfully",
  "data": {
    "id": "68d1234567890abcdef12345",
    "visitorName": "Alice Smith Updated",
    "visitorPhone": "9876543210",
    "visitorEmail": "alice@email.com",
    "purpose": "Updated family visit",
    "expectedDate": "2024-01-20T14:00:00.000Z",
    "expectedTime": "3:00 PM",
    "residentMobileNumber": "9876543210",
    "flatNumber": "B-205",
    "status": "PENDING",
    "fullIdentification": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

---

## **📋 ENDPOINT 5: APPROVE PRE-APPROVAL**

### **POST** `/pre-approvals/:buildingId/:preApprovalId/approve`

**Description**: Approves a pre-approval (Admin/Security only).

**Roles**: `SUPER_ADMIN`, `BUILDING_ADMIN`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building
- `preApprovalId`: MongoDB ObjectId of the pre-approval

**Request Body** (JSON):
```json
{
  "adminNotes": "Approved by security - all documents verified"
}
```

**Example Request**:
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345/approve" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adminNotes": "Approved by security - all documents verified"
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Pre-approval approved successfully",
  "data": {
    "id": "68d1234567890abcdef12345",
    "visitorName": "Alice Smith",
    "visitorPhone": "9876543210",
    "visitorEmail": "alice@email.com",
    "purpose": "Family visit",
    "expectedDate": "2024-01-20T14:00:00.000Z",
    "expectedTime": "2:00 PM",
    "residentMobileNumber": "9876543210",
    "flatNumber": "B-205",
    "status": "APPROVED",
    "fullIdentification": false,
    "approvedBy": "68d1234567890abcdef12348",
    "approvedAt": "2024-01-15T12:00:00.000Z",
    "adminNotes": "Approved by security - all documents verified",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## **📋 ENDPOINT 6: REJECT PRE-APPROVAL**

### **POST** `/pre-approvals/:buildingId/:preApprovalId/reject`

**Description**: Rejects a pre-approval (Admin/Security only).

**Roles**: `SUPER_ADMIN`, `BUILDING_ADMIN`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building
- `preApprovalId`: MongoDB ObjectId of the pre-approval

**Request Body** (JSON):
```json
{
  "rejectionReason": "Incomplete documentation provided"
}
```

**Example Request**:
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345/reject" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rejectionReason": "Incomplete documentation provided"
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Pre-approval rejected successfully",
  "data": {
    "id": "68d1234567890abcdef12345",
    "visitorName": "Alice Smith",
    "visitorPhone": "9876543210",
    "visitorEmail": "alice@email.com",
    "purpose": "Family visit",
    "expectedDate": "2024-01-20T14:00:00.000Z",
    "expectedTime": "2:00 PM",
    "residentMobileNumber": "9876543210",
    "flatNumber": "B-205",
    "status": "REJECTED",
    "fullIdentification": false,
    "rejectedBy": "68d1234567890abcdef12348",
    "rejectedAt": "2024-01-15T12:30:00.000Z",
    "rejectionReason": "Incomplete documentation provided",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:30:00.000Z"
  }
}
```

---

## **📋 ENDPOINT 7: DELETE PRE-APPROVAL**

### **DELETE** `/pre-approvals/:buildingId/:preApprovalId`

**Description**: Soft deletes a pre-approval.

**Roles**: `RESIDENT`, `SUPER_ADMIN`, `BUILDING_ADMIN`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building
- `preApprovalId`: MongoDB ObjectId of the pre-approval

**Example Request**:
```bash
curl -X DELETE "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Pre-approval deleted successfully"
}
```

---

## **🔧 TESTING WORKFLOW**

### **Step 1: Get Authentication Token**
First, get a JWT token by logging in:
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

### **Step 2: Create a Pre-approval**
Use the token from Step 1 to create a new pre-approval.

### **Step 3: Test Approval/Rejection**
Use the pre-approval ID from Step 2 to test approval or rejection.

### **Step 4: Verify Results**
Check the pre-approval status and associated visitor/visit records.

---

## **⚠️ COMMON ERRORS**

### **400 Bad Request**
- Invalid request body format
- Missing required fields
- Validation errors

### **401 Unauthorized**
- Missing or invalid JWT token
- Token expired

### **403 Forbidden**
- Insufficient role permissions
- User not authorized for building

### **404 Not Found**
- Building not found
- Pre-approval not found
- Invalid IDs

### **500 Internal Server Error**
- Database connection issues
- Server-side errors

---

## **📝 NOTES**

1. **Automatic Flow**: Creating a pre-approval automatically creates visitor and visit records
2. **Role-based Access**: Different roles have different permissions
3. **Soft Delete**: Deleted pre-approvals are marked as deleted, not permanently removed
4. **Pagination**: Use query parameters for pagination in list endpoints
5. **Validation**: All input is validated according to the schema rules
6. **Timestamps**: All records include createdAt and updatedAt timestamps

---

## **🚀 QUICK TEST COMMANDS**

```bash
# 1. Create pre-approval
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visitorName": "Test Visitor", "visitorPhone": "9876543210"}'

# 2. Get all pre-approvals
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Approve pre-approval (use ID from step 1)
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/PREAPPROVAL_ID/approve" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminNotes": "Approved"}'
```

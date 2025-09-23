# 🚀 CORRECTED PRE-APPROVAL ENDPOINTS - PROPER ROLE FLOW

## **Base URL**: `https://securityapp-backend.vercel.app/api`

---

## **🔐 AUTHENTICATION REQUIRED**
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## **✅ CORRECTED ROLE PERMISSIONS**

### **RESIDENT ROLE** (Creates and manages their own pre-approvals):
- ✅ **CREATE** pre-approvals
- ✅ **VIEW** their own pre-approvals
- ✅ **UPDATE** their own pre-approvals (before approval)
- ✅ **DELETE** their own pre-approvals (before approval)

### **SECURITY ROLE** (Approves/rejects pre-approvals):
- ✅ **VIEW** all pre-approvals in their building
- ✅ **APPROVE** pre-approvals
- ✅ **REJECT** pre-approvals

---

## **📋 ENDPOINT 1: CREATE PRE-APPROVAL (RESIDENT ONLY)**

### **POST** `/pre-approvals/:buildingId`

**Description**: Creates a new pre-approval and automatically generates visitor and visit records.

**Roles**: `RESIDENT` only

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

**Example Request**:
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3" \
  -H "Authorization: Bearer RESIDENT_JWT_TOKEN" \
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

---

## **📋 ENDPOINT 2: GET ALL PRE-APPROVALS**

### **GET** `/pre-approvals/:buildingId`

**Description**: 
- **RESIDENT**: Gets their own pre-approvals
- **SECURITY**: Gets all pre-approvals in the building

**Roles**: `RESIDENT`, `SECURITY`

**URL Parameters**:
- `buildingId`: MongoDB ObjectId of the building

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`)

**Example Request**:
```bash
# For RESIDENT
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3?page=1&limit=10&status=PENDING" \
  -H "Authorization: Bearer RESIDENT_JWT_TOKEN"

# For SECURITY
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3?page=1&limit=10&status=PENDING" \
  -H "Authorization: Bearer SECURITY_JWT_TOKEN"
```

---

## **📋 ENDPOINT 3: GET SINGLE PRE-APPROVAL**

### **GET** `/pre-approvals/:buildingId/:preApprovalId`

**Description**: 
- **RESIDENT**: Gets their own pre-approval
- **SECURITY**: Gets any pre-approval in their building

**Roles**: `RESIDENT`, `SECURITY`

**Example Request**:
```bash
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## **📋 ENDPOINT 4: UPDATE PRE-APPROVAL (RESIDENT ONLY)**

### **PUT** `/pre-approvals/:buildingId/:preApprovalId`

**Description**: Updates an existing pre-approval (only before approval).

**Roles**: `RESIDENT` only

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
  -H "Authorization: Bearer RESIDENT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitorName": "Alice Smith Updated",
    "purpose": "Updated family visit",
    "expectedTime": "3:00 PM"
  }'
```

---

## **📋 ENDPOINT 5: APPROVE PRE-APPROVAL (SECURITY ONLY)**

### **POST** `/pre-approvals/:buildingId/:preApprovalId/approve`

**Description**: Approves a pre-approval.

**Roles**: `SECURITY` only

**Request Body** (JSON):
```json
{
  "adminNotes": "Approved by security - all documents verified"
}
```

**Example Request**:
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345/approve" \
  -H "Authorization: Bearer SECURITY_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adminNotes": "Approved by security - all documents verified"
  }'
```

---

## **📋 ENDPOINT 6: REJECT PRE-APPROVAL (SECURITY ONLY)**

### **POST** `/pre-approvals/:buildingId/:preApprovalId/reject`

**Description**: Rejects a pre-approval.

**Roles**: `SECURITY` only

**Request Body** (JSON):
```json
{
  "rejectionReason": "Incomplete documentation provided"
}
```

**Example Request**:
```bash
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345/reject" \
  -H "Authorization: Bearer SECURITY_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rejectionReason": "Incomplete documentation provided"
  }'
```

---

## **📋 ENDPOINT 7: DELETE PRE-APPROVAL (RESIDENT ONLY)**

### **DELETE** `/pre-approvals/:buildingId/:preApprovalId`

**Description**: Deletes a pre-approval (only before approval).

**Roles**: `RESIDENT` only

**Example Request**:
```bash
curl -X DELETE "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/68d1234567890abcdef12345" \
  -H "Authorization: Bearer RESIDENT_JWT_TOKEN"
```

---

## **🔄 CORRECT WORKFLOW**

### **Step 1: RESIDENT Creates Pre-approval**
```bash
# RESIDENT logs in and gets token
curl -X POST "https://securityapp-backend.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "resident_username", "password": "password"}'

# RESIDENT creates pre-approval
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3" \
  -H "Authorization: Bearer RESIDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visitorName": "John Doe", "visitorPhone": "9876543210"}'
```

### **Step 2: SECURITY Views and Approves**
```bash
# SECURITY logs in and gets token
curl -X POST "https://securityapp-backend.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "security_username", "password": "password"}'

# SECURITY views all pending pre-approvals
curl -X GET "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3?status=PENDING" \
  -H "Authorization: Bearer SECURITY_TOKEN"

# SECURITY approves pre-approval
curl -X POST "https://securityapp-backend.vercel.app/api/pre-approvals/68b04099951cc19873fc3dd3/PREAPPROVAL_ID/approve" \
  -H "Authorization: Bearer SECURITY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminNotes": "Approved"}'
```

---

## **⚠️ ROLE RESTRICTIONS**

### **RESIDENT Cannot:**
- ❌ Approve pre-approvals
- ❌ Reject pre-approvals
- ❌ View other residents' pre-approvals
- ❌ Update approved/rejected pre-approvals

### **SECURITY Cannot:**
- ❌ Create pre-approvals
- ❌ Update pre-approvals
- ❌ Delete pre-approvals
- ❌ View pre-approvals from other buildings

---

## **🔧 TESTING WITH CORRECT ROLES**

1. **Get RESIDENT token** for creating pre-approvals
2. **Get SECURITY token** for approving/rejecting
3. **Test the complete flow** from creation to approval

The endpoints now follow the correct flow: **Residents create, Security approves!**

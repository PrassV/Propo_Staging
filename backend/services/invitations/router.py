from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any, List
import httpx
import os
from datetime import datetime, timedelta
import secrets
import uuid

# Import the database operations from shared module
from shared.database import get_by_id, create, update, delete_by_id, supabase_client, query_table

router = APIRouter()

# Models
class EmailParams(BaseModel):
    to: EmailStr
    ownerName: str
    propertyName: str
    inviteUrl: str
    
    @validator('ownerName', 'propertyName', 'inviteUrl')
    def not_empty(cls, v, values, **kwargs):
        if not v or not v.strip():
            field_name = kwargs.get('field').name
            raise ValueError(f"{field_name} is required")
        return v

class InvitationRequest(BaseModel):
    tenant_email: EmailStr
    tenant_name: str
    tenant_phone: Optional[str] = None
    property_id: str
    owner_id: str
    rental_details: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

class TokenVerificationRequest(BaseModel):
    token: str

class InvitationBase(BaseModel):
    property_id: str
    email: str
    role: str  # "tenant", "landlord", "manager"
    message: Optional[str] = None
    expires_at: Optional[str] = None

class InvitationCreate(InvitationBase):
    created_by: str

class InvitationResponse(InvitationBase):
    id: str
    created_by: str
    created_at: str
    status: str  # "pending", "accepted", "rejected", "expired"

@router.post("/", response_model=InvitationResponse)
async def create_invitation(invitation: InvitationCreate):
    """Create a new invitation"""
    invitation_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    # If no expiration is provided, default to 7 days
    if not invitation.expires_at:
        expires_at = (datetime.now() + timedelta(days=7)).isoformat()
    else:
        expires_at = invitation.expires_at
    
    new_invitation = {
        "id": invitation_id,
        **invitation.dict(),
        "expires_at": expires_at,
        "created_at": timestamp,
        "status": "pending"
    }
    
    try:
        created_invitation = await create("invitations", new_invitation)
        return created_invitation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invitation: {str(e)}")

@router.get("/{invitation_id}", response_model=InvitationResponse)
async def get_invitation(invitation_id: str):
    """Get an invitation by ID"""
    invitation = await get_by_id("invitations", invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return invitation

@router.post("/{invitation_id}/accept")
async def accept_invitation(invitation_id: str):
    """Accept an invitation"""
    invitation = await get_by_id("invitations", invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation cannot be accepted (status: {invitation['status']})")
    
    # Check if invitation has expired
    expires_at = datetime.fromisoformat(invitation["expires_at"])
    if datetime.now() > expires_at:
        await update("invitations", invitation_id, {"status": "expired"})
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    try:
        updated_invitation = await update("invitations", invitation_id, {"status": "accepted"})
        return {"status": "success", "invitation": updated_invitation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to accept invitation: {str(e)}")

@router.post("/{invitation_id}/reject")
async def reject_invitation(invitation_id: str):
    """Reject an invitation"""
    invitation = await get_by_id("invitations", invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation cannot be rejected (status: {invitation['status']})")
    
    try:
        updated_invitation = await update("invitations", invitation_id, {"status": "rejected"})
        return {"status": "success", "invitation": updated_invitation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject invitation: {str(e)}")

@router.get("/", response_model=List[InvitationResponse])
async def list_invitations(
    property_id: Optional[str] = None,
    email: Optional[str] = None,
    status: Optional[str] = None
):
    """List invitations with optional filters"""
    # Use the query_table function from shared database module
    def build_query(query):
        if property_id:
            query = query.eq("property_id", property_id)
        if email:
            query = query.eq("email", email)
        if status:
            query = query.eq("status", status)
        return query
    
    try:
        invitations = await query_table("invitations", build_query)
        if invitations:
            return invitations
        
        # If no invitations found or for demo purposes, return sample data
        return [
            {
                "id": "sample-invitation-id",
                "property_id": property_id or "sample-property-id",
                "email": email or "tenant@example.com",
                "role": "tenant",
                "message": "Please join as a tenant for this property",
                "created_by": "landlord-id",
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
                "status": status or "pending"
            }
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list invitations: {str(e)}")

@router.post("/send")
async def send_invitation(data: InvitationRequest):
    try:
        # Generate a unique invitation token
        token = secrets.token_urlsafe(32)
        
        # Set expiration (7 days from now)
        expires_at = datetime.now() + timedelta(days=7)
        
        # Get property details using shared db function
        property_data = await get_by_id("properties", data.property_id)
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
            
        # Get owner details using shared db query
        def owner_query(query):
            return query.eq("id", data.owner_id)
        
        owner_data_list = await query_table("user_profiles", owner_query)
        if not owner_data_list:
            raise HTTPException(status_code=404, detail="Owner not found")
        
        owner_data = owner_data_list[0]
        
        # Create invitation record
        invitation_data = {
            "token": token,
            "tenant_email": data.tenant_email,
            "tenant_name": data.tenant_name,
            "tenant_phone": data.tenant_phone,
            "property_id": data.property_id,
            "owner_id": data.owner_id,
            "status": "pending",
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now().isoformat(),
            "rental_details": data.rental_details,
            "message": data.message
        }
        
        created_invitation = await create("tenant_invitations", invitation_data)
        if not created_invitation:
            raise HTTPException(status_code=500, detail="Failed to create invitation")
        
        # Generate invite URL
        base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        invite_url = f"{base_url}/invitation/accept/{token}"
        
        # Send email using Resend API
        resend_api_key = os.getenv("RESEND_API_KEY")
        if not resend_api_key:
            raise HTTPException(status_code=500, detail="RESEND_API_KEY environment variable is not set")
        
        email_params = EmailParams(
            to=data.tenant_email,
            ownerName=f"{owner_data['first_name']} {owner_data['last_name']}",
            propertyName=property_data['name'],
            inviteUrl=invite_url
        )
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Propify <onboarding@resend.dev>",
                    "to": [email_params.to],
                    "subject": f"{email_params.ownerName} invited you to join {email_params.propertyName} on Propify",
                    "html": f"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #000; margin-bottom: 24px;">Welcome to Propify</h1>
                            
                            <p style="color: #666; font-size: 16px; line-height: 24px;">
                                {email_params.ownerName} has invited you to join {email_params.propertyName} on Propify's property management platform.
                            </p>

                            <p style="color: #666; font-size: 16px; line-height: 24px;">
                                Click the button below to accept the invitation and set up your account:
                            </p>

                            <a href="{email_params.inviteUrl}" 
                               style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 6px; margin: 24px 0;">
                                Accept Invitation
                            </a>

                            <p style="color: #666; font-size: 14px; margin-top: 24px;">
                                This invitation will expire in 7 days. If you did not expect this invitation, 
                                please ignore this email.
                            </p>

                            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
                            
                            <p style="color: #999; font-size: 12px;">
                                Propify - Professional Property Management Platform
                            </p>
                        </div>
                    """
                }
            )
            
            if response.status_code != 200:
                # Log error but don't fail the request
                print(f"Failed to send email: {response.text}")
                # Update invitation status
                await update("tenant_invitations", created_invitation["id"], {"email_status": "failed"})
            else:
                # Update invitation with email_id
                email_id = response.json().get("id")
                await update("tenant_invitations", created_invitation["id"], {"email_id": email_id, "email_status": "sent"})
        
        return {
            "status": "success",
            "message": "Invitation sent successfully",
            "invitation_id": created_invitation["id"],
            "token": token,
            "expires_at": expires_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send invitation: {str(e)}")

@router.post("/verify")
async def verify_invitation(data: TokenVerificationRequest):
    try:
        # Define a query function to find an invitation by token
        def token_query(query):
            return query.eq("token", data.token).eq("status", "pending")
        
        # Find the invitation
        invitations = await query_table("tenant_invitations", token_query)
        
        if not invitations:
            return {"status": "error", "message": "Invalid or expired invitation"}
        
        invitation = invitations[0]
        
        # Check if invitation has expired
        if datetime.fromisoformat(invitation["expires_at"]) < datetime.now():
            # Update status to expired
            await update("tenant_invitations", invitation["id"], {"status": "expired"})
            return {"status": "error", "message": "This invitation has expired"}
            
        # Verification successful
        return {
            "status": "success",
            "message": "Invitation verified successfully",
            "invitation": invitation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify invitation: {str(e)}") 
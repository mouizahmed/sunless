package models

import "time"

type Workspace struct {
	ID          string     `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	Description *string    `json:"description" db:"description"`
	Slug        *string    `json:"slug" db:"slug"`
	OwnerUserID string     `json:"owner_user_id" db:"owner_user_id"`
	Settings    map[string]interface{} `json:"settings" db:"settings"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type WorkspaceMember struct {
	WorkspaceID string                 `json:"workspace_id" db:"workspace_id"`
	UserID      string                 `json:"user_id" db:"user_id"`
	Role        string                 `json:"role" db:"role"`
	Permissions map[string]interface{} `json:"permissions" db:"permissions"`
	JoinedAt    time.Time              `json:"joined_at" db:"joined_at"`
	LeftAt      *time.Time             `json:"left_at,omitempty" db:"left_at"`
	InvitedBy   *string                `json:"invited_by" db:"invited_by"`
}

type WorkspaceInvitation struct {
	ID          string     `json:"id" db:"id"`
	WorkspaceID string     `json:"workspace_id" db:"workspace_id"`
	Email       string     `json:"email" db:"email"`
	Role        string     `json:"role" db:"role"`
	Token       string     `json:"token" db:"token"`
	InvitedBy   string     `json:"invited_by" db:"invited_by"`
	ExpiresAt   time.Time  `json:"expires_at" db:"expires_at"`
	AcceptedAt  *time.Time `json:"accepted_at,omitempty" db:"accepted_at"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
}

// Request/Response types
type CreateWorkspaceRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
}

type UpdateWorkspaceRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Slug        *string `json:"slug"`
}

type WorkspaceResponse struct {
	*Workspace
	MemberCount int    `json:"member_count"`
	UserRole    string `json:"user_role"`
}

type UserWorkspacesResponse struct {
	Workspaces []WorkspaceResponse `json:"workspaces"`
}
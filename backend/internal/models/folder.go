package models

import "time"

type Folder struct {
	ID              string     `json:"id" db:"id"`
	Name            string     `json:"name" db:"name"`
	ParentID        *string    `json:"parent_id" db:"parent_id"`
	UserID          string     `json:"user_id" db:"user_id"`
	WorkspaceID     string     `json:"workspace_id" db:"workspace_id"`
	AccessMode      string     `json:"access_mode" db:"access_mode"`
	InheritSettings bool       `json:"inherit_settings" db:"inherit_settings"`
	Tags            []Tag      `json:"tags,omitempty"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type File struct {
	ID        string     `json:"id" db:"id"`
	Name      string     `json:"name" db:"name"`
	Type      string     `json:"type" db:"type"`
	Size      *int64     `json:"size,omitempty" db:"size"`
	Length    *string    `json:"length,omitempty" db:"length"`
	Language  *string    `json:"language,omitempty" db:"language"`
	Service   *string    `json:"service,omitempty" db:"service"`
	Tags      []Tag      `json:"tags,omitempty"`
	FolderID  *string    `json:"folder_id" db:"folder_id"`
	UserID    string     `json:"user_id" db:"user_id"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type Breadcrumb struct {
	ID   *string `json:"id"`
	Name string  `json:"name"`
	Href string  `json:"href"`
}

type FolderContents struct {
	Folders []Folder `json:"folders"`
	Files   []File   `json:"files"`
}

type FolderDataResponse struct {
	Folder      *Folder        `json:"folder"`
	Breadcrumbs []Breadcrumb   `json:"breadcrumbs"`
	Contents    FolderContents `json:"contents"`
	Stats       struct {
		TotalFiles   int `json:"total_files"`
		TotalFolders int `json:"total_folders"`
	} `json:"stats"`
}

type CreateFolderRequest struct {
	Name            string  `json:"name" binding:"required"`
	ParentID        *string `json:"parent_id"`
	WorkspaceID     string  `json:"workspace_id" binding:"required"`
	AccessMode      string  `json:"access_mode"`
	InheritSettings bool    `json:"inherit_settings"`
}

type UpdateFolderRequest struct {
	Name string `json:"name" binding:"required"`
}

type MoveFolderRequest struct {
	ParentID *string `json:"parent_id"`
}

type FolderAccess struct {
	ID         string    `json:"id" db:"id"`
	FolderID   string    `json:"folder_id" db:"folder_id"`
	UserID     string    `json:"user_id" db:"user_id"`
	AccessType string    `json:"access_type" db:"access_type"`
	GrantedBy  string    `json:"granted_by" db:"granted_by"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

type ShareFolderRequest struct {
	UserEmails  []string `json:"user_emails" binding:"required"`
	AccessType  string   `json:"access_type" binding:"required"`
}

type UpdateFolderSettingsRequest struct {
	AccessMode      *string `json:"access_mode"`
	InheritSettings *bool   `json:"inherit_settings"`
}

type FolderMemberResponse struct {
	UserID      string    `json:"user_id"`
	Email       string    `json:"email"`
	Name        string    `json:"name"`
	AccessType  string    `json:"access_type"`
	GrantedBy   string    `json:"granted_by"`
	GrantedAt   time.Time `json:"granted_at"`
}


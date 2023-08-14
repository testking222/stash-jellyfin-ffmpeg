package models

import (
	"time"
)

type SceneMarker struct {
	ID           int       `json:"id"`
	Title        string    `json:"title"`
	Seconds      float64   `json:"seconds"`
	PrimaryTagID int       `json:"primary_tag_id"`
	SceneID      int       `json:"scene_id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// SceneMarkerPartial represents part of a SceneMarker object.
// It is used to update the database entry.
type SceneMarkerPartial struct {
	Title        OptionalString
	Seconds      OptionalFloat64
	PrimaryTagID OptionalInt
	SceneID      OptionalInt
	CreatedAt    OptionalTime
	UpdatedAt    OptionalTime
}

func NewSceneMarkerPartial() SceneMarkerPartial {
	updatedTime := time.Now()
	return SceneMarkerPartial{
		UpdatedAt: NewOptionalTime(updatedTime),
	}
}

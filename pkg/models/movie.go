package models

import "context"

type MovieFilterType struct {
	Name     *StringCriterionInput `json:"name"`
	Director *StringCriterionInput `json:"director"`
	Synopsis *StringCriterionInput `json:"synopsis"`
	// Filter by duration (in seconds)
	Duration *IntCriterionInput `json:"duration"`
	// Filter by rating expressed as 1-5
	Rating *IntCriterionInput `json:"rating"`
	// Filter by rating expressed as 1-100
	Rating100 *IntCriterionInput `json:"rating100"`
	// Filter to only include movies with this studio
	Studios *HierarchicalMultiCriterionInput `json:"studios"`
	// Filter to only include movies missing this property
	IsMissing *string `json:"is_missing"`
	// Filter by url
	URL *StringCriterionInput `json:"url"`
	// Filter to only include movies where performer appears in a scene
	Performers *MultiCriterionInput `json:"performers"`
	// Filter by date
	Date *DateCriterionInput `json:"date"`
	// Filter by created at
	CreatedAt *TimestampCriterionInput `json:"created_at"`
	// Filter by updated at
	UpdatedAt *TimestampCriterionInput `json:"updated_at"`
}

type MovieReader interface {
	Find(ctx context.Context, id int) (*Movie, error)
	FindMany(ctx context.Context, ids []int) ([]*Movie, error)
	// FindBySceneID(sceneID int) ([]*Movie, error)
	FindByName(ctx context.Context, name string, nocase bool) (*Movie, error)
	FindByNames(ctx context.Context, names []string, nocase bool) ([]*Movie, error)
	All(ctx context.Context) ([]*Movie, error)
	Count(ctx context.Context) (int, error)
	Query(ctx context.Context, movieFilter *MovieFilterType, findFilter *FindFilterType) ([]*Movie, int, error)
	QueryCount(ctx context.Context, movieFilter *MovieFilterType, findFilter *FindFilterType) (int, error)
	GetFrontImage(ctx context.Context, movieID int) ([]byte, error)
	HasFrontImage(ctx context.Context, movieID int) (bool, error)
	GetBackImage(ctx context.Context, movieID int) ([]byte, error)
	HasBackImage(ctx context.Context, movieID int) (bool, error)
	FindByPerformerID(ctx context.Context, performerID int) ([]*Movie, error)
	CountByPerformerID(ctx context.Context, performerID int) (int, error)
	FindByStudioID(ctx context.Context, studioID int) ([]*Movie, error)
	CountByStudioID(ctx context.Context, studioID int) (int, error)
}

type MovieWriter interface {
	Create(ctx context.Context, newMovie *Movie) error
	UpdatePartial(ctx context.Context, id int, updatedMovie MoviePartial) (*Movie, error)
	Update(ctx context.Context, updatedMovie *Movie) error
	Destroy(ctx context.Context, id int) error
	UpdateFrontImage(ctx context.Context, movieID int, frontImage []byte) error
	UpdateBackImage(ctx context.Context, movieID int, backImage []byte) error
}

type MovieReaderWriter interface {
	MovieReader
	MovieWriter
}

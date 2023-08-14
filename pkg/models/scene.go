package models

import (
	"context"

	"github.com/stashapp/stash/pkg/file"
)

type PHashDuplicationCriterionInput struct {
	Duplicated *bool `json:"duplicated"`
	// Currently unimplemented
	Distance *int `json:"distance"`
}

type SceneFilterType struct {
	And      *SceneFilterType      `json:"AND"`
	Or       *SceneFilterType      `json:"OR"`
	Not      *SceneFilterType      `json:"NOT"`
	ID       *IntCriterionInput    `json:"id"`
	Title    *StringCriterionInput `json:"title"`
	Code     *StringCriterionInput `json:"code"`
	Details  *StringCriterionInput `json:"details"`
	Director *StringCriterionInput `json:"director"`
	// Filter by file oshash
	Oshash *StringCriterionInput `json:"oshash"`
	// Filter by file checksum
	Checksum *StringCriterionInput `json:"checksum"`
	// Filter by file phash
	Phash *StringCriterionInput `json:"phash"`
	// Filter by phash distance
	PhashDistance *PhashDistanceCriterionInput `json:"phash_distance"`
	// Filter by path
	Path *StringCriterionInput `json:"path"`
	// Filter by file count
	FileCount *IntCriterionInput `json:"file_count"`
	// Filter by rating expressed as 1-5
	Rating *IntCriterionInput `json:"rating"`
	// Filter by rating expressed as 1-100
	Rating100 *IntCriterionInput `json:"rating100"`
	// Filter by organized
	Organized *bool `json:"organized"`
	// Filter by o-counter
	OCounter *IntCriterionInput `json:"o_counter"`
	// Filter Scenes that have an exact phash match available
	Duplicated *PHashDuplicationCriterionInput `json:"duplicated"`
	// Filter by resolution
	Resolution *ResolutionCriterionInput `json:"resolution"`
	// Filter by video codec
	VideoCodec *StringCriterionInput `json:"video_codec"`
	// Filter by audio codec
	AudioCodec *StringCriterionInput `json:"audio_codec"`
	// Filter by duration (in seconds)
	Duration *IntCriterionInput `json:"duration"`
	// Filter to only include scenes which have markers. `true` or `false`
	HasMarkers *string `json:"has_markers"`
	// Filter to only include scenes missing this property
	IsMissing *string `json:"is_missing"`
	// Filter to only include scenes with this studio
	Studios *HierarchicalMultiCriterionInput `json:"studios"`
	// Filter to only include scenes with this movie
	Movies *MultiCriterionInput `json:"movies"`
	// Filter to only include scenes with these tags
	Tags *HierarchicalMultiCriterionInput `json:"tags"`
	// Filter by tag count
	TagCount *IntCriterionInput `json:"tag_count"`
	// Filter to only include scenes with performers with these tags
	PerformerTags *HierarchicalMultiCriterionInput `json:"performer_tags"`
	// Filter scenes that have performers that have been favorited
	PerformerFavorite *bool `json:"performer_favorite"`
	// Filter scenes by performer age at time of scene
	PerformerAge *IntCriterionInput `json:"performer_age"`
	// Filter to only include scenes with these performers
	Performers *MultiCriterionInput `json:"performers"`
	// Filter by performer count
	PerformerCount *IntCriterionInput `json:"performer_count"`
	// Filter by StashID
	StashID *StringCriterionInput `json:"stash_id"`
	// Filter by StashID Endpoint
	StashIDEndpoint *StashIDCriterionInput `json:"stash_id_endpoint"`
	// Filter by url
	URL *StringCriterionInput `json:"url"`
	// Filter by interactive
	Interactive *bool `json:"interactive"`
	// Filter by InteractiveSpeed
	InteractiveSpeed *IntCriterionInput `json:"interactive_speed"`
	// Filter by captions
	Captions *StringCriterionInput `json:"captions"`
	// Filter by resume time
	ResumeTime *IntCriterionInput `json:"resume_time"`
	// Filter by play count
	PlayCount *IntCriterionInput `json:"play_count"`
	// Filter by play duration (in seconds)
	PlayDuration *IntCriterionInput `json:"play_duration"`
	// Filter by date
	Date *DateCriterionInput `json:"date"`
	// Filter by created at
	CreatedAt *TimestampCriterionInput `json:"created_at"`
	// Filter by updated at
	UpdatedAt *TimestampCriterionInput `json:"updated_at"`
}

type SceneQueryOptions struct {
	QueryOptions
	SceneFilter *SceneFilterType

	TotalDuration bool
	TotalSize     bool
}

type SceneQueryResult struct {
	QueryResult
	TotalDuration float64
	TotalSize     float64

	finder     SceneFinder
	scenes     []*Scene
	resolveErr error
}

type SceneDestroyInput struct {
	ID              string `json:"id"`
	DeleteFile      *bool  `json:"delete_file"`
	DeleteGenerated *bool  `json:"delete_generated"`
}

type ScenesDestroyInput struct {
	Ids             []string `json:"ids"`
	DeleteFile      *bool    `json:"delete_file"`
	DeleteGenerated *bool    `json:"delete_generated"`
}

func NewSceneQueryResult(finder SceneFinder) *SceneQueryResult {
	return &SceneQueryResult{
		finder: finder,
	}
}

func (r *SceneQueryResult) Resolve(ctx context.Context) ([]*Scene, error) {
	// cache results
	if r.scenes == nil && r.resolveErr == nil {
		r.scenes, r.resolveErr = r.finder.FindMany(ctx, r.IDs)
	}
	return r.scenes, r.resolveErr
}

type SceneFinder interface {
	// TODO - rename this to Find and remove existing method
	FindMany(ctx context.Context, ids []int) ([]*Scene, error)
}

type SceneReader interface {
	SceneFinder
	// TODO - remove this in another PR
	Find(ctx context.Context, id int) (*Scene, error)
	FindByChecksum(ctx context.Context, checksum string) ([]*Scene, error)
	FindByOSHash(ctx context.Context, oshash string) ([]*Scene, error)
	FindByPath(ctx context.Context, path string) ([]*Scene, error)
	FindByPerformerID(ctx context.Context, performerID int) ([]*Scene, error)
	FindByGalleryID(ctx context.Context, performerID int) ([]*Scene, error)
	FindDuplicates(ctx context.Context, distance int, durationDiff float64) ([][]*Scene, error)

	URLLoader
	GalleryIDLoader
	PerformerIDLoader
	TagIDLoader
	SceneMovieLoader
	StashIDLoader
	VideoFileLoader

	CountByPerformerID(ctx context.Context, performerID int) (int, error)
	OCountByPerformerID(ctx context.Context, performerID int) (int, error)
	OCount(ctx context.Context) (int, error)
	// FindByStudioID(studioID int) ([]*Scene, error)
	FindByMovieID(ctx context.Context, movieID int) ([]*Scene, error)
	CountByMovieID(ctx context.Context, movieID int) (int, error)
	Count(ctx context.Context) (int, error)
	PlayCount(ctx context.Context) (int, error)
	UniqueScenePlayCount(ctx context.Context) (int, error)
	Size(ctx context.Context) (float64, error)
	Duration(ctx context.Context) (float64, error)
	PlayDuration(ctx context.Context) (float64, error)
	// SizeCount() (string, error)
	CountByStudioID(ctx context.Context, studioID int) (int, error)
	CountByTagID(ctx context.Context, tagID int) (int, error)
	CountMissingChecksum(ctx context.Context) (int, error)
	CountMissingOSHash(ctx context.Context) (int, error)
	Wall(ctx context.Context, q *string) ([]*Scene, error)
	All(ctx context.Context) ([]*Scene, error)
	Query(ctx context.Context, options SceneQueryOptions) (*SceneQueryResult, error)
	QueryCount(ctx context.Context, sceneFilter *SceneFilterType, findFilter *FindFilterType) (int, error)
	GetCover(ctx context.Context, sceneID int) ([]byte, error)
	HasCover(ctx context.Context, sceneID int) (bool, error)
}

type SceneWriter interface {
	Create(ctx context.Context, newScene *Scene, fileIDs []file.ID) error
	Update(ctx context.Context, updatedScene *Scene) error
	UpdatePartial(ctx context.Context, id int, updatedScene ScenePartial) (*Scene, error)
	IncrementOCounter(ctx context.Context, id int) (int, error)
	DecrementOCounter(ctx context.Context, id int) (int, error)
	ResetOCounter(ctx context.Context, id int) (int, error)
	SaveActivity(ctx context.Context, id int, resumeTime *float64, playDuration *float64) (bool, error)
	IncrementWatchCount(ctx context.Context, id int) (int, error)
	Destroy(ctx context.Context, id int) error
	UpdateCover(ctx context.Context, sceneID int, cover []byte) error
}

type SceneReaderWriter interface {
	SceneReader
	SceneWriter
}

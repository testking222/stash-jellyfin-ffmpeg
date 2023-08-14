package api

import (
	"context"

	"github.com/stashapp/stash/internal/api/loaders"
	"github.com/stashapp/stash/internal/api/urlbuilders"
	"github.com/stashapp/stash/pkg/gallery"
	"github.com/stashapp/stash/pkg/hash/md5"
	"github.com/stashapp/stash/pkg/image"
	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/movie"
	"github.com/stashapp/stash/pkg/performer"
	"github.com/stashapp/stash/pkg/scene"
)

func (r *studioResolver) Checksum(ctx context.Context, obj *models.Studio) (string, error) {
	// generate checksum from studio name
	return md5.FromString(obj.Name), nil
}

func (r *studioResolver) ImagePath(ctx context.Context, obj *models.Studio) (*string, error) {
	var hasImage bool
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		var err error
		hasImage, err = r.repository.Studio.HasImage(ctx, obj.ID)
		return err
	}); err != nil {
		return nil, err
	}

	baseURL, _ := ctx.Value(BaseURLCtxKey).(string)
	imagePath := urlbuilders.NewStudioURLBuilder(baseURL, obj).GetStudioImageURL(hasImage)
	return &imagePath, nil
}

func (r *studioResolver) Aliases(ctx context.Context, obj *models.Studio) ([]string, error) {
	if !obj.Aliases.Loaded() {
		if err := r.withReadTxn(ctx, func(ctx context.Context) error {
			return obj.LoadAliases(ctx, r.repository.Studio)
		}); err != nil {
			return nil, err
		}
	}

	return obj.Aliases.List(), nil
}

func (r *studioResolver) SceneCount(ctx context.Context, obj *models.Studio, depth *int) (ret int, err error) {
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		ret, err = scene.CountByStudioID(ctx, r.repository.Scene, obj.ID, depth)
		return err
	}); err != nil {
		return 0, err
	}

	return ret, nil
}

func (r *studioResolver) ImageCount(ctx context.Context, obj *models.Studio, depth *int) (ret int, err error) {
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		ret, err = image.CountByStudioID(ctx, r.repository.Image, obj.ID, depth)
		return err
	}); err != nil {
		return 0, err
	}

	return ret, nil
}

func (r *studioResolver) GalleryCount(ctx context.Context, obj *models.Studio, depth *int) (ret int, err error) {
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		ret, err = gallery.CountByStudioID(ctx, r.repository.Gallery, obj.ID, depth)
		return err
	}); err != nil {
		return 0, err
	}

	return ret, nil
}

func (r *studioResolver) PerformerCount(ctx context.Context, obj *models.Studio, depth *int) (ret int, err error) {
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		ret, err = performer.CountByStudioID(ctx, r.repository.Performer, obj.ID, depth)
		return err
	}); err != nil {
		return 0, err
	}

	return ret, nil
}

func (r *studioResolver) MovieCount(ctx context.Context, obj *models.Studio, depth *int) (ret int, err error) {
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		ret, err = movie.CountByStudioID(ctx, r.repository.Movie, obj.ID, depth)
		return err
	}); err != nil {
		return 0, err
	}

	return ret, nil
}

func (r *studioResolver) ParentStudio(ctx context.Context, obj *models.Studio) (ret *models.Studio, err error) {
	if obj.ParentID == nil {
		return nil, nil
	}

	return loaders.From(ctx).StudioByID.Load(*obj.ParentID)
}

func (r *studioResolver) ChildStudios(ctx context.Context, obj *models.Studio) (ret []*models.Studio, err error) {
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		ret, err = r.repository.Studio.FindChildren(ctx, obj.ID)
		return err
	}); err != nil {
		return nil, err
	}

	return ret, nil
}

func (r *studioResolver) StashIds(ctx context.Context, obj *models.Studio) ([]*models.StashID, error) {
	if !obj.StashIDs.Loaded() {
		if err := r.withReadTxn(ctx, func(ctx context.Context) error {
			return obj.LoadStashIDs(ctx, r.repository.Studio)
		}); err != nil {
			return nil, err
		}
	}

	return stashIDsSliceToPtrSlice(obj.StashIDs.List()), nil
}

func (r *studioResolver) Rating(ctx context.Context, obj *models.Studio) (*int, error) {
	if obj.Rating != nil {
		rating := models.Rating100To5(*obj.Rating)
		return &rating, nil
	}
	return nil, nil
}

func (r *studioResolver) Rating100(ctx context.Context, obj *models.Studio) (*int, error) {
	return obj.Rating, nil
}

func (r *studioResolver) Movies(ctx context.Context, obj *models.Studio) (ret []*models.Movie, err error) {
	if err := r.withReadTxn(ctx, func(ctx context.Context) error {
		ret, err = r.repository.Movie.FindByStudioID(ctx, obj.ID)
		return err
	}); err != nil {
		return nil, err
	}

	return ret, nil
}

package api

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/99designs/gqlgen/graphql"

	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/sliceutil/stringslice"
)

const updateInputField = "input"

func getArgumentMap(ctx context.Context) map[string]interface{} {
	rctx := graphql.GetFieldContext(ctx)
	reqCtx := graphql.GetOperationContext(ctx)
	return rctx.Field.ArgumentMap(reqCtx.Variables)
}

func getUpdateInputMap(ctx context.Context) map[string]interface{} {
	return getNamedUpdateInputMap(ctx, updateInputField)
}

func getNamedUpdateInputMap(ctx context.Context, field string) map[string]interface{} {
	args := getArgumentMap(ctx)

	// field can be qualified
	fields := strings.Split(field, ".")

	currArgs := args

	for _, f := range fields {
		v, found := currArgs[f]
		if !found {
			currArgs = nil
			break
		}

		currArgs, _ = v.(map[string]interface{})
		if currArgs == nil {
			break
		}
	}

	if currArgs != nil {
		return currArgs
	}

	return make(map[string]interface{})
}

func getUpdateInputMaps(ctx context.Context) []map[string]interface{} {
	args := getArgumentMap(ctx)

	input := args[updateInputField]
	var ret []map[string]interface{}
	if input != nil {
		// convert []interface{} into []map[string]interface{}
		iSlice, _ := input.([]interface{})
		for _, i := range iSlice {
			m, _ := i.(map[string]interface{})
			if m != nil {
				ret = append(ret, m)
			}
		}
	}

	return ret
}

type changesetTranslator struct {
	inputMap map[string]interface{}
}

func (t changesetTranslator) hasField(field string) bool {
	if t.inputMap == nil {
		return false
	}

	_, found := t.inputMap[field]
	return found
}

func (t changesetTranslator) getFields() []string {
	var ret []string
	for k := range t.inputMap {
		ret = append(ret, k)
	}

	return ret
}

func (t changesetTranslator) string(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}

func (t changesetTranslator) optionalString(value *string, field string) models.OptionalString {
	if !t.hasField(field) {
		return models.OptionalString{}
	}

	return models.NewOptionalStringPtr(value)
}

func (t changesetTranslator) optionalDate(value *string, field string) (models.OptionalDate, error) {
	if !t.hasField(field) {
		return models.OptionalDate{}, nil
	}

	if value == nil || *value == "" {
		return models.OptionalDate{
			Set:  true,
			Null: true,
		}, nil
	}

	date, err := models.ParseDate(*value)
	if err != nil {
		return models.OptionalDate{}, err
	}

	return models.NewOptionalDate(date), nil
}

func (t changesetTranslator) datePtr(value *string) (*models.Date, error) {
	if value == nil || *value == "" {
		return nil, nil
	}

	date, err := models.ParseDate(*value)
	if err != nil {
		return nil, err
	}
	return &date, nil
}

func (t changesetTranslator) intPtrFromString(value *string) (*int, error) {
	if value == nil || *value == "" {
		return nil, nil
	}

	vv, err := strconv.Atoi(*value)
	if err != nil {
		return nil, fmt.Errorf("converting %v to int: %w", *value, err)
	}
	return &vv, nil
}

func (t changesetTranslator) ratingConversion(legacyValue *int, rating100Value *int) *int {
	const (
		legacyField    = "rating"
		rating100Field = "rating100"
	)

	legacyRating := t.optionalInt(legacyValue, legacyField)
	if legacyRating.Set && !legacyRating.Null {
		ret := models.Rating5To100(legacyRating.Value)
		return &ret
	}

	o := t.optionalInt(rating100Value, rating100Field)
	if o.Set && !o.Null {
		return &o.Value
	}

	return nil
}

func (t changesetTranslator) optionalRatingConversion(legacyValue *int, rating100Value *int) models.OptionalInt {
	const (
		legacyField    = "rating"
		rating100Field = "rating100"
	)

	legacyRating := t.optionalInt(legacyValue, legacyField)
	if legacyRating.Set && !legacyRating.Null {
		legacyRating.Value = models.Rating5To100(legacyRating.Value)
		return legacyRating
	}
	return t.optionalInt(rating100Value, rating100Field)
}

func (t changesetTranslator) optionalInt(value *int, field string) models.OptionalInt {
	if !t.hasField(field) {
		return models.OptionalInt{}
	}

	return models.NewOptionalIntPtr(value)
}

func (t changesetTranslator) optionalIntFromString(value *string, field string) (models.OptionalInt, error) {
	if !t.hasField(field) {
		return models.OptionalInt{}, nil
	}

	if value == nil {
		return models.OptionalInt{
			Set:  true,
			Null: true,
		}, nil
	}

	vv, err := strconv.Atoi(*value)
	if err != nil {
		return models.OptionalInt{}, fmt.Errorf("converting %v to int: %w", *value, err)
	}
	return models.NewOptionalInt(vv), nil
}

func (t changesetTranslator) bool(value *bool) bool {
	if value == nil {
		return false
	}

	return *value
}

func (t changesetTranslator) optionalBool(value *bool, field string) models.OptionalBool {
	if !t.hasField(field) {
		return models.OptionalBool{}
	}

	return models.NewOptionalBoolPtr(value)
}

func (t changesetTranslator) optionalFloat64(value *float64, field string) models.OptionalFloat64 {
	if !t.hasField(field) {
		return models.OptionalFloat64{}
	}

	return models.NewOptionalFloat64Ptr(value)
}

func (t changesetTranslator) fileIDPtrFromString(value *string) (*models.FileID, error) {
	if value == nil || *value == "" {
		return nil, nil
	}

	vv, err := strconv.Atoi(*value)
	if err != nil {
		return nil, fmt.Errorf("converting %v to int: %w", *value, err)
	}

	id := models.FileID(vv)
	return &id, nil
}

func (t changesetTranslator) fileIDSliceFromStringSlice(value []string) ([]models.FileID, error) {
	ints, err := stringslice.StringSliceToIntSlice(value)
	if err != nil {
		return nil, err
	}

	fileIDs := make([]models.FileID, len(ints))
	for i, v := range ints {
		fileIDs[i] = models.FileID(v)
	}

	return fileIDs, nil
}

func (t changesetTranslator) relatedIds(value []string) (models.RelatedIDs, error) {
	ids, err := stringslice.StringSliceToIntSlice(value)
	if err != nil {
		return models.RelatedIDs{}, err
	}

	return models.NewRelatedIDs(ids), nil
}

func (t changesetTranslator) updateIds(value []string, field string) (*models.UpdateIDs, error) {
	if !t.hasField(field) {
		return nil, nil
	}

	ids, err := stringslice.StringSliceToIntSlice(value)
	if err != nil {
		return nil, err
	}

	return &models.UpdateIDs{
		IDs:  ids,
		Mode: models.RelationshipUpdateModeSet,
	}, nil
}

func (t changesetTranslator) updateIdsBulk(value *BulkUpdateIds, field string) (*models.UpdateIDs, error) {
	if !t.hasField(field) || value == nil {
		return nil, nil
	}

	ids, err := stringslice.StringSliceToIntSlice(value.Ids)
	if err != nil {
		return nil, fmt.Errorf("converting ids [%v]: %w", value.Ids, err)
	}

	return &models.UpdateIDs{
		IDs:  ids,
		Mode: value.Mode,
	}, nil
}

func (t changesetTranslator) optionalURLs(value []string, legacyValue *string) *models.UpdateStrings {
	const (
		legacyField = "url"
		field       = "urls"
	)

	// prefer urls over url
	if t.hasField(field) {
		return t.updateStrings(value, field)
	} else if t.hasField(legacyField) {
		var valueSlice []string
		if legacyValue != nil {
			valueSlice = []string{*legacyValue}
		}
		return t.updateStrings(valueSlice, legacyField)
	}

	return nil
}

func (t changesetTranslator) optionalURLsBulk(value *BulkUpdateStrings, legacyValue *string) *models.UpdateStrings {
	const (
		legacyField = "url"
		field       = "urls"
	)

	// prefer urls over url
	if t.hasField("urls") {
		return t.updateStringsBulk(value, field)
	} else if t.hasField(legacyField) {
		var valueSlice []string
		if legacyValue != nil {
			valueSlice = []string{*legacyValue}
		}
		return t.updateStrings(valueSlice, legacyField)
	}

	return nil
}

func (t changesetTranslator) updateStrings(value []string, field string) *models.UpdateStrings {
	if !t.hasField(field) {
		return nil
	}

	return &models.UpdateStrings{
		Values: value,
		Mode:   models.RelationshipUpdateModeSet,
	}
}

func (t changesetTranslator) updateStringsBulk(value *BulkUpdateStrings, field string) *models.UpdateStrings {
	if !t.hasField(field) || value == nil {
		return nil
	}

	return &models.UpdateStrings{
		Values: value.Values,
		Mode:   value.Mode,
	}
}

func (t changesetTranslator) updateStashIDs(value []models.StashID, field string) *models.UpdateStashIDs {
	if !t.hasField(field) {
		return nil
	}

	return &models.UpdateStashIDs{
		StashIDs: value,
		Mode:     models.RelationshipUpdateModeSet,
	}
}

func (t changesetTranslator) relatedMovies(value []models.SceneMovieInput) (models.RelatedMovies, error) {
	moviesScenes, err := models.MoviesScenesFromInput(value)
	if err != nil {
		return models.RelatedMovies{}, err
	}

	return models.NewRelatedMovies(moviesScenes), nil
}

func (t changesetTranslator) updateMovieIDs(value []models.SceneMovieInput, field string) (*models.UpdateMovieIDs, error) {
	if !t.hasField(field) {
		return nil, nil
	}

	moviesScenes, err := models.MoviesScenesFromInput(value)
	if err != nil {
		return nil, err
	}

	return &models.UpdateMovieIDs{
		Movies: moviesScenes,
		Mode:   models.RelationshipUpdateModeSet,
	}, nil
}

func (t changesetTranslator) updateMovieIDsBulk(value *BulkUpdateIds, field string) (*models.UpdateMovieIDs, error) {
	if !t.hasField(field) || value == nil {
		return nil, nil
	}

	ids, err := stringslice.StringSliceToIntSlice(value.Ids)
	if err != nil {
		return nil, fmt.Errorf("converting ids [%v]: %w", value.Ids, err)
	}

	movies := make([]models.MoviesScenes, len(ids))
	for i, id := range ids {
		movies[i] = models.MoviesScenes{MovieID: id}
	}

	return &models.UpdateMovieIDs{
		Movies: movies,
		Mode:   value.Mode,
	}, nil
}

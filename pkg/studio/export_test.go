package studio

import (
	"context"
	"errors"

	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/models/json"
	"github.com/stashapp/stash/pkg/models/jsonschema"
	"github.com/stashapp/stash/pkg/models/mocks"
	"github.com/stretchr/testify/assert"

	"testing"
	"time"
)

const (
	noImageID             = 2
	errImageID            = 3
	missingParentStudioID = 4
	errStudioID           = 5

	parentStudioID    = 10
	missingStudioID   = 11
	errParentStudioID = 12
)

var (
	studioName       = "testStudio"
	url              = "url"
	details          = "details"
	parentStudioName = "parentStudio"
	autoTagIgnored   = true
)

var studioID = 1
var rating = 5
var parentStudio models.Studio = models.Studio{
	Name: parentStudioName,
}

var imageBytes = []byte("imageBytes")

var aliases = []string{"alias"}
var stashID = models.StashID{
	StashID:  "StashID",
	Endpoint: "Endpoint",
}
var stashIDs = []models.StashID{
	stashID,
}

const image = "aW1hZ2VCeXRlcw=="

var (
	createTime = time.Date(2001, 01, 01, 0, 0, 0, 0, time.Local)
	updateTime = time.Date(2002, 01, 01, 0, 0, 0, 0, time.Local)
)

func createFullStudio(id int, parentID int) models.Studio {
	ret := models.Studio{
		ID:            id,
		Name:          studioName,
		URL:           url,
		Details:       details,
		CreatedAt:     createTime,
		UpdatedAt:     updateTime,
		Rating:        &rating,
		IgnoreAutoTag: autoTagIgnored,
		Aliases:       models.NewRelatedStrings(aliases),
		StashIDs:      models.NewRelatedStashIDs(stashIDs),
	}

	if parentID != 0 {
		ret.ParentID = &parentID
	}

	return ret
}

func createEmptyStudio(id int) models.Studio {
	return models.Studio{
		ID:        id,
		CreatedAt: createTime,
		UpdatedAt: updateTime,
		Aliases:   models.NewRelatedStrings([]string{}),
		StashIDs:  models.NewRelatedStashIDs([]models.StashID{}),
	}
}

func createFullJSONStudio(parentStudio, image string, aliases []string) *jsonschema.Studio {
	return &jsonschema.Studio{
		Name:    studioName,
		URL:     url,
		Details: details,
		CreatedAt: json.JSONTime{
			Time: createTime,
		},
		UpdatedAt: json.JSONTime{
			Time: updateTime,
		},
		ParentStudio:  parentStudio,
		Image:         image,
		Rating:        rating,
		Aliases:       aliases,
		StashIDs:      stashIDs,
		IgnoreAutoTag: autoTagIgnored,
	}
}

func createEmptyJSONStudio() *jsonschema.Studio {
	return &jsonschema.Studio{
		CreatedAt: json.JSONTime{
			Time: createTime,
		},
		UpdatedAt: json.JSONTime{
			Time: updateTime,
		},
		Aliases:  []string{},
		StashIDs: []models.StashID{},
	}
}

type testScenario struct {
	input    models.Studio
	expected *jsonschema.Studio
	err      bool
}

var scenarios []testScenario

func initTestTable() {
	scenarios = []testScenario{
		{
			createFullStudio(studioID, parentStudioID),
			createFullJSONStudio(parentStudioName, image, []string{"alias"}),
			false,
		},
		{
			createEmptyStudio(noImageID),
			createEmptyJSONStudio(),
			false,
		},
		{
			createFullStudio(errImageID, parentStudioID),
			createFullJSONStudio(parentStudioName, "", []string{"alias"}),
			// failure to get image is not an error
			false,
		},
		{
			createFullStudio(missingParentStudioID, missingStudioID),
			createFullJSONStudio("", image, []string{"alias"}),
			false,
		},
		{
			createFullStudio(errStudioID, errParentStudioID),
			nil,
			true,
		},
	}
}

func TestToJSON(t *testing.T) {
	initTestTable()
	ctx := context.Background()

	mockStudioReader := &mocks.StudioReaderWriter{}

	imageErr := errors.New("error getting image")

	mockStudioReader.On("GetImage", ctx, studioID).Return(imageBytes, nil).Once()
	mockStudioReader.On("GetImage", ctx, noImageID).Return(nil, nil).Once()
	mockStudioReader.On("GetImage", ctx, errImageID).Return(nil, imageErr).Once()
	mockStudioReader.On("GetImage", ctx, missingParentStudioID).Return(imageBytes, nil).Maybe()
	mockStudioReader.On("GetImage", ctx, errStudioID).Return(imageBytes, nil).Maybe()

	parentStudioErr := errors.New("error getting parent studio")

	mockStudioReader.On("Find", ctx, parentStudioID).Return(&parentStudio, nil)
	mockStudioReader.On("Find", ctx, missingStudioID).Return(nil, nil)
	mockStudioReader.On("Find", ctx, errParentStudioID).Return(nil, parentStudioErr)

	for i, s := range scenarios {
		studio := s.input
		json, err := ToJSON(ctx, mockStudioReader, &studio)

		switch {
		case !s.err && err != nil:
			t.Errorf("[%d] unexpected error: %s", i, err.Error())
		case s.err && err == nil:
			t.Errorf("[%d] expected error not returned", i)
		default:
			assert.Equal(t, s.expected, json, "[%d]", i)
		}
	}

	mockStudioReader.AssertExpectations(t)
}

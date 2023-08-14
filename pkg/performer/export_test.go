package performer

import (
	"errors"
	"strconv"

	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/models/json"
	"github.com/stashapp/stash/pkg/models/jsonschema"
	"github.com/stashapp/stash/pkg/models/mocks"
	"github.com/stretchr/testify/assert"

	"testing"
	"time"
)

const (
	performerID = 1
	noImageID   = 2
	errImageID  = 3
)

const (
	performerName  = "testPerformer"
	disambiguation = "disambiguation"
	url            = "url"
	careerLength   = "careerLength"
	country        = "country"
	ethnicity      = "ethnicity"
	eyeColor       = "eyeColor"
	fakeTits       = "fakeTits"
	instagram      = "instagram"
	measurements   = "measurements"
	piercings      = "piercings"
	tattoos        = "tattoos"
	twitter        = "twitter"
	details        = "details"
	hairColor      = "hairColor"

	autoTagIgnored = true
)

var (
	genderEnum      = models.GenderEnumFemale
	gender          = genderEnum.String()
	aliases         = []string{"alias1", "alias2"}
	rating          = 5
	height          = 123
	weight          = 60
	penisLength     = 1.23
	circumcisedEnum = models.CircumisedEnumCut
	circumcised     = circumcisedEnum.String()
)

var imageBytes = []byte("imageBytes")

var stashID = models.StashID{
	StashID:  "StashID",
	Endpoint: "Endpoint",
}
var stashIDs = []models.StashID{
	stashID,
}

const image = "aW1hZ2VCeXRlcw=="

var birthDate, _ = models.ParseDate("2001-01-01")
var deathDate, _ = models.ParseDate("2021-02-02")

var (
	createTime = time.Date(2001, 01, 01, 0, 0, 0, 0, time.Local)
	updateTime = time.Date(2002, 01, 01, 0, 0, 0, 0, time.Local)
)

func createFullPerformer(id int, name string) *models.Performer {
	return &models.Performer{
		ID:             id,
		Name:           name,
		Disambiguation: disambiguation,
		URL:            url,
		Aliases:        models.NewRelatedStrings(aliases),
		Birthdate:      &birthDate,
		CareerLength:   careerLength,
		Country:        country,
		Ethnicity:      ethnicity,
		EyeColor:       eyeColor,
		FakeTits:       fakeTits,
		PenisLength:    &penisLength,
		Circumcised:    &circumcisedEnum,
		Favorite:       true,
		Gender:         &genderEnum,
		Height:         &height,
		Instagram:      instagram,
		Measurements:   measurements,
		Piercings:      piercings,
		Tattoos:        tattoos,
		Twitter:        twitter,
		CreatedAt:      createTime,
		UpdatedAt:      updateTime,
		Rating:         &rating,
		Details:        details,
		DeathDate:      &deathDate,
		HairColor:      hairColor,
		Weight:         &weight,
		IgnoreAutoTag:  autoTagIgnored,
		TagIDs:         models.NewRelatedIDs([]int{}),
		StashIDs:       models.NewRelatedStashIDs(stashIDs),
	}
}

func createEmptyPerformer(id int) models.Performer {
	return models.Performer{
		ID:        id,
		CreatedAt: createTime,
		UpdatedAt: updateTime,
		Aliases:   models.NewRelatedStrings([]string{}),
		TagIDs:    models.NewRelatedIDs([]int{}),
		StashIDs:  models.NewRelatedStashIDs([]models.StashID{}),
	}
}

func createFullJSONPerformer(name string, image string) *jsonschema.Performer {
	return &jsonschema.Performer{
		Name:           name,
		Disambiguation: disambiguation,
		URL:            url,
		Aliases:        aliases,
		Birthdate:      birthDate.String(),
		CareerLength:   careerLength,
		Country:        country,
		Ethnicity:      ethnicity,
		EyeColor:       eyeColor,
		FakeTits:       fakeTits,
		PenisLength:    penisLength,
		Circumcised:    circumcised,
		Favorite:       true,
		Gender:         gender,
		Height:         strconv.Itoa(height),
		Instagram:      instagram,
		Measurements:   measurements,
		Piercings:      piercings,
		Tattoos:        tattoos,
		Twitter:        twitter,
		CreatedAt: json.JSONTime{
			Time: createTime,
		},
		UpdatedAt: json.JSONTime{
			Time: updateTime,
		},
		Rating:        rating,
		Image:         image,
		Details:       details,
		DeathDate:     deathDate.String(),
		HairColor:     hairColor,
		Weight:        weight,
		StashIDs:      stashIDs,
		IgnoreAutoTag: autoTagIgnored,
	}
}

func createEmptyJSONPerformer() *jsonschema.Performer {
	return &jsonschema.Performer{
		Aliases:  []string{},
		StashIDs: []models.StashID{},
		CreatedAt: json.JSONTime{
			Time: createTime,
		},
		UpdatedAt: json.JSONTime{
			Time: updateTime,
		},
	}
}

type testScenario struct {
	input    models.Performer
	expected *jsonschema.Performer
	err      bool
}

var scenarios []testScenario

func initTestTable() {
	scenarios = []testScenario{
		{
			*createFullPerformer(performerID, performerName),
			createFullJSONPerformer(performerName, image),
			false,
		},
		{
			createEmptyPerformer(noImageID),
			createEmptyJSONPerformer(),
			false,
		},
		{
			*createFullPerformer(errImageID, performerName),
			createFullJSONPerformer(performerName, ""),
			// failure to get image should not cause an error
			false,
		},
	}
}

func TestToJSON(t *testing.T) {
	initTestTable()

	mockPerformerReader := &mocks.PerformerReaderWriter{}

	imageErr := errors.New("error getting image")

	mockPerformerReader.On("GetImage", testCtx, performerID).Return(imageBytes, nil).Once()
	mockPerformerReader.On("GetImage", testCtx, noImageID).Return(nil, nil).Once()
	mockPerformerReader.On("GetImage", testCtx, errImageID).Return(nil, imageErr).Once()

	for i, s := range scenarios {
		tag := s.input
		json, err := ToJSON(testCtx, mockPerformerReader, &tag)

		switch {
		case !s.err && err != nil:
			t.Errorf("[%d] unexpected error: %s", i, err.Error())
		case s.err && err == nil:
			t.Errorf("[%d] expected error not returned", i)
		default:
			assert.Equal(t, s.expected, json, "[%d]", i)
		}
	}

	mockPerformerReader.AssertExpectations(t)
}

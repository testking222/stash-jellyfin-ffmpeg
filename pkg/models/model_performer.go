package models

import (
	"context"
	"time"
)

type Performer struct {
	ID             int             `json:"id"`
	Name           string          `json:"name"`
	Disambiguation string          `json:"disambiguation"`
	Gender         *GenderEnum     `json:"gender"`
	URL            string          `json:"url"`
	Twitter        string          `json:"twitter"`
	Instagram      string          `json:"instagram"`
	Birthdate      *Date           `json:"birthdate"`
	Ethnicity      string          `json:"ethnicity"`
	Country        string          `json:"country"`
	EyeColor       string          `json:"eye_color"`
	Height         *int            `json:"height"`
	Measurements   string          `json:"measurements"`
	FakeTits       string          `json:"fake_tits"`
	PenisLength    *float64        `json:"penis_length"`
	Circumcised    *CircumisedEnum `json:"circumcised"`
	CareerLength   string          `json:"career_length"`
	Tattoos        string          `json:"tattoos"`
	Piercings      string          `json:"piercings"`
	Favorite       bool            `json:"favorite"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	// Rating expressed in 1-100 scale
	Rating        *int   `json:"rating"`
	Details       string `json:"details"`
	DeathDate     *Date  `json:"death_date"`
	HairColor     string `json:"hair_color"`
	Weight        *int   `json:"weight"`
	IgnoreAutoTag bool   `json:"ignore_auto_tag"`

	Aliases  RelatedStrings  `json:"aliases"`
	TagIDs   RelatedIDs      `json:"tag_ids"`
	StashIDs RelatedStashIDs `json:"stash_ids"`
}

func (s *Performer) LoadAliases(ctx context.Context, l AliasLoader) error {
	return s.Aliases.load(func() ([]string, error) {
		return l.GetAliases(ctx, s.ID)
	})
}

func (s *Performer) LoadTagIDs(ctx context.Context, l TagIDLoader) error {
	return s.TagIDs.load(func() ([]int, error) {
		return l.GetTagIDs(ctx, s.ID)
	})
}

func (s *Performer) LoadStashIDs(ctx context.Context, l StashIDLoader) error {
	return s.StashIDs.load(func() ([]StashID, error) {
		return l.GetStashIDs(ctx, s.ID)
	})
}

func (s *Performer) LoadRelationships(ctx context.Context, l PerformerReader) error {
	if err := s.LoadAliases(ctx, l); err != nil {
		return err
	}

	if err := s.LoadTagIDs(ctx, l); err != nil {
		return err
	}

	if err := s.LoadStashIDs(ctx, l); err != nil {
		return err
	}

	return nil
}

// PerformerPartial represents part of a Performer object. It is used to update
// the database entry.
type PerformerPartial struct {
	Name           OptionalString
	Disambiguation OptionalString
	Gender         OptionalString
	URL            OptionalString
	Twitter        OptionalString
	Instagram      OptionalString
	Birthdate      OptionalDate
	Ethnicity      OptionalString
	Country        OptionalString
	EyeColor       OptionalString
	Height         OptionalInt
	Measurements   OptionalString
	FakeTits       OptionalString
	PenisLength    OptionalFloat64
	Circumcised    OptionalString
	CareerLength   OptionalString
	Tattoos        OptionalString
	Piercings      OptionalString
	Favorite       OptionalBool
	CreatedAt      OptionalTime
	UpdatedAt      OptionalTime
	// Rating expressed in 1-100 scale
	Rating        OptionalInt
	Details       OptionalString
	DeathDate     OptionalDate
	HairColor     OptionalString
	Weight        OptionalInt
	IgnoreAutoTag OptionalBool

	Aliases  *UpdateStrings
	TagIDs   *UpdateIDs
	StashIDs *UpdateStashIDs
}

func NewPerformer(name string) *Performer {
	currentTime := time.Now()
	return &Performer{
		Name:      name,
		CreatedAt: currentTime,
		UpdatedAt: currentTime,
	}
}

func NewPerformerPartial() PerformerPartial {
	updatedTime := time.Now()
	return PerformerPartial{
		UpdatedAt: NewOptionalTime(updatedTime),
	}
}

type Performers []*Performer

func (p *Performers) Append(o interface{}) {
	*p = append(*p, o.(*Performer))
}

func (p *Performers) New() interface{} {
	return &Performer{}
}

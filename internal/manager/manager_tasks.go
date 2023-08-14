package manager

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/stashapp/stash/internal/manager/config"
	"github.com/stashapp/stash/pkg/fsutil"
	"github.com/stashapp/stash/pkg/job"
	"github.com/stashapp/stash/pkg/logger"
	"github.com/stashapp/stash/pkg/models"
)

func useAsVideo(pathname string) bool {
	if instance.Config.IsCreateImageClipsFromVideos() && config.StashConfigs.GetStashFromDirPath(instance.Config.GetStashPaths(), pathname).ExcludeVideo {
		return false
	}
	return isVideo(pathname)
}

func useAsImage(pathname string) bool {
	if instance.Config.IsCreateImageClipsFromVideos() && config.StashConfigs.GetStashFromDirPath(instance.Config.GetStashPaths(), pathname).ExcludeVideo {
		return isImage(pathname) || isVideo(pathname)
	}
	return isImage(pathname)
}

func isZip(pathname string) bool {
	gExt := config.GetInstance().GetGalleryExtensions()
	return fsutil.MatchExtension(pathname, gExt)
}

func isVideo(pathname string) bool {
	vidExt := config.GetInstance().GetVideoExtensions()
	return fsutil.MatchExtension(pathname, vidExt)
}

func isImage(pathname string) bool {
	imgExt := config.GetInstance().GetImageExtensions()
	return fsutil.MatchExtension(pathname, imgExt)
}

func getScanPaths(inputPaths []string) []*config.StashConfig {
	stashPaths := config.GetInstance().GetStashPaths()

	if len(inputPaths) == 0 {
		return stashPaths
	}

	var ret config.StashConfigs
	for _, p := range inputPaths {
		s := stashPaths.GetStashFromDirPath(p)
		if s == nil {
			logger.Warnf("%s is not in the configured stash paths", p)
			continue
		}

		// make a copy, changing the path
		ss := *s
		ss.Path = p
		ret = append(ret, &ss)
	}

	return ret
}

// ScanSubscribe subscribes to a notification that is triggered when a
// scan or clean is complete.
func (s *Manager) ScanSubscribe(ctx context.Context) <-chan bool {
	return s.scanSubs.subscribe(ctx)
}

type ScanMetadataInput struct {
	Paths []string `json:"paths"`

	config.ScanMetadataOptions `mapstructure:",squash"`

	// Filter options for the scan
	Filter *ScanMetaDataFilterInput `json:"filter"`
}

// Filter options for meta data scannning
type ScanMetaDataFilterInput struct {
	// If set, files with a modification time before this time point are ignored by the scan
	MinModTime *time.Time `json:"minModTime"`
}

func (s *Manager) Scan(ctx context.Context, input ScanMetadataInput) (int, error) {
	if err := s.validateFFMPEG(); err != nil {
		return 0, err
	}

	scanJob := ScanJob{
		scanner:       s.Scanner,
		input:         input,
		subscriptions: s.scanSubs,
	}

	return s.JobManager.Add(ctx, "Scanning...", &scanJob), nil
}

func (s *Manager) Import(ctx context.Context) (int, error) {
	config := config.GetInstance()
	metadataPath := config.GetMetadataPath()
	if metadataPath == "" {
		return 0, errors.New("metadata path must be set in config")
	}

	j := job.MakeJobExec(func(ctx context.Context, progress *job.Progress) {
		task := ImportTask{
			txnManager:          s.Repository,
			BaseDir:             metadataPath,
			Reset:               true,
			DuplicateBehaviour:  ImportDuplicateEnumFail,
			MissingRefBehaviour: models.ImportMissingRefEnumFail,
			fileNamingAlgorithm: config.GetVideoFileNamingAlgorithm(),
		}
		task.Start(ctx)
	})

	return s.JobManager.Add(ctx, "Importing...", j), nil
}

func (s *Manager) Export(ctx context.Context) (int, error) {
	config := config.GetInstance()
	metadataPath := config.GetMetadataPath()
	if metadataPath == "" {
		return 0, errors.New("metadata path must be set in config")
	}

	j := job.MakeJobExec(func(ctx context.Context, progress *job.Progress) {
		var wg sync.WaitGroup
		wg.Add(1)
		task := ExportTask{
			txnManager:          s.Repository,
			full:                true,
			fileNamingAlgorithm: config.GetVideoFileNamingAlgorithm(),
		}
		task.Start(ctx, &wg)
	})

	return s.JobManager.Add(ctx, "Exporting...", j), nil
}

func (s *Manager) RunSingleTask(ctx context.Context, t Task) int {
	var wg sync.WaitGroup
	wg.Add(1)

	j := job.MakeJobExec(func(ctx context.Context, progress *job.Progress) {
		t.Start(ctx)
		wg.Done()
	})

	return s.JobManager.Add(ctx, t.GetDescription(), j)
}

func (s *Manager) Generate(ctx context.Context, input GenerateMetadataInput) (int, error) {
	if err := s.validateFFMPEG(); err != nil {
		return 0, err
	}
	if err := instance.Paths.Generated.EnsureTmpDir(); err != nil {
		logger.Warnf("could not generate temporary directory: %v", err)
	}

	j := &GenerateJob{
		txnManager: s.Repository,
		input:      input,
	}

	return s.JobManager.Add(ctx, "Generating...", j), nil
}

func (s *Manager) GenerateDefaultScreenshot(ctx context.Context, sceneId string) int {
	return s.generateScreenshot(ctx, sceneId, nil)
}

func (s *Manager) GenerateScreenshot(ctx context.Context, sceneId string, at float64) int {
	return s.generateScreenshot(ctx, sceneId, &at)
}

// generate default screenshot if at is nil
func (s *Manager) generateScreenshot(ctx context.Context, sceneId string, at *float64) int {
	if err := instance.Paths.Generated.EnsureTmpDir(); err != nil {
		logger.Warnf("failure generating screenshot: %v", err)
	}

	j := job.MakeJobExec(func(ctx context.Context, progress *job.Progress) {
		sceneIdInt, err := strconv.Atoi(sceneId)
		if err != nil {
			logger.Errorf("Error parsing scene id %s: %v", sceneId, err)
			return
		}

		var scene *models.Scene
		if err := s.Repository.WithTxn(ctx, func(ctx context.Context) error {
			scene, err = s.Repository.Scene.Find(ctx, sceneIdInt)
			if err != nil {
				return err
			}
			if scene == nil {
				return fmt.Errorf("scene with id %s not found", sceneId)
			}

			return scene.LoadPrimaryFile(ctx, s.Repository.File)
		}); err != nil {
			logger.Errorf("error finding scene for screenshot generation: %v", err)
			return
		}

		task := GenerateCoverTask{
			txnManager:   s.Repository,
			Scene:        *scene,
			ScreenshotAt: at,
			Overwrite:    true,
		}

		task.Start(ctx)

		logger.Infof("Generate screenshot finished")
	})

	return s.JobManager.Add(ctx, fmt.Sprintf("Generating screenshot for scene id %s", sceneId), j)
}

type AutoTagMetadataInput struct {
	// Paths to tag, null for all files
	Paths []string `json:"paths"`
	// IDs of performers to tag files with, or "*" for all
	Performers []string `json:"performers"`
	// IDs of studios to tag files with, or "*" for all
	Studios []string `json:"studios"`
	// IDs of tags to tag files with, or "*" for all
	Tags []string `json:"tags"`
}

func (s *Manager) AutoTag(ctx context.Context, input AutoTagMetadataInput) int {
	j := autoTagJob{
		txnManager: s.Repository,
		input:      input,
	}

	return s.JobManager.Add(ctx, "Auto-tagging...", &j)
}

type CleanMetadataInput struct {
	Paths []string `json:"paths"`
	// Do a dry run. Don't delete any files
	DryRun bool `json:"dryRun"`
}

func (s *Manager) Clean(ctx context.Context, input CleanMetadataInput) int {
	j := cleanJob{
		cleaner:      s.Cleaner,
		txnManager:   s.Repository,
		sceneService: s.SceneService,
		imageService: s.ImageService,
		input:        input,
		scanSubs:     s.scanSubs,
	}

	return s.JobManager.Add(ctx, "Cleaning...", &j)
}

func (s *Manager) OptimiseDatabase(ctx context.Context) int {
	j := OptimiseDatabaseJob{
		Optimiser: s.Database,
	}

	return s.JobManager.Add(ctx, "Optimising database...", &j)
}

func (s *Manager) MigrateHash(ctx context.Context) int {
	j := job.MakeJobExec(func(ctx context.Context, progress *job.Progress) {
		fileNamingAlgo := config.GetInstance().GetVideoFileNamingAlgorithm()
		logger.Infof("Migrating generated files for %s naming hash", fileNamingAlgo.String())

		var scenes []*models.Scene
		if err := s.Repository.WithTxn(ctx, func(ctx context.Context) error {
			var err error
			scenes, err = s.Repository.Scene.All(ctx)
			return err
		}); err != nil {
			logger.Errorf("failed to fetch list of scenes for migration: %s", err.Error())
			return
		}

		var wg sync.WaitGroup
		total := len(scenes)
		progress.SetTotal(total)

		for _, scene := range scenes {
			progress.Increment()
			if job.IsCancelled(ctx) {
				logger.Info("Stopping due to user request")
				return
			}

			if scene == nil {
				logger.Errorf("nil scene, skipping migrate")
				continue
			}

			wg.Add(1)

			task := MigrateHashTask{Scene: scene, fileNamingAlgorithm: fileNamingAlgo}
			go func() {
				task.Start()
				wg.Done()
			}()

			wg.Wait()
		}

		logger.Info("Finished migrating")
	})

	return s.JobManager.Add(ctx, "Migrating scene hashes...", j)
}

// If neither ids nor names are set, tag all items
type StashBoxBatchTagInput struct {
	// Stash endpoint to use for the tagging
	Endpoint int `json:"endpoint"`
	// Fields to exclude when executing the tagging
	ExcludeFields []string `json:"exclude_fields"`
	// Refresh items already tagged by StashBox if true. Only tag items with no StashBox tagging if false
	Refresh bool `json:"refresh"`
	// If batch adding studios, should their parent studios also be created?
	CreateParent bool `json:"createParent"`
	// If set, only tag these ids
	Ids []string `json:"ids"`
	// If set, only tag these names
	Names []string `json:"names"`
	// If set, only tag these performer ids
	//
	// Deprecated: please use Ids
	PerformerIds []string `json:"performer_ids"`
	// If set, only tag these performer names
	//
	// Deprecated: please use Names
	PerformerNames []string `json:"performer_names"`
}

func (s *Manager) StashBoxBatchPerformerTag(ctx context.Context, input StashBoxBatchTagInput) int {
	j := job.MakeJobExec(func(ctx context.Context, progress *job.Progress) {
		logger.Infof("Initiating stash-box batch performer tag")

		boxes := config.GetInstance().GetStashBoxes()
		if input.Endpoint < 0 || input.Endpoint >= len(boxes) {
			logger.Error(fmt.Errorf("invalid stash_box_index %d", input.Endpoint))
			return
		}
		box := boxes[input.Endpoint]

		var tasks []StashBoxBatchTagTask

		// The gocritic linter wants to turn this ifElseChain into a switch.
		// however, such a switch would contain quite large blocks for each section
		// and would arguably be hard to read.
		//
		// This is why we mark this section nolint. In principle, we should look to
		// rewrite the section at some point, to avoid the linter warning.
		if len(input.Ids) > 0 || len(input.PerformerIds) > 0 { //nolint:gocritic
			// The user has chosen only to tag the items on the current page
			if err := s.Repository.WithTxn(ctx, func(ctx context.Context) error {
				performerQuery := s.Repository.Performer

				idsToUse := input.PerformerIds
				if len(input.Ids) > 0 {
					idsToUse = input.Ids
				}

				for _, performerID := range idsToUse {
					if id, err := strconv.Atoi(performerID); err == nil {
						performer, err := performerQuery.Find(ctx, id)
						if err == nil {
							if err := performer.LoadStashIDs(ctx, performerQuery); err != nil {
								return fmt.Errorf("loading performer stash ids: %w", err)
							}

							// Check if the user wants to refresh existing or new items
							if (input.Refresh && len(performer.StashIDs.List()) > 0) ||
								(!input.Refresh && len(performer.StashIDs.List()) == 0) {
								tasks = append(tasks, StashBoxBatchTagTask{
									performer:      performer,
									refresh:        input.Refresh,
									box:            box,
									excludedFields: input.ExcludeFields,
									taskType:       Performer,
								})
							}
						} else {
							return err
						}
					}
				}
				return nil
			}); err != nil {
				logger.Error(err.Error())
			}
		} else if len(input.Names) > 0 || len(input.PerformerNames) > 0 {
			// The user is batch adding performers
			namesToUse := input.PerformerNames
			if len(input.Names) > 0 {
				namesToUse = input.Names
			}

			for i := range namesToUse {
				if len(namesToUse[i]) > 0 {
					performer := models.Performer{
						Name: namesToUse[i],
					}

					tasks = append(tasks, StashBoxBatchTagTask{
						performer:      &performer,
						refresh:        false,
						box:            box,
						excludedFields: input.ExcludeFields,
						taskType:       Performer,
					})
				}
			}
		} else { //nolint:gocritic
			// The gocritic linter wants to fold this if-block into the else on the line above.
			// However, this doesn't really help with readability of the current section. Mark it
			// as nolint for now. In the future we'd like to rewrite this code by factoring some of
			// this into separate functions.

			// The user has chosen to tag every item in their database
			if err := s.Repository.WithTxn(ctx, func(ctx context.Context) error {
				performerQuery := s.Repository.Performer
				var performers []*models.Performer
				var err error
				if input.Refresh {
					performers, err = performerQuery.FindByStashIDStatus(ctx, true, box.Endpoint)
				} else {
					performers, err = performerQuery.FindByStashIDStatus(ctx, false, box.Endpoint)
				}

				if err != nil {
					return fmt.Errorf("error querying performers: %v", err)
				}

				for _, performer := range performers {
					if err := performer.LoadStashIDs(ctx, performerQuery); err != nil {
						return fmt.Errorf("error loading stash ids for performer %s: %v", performer.Name, err)
					}

					tasks = append(tasks, StashBoxBatchTagTask{
						performer:      performer,
						refresh:        input.Refresh,
						box:            box,
						excludedFields: input.ExcludeFields,
						taskType:       Performer,
					})
				}
				return nil
			}); err != nil {
				logger.Error(err.Error())
				return
			}
		}

		if len(tasks) == 0 {
			return
		}

		progress.SetTotal(len(tasks))

		logger.Infof("Starting stash-box batch operation for %d performers", len(tasks))

		var wg sync.WaitGroup
		for _, task := range tasks {
			wg.Add(1)
			progress.ExecuteTask(task.Description(), func() {
				task.Start(ctx)
				wg.Done()
			})

			progress.Increment()
		}
	})

	return s.JobManager.Add(ctx, "Batch stash-box performer tag...", j)
}

func (s *Manager) StashBoxBatchStudioTag(ctx context.Context, input StashBoxBatchTagInput) int {
	j := job.MakeJobExec(func(ctx context.Context, progress *job.Progress) {
		logger.Infof("Initiating stash-box batch studio tag")

		boxes := config.GetInstance().GetStashBoxes()
		if input.Endpoint < 0 || input.Endpoint >= len(boxes) {
			logger.Error(fmt.Errorf("invalid stash_box_index %d", input.Endpoint))
			return
		}
		box := boxes[input.Endpoint]

		var tasks []StashBoxBatchTagTask

		// The gocritic linter wants to turn this ifElseChain into a switch.
		// however, such a switch would contain quite large blocks for each section
		// and would arguably be hard to read.
		//
		// This is why we mark this section nolint. In principle, we should look to
		// rewrite the section at some point, to avoid the linter warning.
		if len(input.Ids) > 0 { //nolint:gocritic
			// The user has chosen only to tag the items on the current page
			if err := s.Repository.WithTxn(ctx, func(ctx context.Context) error {
				studioQuery := s.Repository.Studio

				for _, studioID := range input.Ids {
					if id, err := strconv.Atoi(studioID); err == nil {
						studio, err := studioQuery.Find(ctx, id)
						if err == nil {
							if err := studio.LoadStashIDs(ctx, studioQuery); err != nil {
								return fmt.Errorf("loading studio stash ids: %w", err)
							}

							// Check if the user wants to refresh existing or new items
							if (input.Refresh && len(studio.StashIDs.List()) > 0) ||
								(!input.Refresh && len(studio.StashIDs.List()) == 0) {
								tasks = append(tasks, StashBoxBatchTagTask{
									studio:         studio,
									refresh:        input.Refresh,
									createParent:   input.CreateParent,
									box:            box,
									excludedFields: input.ExcludeFields,
									taskType:       Studio,
								})
							}
						} else {
							return err
						}
					}
				}
				return nil
			}); err != nil {
				logger.Error(err.Error())
			}
		} else if len(input.Names) > 0 {
			// The user is batch adding studios
			for i := range input.Names {
				if len(input.Names[i]) > 0 {
					tasks = append(tasks, StashBoxBatchTagTask{
						name:           &input.Names[i],
						refresh:        false,
						createParent:   input.CreateParent,
						box:            box,
						excludedFields: input.ExcludeFields,
						taskType:       Studio,
					})
				}
			}
		} else { //nolint:gocritic
			// The gocritic linter wants to fold this if-block into the else on the line above.
			// However, this doesn't really help with readability of the current section. Mark it
			// as nolint for now. In the future we'd like to rewrite this code by factoring some of
			// this into separate functions.

			// The user has chosen to tag every item in their database
			if err := s.Repository.WithTxn(ctx, func(ctx context.Context) error {
				studioQuery := s.Repository.Studio
				var studios []*models.Studio
				var err error

				if input.Refresh {
					studios, err = studioQuery.FindByStashIDStatus(ctx, true, box.Endpoint)
				} else {
					studios, err = studioQuery.FindByStashIDStatus(ctx, false, box.Endpoint)
				}

				if err != nil {
					return fmt.Errorf("error querying studios: %v", err)
				}

				for _, studio := range studios {
					tasks = append(tasks, StashBoxBatchTagTask{
						studio:         studio,
						refresh:        input.Refresh,
						createParent:   input.CreateParent,
						box:            box,
						excludedFields: input.ExcludeFields,
						taskType:       Studio,
					})
				}
				return nil
			}); err != nil {
				logger.Error(err.Error())
				return
			}
		}

		if len(tasks) == 0 {
			return
		}

		progress.SetTotal(len(tasks))

		logger.Infof("Starting stash-box batch operation for %d studios", len(tasks))

		var wg sync.WaitGroup
		for _, task := range tasks {
			wg.Add(1)
			progress.ExecuteTask(task.Description(), func() {
				task.Start(ctx)
				wg.Done()
			})

			progress.Increment()
		}
	})

	return s.JobManager.Add(ctx, "Batch stash-box studio tag...", j)
}

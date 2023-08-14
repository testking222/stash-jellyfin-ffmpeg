import { ApolloCache, DocumentNode, FetchResult } from "@apollo/client";
import { Modifiers } from "@apollo/client/cache";
import {
  isField,
  getQueryDefinition,
  StoreObject,
} from "@apollo/client/utilities";
import { ListFilterModel } from "../models/list-filter/filter";
import * as GQL from "./generated-graphql";

import { createClient } from "./createClient";

const { client } = createClient();

export const getClient = () => client;

// Evicts cached results for the given queries.
// Will also call a cache GC afterwards.
export function evictQueries(
  cache: ApolloCache<unknown>,
  queries: DocumentNode[]
) {
  const fields: Modifiers = {};
  for (const query of queries) {
    const { selections } = getQueryDefinition(query).selectionSet;
    for (const field of selections) {
      if (!isField(field)) continue;
      const keyName = field.name.value;
      fields[keyName] = (_value, { DELETE }) => DELETE;
    }
  }

  cache.modify({ fields });

  // evictQueries is usually called at the end of
  // an update function - so call a GC here
  cache.gc();
}

/**
 * Evicts fields from all objects of a given type.
 *
 * @param input   a map from typename -> list of field names to evict
 * @param ignore  optionally specify a cache id to ignore and not modify
 */
function evictTypeFields(
  cache: ApolloCache<Record<string, StoreObject>>,
  input: Record<string, string[]>,
  ignore?: string
) {
  const data = cache.extract();
  for (const key in data) {
    if (ignore?.includes(key)) continue;

    const obj = data[key];
    const typename = obj.__typename;

    if (typename && input[typename]) {
      const modifiers: Modifiers = {};
      for (const field of input[typename]) {
        modifiers[field] = (_value, { DELETE }) => DELETE;
      }
      cache.modify({
        id: key,
        fields: modifiers,
      });
    }
  }
}

// Appends obj to the cached result of the given query.
// Use to append objects to "All*" queries in "Create" mutations.
function appendObject(
  cache: ApolloCache<unknown>,
  obj: StoreObject,
  query: DocumentNode
) {
  const field = getQueryDefinition(query).selectionSet.selections[0];
  if (!isField(field)) return;
  const keyName = field.name.value;

  cache.modify({
    fields: {
      [keyName]: (value, { toReference }) => {
        return [...value, toReference(obj)];
      },
    },
  });
}

// Deletes obj from the cache, and sets the
// cached result of the given query to null.
// Use with "Destroy" mutations.
function deleteObject(
  cache: ApolloCache<unknown>,
  obj: StoreObject,
  query: DocumentNode
) {
  const field = getQueryDefinition(query).selectionSet.selections[0];
  if (!isField(field)) return;
  const keyName = field.name.value;

  cache.writeQuery({
    query,
    variables: { id: obj.id },
    data: { [keyName]: null },
  });
  cache.evict({ id: cache.identify(obj) });
}

/// Object queries

export const useFindScene = (id: string) => {
  const skip = id === "new" || id === "";
  return GQL.useFindSceneQuery({ variables: { id }, skip });
};

export const useSceneStreams = (id: string) =>
  GQL.useSceneStreamsQuery({ variables: { id } });

export const useFindScenes = (filter?: ListFilterModel) =>
  GQL.useFindScenesQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      scene_filter: filter?.makeFilter(),
    },
  });

export const queryFindScenes = (filter: ListFilterModel) =>
  client.query<GQL.FindScenesQuery>({
    query: GQL.FindScenesDocument,
    variables: {
      filter: filter.makeFindFilter(),
      scene_filter: filter.makeFilter(),
    },
  });

export const queryFindScenesByID = (sceneIDs: number[]) =>
  client.query<GQL.FindScenesQuery>({
    query: GQL.FindScenesDocument,
    variables: {
      scene_ids: sceneIDs,
    },
  });

export const querySceneByPathRegex = (filter: GQL.FindFilterType) =>
  client.query<GQL.FindScenesByPathRegexQuery>({
    query: GQL.FindScenesByPathRegexDocument,
    variables: { filter },
  });

export const useFindImage = (id: string) =>
  GQL.useFindImageQuery({ variables: { id } });

export const useFindImages = (filter?: ListFilterModel) =>
  GQL.useFindImagesQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      image_filter: filter?.makeFilter(),
    },
  });

export const queryFindImages = (filter: ListFilterModel) =>
  client.query<GQL.FindImagesQuery>({
    query: GQL.FindImagesDocument,
    variables: {
      filter: filter.makeFindFilter(),
      image_filter: filter.makeFilter(),
    },
  });

export const useFindMovie = (id: string) => {
  const skip = id === "new" || id === "";
  return GQL.useFindMovieQuery({ variables: { id }, skip });
};

export const useFindMovies = (filter?: ListFilterModel) =>
  GQL.useFindMoviesQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      movie_filter: filter?.makeFilter(),
    },
  });

export const queryFindMovies = (filter: ListFilterModel) =>
  client.query<GQL.FindMoviesQuery>({
    query: GQL.FindMoviesDocument,
    variables: {
      filter: filter.makeFindFilter(),
      movie_filter: filter.makeFilter(),
    },
  });

export const useAllMoviesForFilter = () => GQL.useAllMoviesForFilterQuery();

export const useFindSceneMarkers = (filter?: ListFilterModel) =>
  GQL.useFindSceneMarkersQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      scene_marker_filter: filter?.makeFilter(),
    },
  });

export const queryFindSceneMarkers = (filter: ListFilterModel) =>
  client.query<GQL.FindSceneMarkersQuery>({
    query: GQL.FindSceneMarkersDocument,
    variables: {
      filter: filter.makeFindFilter(),
      scene_marker_filter: filter.makeFilter(),
    },
  });

export const useMarkerStrings = () => GQL.useMarkerStringsQuery();

export const useFindGallery = (id: string) => {
  const skip = id === "new" || id === "";
  return GQL.useFindGalleryQuery({ variables: { id }, skip });
};

export const useFindGalleries = (filter?: ListFilterModel) =>
  GQL.useFindGalleriesQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      gallery_filter: filter?.makeFilter(),
    },
  });

export const queryFindGalleries = (filter: ListFilterModel) =>
  client.query<GQL.FindGalleriesQuery>({
    query: GQL.FindGalleriesDocument,
    variables: {
      filter: filter.makeFindFilter(),
      gallery_filter: filter.makeFilter(),
    },
  });

export const useFindPerformer = (id: string) => {
  const skip = id === "new" || id === "";
  return GQL.useFindPerformerQuery({ variables: { id }, skip });
};

export const queryFindPerformer = (id: string) =>
  client.query<GQL.FindPerformerQuery>({
    query: GQL.FindPerformerDocument,
    variables: { id },
  });

export const useFindPerformers = (filter?: ListFilterModel) =>
  GQL.useFindPerformersQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      performer_filter: filter?.makeFilter(),
    },
  });

export const queryFindPerformers = (filter: ListFilterModel) =>
  client.query<GQL.FindPerformersQuery>({
    query: GQL.FindPerformersDocument,
    variables: {
      filter: filter.makeFindFilter(),
      performer_filter: filter.makeFilter(),
    },
  });

export const useAllPerformersForFilter = () =>
  GQL.useAllPerformersForFilterQuery();

export const useFindStudio = (id: string) => {
  const skip = id === "new" || id === "";
  return GQL.useFindStudioQuery({ variables: { id }, skip });
};

export const queryFindStudio = (id: string) =>
  client.query<GQL.FindStudioQuery>({
    query: GQL.FindStudioDocument,
    variables: { id },
  });

export const useFindStudios = (filter?: ListFilterModel) =>
  GQL.useFindStudiosQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      studio_filter: filter?.makeFilter(),
    },
  });

export const queryFindStudios = (filter: ListFilterModel) =>
  client.query<GQL.FindStudiosQuery>({
    query: GQL.FindStudiosDocument,
    variables: {
      filter: filter.makeFindFilter(),
      studio_filter: filter.makeFilter(),
    },
  });

export const useAllStudiosForFilter = () => GQL.useAllStudiosForFilterQuery();

export const useFindTag = (id: string) => {
  const skip = id === "new" || id === "";
  return GQL.useFindTagQuery({ variables: { id }, skip });
};

export const useFindTags = (filter?: ListFilterModel) =>
  GQL.useFindTagsQuery({
    skip: filter === undefined,
    variables: {
      filter: filter?.makeFindFilter(),
      tag_filter: filter?.makeFilter(),
    },
  });

export const queryFindTags = (filter: ListFilterModel) =>
  client.query<GQL.FindTagsQuery>({
    query: GQL.FindTagsDocument,
    variables: {
      filter: filter.makeFindFilter(),
      tag_filter: filter.makeFilter(),
    },
  });

export const useAllTagsForFilter = () => GQL.useAllTagsForFilterQuery();

export const useFindSavedFilter = (id: string) =>
  GQL.useFindSavedFilterQuery({
    variables: { id },
  });

export const useFindSavedFilters = (mode?: GQL.FilterMode) =>
  GQL.useFindSavedFiltersQuery({
    variables: { mode },
  });

export const useFindDefaultFilter = (mode: GQL.FilterMode) =>
  GQL.useFindDefaultFilterQuery({
    variables: { mode },
  });

/// Object Mutations

// Increases/decreases the given field of the Stats query by diff
function updateStats(cache: ApolloCache<unknown>, field: string, diff: number) {
  cache.modify({
    fields: {
      stats(value) {
        return {
          ...value,
          [field]: value[field] + diff,
        };
      },
    },
  });
}

function updateO(
  cache: ApolloCache<unknown>,
  typename: string,
  id: string,
  updatedOCount: number
) {
  cache.modify({
    id: cache.identify({ __typename: typename, id }),
    fields: {
      o_counter() {
        return updatedOCount;
      },
    },
  });
}

const sceneMutationImpactedTypeFields = {
  Movie: ["scenes", "scene_count"],
  Gallery: ["scenes"],
  Performer: [
    "scenes",
    "scene_count",
    "movies",
    "movie_count",
    "performer_count",
  ],
  Studio: ["scene_count", "performer_count"],
  Tag: ["scene_count"],
};

const sceneMutationImpactedQueries = [
  GQL.FindScenesDocument, // various filters
  GQL.FindMoviesDocument, // is missing scenes
  GQL.FindGalleriesDocument, // is missing scenes
  GQL.FindPerformersDocument, // filter by scene count
  GQL.FindStudiosDocument, // filter by scene count
  GQL.FindTagsDocument, // filter by scene count
];

export const mutateCreateScene = (input: GQL.SceneCreateInput) =>
  client.mutate<GQL.SceneCreateMutation>({
    mutation: GQL.SceneCreateDocument,
    variables: { input },
    update(cache, result) {
      const scene = result.data?.sceneCreate;
      if (!scene) return;

      // update stats
      updateStats(cache, "scene_count", 1);

      // if we're reassigning files, refetch files from other scenes
      if (input.file_ids?.length) {
        const obj = { __typename: "Scene", id: scene.id };
        evictTypeFields(
          cache,
          {
            ...sceneMutationImpactedTypeFields,
            Scene: ["files"],
          },
          cache.identify(obj) // don't evict this scene
        );
      } else {
        evictTypeFields(cache, sceneMutationImpactedTypeFields);
      }

      evictQueries(cache, sceneMutationImpactedQueries);
    },
  });

export const useSceneUpdate = () =>
  GQL.useSceneUpdateMutation({
    update(cache, result) {
      if (!result.data?.sceneUpdate) return;

      evictTypeFields(cache, sceneMutationImpactedTypeFields);
      evictQueries(cache, sceneMutationImpactedQueries);
    },
  });

export const useBulkSceneUpdate = (input: GQL.BulkSceneUpdateInput) =>
  GQL.useBulkSceneUpdateMutation({
    variables: { input },
    update(cache, result) {
      if (!result.data?.bulkSceneUpdate) return;

      evictTypeFields(cache, sceneMutationImpactedTypeFields);
      evictQueries(cache, sceneMutationImpactedQueries);
    },
  });

export const useScenesUpdate = (input: GQL.SceneUpdateInput[]) =>
  GQL.useScenesUpdateMutation({
    variables: { input },
    update(cache, result) {
      if (!result.data?.scenesUpdate) return;

      evictTypeFields(cache, sceneMutationImpactedTypeFields);
      evictQueries(cache, sceneMutationImpactedQueries);
    },
  });

export const useSceneDestroy = (input: GQL.SceneDestroyInput) =>
  GQL.useSceneDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.sceneDestroy) return;

      const obj = { __typename: "Scene", id: input.id };
      deleteObject(cache, obj, GQL.FindSceneDocument);

      evictTypeFields(cache, sceneMutationImpactedTypeFields);
      evictQueries(cache, [
        ...sceneMutationImpactedQueries,
        GQL.FindSceneMarkersDocument, // filter by scene tags
        GQL.StatsDocument, // scenes size, scene count, etc
      ]);
    },
  });

export const useScenesDestroy = (input: GQL.ScenesDestroyInput) =>
  GQL.useScenesDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.scenesDestroy) return;

      for (const id of input.ids) {
        const obj = { __typename: "Scene", id };
        deleteObject(cache, obj, GQL.FindSceneDocument);
      }

      evictTypeFields(cache, sceneMutationImpactedTypeFields);
      evictQueries(cache, [
        ...sceneMutationImpactedQueries,
        GQL.FindSceneMarkersDocument, // filter by scene tags
        GQL.StatsDocument, // scenes size, scene count, etc
      ]);
    },
  });

export const useSceneIncrementO = (id: string) =>
  GQL.useSceneIncrementOMutation({
    variables: { id },
    update(cache, result) {
      const updatedOCount = result.data?.sceneIncrementO;
      if (updatedOCount === undefined) return;

      const scene = cache.readFragment<GQL.SlimSceneDataFragment>({
        id: cache.identify({ __typename: "Scene", id }),
        fragment: GQL.SlimSceneDataFragmentDoc,
        fragmentName: "SlimSceneData",
      });

      if (scene) {
        // if we have the scene, update performer o_counters manually
        for (const performer of scene.performers) {
          cache.modify({
            id: cache.identify(performer),
            fields: {
              o_counter(value) {
                return value + 1;
              },
            },
          });
        }
      } else {
        // else refresh all performer o_counters
        evictTypeFields(cache, {
          Performer: ["o_counter"],
        });
      }

      updateStats(cache, "total_o_count", 1);
      updateO(cache, "Scene", id, updatedOCount);
      evictQueries(cache, [
        GQL.FindScenesDocument, // filter by o_counter
        GQL.FindPerformersDocument, // filter by o_counter
      ]);
    },
  });

export const useSceneDecrementO = (id: string) =>
  GQL.useSceneDecrementOMutation({
    variables: { id },
    update(cache, result) {
      const updatedOCount = result.data?.sceneDecrementO;
      if (updatedOCount === undefined) return;

      const scene = cache.readFragment<GQL.SlimSceneDataFragment>({
        id: cache.identify({ __typename: "Scene", id }),
        fragment: GQL.SlimSceneDataFragmentDoc,
        fragmentName: "SlimSceneData",
      });

      if (scene) {
        // if we have the scene, update performer o_counters manually
        for (const performer of scene.performers) {
          cache.modify({
            id: cache.identify(performer),
            fields: {
              o_counter(value) {
                return value - 1;
              },
            },
          });
        }
      } else {
        // else refresh all performer o_counters
        evictTypeFields(cache, {
          Performer: ["o_counter"],
        });
      }

      updateStats(cache, "total_o_count", -1);
      updateO(cache, "Scene", id, updatedOCount);
      evictQueries(cache, [
        GQL.FindScenesDocument, // filter by o_counter
        GQL.FindPerformersDocument, // filter by o_counter
      ]);
    },
  });

export const useSceneResetO = (id: string) =>
  GQL.useSceneResetOMutation({
    variables: { id },
    update(cache, result) {
      const updatedOCount = result.data?.sceneResetO;
      if (updatedOCount === undefined) return;

      const scene = cache.readFragment<GQL.SlimSceneDataFragment>({
        id: cache.identify({ __typename: "Scene", id }),
        fragment: GQL.SlimSceneDataFragmentDoc,
        fragmentName: "SlimSceneData",
      });

      if (scene) {
        // if we have the scene, update performer o_counters manually
        const old_count = scene.o_counter ?? 0;
        for (const performer of scene.performers) {
          cache.modify({
            id: cache.identify(performer),
            fields: {
              o_counter(value) {
                return value - old_count;
              },
            },
          });
        }
        updateStats(cache, "total_o_count", -old_count);
      } else {
        // else refresh all performer o_counters
        evictTypeFields(cache, {
          Performer: ["o_counter"],
        });
        // also refresh stats total_o_count
        cache.modify({
          fields: {
            stats: (value) => ({
              ...value,
              total_o_count: undefined,
            }),
          },
        });
      }

      updateO(cache, "Scene", id, updatedOCount);
      evictQueries(cache, [
        GQL.FindScenesDocument, // filter by o_counter
        GQL.FindPerformersDocument, // filter by o_counter
      ]);
    },
  });

export const useSceneGenerateScreenshot = () =>
  GQL.useSceneGenerateScreenshotMutation();

export const mutateSceneSetPrimaryFile = (id: string, fileID: string) =>
  client.mutate<GQL.SceneUpdateMutation>({
    mutation: GQL.SceneUpdateDocument,
    variables: {
      input: {
        id,
        primary_file_id: fileID,
      },
    },
    update(cache, result) {
      if (!result.data?.sceneUpdate) return;

      evictQueries(cache, [
        GQL.FindScenesDocument, // sort by primary basename when missing title
      ]);
    },
  });

export const mutateSceneAssignFile = (sceneID: string, fileID: string) =>
  client.mutate<GQL.SceneAssignFileMutation>({
    mutation: GQL.SceneAssignFileDocument,
    variables: {
      input: {
        scene_id: sceneID,
        file_id: fileID,
      },
    },
    update(cache, result) {
      if (!result.data?.sceneAssignFile) return;

      // refetch target scene
      cache.evict({
        id: cache.identify({ __typename: "Scene", id: sceneID }),
      });

      // refetch files of the scene the file was previously assigned to
      evictTypeFields(cache, { Scene: ["files"] });

      evictQueries(cache, [
        GQL.FindScenesDocument, // filter by file count
      ]);
    },
  });

export const mutateSceneMerge = (
  destination: string,
  source: string[],
  values: GQL.SceneUpdateInput
) =>
  client.mutate<GQL.SceneMergeMutation>({
    mutation: GQL.SceneMergeDocument,
    variables: {
      input: {
        source,
        destination,
        values,
      },
    },
    update(cache, result) {
      if (!result.data?.sceneMerge) return;

      for (const id of source) {
        const obj = { __typename: "Scene", id };
        deleteObject(cache, obj, GQL.FindSceneDocument);
      }

      evictTypeFields(cache, sceneMutationImpactedTypeFields);
      evictQueries(cache, [
        ...sceneMutationImpactedQueries,
        GQL.StatsDocument, // scenes size, scene count, etc
      ]);
    },
  });

export const useSceneSaveActivity = () =>
  GQL.useSceneSaveActivityMutation({
    update(cache, result, { variables }) {
      if (!result.data?.sceneSaveActivity || !variables) return;

      const { id, playDuration, resume_time: resumeTime } = variables;

      cache.modify({
        id: cache.identify({ __typename: "Scene", id }),
        fields: {
          resume_time() {
            return resumeTime;
          },
          play_duration(value) {
            return value + playDuration;
          },
        },
      });

      if (playDuration) {
        updateStats(cache, "total_play_duration", playDuration);
      }

      evictQueries(cache, [
        GQL.FindScenesDocument, // filter by play duration
      ]);
    },
  });

export const useSceneIncrementPlayCount = () =>
  GQL.useSceneIncrementPlayCountMutation({
    update(cache, result, { variables }) {
      if (!result.data?.sceneIncrementPlayCount || !variables) return;

      let lastPlayCount = 0;
      cache.modify({
        id: cache.identify({ __typename: "Scene", id: variables.id }),
        fields: {
          play_count(value) {
            lastPlayCount = value;
            return value + 1;
          },
          last_played_at() {
            // this is not perfectly accurate, the time is set server-side
            // it isn't even displayed anywhere in the UI anyway
            return new Date().toISOString();
          },
        },
      });

      updateStats(cache, "total_play_count", 1);
      if (lastPlayCount === 0) {
        updateStats(cache, "scenes_played", 1);
      }

      evictQueries(cache, [
        GQL.FindScenesDocument, // filter by play count
      ]);
    },
  });

const imageMutationImpactedTypeFields = {
  Gallery: ["images", "image_count"],
  Performer: ["image_count", "performer_count"],
  Studio: ["image_count", "performer_count"],
  Tag: ["image_count"],
};

const imageMutationImpactedQueries = [
  GQL.FindImagesDocument, // various filters
  GQL.FindGalleriesDocument, // filter by image count
  GQL.FindPerformersDocument, // filter by image count
  GQL.FindStudiosDocument, // filter by image count
  GQL.FindTagsDocument, // filter by image count
];

export const useImageUpdate = () =>
  GQL.useImageUpdateMutation({
    update(cache, result) {
      if (!result.data?.imageUpdate) return;

      evictTypeFields(cache, imageMutationImpactedTypeFields);
      evictQueries(cache, imageMutationImpactedQueries);
    },
  });

export const useBulkImageUpdate = () =>
  GQL.useBulkImageUpdateMutation({
    update(cache, result) {
      if (!result.data?.bulkImageUpdate) return;

      evictTypeFields(cache, imageMutationImpactedTypeFields);
      evictQueries(cache, imageMutationImpactedQueries);
    },
  });

export const useImagesDestroy = (input: GQL.ImagesDestroyInput) =>
  GQL.useImagesDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.imagesDestroy) return;

      for (const id of input.ids) {
        const obj = { __typename: "Image", id };
        deleteObject(cache, obj, GQL.FindImageDocument);
      }

      evictTypeFields(cache, imageMutationImpactedTypeFields);
      evictQueries(cache, [
        ...imageMutationImpactedQueries,
        GQL.StatsDocument, // images size, images count
      ]);
    },
  });

function updateImageIncrementO(id: string) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cache: ApolloCache<any>,
    result: FetchResult<GQL.ImageIncrementOMutation>
  ) => {
    const updatedOCount = result.data?.imageIncrementO;
    if (updatedOCount === undefined) return;

    const image = cache.readFragment<GQL.SlimImageDataFragment>({
      id: cache.identify({ __typename: "Image", id }),
      fragment: GQL.SlimImageDataFragmentDoc,
      fragmentName: "SlimImageData",
    });

    if (image) {
      // if we have the image, update performer o_counters manually
      for (const performer of image.performers) {
        cache.modify({
          id: cache.identify(performer),
          fields: {
            o_counter(value) {
              return value + 1;
            },
          },
        });
      }
    } else {
      // else refresh all performer o_counters
      evictTypeFields(cache, {
        Performer: ["o_counter"],
      });
    }

    updateStats(cache, "total_o_count", 1);
    updateO(cache, "Image", id, updatedOCount);
    evictQueries(cache, [
      GQL.FindImagesDocument, // filter by o_counter
      GQL.FindPerformersDocument, // filter by o_counter
    ]);
  };
}
export const useImageIncrementO = (id: string) =>
  GQL.useImageIncrementOMutation({
    variables: { id },
    update: updateImageIncrementO(id),
  });

export const mutateImageIncrementO = (id: string) =>
  client.mutate<GQL.ImageIncrementOMutation>({
    mutation: GQL.ImageIncrementODocument,
    variables: { id },
    update: updateImageIncrementO(id),
  });

function updateImageDecrementO(id: string) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cache: ApolloCache<any>,
    result: FetchResult<GQL.ImageDecrementOMutation>
  ) => {
    const updatedOCount = result.data?.imageDecrementO;
    if (updatedOCount === undefined) return;

    const image = cache.readFragment<GQL.SlimImageDataFragment>({
      id: cache.identify({ __typename: "Image", id }),
      fragment: GQL.SlimImageDataFragmentDoc,
      fragmentName: "SlimImageData",
    });

    if (image) {
      // if we have the image, update performer o_counters manually
      for (const performer of image.performers) {
        cache.modify({
          id: cache.identify(performer),
          fields: {
            o_counter(value) {
              return value - 1;
            },
          },
        });
      }
    } else {
      // else refresh all performer o_counters
      evictTypeFields(cache, {
        Performer: ["o_counter"],
      });
    }

    updateStats(cache, "total_o_count", -1);
    updateO(cache, "Image", id, updatedOCount);
    evictQueries(cache, [
      GQL.FindImagesDocument, // filter by o_counter
      GQL.FindPerformersDocument, // filter by o_counter
    ]);
  };
}

export const useImageDecrementO = (id: string) =>
  GQL.useImageDecrementOMutation({
    variables: { id },
    update: updateImageDecrementO(id),
  });

export const mutateImageDecrementO = (id: string) =>
  client.mutate<GQL.ImageDecrementOMutation>({
    mutation: GQL.ImageDecrementODocument,
    variables: { id },
    update: updateImageDecrementO(id),
  });

function updateImageResetO(id: string) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cache: ApolloCache<any>,
    result: FetchResult<GQL.ImageResetOMutation>
  ) => {
    const updatedOCount = result.data?.imageResetO;
    if (updatedOCount === undefined) return;

    const image = cache.readFragment<GQL.SlimImageDataFragment>({
      id: cache.identify({ __typename: "Image", id }),
      fragment: GQL.SlimImageDataFragmentDoc,
      fragmentName: "SlimImageData",
    });

    if (image) {
      // if we have the image, update performer o_counters manually
      const old_count = image.o_counter ?? 0;
      for (const performer of image.performers) {
        cache.modify({
          id: cache.identify(performer),
          fields: {
            o_counter(value) {
              return value - old_count;
            },
          },
        });
      }
      updateStats(cache, "total_o_count", -old_count);
    } else {
      // else refresh all performer o_counters
      evictTypeFields(cache, {
        Performer: ["o_counter"],
      });
      // also refresh stats total_o_count
      cache.modify({
        fields: {
          stats: (value) => ({
            ...value,
            total_o_count: undefined,
          }),
        },
      });
    }

    updateO(cache, "Image", id, updatedOCount);
    evictQueries(cache, [
      GQL.FindImagesDocument, // filter by o_counter
      GQL.FindPerformersDocument, // filter by o_counter
    ]);
  };
}

export const useImageResetO = (id: string) =>
  GQL.useImageResetOMutation({
    variables: { id },
    update: updateImageResetO(id),
  });

export const mutateImageResetO = (id: string) =>
  client.mutate<GQL.ImageResetOMutation>({
    mutation: GQL.ImageResetODocument,
    variables: { id },
    update: updateImageResetO(id),
  });

export const mutateImageSetPrimaryFile = (id: string, fileID: string) =>
  client.mutate<GQL.ImageUpdateMutation>({
    mutation: GQL.ImageUpdateDocument,
    variables: {
      input: {
        id,
        primary_file_id: fileID,
      },
    },
    update(cache, result) {
      if (!result.data?.imageUpdate) return;

      evictQueries(cache, [
        GQL.FindImagesDocument, // sort by primary basename when missing title
      ]);
    },
  });

const movieMutationImpactedTypeFields = {
  Studio: ["movie_count"],
};

const movieMutationImpactedQueries = [
  GQL.FindMoviesDocument, // various filters
];

export const useMovieCreate = () =>
  GQL.useMovieCreateMutation({
    update(cache, result) {
      const movie = result.data?.movieCreate;
      if (!movie) return;

      appendObject(cache, movie, GQL.AllMoviesForFilterDocument);

      // update stats
      updateStats(cache, "studio_count", 1);

      evictTypeFields(cache, movieMutationImpactedTypeFields);
      evictQueries(cache, movieMutationImpactedQueries);
    },
  });

export const useMovieUpdate = () =>
  GQL.useMovieUpdateMutation({
    update(cache, result) {
      if (!result.data?.movieUpdate) return;

      evictTypeFields(cache, movieMutationImpactedTypeFields);
      evictQueries(cache, movieMutationImpactedQueries);
    },
  });

export const useBulkMovieUpdate = (input: GQL.BulkMovieUpdateInput) =>
  GQL.useBulkMovieUpdateMutation({
    variables: { input },
    update(cache, result) {
      if (!result.data?.bulkMovieUpdate) return;

      evictTypeFields(cache, movieMutationImpactedTypeFields);
      evictQueries(cache, movieMutationImpactedQueries);
    },
  });

export const useMovieDestroy = (input: GQL.MovieDestroyInput) =>
  GQL.useMovieDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.movieDestroy) return;

      const obj = { __typename: "Movie", id: input.id };
      deleteObject(cache, obj, GQL.FindMovieDocument);

      // update stats
      updateStats(cache, "movie_count", -1);

      evictTypeFields(cache, {
        Scene: ["movies"],
        Performer: ["movie_count"],
        Studio: ["movie_count"],
      });
      evictQueries(cache, [
        ...movieMutationImpactedQueries,
        GQL.FindScenesDocument, // filter by movie
      ]);
    },
  });

export const useMoviesDestroy = (input: GQL.MoviesDestroyMutationVariables) =>
  GQL.useMoviesDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.moviesDestroy) return;

      const { ids } = input;

      for (const id of ids) {
        const obj = { __typename: "Movie", id };
        deleteObject(cache, obj, GQL.FindMovieDocument);
      }

      // update stats
      updateStats(cache, "movie_count", -ids.length);

      evictTypeFields(cache, {
        Scene: ["movies"],
        Performer: ["movie_count"],
        Studio: ["movie_count"],
      });
      evictQueries(cache, [
        ...movieMutationImpactedQueries,
        GQL.FindScenesDocument, // filter by movie
      ]);
    },
  });

const sceneMarkerMutationImpactedTypeFields = {
  Tag: ["scene_marker_count"],
};

const sceneMarkerMutationImpactedQueries = [
  GQL.FindScenesDocument, // has marker filter
  GQL.FindSceneMarkersDocument, // various filters
  GQL.MarkerStringsDocument, // marker list
  GQL.FindSceneMarkerTagsDocument, // marker tag list
  GQL.FindTagsDocument, // filter by marker count
];

export const useSceneMarkerCreate = () =>
  GQL.useSceneMarkerCreateMutation({
    update(cache, result, { variables }) {
      if (!result.data?.sceneMarkerCreate || !variables) return;

      // refetch linked scene's marker list
      cache.evict({
        id: cache.identify({ __typename: "Scene", id: variables.scene_id }),
        fieldName: "scene_markers",
      });

      evictTypeFields(cache, sceneMarkerMutationImpactedTypeFields);
      evictQueries(cache, sceneMarkerMutationImpactedQueries);
    },
  });

export const useSceneMarkerUpdate = () =>
  GQL.useSceneMarkerUpdateMutation({
    update(cache, result, { variables }) {
      if (!result.data?.sceneMarkerUpdate || !variables) return;

      // refetch linked scene's marker list
      cache.evict({
        id: cache.identify({ __typename: "Scene", id: variables.scene_id }),
        fieldName: "scene_markers",
      });

      evictTypeFields(cache, sceneMarkerMutationImpactedTypeFields);
      evictQueries(cache, sceneMarkerMutationImpactedQueries);
    },
  });

export const useSceneMarkerDestroy = () =>
  GQL.useSceneMarkerDestroyMutation({
    update(cache, result, { variables }) {
      if (!result.data?.sceneMarkerDestroy || !variables) return;

      const obj = { __typename: "SceneMarker", id: variables.id };
      cache.evict({ id: cache.identify(obj) });

      evictTypeFields(cache, sceneMarkerMutationImpactedTypeFields);
      evictQueries(cache, sceneMarkerMutationImpactedQueries);
    },
  });

const galleryMutationImpactedTypeFields = {
  Scene: ["galleries"],
  Performer: ["gallery_count", "performer_count"],
  Studio: ["gallery_count", "performer_count"],
  Tag: ["gallery_count"],
};

const galleryMutationImpactedQueries = [
  GQL.FindScenesDocument, // is missing galleries
  GQL.FindGalleriesDocument, // various filters
  GQL.FindPerformersDocument, // filter by gallery count
  GQL.FindStudiosDocument, // filter by gallery count
  GQL.FindTagsDocument, // filter by gallery count
];

export const useGalleryCreate = () =>
  GQL.useGalleryCreateMutation({
    update(cache, result) {
      if (!result.data?.galleryCreate) return;

      // update stats
      updateStats(cache, "gallery_count", 1);

      evictTypeFields(cache, galleryMutationImpactedTypeFields);
      evictQueries(cache, galleryMutationImpactedQueries);
    },
  });

export const useGalleryUpdate = () =>
  GQL.useGalleryUpdateMutation({
    update(cache, result) {
      if (!result.data?.galleryUpdate) return;

      evictTypeFields(cache, galleryMutationImpactedTypeFields);
      evictQueries(cache, galleryMutationImpactedQueries);
    },
  });

export const useBulkGalleryUpdate = () =>
  GQL.useBulkGalleryUpdateMutation({
    update(cache, result) {
      if (!result.data?.bulkGalleryUpdate) return;

      evictTypeFields(cache, galleryMutationImpactedTypeFields);
      evictQueries(cache, galleryMutationImpactedQueries);
    },
  });

export const useGalleryDestroy = (input: GQL.GalleryDestroyInput) =>
  GQL.useGalleryDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.galleryDestroy) return;

      for (const id of input.ids) {
        const obj = { __typename: "Gallery", id };
        deleteObject(cache, obj, GQL.FindGalleryDocument);
      }

      evictTypeFields(cache, galleryMutationImpactedTypeFields);
      evictQueries(cache, [
        ...galleryMutationImpactedQueries,
        GQL.FindImagesDocument, // filter by gallery
        GQL.StatsDocument, // images size, gallery count, etc
      ]);
    },
  });

export const mutateAddGalleryImages = (input: GQL.GalleryAddInput) =>
  client.mutate<GQL.AddGalleryImagesMutation>({
    mutation: GQL.AddGalleryImagesDocument,
    variables: input,
    update(cache, result) {
      if (!result.data?.addGalleryImages) return;

      // refetch gallery image_count
      cache.evict({
        id: cache.identify({ __typename: "Gallery", id: input.gallery_id }),
        fieldName: "image_count",
      });

      // refetch images galleries field
      for (const id of input.image_ids) {
        cache.evict({
          id: cache.identify({ __typename: "Image", id }),
          fieldName: "galleries",
        });
      }

      evictQueries(cache, [
        GQL.FindGalleriesDocument, // filter by image count
        GQL.FindImagesDocument, // filter by gallery
      ]);
    },
  });

export const mutateRemoveGalleryImages = (input: GQL.GalleryRemoveInput) =>
  client.mutate<GQL.RemoveGalleryImagesMutation>({
    mutation: GQL.RemoveGalleryImagesDocument,
    variables: input,
    update(cache, result) {
      if (!result.data?.removeGalleryImages) return;

      // refetch gallery image_count
      cache.evict({
        id: cache.identify({ __typename: "Gallery", id: input.gallery_id }),
        fieldName: "image_count",
      });

      // refetch images galleries field
      for (const id of input.image_ids) {
        cache.evict({
          id: cache.identify({ __typename: "Image", id }),
          fieldName: "galleries",
        });
      }

      evictQueries(cache, [
        GQL.FindGalleriesDocument, // filter by image count
        GQL.FindImagesDocument, // filter by gallery
      ]);
    },
  });

export const mutateGallerySetPrimaryFile = (id: string, fileID: string) =>
  client.mutate<GQL.GalleryUpdateMutation>({
    mutation: GQL.GalleryUpdateDocument,
    variables: {
      input: {
        id,
        primary_file_id: fileID,
      },
    },
    update(cache, result) {
      if (!result.data?.galleryUpdate) return;

      evictQueries(cache, [
        GQL.FindGalleriesDocument, // sort by primary basename when missing title
      ]);
    },
  });

const galleryChapterMutationImpactedTypeFields = {
  Gallery: ["chapters"],
};

const galleryChapterMutationImpactedQueries = [
  GQL.FindGalleriesDocument, // filter by has chapters
];

export const useGalleryChapterCreate = () =>
  GQL.useGalleryChapterCreateMutation({
    update(cache, result) {
      if (!result.data?.galleryChapterCreate) return;

      evictTypeFields(cache, galleryChapterMutationImpactedTypeFields);
      evictQueries(cache, galleryChapterMutationImpactedQueries);
    },
  });

export const useGalleryChapterUpdate = () =>
  GQL.useGalleryChapterUpdateMutation({
    update(cache, result) {
      if (!result.data?.galleryChapterUpdate) return;

      evictTypeFields(cache, galleryChapterMutationImpactedTypeFields);
      evictQueries(cache, galleryChapterMutationImpactedQueries);
    },
  });

export const useGalleryChapterDestroy = () =>
  GQL.useGalleryChapterDestroyMutation({
    update(cache, result, { variables }) {
      if (!result.data?.galleryChapterDestroy || !variables) return;

      const obj = { __typename: "GalleryChapter", id: variables.id };
      cache.evict({ id: cache.identify(obj) });

      evictTypeFields(cache, galleryChapterMutationImpactedTypeFields);
      evictQueries(cache, galleryChapterMutationImpactedQueries);
    },
  });

const performerMutationImpactedTypeFields = {
  Tag: ["performer_count"],
};

const performerMutationImpactedQueries = [
  GQL.FindScenesDocument, // filter by performer tags
  GQL.FindImagesDocument, // filter by performer tags
  GQL.FindGalleriesDocument, // filter by performer tags
  GQL.FindPerformersDocument, // various filters
  GQL.FindTagsDocument, // filter by performer count
];

export const usePerformerCreate = () =>
  GQL.usePerformerCreateMutation({
    update(cache, result) {
      const performer = result.data?.performerCreate;
      if (!performer) return;

      appendObject(cache, performer, GQL.AllPerformersForFilterDocument);

      // update stats
      updateStats(cache, "performer_count", 1);

      evictTypeFields(cache, performerMutationImpactedTypeFields);
      evictQueries(cache, [
        GQL.FindPerformersDocument, // various filters
        GQL.FindTagsDocument, // filter by performer count
      ]);
    },
  });

export const usePerformerUpdate = () =>
  GQL.usePerformerUpdateMutation({
    update(cache, result) {
      if (!result.data?.performerUpdate) return;

      evictTypeFields(cache, performerMutationImpactedTypeFields);
      evictQueries(cache, performerMutationImpactedQueries);
    },
  });

export const useBulkPerformerUpdate = (input: GQL.BulkPerformerUpdateInput) =>
  GQL.useBulkPerformerUpdateMutation({
    variables: { input },
    update(cache, result) {
      if (!result.data?.bulkPerformerUpdate) return;

      evictTypeFields(cache, performerMutationImpactedTypeFields);
      evictQueries(cache, performerMutationImpactedQueries);
    },
  });

export const usePerformerDestroy = () =>
  GQL.usePerformerDestroyMutation({
    update(cache, result, { variables }) {
      if (!result.data?.performerDestroy || !variables) return;

      const obj = { __typename: "Performer", id: variables.id };
      deleteObject(cache, obj, GQL.FindPerformerDocument);

      // update stats
      updateStats(cache, "performer_count", -1);

      evictTypeFields(cache, {
        ...performerMutationImpactedTypeFields,
        Performer: ["performer_count"],
        Studio: ["performer_count"],
      });
      evictQueries(cache, [
        ...performerMutationImpactedQueries,
        GQL.FindPerformersDocument, // appears with
        GQL.FindMoviesDocument, // filter by performers
        GQL.FindSceneMarkersDocument, // filter by performers
      ]);
    },
  });

export const usePerformersDestroy = (
  input: GQL.PerformersDestroyMutationVariables
) =>
  GQL.usePerformersDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.performersDestroy) return;

      const { ids } = input;

      let count: number;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          const obj = { __typename: "Performer", id };
          deleteObject(cache, obj, GQL.FindPerformerDocument);
        }
        count = ids.length;
      } else {
        const obj = { __typename: "Performer", id: ids };
        deleteObject(cache, obj, GQL.FindPerformerDocument);
        count = 1;
      }

      // update stats
      updateStats(cache, "performer_count", -count);

      evictTypeFields(cache, {
        ...performerMutationImpactedTypeFields,
        Performer: ["performer_count"],
        Studio: ["performer_count"],
      });
      evictQueries(cache, [
        ...performerMutationImpactedQueries,
        GQL.FindPerformersDocument, // appears with
        GQL.FindMoviesDocument, // filter by performers
        GQL.FindSceneMarkersDocument, // filter by performers
      ]);
    },
  });

const studioMutationImpactedTypeFields = {
  Studio: ["child_studios"],
};

export const studioMutationImpactedQueries = [
  GQL.FindScenesDocument, // filter by studio
  GQL.FindImagesDocument, // filter by studio
  GQL.FindMoviesDocument, // filter by studio
  GQL.FindGalleriesDocument, // filter by studio
  GQL.FindPerformersDocument, // filter by studio
  GQL.FindStudiosDocument, // various filters
];

export const useStudioCreate = () =>
  GQL.useStudioCreateMutation({
    update(cache, result, { variables }) {
      const studio = result.data?.studioCreate;
      if (!studio || !variables) return;

      appendObject(cache, studio, GQL.AllStudiosForFilterDocument);

      // update stats
      updateStats(cache, "studio_count", 1);

      // if new scene has a parent studio,
      // refetch the parent's list of child studios
      const { parent_id } = variables.input;
      if (parent_id !== undefined) {
        cache.evict({
          id: cache.identify({ __typename: "Studio", id: parent_id }),
          fieldName: "child_studios",
        });
      }

      evictQueries(cache, [
        GQL.FindStudiosDocument, // various filters
      ]);
    },
  });

export const useStudioUpdate = () =>
  GQL.useStudioUpdateMutation({
    update(cache, result) {
      const studio = result.data?.studioUpdate;
      if (!studio) return;

      const obj = { __typename: "Studio", id: studio.id };
      evictTypeFields(
        cache,
        studioMutationImpactedTypeFields,
        cache.identify(obj) // don't evict this studio
      );

      evictQueries(cache, studioMutationImpactedQueries);
    },
  });

export const useStudioDestroy = (input: GQL.StudioDestroyInput) =>
  GQL.useStudioDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.studioDestroy) return;

      const obj = { __typename: "Studio", id: input.id };
      deleteObject(cache, obj, GQL.FindStudioDocument);

      // update stats
      updateStats(cache, "studio_count", -1);

      evictTypeFields(cache, studioMutationImpactedTypeFields);
      evictQueries(cache, studioMutationImpactedQueries);
    },
  });

export const useStudiosDestroy = (input: GQL.StudiosDestroyMutationVariables) =>
  GQL.useStudiosDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.studiosDestroy) return;

      const { ids } = input;

      for (const id of ids) {
        const obj = { __typename: "Studio", id };
        deleteObject(cache, obj, GQL.FindStudioDocument);
      }

      // update stats
      updateStats(cache, "studio_count", -ids.length);

      evictTypeFields(cache, studioMutationImpactedTypeFields);
      evictQueries(cache, studioMutationImpactedQueries);
    },
  });

const tagMutationImpactedTypeFields = {
  Tag: ["parents", "children"],
};

const tagMutationImpactedQueries = [
  GQL.FindScenesDocument, // filter by tags
  GQL.FindImagesDocument, // filter by tags
  GQL.FindGalleriesDocument, // filter by tags
  GQL.FindPerformersDocument, // filter by tags
  GQL.FindTagsDocument, // various filters
];

export const useTagCreate = () =>
  GQL.useTagCreateMutation({
    update(cache, result) {
      const tag = result.data?.tagCreate;
      if (!tag) return;

      appendObject(cache, tag, GQL.AllTagsForFilterDocument);

      // update stats
      updateStats(cache, "tag_count", 1);

      const obj = { __typename: "Tag", id: tag.id };
      evictTypeFields(
        cache,
        tagMutationImpactedTypeFields,
        cache.identify(obj) // don't evict this tag
      );

      evictQueries(cache, [
        GQL.FindTagsDocument, // various filters
      ]);
    },
  });

export const useTagUpdate = () =>
  GQL.useTagUpdateMutation({
    update(cache, result) {
      const tag = result.data?.tagUpdate;
      if (!tag) return;

      const obj = { __typename: "Tag", id: tag.id };
      evictTypeFields(
        cache,
        tagMutationImpactedTypeFields,
        cache.identify(obj) // don't evict this tag
      );

      evictQueries(cache, tagMutationImpactedQueries);
    },
  });

export const useTagDestroy = (input: GQL.TagDestroyInput) =>
  GQL.useTagDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.tagDestroy) return;

      const obj = { __typename: "Tag", id: input.id };
      deleteObject(cache, obj, GQL.FindTagDocument);

      // update stats
      updateStats(cache, "tag_count", -1);

      evictTypeFields(cache, tagMutationImpactedTypeFields);
      evictQueries(cache, tagMutationImpactedQueries);
    },
  });

export const useTagsDestroy = (input: GQL.TagsDestroyMutationVariables) =>
  GQL.useTagsDestroyMutation({
    variables: input,
    update(cache, result) {
      if (!result.data?.tagsDestroy) return;

      const { ids } = input;

      for (const id of ids) {
        const obj = { __typename: "Tag", id };
        deleteObject(cache, obj, GQL.FindTagDocument);
      }

      // update stats
      updateStats(cache, "tag_count", -ids.length);

      evictTypeFields(cache, tagMutationImpactedTypeFields);
      evictQueries(cache, tagMutationImpactedQueries);
    },
  });

export const useTagsMerge = () =>
  GQL.useTagsMergeMutation({
    update(cache, result, { variables }) {
      if (!result.data?.tagsMerge || !variables) return;

      const { source, destination } = variables;

      for (const id of source) {
        const obj = { __typename: "Tag", id };
        deleteObject(cache, obj, GQL.FindTagDocument);
      }

      updateStats(cache, "tag_count", -source.length);

      const obj = { __typename: "Tag", id: destination };
      evictTypeFields(
        cache,
        tagMutationImpactedTypeFields,
        cache.identify(obj) // don't evict destination tag
      );

      evictQueries(cache, tagMutationImpactedQueries);
    },
  });

export const useSaveFilter = () =>
  GQL.useSaveFilterMutation({
    update(cache, result) {
      if (!result.data?.saveFilter) return;

      evictQueries(cache, [GQL.FindSavedFiltersDocument]);
    },
  });

export const useSetDefaultFilter = () =>
  GQL.useSetDefaultFilterMutation({
    update(cache, result) {
      if (!result.data?.setDefaultFilter) return;

      evictQueries(cache, [GQL.FindDefaultFilterDocument]);
    },
  });

export const useSavedFilterDestroy = () =>
  GQL.useDestroySavedFilterMutation({
    update(cache, result, { variables }) {
      if (!result.data?.destroySavedFilter || !variables) return;

      const obj = { __typename: "SavedFilter", id: variables.input.id };
      deleteObject(cache, obj, GQL.FindSavedFilterDocument);

      evictQueries(cache, [GQL.FindDefaultFilterDocument]);
    },
  });

export const mutateDeleteFiles = (ids: string[]) =>
  client.mutate<GQL.DeleteFilesMutation>({
    mutation: GQL.DeleteFilesDocument,
    variables: { ids },
    update(cache, result) {
      if (!result.data?.deleteFiles) return;

      // we don't know which type the files are,
      // so evict all of them
      for (const id of ids) {
        cache.evict({
          id: cache.identify({ __typename: "VideoFile", id }),
        });
        cache.evict({
          id: cache.identify({ __typename: "ImageFile", id }),
        });
        cache.evict({
          id: cache.identify({ __typename: "GalleryFile", id }),
        });
      }

      evictQueries(cache, [
        GQL.FindScenesDocument, // filter by file count
        GQL.FindImagesDocument, // filter by file count
        GQL.FindGalleriesDocument, // filter by file count
        GQL.StatsDocument, // scenes size, images size
      ]);
    },
  });

/// Scrapers

export const useListSceneScrapers = () => GQL.useListSceneScrapersQuery();

export const queryScrapeScene = (
  source: GQL.ScraperSourceInput,
  sceneId: string
) =>
  client.query<GQL.ScrapeSingleSceneQuery>({
    query: GQL.ScrapeSingleSceneDocument,
    variables: {
      source,
      input: {
        scene_id: sceneId,
      },
    },
    fetchPolicy: "network-only",
  });

export const queryScrapeSceneQuery = (
  source: GQL.ScraperSourceInput,
  q: string
) =>
  client.query<GQL.ScrapeSingleSceneQuery>({
    query: GQL.ScrapeSingleSceneDocument,
    variables: {
      source,
      input: {
        query: q,
      },
    },
    fetchPolicy: "network-only",
  });

export const queryScrapeSceneURL = (url: string) =>
  client.query<GQL.ScrapeSceneUrlQuery>({
    query: GQL.ScrapeSceneUrlDocument,
    variables: { url },
    fetchPolicy: "network-only",
  });

export const queryScrapeSceneQueryFragment = (
  source: GQL.ScraperSourceInput,
  input: GQL.ScrapedSceneInput
) =>
  client.query<GQL.ScrapeSingleSceneQuery>({
    query: GQL.ScrapeSingleSceneDocument,
    variables: {
      source,
      input: {
        scene_input: input,
      },
    },
    fetchPolicy: "network-only",
  });

export const stashBoxSceneBatchQuery = (
  sceneIds: string[],
  stashBoxIndex: number
) =>
  client.query<GQL.ScrapeMultiScenesQuery>({
    query: GQL.ScrapeMultiScenesDocument,
    variables: {
      source: {
        stash_box_index: stashBoxIndex,
      },
      input: {
        scene_ids: sceneIds,
      },
    },
  });

export const useListPerformerScrapers = () =>
  GQL.useListPerformerScrapersQuery();

export const useScrapePerformerList = (scraperId: string, q: string) =>
  GQL.useScrapeSinglePerformerQuery({
    variables: {
      source: {
        scraper_id: scraperId,
      },
      input: {
        query: q,
      },
    },
    skip: q === "",
  });

export const queryScrapePerformer = (
  scraperId: string,
  scrapedPerformer: GQL.ScrapedPerformerInput
) =>
  client.query<GQL.ScrapeSinglePerformerQuery>({
    query: GQL.ScrapeSinglePerformerDocument,
    variables: {
      source: {
        scraper_id: scraperId,
      },
      input: {
        performer_input: scrapedPerformer,
      },
    },
    fetchPolicy: "network-only",
  });

export const queryScrapePerformerURL = (url: string) =>
  client.query<GQL.ScrapePerformerUrlQuery>({
    query: GQL.ScrapePerformerUrlDocument,
    variables: { url },
    fetchPolicy: "network-only",
  });

export const stashBoxPerformerQuery = (
  searchVal: string,
  stashBoxIndex: number
) =>
  client.query<GQL.ScrapeSinglePerformerQuery>({
    query: GQL.ScrapeSinglePerformerDocument,
    variables: {
      source: {
        stash_box_index: stashBoxIndex,
      },
      input: {
        query: searchVal,
      },
    },
    fetchPolicy: "network-only",
  });

export const stashBoxStudioQuery = (
  query: string | null,
  stashBoxIndex: number
) =>
  client.query<GQL.ScrapeSingleStudioQuery>({
    query: GQL.ScrapeSingleStudioDocument,
    variables: {
      source: {
        stash_box_index: stashBoxIndex,
      },
      input: {
        query: query,
      },
    },
    fetchPolicy: "network-only",
  });

export const mutateStashBoxBatchPerformerTag = (
  input: GQL.StashBoxBatchTagInput
) =>
  client.mutate<GQL.StashBoxBatchPerformerTagMutation>({
    mutation: GQL.StashBoxBatchPerformerTagDocument,
    variables: { input },
  });

export const mutateStashBoxBatchStudioTag = (
  input: GQL.StashBoxBatchTagInput
) =>
  client.mutate<GQL.StashBoxBatchStudioTagMutation>({
    mutation: GQL.StashBoxBatchStudioTagDocument,
    variables: { input },
  });

export const useListMovieScrapers = () => GQL.useListMovieScrapersQuery();

export const queryScrapeMovieURL = (url: string) =>
  client.query<GQL.ScrapeMovieUrlQuery>({
    query: GQL.ScrapeMovieUrlDocument,
    variables: { url },
    fetchPolicy: "network-only",
  });

export const useListGalleryScrapers = () => GQL.useListGalleryScrapersQuery();

export const queryScrapeGallery = (scraperId: string, galleryId: string) =>
  client.query<GQL.ScrapeSingleGalleryQuery>({
    query: GQL.ScrapeSingleGalleryDocument,
    variables: {
      source: {
        scraper_id: scraperId,
      },
      input: {
        gallery_id: galleryId,
      },
    },
    fetchPolicy: "network-only",
  });

export const queryScrapeGalleryURL = (url: string) =>
  client.query<GQL.ScrapeGalleryUrlQuery>({
    query: GQL.ScrapeGalleryUrlDocument,
    variables: { url },
    fetchPolicy: "network-only",
  });

/// Configuration

export const useConfiguration = () => GQL.useConfigurationQuery();

export const usePlugins = () => GQL.usePluginsQuery();

export const usePluginTasks = () => GQL.usePluginTasksQuery();

export const useStats = () => GQL.useStatsQuery();

export const useVersion = () => GQL.useVersionQuery();

export const useLatestVersion = () =>
  GQL.useLatestVersionQuery({
    notifyOnNetworkStatusChange: true,
    errorPolicy: "ignore",
  });

export const useDLNAStatus = () =>
  GQL.useDlnaStatusQuery({
    fetchPolicy: "no-cache",
  });

export const useJobQueue = () =>
  GQL.useJobQueueQuery({
    fetchPolicy: "no-cache",
  });

export const useLogs = () =>
  GQL.useLogsQuery({
    fetchPolicy: "no-cache",
  });

export const queryLogs = () =>
  client.query<GQL.LogsQuery>({
    query: GQL.LogsDocument,
    fetchPolicy: "no-cache",
  });

export const useSystemStatus = () => GQL.useSystemStatusQuery();

export const useJobsSubscribe = () => GQL.useJobsSubscribeSubscription();

export const useLoggingSubscribe = () => GQL.useLoggingSubscribeSubscription();

function updateConfiguration(cache: ApolloCache<unknown>, result: FetchResult) {
  if (!result.data) return;

  evictQueries(cache, [GQL.ConfigurationDocument]);
}

export const useConfigureGeneral = () =>
  GQL.useConfigureGeneralMutation({
    update: updateConfiguration,
  });

export const useConfigureInterface = () =>
  GQL.useConfigureInterfaceMutation({
    update: updateConfiguration,
  });

export const useGenerateAPIKey = () =>
  GQL.useGenerateApiKeyMutation({
    update: updateConfiguration,
  });

export const useConfigureDefaults = () =>
  GQL.useConfigureDefaultsMutation({
    update: updateConfiguration,
  });

export const useConfigureUI = () =>
  GQL.useConfigureUiMutation({
    update: updateConfiguration,
  });

export const useConfigureScraping = () =>
  GQL.useConfigureScrapingMutation({
    update: updateConfiguration,
  });

export const useConfigureDLNA = () =>
  GQL.useConfigureDlnaMutation({
    update: updateConfiguration,
  });

export const useEnableDLNA = () => GQL.useEnableDlnaMutation();

export const useDisableDLNA = () => GQL.useDisableDlnaMutation();

export const useAddTempDLNAIP = () => GQL.useAddTempDlnaipMutation();

export const useRemoveTempDLNAIP = () => GQL.useRemoveTempDlnaipMutation();

export const mutateReloadScrapers = () =>
  client.mutate<GQL.ReloadScrapersMutation>({
    mutation: GQL.ReloadScrapersDocument,
    refetchQueries: [
      GQL.refetchListMovieScrapersQuery(),
      GQL.refetchListPerformerScrapersQuery(),
      GQL.refetchListSceneScrapersQuery(),
    ],
  });

export const mutateReloadPlugins = () =>
  client.mutate<GQL.ReloadPluginsMutation>({
    mutation: GQL.ReloadPluginsDocument,
    refetchQueries: [GQL.refetchPluginsQuery(), GQL.refetchPluginTasksQuery()],
  });

export const mutateStopJob = (jobID: string) =>
  client.mutate<GQL.StopJobMutation>({
    mutation: GQL.StopJobDocument,
    variables: { job_id: jobID },
  });

const setupMutationImpactedQueries = [
  GQL.ConfigurationDocument,
  GQL.SystemStatusDocument,
];

export const mutateSetup = (input: GQL.SetupInput) =>
  client.mutate<GQL.SetupMutation>({
    mutation: GQL.SetupDocument,
    variables: { input },
    update(cache, result) {
      if (!result.data?.setup) return;

      evictQueries(cache, setupMutationImpactedQueries);
    },
  });

export const mutateMigrate = (input: GQL.MigrateInput) =>
  client.mutate<GQL.MigrateMutation>({
    mutation: GQL.MigrateDocument,
    variables: { input },
    update(cache, result) {
      if (!result.data?.migrate) return;

      evictQueries(cache, setupMutationImpactedQueries);
    },
  });

/// Tasks

export const mutateMetadataScan = (input: GQL.ScanMetadataInput) =>
  client.mutate<GQL.MetadataScanMutation>({
    mutation: GQL.MetadataScanDocument,
    variables: { input },
  });

export const mutateMetadataIdentify = (input: GQL.IdentifyMetadataInput) =>
  client.mutate<GQL.MetadataIdentifyMutation>({
    mutation: GQL.MetadataIdentifyDocument,
    variables: { input },
  });

export const mutateMetadataAutoTag = (input: GQL.AutoTagMetadataInput) =>
  client.mutate<GQL.MetadataAutoTagMutation>({
    mutation: GQL.MetadataAutoTagDocument,
    variables: { input },
  });

export const mutateMetadataGenerate = (input: GQL.GenerateMetadataInput) =>
  client.mutate<GQL.MetadataGenerateMutation>({
    mutation: GQL.MetadataGenerateDocument,
    variables: { input },
  });

export const mutateMetadataClean = (input: GQL.CleanMetadataInput) =>
  client.mutate<GQL.MetadataCleanMutation>({
    mutation: GQL.MetadataCleanDocument,
    variables: { input },
  });

export const mutateRunPluginTask = (
  pluginId: string,
  taskName: string,
  args?: GQL.PluginArgInput[]
) =>
  client.mutate<GQL.RunPluginTaskMutation>({
    mutation: GQL.RunPluginTaskDocument,
    variables: { plugin_id: pluginId, task_name: taskName, args },
  });

export const mutateMetadataExport = () =>
  client.mutate<GQL.MetadataExportMutation>({
    mutation: GQL.MetadataExportDocument,
  });

export const mutateExportObjects = (input: GQL.ExportObjectsInput) =>
  client.mutate<GQL.ExportObjectsMutation>({
    mutation: GQL.ExportObjectsDocument,
    variables: { input },
  });

export const mutateMetadataImport = () =>
  client.mutate<GQL.MetadataImportMutation>({
    mutation: GQL.MetadataImportDocument,
  });

export const mutateImportObjects = (input: GQL.ImportObjectsInput) =>
  client.mutate<GQL.ImportObjectsMutation>({
    mutation: GQL.ImportObjectsDocument,
    variables: { input },
  });

export const mutateBackupDatabase = (input: GQL.BackupDatabaseInput) =>
  client.mutate<GQL.BackupDatabaseMutation>({
    mutation: GQL.BackupDatabaseDocument,
    variables: { input },
  });

export const mutateAnonymiseDatabase = (input: GQL.AnonymiseDatabaseInput) =>
  client.mutate<GQL.AnonymiseDatabaseMutation>({
    mutation: GQL.AnonymiseDatabaseDocument,
    variables: { input },
  });

export const mutateOptimiseDatabase = () =>
  client.mutate<GQL.OptimiseDatabaseMutation>({
    mutation: GQL.OptimiseDatabaseDocument,
  });

export const mutateMigrateHashNaming = () =>
  client.mutate<GQL.MigrateHashNamingMutation>({
    mutation: GQL.MigrateHashNamingDocument,
  });

export const mutateMigrateSceneScreenshots = (
  input: GQL.MigrateSceneScreenshotsInput
) =>
  client.mutate<GQL.MigrateSceneScreenshotsMutation>({
    mutation: GQL.MigrateSceneScreenshotsDocument,
    variables: { input },
  });

export const mutateMigrateBlobs = (input: GQL.MigrateBlobsInput) =>
  client.mutate<GQL.MigrateBlobsMutation>({
    mutation: GQL.MigrateBlobsDocument,
    variables: { input },
  });

/// Misc

export const useDirectory = (path?: string) =>
  GQL.useDirectoryQuery({ variables: { path } });

export const queryParseSceneFilenames = (
  filter: GQL.FindFilterType,
  config: GQL.SceneParserInput
) =>
  client.query<GQL.ParseSceneFilenamesQuery>({
    query: GQL.ParseSceneFilenamesDocument,
    variables: { filter, config },
    fetchPolicy: "network-only",
  });

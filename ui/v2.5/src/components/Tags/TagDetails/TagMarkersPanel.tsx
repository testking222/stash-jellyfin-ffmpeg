import React from "react";
import * as GQL from "src/core/generated-graphql";
import { ListFilterModel } from "src/models/list-filter/filter";
import {
  TagsCriterion,
  TagsCriterionOption,
} from "src/models/list-filter/criteria/tags";
import { SceneMarkerList } from "src/components/Scenes/SceneMarkerList";

interface ITagMarkersPanel {
  active: boolean;
  tag: GQL.TagDataFragment;
}

export const TagMarkersPanel: React.FC<ITagMarkersPanel> = ({
  active,
  tag,
}) => {
  function filterHook(filter: ListFilterModel) {
    const tagValue = { id: tag.id, label: tag.name };
    // if tag is already present, then we modify it, otherwise add
    let tagCriterion = filter.criteria.find((c) => {
      return c.criterionOption.type === "tags";
    }) as TagsCriterion | undefined;

    if (
      tagCriterion &&
      (tagCriterion.modifier === GQL.CriterionModifier.IncludesAll ||
        tagCriterion.modifier === GQL.CriterionModifier.Includes)
    ) {
      // add the tag if not present
      if (
        !tagCriterion.value.items.find((p) => {
          return p.id === tag.id;
        })
      ) {
        tagCriterion.value.items.push(tagValue);
      }

      tagCriterion.modifier = GQL.CriterionModifier.IncludesAll;
    } else {
      // overwrite
      tagCriterion = new TagsCriterion(TagsCriterionOption);
      tagCriterion.value = {
        items: [tagValue],
        excluded: [],
        depth: 0,
      };
      filter.criteria.push(tagCriterion);
    }

    return filter;
  }

  return <SceneMarkerList filterHook={filterHook} alterQuery={active} />;
};

import React, { useEffect, useMemo, useRef } from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import { Link, useHistory } from "react-router-dom";
import cx from "classnames";
import * as GQL from "src/core/generated-graphql";
import { Icon } from "../Shared/Icon";
import {
  GalleryLink,
  TagLink,
  MovieLink,
  SceneMarkerLink,
} from "../Shared/TagLink";
import { HoverPopover } from "../Shared/HoverPopover";
import { SweatDrops } from "../Shared/SweatDrops";
import { TruncatedText } from "../Shared/TruncatedText";
import NavUtils from "src/utils/navigation";
import TextUtils from "src/utils/text";
import { SceneQueue } from "src/models/sceneQueue";
import { ConfigurationContext } from "src/hooks/Config";
import { PerformerPopoverButton } from "../Shared/PerformerPopoverButton";
import { GridCard } from "../Shared/GridCard";
import { RatingBanner } from "../Shared/RatingBanner";
import { FormattedNumber } from "react-intl";
import {
  faBox,
  faCopy,
  faFilm,
  faImages,
  faMapMarkerAlt,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import { objectPath, objectTitle } from "src/core/files";
import { PreviewScrubber } from "./PreviewScrubber";

interface IScenePreviewProps {
  isPortrait: boolean;
  image?: string;
  video?: string;
  soundActive: boolean;
  vttPath?: string;
  onScrubberClick?: (timestamp: number) => void;
}

export const ScenePreview: React.FC<IScenePreviewProps> = ({
  image,
  video,
  isPortrait,
  soundActive,
  vttPath,
  onScrubberClick,
}) => {
  const videoEl = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio > 0)
          // Catch is necessary due to DOMException if user hovers before clicking on page
          videoEl.current?.play()?.catch(() => {});
        else videoEl.current?.pause();
      });
    });

    if (videoEl.current) observer.observe(videoEl.current);
  });

  useEffect(() => {
    if (videoEl?.current?.volume)
      videoEl.current.volume = soundActive ? 0.05 : 0;
  }, [soundActive]);

  return (
    <div className={cx("scene-card-preview", { portrait: isPortrait })}>
      <img className="scene-card-preview-image" src={image} alt="" />
      <video
        disableRemotePlayback
        playsInline
        muted={!soundActive}
        className="scene-card-preview-video"
        loop
        preload="none"
        ref={videoEl}
        src={video}
      />
      <PreviewScrubber vttPath={vttPath} onClick={onScrubberClick} />
    </div>
  );
};

interface ISceneCardProps {
  scene: GQL.SlimSceneDataFragment;
  index?: number;
  queue?: SceneQueue;
  compact?: boolean;
  selecting?: boolean;
  selected?: boolean | undefined;
  zoomIndex?: number;
  onSelectedChanged?: (selected: boolean, shiftKey: boolean) => void;
}

export const SceneCard: React.FC<ISceneCardProps> = (
  props: ISceneCardProps
) => {
  const history = useHistory();
  const { configuration } = React.useContext(ConfigurationContext);

  const file = useMemo(
    () => (props.scene.files.length > 0 ? props.scene.files[0] : undefined),
    [props.scene]
  );

  function maybeRenderSceneSpecsOverlay() {
    let sizeObj = null;
    if (file?.size) {
      sizeObj = TextUtils.fileSize(file.size);
    }
    return (
      <div className="scene-specs-overlay">
        {sizeObj != null ? (
          <span className="overlay-filesize extra-scene-info">
            <FormattedNumber
              value={sizeObj.size}
              maximumFractionDigits={TextUtils.fileSizeFractionalDigits(
                sizeObj.unit
              )}
            />
            {TextUtils.formatFileSizeUnit(sizeObj.unit)}
          </span>
        ) : (
          ""
        )}
        {file?.width && file?.height ? (
          <span className="overlay-resolution">
            {" "}
            {TextUtils.resolution(file?.width, file?.height)}
          </span>
        ) : (
          ""
        )}
        {(file?.duration ?? 0) >= 1
          ? TextUtils.secondsToTimestamp(file?.duration ?? 0)
          : ""}
      </div>
    );
  }

  function maybeRenderInteractiveSpeedOverlay() {
    return (
      <div className="scene-interactive-speed-overlay">
        {props.scene.interactive_speed ?? ""}
      </div>
    );
  }

  function renderStudioThumbnail() {
    const studioImage = props.scene.studio?.image_path;
    const studioName = props.scene.studio?.name;

    if (configuration?.interface.showStudioAsText || !studioImage) {
      return studioName;
    }

    const studioImageURL = new URL(studioImage);
    if (studioImageURL.searchParams.get("default") === "true") {
      return studioName;
    }

    return (
      <img className="image-thumbnail" alt={studioName} src={studioImage} />
    );
  }

  function maybeRenderSceneStudioOverlay() {
    if (!props.scene.studio) return;

    return (
      <div className="scene-studio-overlay">
        <Link to={`/studios/${props.scene.studio.id}`}>
          {renderStudioThumbnail()}
        </Link>
      </div>
    );
  }

  function maybeRenderTagPopoverButton() {
    if (props.scene.tags.length <= 0) return;

    const popoverContent = props.scene.tags.map((tag) => (
      <TagLink key={tag.id} tag={tag} />
    ));

    return (
      <HoverPopover
        className="tag-count"
        placement="bottom"
        content={popoverContent}
      >
        <Button className="minimal">
          <Icon icon={faTag} />
          <span>{props.scene.tags.length}</span>
        </Button>
      </HoverPopover>
    );
  }

  function maybeRenderPerformerPopoverButton() {
    if (props.scene.performers.length <= 0) return;

    return <PerformerPopoverButton performers={props.scene.performers} />;
  }

  function maybeRenderMoviePopoverButton() {
    if (props.scene.movies.length <= 0) return;

    const popoverContent = props.scene.movies.map((sceneMovie) => (
      <div className="movie-tag-container row" key="movie">
        <Link
          to={`/movies/${sceneMovie.movie.id}`}
          className="movie-tag col m-auto zoom-2"
        >
          <img
            className="image-thumbnail"
            alt={sceneMovie.movie.name ?? ""}
            src={sceneMovie.movie.front_image_path ?? ""}
          />
        </Link>
        <MovieLink
          key={sceneMovie.movie.id}
          movie={sceneMovie.movie}
          className="d-block"
        />
      </div>
    ));

    return (
      <HoverPopover
        placement="bottom"
        content={popoverContent}
        className="movie-count tag-tooltip"
      >
        <Button className="minimal">
          <Icon icon={faFilm} />
          <span>{props.scene.movies.length}</span>
        </Button>
      </HoverPopover>
    );
  }

  function maybeRenderSceneMarkerPopoverButton() {
    if (props.scene.scene_markers.length <= 0) return;

    const popoverContent = props.scene.scene_markers.map((marker) => {
      const markerWithScene = { ...marker, scene: { id: props.scene.id } };
      return <SceneMarkerLink key={marker.id} marker={markerWithScene} />;
    });

    return (
      <HoverPopover
        className="marker-count"
        placement="bottom"
        content={popoverContent}
      >
        <Button className="minimal">
          <Icon icon={faMapMarkerAlt} />
          <span>{props.scene.scene_markers.length}</span>
        </Button>
      </HoverPopover>
    );
  }

  function maybeRenderOCounter() {
    if (props.scene.o_counter) {
      return (
        <div className="o-count">
          <Button className="minimal">
            <span className="fa-icon">
              <SweatDrops />
            </span>
            <span>{props.scene.o_counter}</span>
          </Button>
        </div>
      );
    }
  }

  function maybeRenderGallery() {
    if (props.scene.galleries.length <= 0) return;

    const popoverContent = props.scene.galleries.map((gallery) => (
      <GalleryLink key={gallery.id} gallery={gallery} />
    ));

    return (
      <HoverPopover
        className="gallery-count"
        placement="bottom"
        content={popoverContent}
      >
        <Button className="minimal">
          <Icon icon={faImages} />
          <span>{props.scene.galleries.length}</span>
        </Button>
      </HoverPopover>
    );
  }

  function maybeRenderOrganized() {
    if (props.scene.organized) {
      return (
        <div className="organized">
          <Button className="minimal">
            <Icon icon={faBox} />
          </Button>
        </div>
      );
    }
  }

  function maybeRenderDupeCopies() {
    const phash = file
      ? file.fingerprints.find((fp) => fp.type === "phash")
      : undefined;

    if (phash) {
      return (
        <div className="other-copies extra-scene-info">
          <Button
            href={NavUtils.makeScenesPHashMatchUrl(phash.value)}
            className="minimal"
          >
            <Icon icon={faCopy} />
          </Button>
        </div>
      );
    }
  }

  function maybeRenderPopoverButtonGroup() {
    if (
      !props.compact &&
      (props.scene.tags.length > 0 ||
        props.scene.performers.length > 0 ||
        props.scene.movies.length > 0 ||
        props.scene.scene_markers.length > 0 ||
        props.scene?.o_counter ||
        props.scene.galleries.length > 0 ||
        props.scene.organized)
    ) {
      return (
        <>
          <hr />
          <ButtonGroup className="card-popovers">
            {maybeRenderTagPopoverButton()}
            {maybeRenderPerformerPopoverButton()}
            {maybeRenderMoviePopoverButton()}
            {maybeRenderSceneMarkerPopoverButton()}
            {maybeRenderOCounter()}
            {maybeRenderGallery()}
            {maybeRenderOrganized()}
            {maybeRenderDupeCopies()}
          </ButtonGroup>
        </>
      );
    }
  }

  function isPortrait() {
    const width = file?.width ? file.width : 0;
    const height = file?.height ? file.height : 0;
    return height > width;
  }

  function zoomIndex() {
    if (!props.compact && props.zoomIndex !== undefined) {
      return `zoom-${props.zoomIndex}`;
    }

    return "";
  }

  function filelessClass() {
    if (!props.scene.files.length) {
      return "fileless";
    }

    return "";
  }

  const cont = configuration?.interface.continuePlaylistDefault ?? false;

  const sceneLink = props.queue
    ? props.queue.makeLink(props.scene.id, {
        sceneIndex: props.index,
        continue: cont,
      })
    : `/scenes/${props.scene.id}`;

  function onScrubberClick(timestamp: number) {
    const link = props.queue
      ? props.queue.makeLink(props.scene.id, {
          sceneIndex: props.index,
          continue: cont,
          start: timestamp,
        })
      : `/scenes/${props.scene.id}?t=${timestamp}`;

    history.push(link);
  }

  return (
    <GridCard
      className={`scene-card ${zoomIndex()} ${filelessClass()}`}
      url={sceneLink}
      title={objectTitle(props.scene)}
      linkClassName="scene-card-link"
      thumbnailSectionClassName="video-section"
      resumeTime={props.scene.resume_time ?? undefined}
      duration={file?.duration ?? undefined}
      interactiveHeatmap={
        props.scene.interactive_speed
          ? props.scene.paths.interactive_heatmap ?? undefined
          : undefined
      }
      image={
        <>
          <ScenePreview
            image={props.scene.paths.screenshot ?? undefined}
            video={props.scene.paths.preview ?? undefined}
            isPortrait={isPortrait()}
            soundActive={configuration?.interface?.soundOnPreview ?? false}
            vttPath={props.scene.paths.vtt ?? undefined}
            onScrubberClick={onScrubberClick}
          />
          <RatingBanner rating={props.scene.rating100} />
          {maybeRenderSceneSpecsOverlay()}
          {maybeRenderInteractiveSpeedOverlay()}
        </>
      }
      overlays={maybeRenderSceneStudioOverlay()}
      details={
        <div className="scene-card__details">
          <span className="scene-card__date">{props.scene.date}</span>
          <span className="file-path extra-scene-info">
            {objectPath(props.scene)}
          </span>
          <TruncatedText
            className="scene-card__description"
            text={props.scene.details}
            lineCount={3}
          />
        </div>
      }
      popovers={maybeRenderPopoverButtonGroup()}
      selected={props.selected}
      selecting={props.selecting}
      onSelectedChanged={props.onSelectedChanged}
    />
  );
};

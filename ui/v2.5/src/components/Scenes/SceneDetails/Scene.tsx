import { Tab, Nav, Dropdown, Button, ButtonGroup } from "react-bootstrap";
import React, {
  useEffect,
  useState,
  useMemo,
  useContext,
  useRef,
  useLayoutEffect,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, RouteComponentProps } from "react-router-dom";
import { Helmet } from "react-helmet";
import * as GQL from "src/core/generated-graphql";
import {
  mutateMetadataScan,
  useFindScene,
  useSceneIncrementO,
  useSceneDecrementO,
  useSceneResetO,
  useSceneGenerateScreenshot,
  useSceneUpdate,
  queryFindScenes,
  queryFindScenesByID,
} from "src/core/StashService";

import { ErrorMessage } from "src/components/Shared/ErrorMessage";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { Icon } from "src/components/Shared/Icon";
import { Counter } from "src/components/Shared/Counter";
import { useToast } from "src/hooks/Toast";
import SceneQueue, { QueuedScene } from "src/models/sceneQueue";
import { ListFilterModel } from "src/models/list-filter/filter";
import Mousetrap from "mousetrap";
import { OCounterButton } from "./OCounterButton";
import { OrganizedButton } from "./OrganizedButton";
import { ConfigurationContext } from "src/hooks/Config";
import { getPlayerPosition } from "src/components/ScenePlayer/util";
import {
  faEllipsisV,
  faChevronRight,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";
import { lazyComponent } from "src/utils/lazyComponent";

const SubmitStashBoxDraft = lazyComponent(
  () => import("src/components/Dialogs/SubmitDraft")
);
const ScenePlayer = lazyComponent(
  () => import("src/components/ScenePlayer/ScenePlayer")
);

const GalleryViewer = lazyComponent(
  () => import("src/components/Galleries/GalleryViewer")
);
const ExternalPlayerButton = lazyComponent(
  () => import("./ExternalPlayerButton")
);

const QueueViewer = lazyComponent(() => import("./QueueViewer"));
const SceneMarkersPanel = lazyComponent(() => import("./SceneMarkersPanel"));
const SceneFileInfoPanel = lazyComponent(() => import("./SceneFileInfoPanel"));
const SceneEditPanel = lazyComponent(() => import("./SceneEditPanel"));
const SceneDetailPanel = lazyComponent(() => import("./SceneDetailPanel"));
const SceneMoviePanel = lazyComponent(() => import("./SceneMoviePanel"));
const SceneGalleriesPanel = lazyComponent(
  () => import("./SceneGalleriesPanel")
);
const DeleteScenesDialog = lazyComponent(() => import("../DeleteScenesDialog"));
const GenerateDialog = lazyComponent(
  () => import("../../Dialogs/GenerateDialog")
);
const SceneVideoFilterPanel = lazyComponent(
  () => import("./SceneVideoFilterPanel")
);
import { objectPath, objectTitle } from "src/core/files";

interface IProps {
  scene: GQL.SceneDataFragment;
  setTimestamp: (num: number) => void;
  queueScenes: QueuedScene[];
  onQueueNext: () => void;
  onQueuePrevious: () => void;
  onQueueRandom: () => void;
  onDelete: () => void;
  continuePlaylist: boolean;
  loadScene: (sceneID: string) => void;
  queueHasMoreScenes: () => boolean;
  onQueueMoreScenes: () => void;
  onQueueLessScenes: () => void;
  queueStart: number;
  collapsed: boolean;
  setCollapsed: (state: boolean) => void;
  setContinuePlaylist: (value: boolean) => void;
}

interface ISceneParams {
  id: string;
}

const ScenePage: React.FC<IProps> = ({
  scene,
  setTimestamp,
  queueScenes,
  onQueueNext,
  onQueuePrevious,
  onQueueRandom,
  onDelete,
  continuePlaylist,
  loadScene,
  queueHasMoreScenes,
  onQueueMoreScenes,
  onQueueLessScenes,
  queueStart,
  collapsed,
  setCollapsed,
  setContinuePlaylist,
}) => {
  const Toast = useToast();
  const intl = useIntl();
  const [updateScene] = useSceneUpdate();
  const [generateScreenshot] = useSceneGenerateScreenshot();
  const { configuration } = useContext(ConfigurationContext);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const boxes = configuration?.general?.stashBoxes ?? [];

  const [incrementO] = useSceneIncrementO(scene.id);
  const [decrementO] = useSceneDecrementO(scene.id);
  const [resetO] = useSceneResetO(scene.id);

  const [organizedLoading, setOrganizedLoading] = useState(false);

  const [activeTabKey, setActiveTabKey] = useState("scene-details-panel");

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  const onIncrementClick = async () => {
    try {
      await incrementO();
    } catch (e) {
      Toast.error(e);
    }
  };

  const onDecrementClick = async () => {
    try {
      await decrementO();
    } catch (e) {
      Toast.error(e);
    }
  };

  // set up hotkeys
  useEffect(() => {
    Mousetrap.bind("a", () => setActiveTabKey("scene-details-panel"));
    Mousetrap.bind("q", () => setActiveTabKey("scene-queue-panel"));
    Mousetrap.bind("e", () => setActiveTabKey("scene-edit-panel"));
    Mousetrap.bind("k", () => setActiveTabKey("scene-markers-panel"));
    Mousetrap.bind("i", () => setActiveTabKey("scene-file-info-panel"));
    Mousetrap.bind("o", () => {
      onIncrementClick();
    });
    Mousetrap.bind("p n", () => onQueueNext());
    Mousetrap.bind("p p", () => onQueuePrevious());
    Mousetrap.bind("p r", () => onQueueRandom());
    Mousetrap.bind(",", () => setCollapsed(!collapsed));

    return () => {
      Mousetrap.unbind("a");
      Mousetrap.unbind("q");
      Mousetrap.unbind("e");
      Mousetrap.unbind("k");
      Mousetrap.unbind("i");
      Mousetrap.unbind("o");
      Mousetrap.unbind("p n");
      Mousetrap.unbind("p p");
      Mousetrap.unbind("p r");
      Mousetrap.unbind(",");
    };
  });

  async function onSave(input: GQL.SceneCreateInput) {
    await updateScene({
      variables: {
        input: {
          id: scene.id,
          ...input,
        },
      },
    });
    Toast.success({
      content: intl.formatMessage(
        { id: "toast.updated_entity" },
        { entity: intl.formatMessage({ id: "scene" }).toLocaleLowerCase() }
      ),
    });
  }

  const onOrganizedClick = async () => {
    try {
      setOrganizedLoading(true);
      await updateScene({
        variables: {
          input: {
            id: scene.id,
            organized: !scene.organized,
          },
        },
      });
    } catch (e) {
      Toast.error(e);
    } finally {
      setOrganizedLoading(false);
    }
  };

  const onResetClick = async () => {
    try {
      await resetO();
    } catch (e) {
      Toast.error(e);
    }
  };

  function onClickMarker(marker: GQL.SceneMarkerDataFragment) {
    setTimestamp(marker.seconds);
  }

  async function onRescan() {
    await mutateMetadataScan({
      paths: [objectPath(scene)],
    });

    Toast.success({
      content: intl.formatMessage(
        { id: "toast.rescanning_entity" },
        {
          count: 1,
          singularEntity: intl
            .formatMessage({ id: "scene" })
            .toLocaleLowerCase(),
        }
      ),
    });
  }

  async function onGenerateScreenshot(at?: number) {
    await generateScreenshot({
      variables: {
        id: scene.id,
        at,
      },
    });
    Toast.success({
      content: intl.formatMessage({ id: "toast.generating_screenshot" }),
    });
  }

  function onDeleteDialogClosed(deleted: boolean) {
    setIsDeleteAlertOpen(false);
    if (deleted) {
      onDelete();
    }
  }

  function maybeRenderDeleteDialog() {
    if (isDeleteAlertOpen) {
      return (
        <DeleteScenesDialog selected={[scene]} onClose={onDeleteDialogClosed} />
      );
    }
  }

  function maybeRenderSceneGenerateDialog() {
    if (isGenerateDialogOpen) {
      return (
        <GenerateDialog
          selectedIds={[scene.id]}
          onClose={() => {
            setIsGenerateDialogOpen(false);
          }}
        />
      );
    }
  }

  const renderOperations = () => (
    <Dropdown>
      <Dropdown.Toggle
        variant="secondary"
        id="operation-menu"
        className="minimal"
        title={intl.formatMessage({ id: "operations" })}
      >
        <Icon icon={faEllipsisV} />
      </Dropdown.Toggle>
      <Dropdown.Menu className="bg-secondary text-white">
        {!!scene.files.length && (
          <Dropdown.Item
            key="rescan"
            className="bg-secondary text-white"
            onClick={() => onRescan()}
          >
            <FormattedMessage id="actions.rescan" />
          </Dropdown.Item>
        )}
        <Dropdown.Item
          key="generate"
          className="bg-secondary text-white"
          onClick={() => setIsGenerateDialogOpen(true)}
        >
          <FormattedMessage id="actions.generate" />
        </Dropdown.Item>
        <Dropdown.Item
          key="generate-screenshot"
          className="bg-secondary text-white"
          onClick={() => onGenerateScreenshot(getPlayerPosition())}
        >
          <FormattedMessage id="actions.generate_thumb_from_current" />
        </Dropdown.Item>
        <Dropdown.Item
          key="generate-default"
          className="bg-secondary text-white"
          onClick={() => onGenerateScreenshot()}
        >
          <FormattedMessage id="actions.generate_thumb_default" />
        </Dropdown.Item>
        {boxes.length > 0 && (
          <Dropdown.Item
            key="submit"
            className="bg-secondary text-white"
            onClick={() => setShowDraftModal(true)}
          >
            <FormattedMessage id="actions.submit_stash_box" />
          </Dropdown.Item>
        )}
        <Dropdown.Item
          key="delete-scene"
          className="bg-secondary text-white"
          onClick={() => setIsDeleteAlertOpen(true)}
        >
          <FormattedMessage
            id="actions.delete_entity"
            values={{ entityType: intl.formatMessage({ id: "scene" }) }}
          />
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );

  const renderTabs = () => (
    <Tab.Container
      activeKey={activeTabKey}
      onSelect={(k) => k && setActiveTabKey(k)}
    >
      <div>
        <Nav variant="tabs" className="mr-auto">
          <Nav.Item>
            <Nav.Link eventKey="scene-details-panel">
              <FormattedMessage id="details" />
            </Nav.Link>
          </Nav.Item>
          {(queueScenes ?? []).length > 0 ? (
            <Nav.Item>
              <Nav.Link eventKey="scene-queue-panel">
                <FormattedMessage id="queue" />
              </Nav.Link>
            </Nav.Item>
          ) : (
            ""
          )}
          <Nav.Item>
            <Nav.Link eventKey="scene-markers-panel">
              <FormattedMessage id="markers" />
            </Nav.Link>
          </Nav.Item>
          {scene.movies.length > 0 ? (
            <Nav.Item>
              <Nav.Link eventKey="scene-movie-panel">
                <FormattedMessage
                  id="countables.movies"
                  values={{ count: scene.movies.length }}
                />
              </Nav.Link>
            </Nav.Item>
          ) : (
            ""
          )}
          {scene.galleries.length >= 1 ? (
            <Nav.Item>
              <Nav.Link eventKey="scene-galleries-panel">
                <FormattedMessage
                  id="countables.galleries"
                  values={{ count: scene.galleries.length }}
                />
              </Nav.Link>
            </Nav.Item>
          ) : undefined}
          <Nav.Item>
            <Nav.Link eventKey="scene-video-filter-panel">
              <FormattedMessage id="effect_filters.name" />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="scene-file-info-panel">
              <FormattedMessage id="file_info" />
              <Counter count={scene.files.length} hideZero hideOne />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="scene-edit-panel">
              <FormattedMessage id="actions.edit" />
            </Nav.Link>
          </Nav.Item>
          <ButtonGroup className="ml-auto">
            <Nav.Item className="ml-auto">
              <ExternalPlayerButton scene={scene} />
            </Nav.Item>
            <Nav.Item className="ml-auto">
              <OCounterButton
                value={scene.o_counter || 0}
                onIncrement={onIncrementClick}
                onDecrement={onDecrementClick}
                onReset={onResetClick}
              />
            </Nav.Item>
            <Nav.Item>
              <OrganizedButton
                loading={organizedLoading}
                organized={scene.organized}
                onClick={onOrganizedClick}
              />
            </Nav.Item>
            <Nav.Item>{renderOperations()}</Nav.Item>
          </ButtonGroup>
        </Nav>
      </div>

      <Tab.Content>
        <Tab.Pane eventKey="scene-details-panel">
          <SceneDetailPanel scene={scene} />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-queue-panel">
          <QueueViewer
            scenes={queueScenes}
            currentID={scene.id}
            continue={continuePlaylist}
            setContinue={setContinuePlaylist}
            onSceneClicked={loadScene}
            onNext={onQueueNext}
            onPrevious={onQueuePrevious}
            onRandom={onQueueRandom}
            start={queueStart}
            hasMoreScenes={queueHasMoreScenes()}
            onLessScenes={onQueueLessScenes}
            onMoreScenes={onQueueMoreScenes}
          />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-markers-panel">
          <SceneMarkersPanel
            sceneId={scene.id}
            onClickMarker={onClickMarker}
            isVisible={activeTabKey === "scene-markers-panel"}
          />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-movie-panel">
          <SceneMoviePanel scene={scene} />
        </Tab.Pane>
        {scene.galleries.length >= 1 && (
          <Tab.Pane eventKey="scene-galleries-panel">
            <SceneGalleriesPanel galleries={scene.galleries} />
            {scene.galleries.length === 1 && (
              <GalleryViewer galleryId={scene.galleries[0].id} />
            )}
          </Tab.Pane>
        )}
        <Tab.Pane eventKey="scene-video-filter-panel">
          <SceneVideoFilterPanel scene={scene} />
        </Tab.Pane>
        <Tab.Pane className="file-info-panel" eventKey="scene-file-info-panel">
          <SceneFileInfoPanel scene={scene} />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-edit-panel">
          <SceneEditPanel
            isVisible={activeTabKey === "scene-edit-panel"}
            scene={scene}
            onSubmit={onSave}
            onDelete={() => setIsDeleteAlertOpen(true)}
          />
        </Tab.Pane>
      </Tab.Content>
    </Tab.Container>
  );

  function getCollapseButtonIcon() {
    return collapsed ? faChevronRight : faChevronLeft;
  }

  const title = objectTitle(scene);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      {maybeRenderSceneGenerateDialog()}
      {maybeRenderDeleteDialog()}
      <div
        className={`scene-tabs order-xl-first order-last ${
          collapsed ? "collapsed" : ""
        }`}
      >
        <div className="d-none d-xl-block">
          {scene.studio && (
            <h1 className="mt-3 text-center">
              <Link to={`/studios/${scene.studio.id}`}>
                <img
                  src={scene.studio.image_path ?? ""}
                  alt={`${scene.studio.name} logo`}
                  className="studio-logo"
                />
              </Link>
            </h1>
          )}
          <h3 className="scene-header">{title}</h3>
        </div>
        {renderTabs()}
      </div>
      <div className="scene-divider d-none d-xl-block">
        <Button onClick={() => setCollapsed(!collapsed)}>
          <Icon className="fa-fw" icon={getCollapseButtonIcon()} />
        </Button>
      </div>
      <SubmitStashBoxDraft
        boxes={boxes}
        entity={scene}
        query={GQL.SubmitStashBoxSceneDraftDocument}
        show={showDraftModal}
        onHide={() => setShowDraftModal(false)}
      />
    </>
  );
};

const SceneLoader: React.FC<RouteComponentProps<ISceneParams>> = ({
  location,
  history,
  match,
}) => {
  const { id } = match.params;
  const { configuration } = useContext(ConfigurationContext);
  const { data, loading, error } = useFindScene(id);

  const [scene, setScene] = useState<GQL.SceneDataFragment>();

  // useLayoutEffect to update before paint
  useLayoutEffect(() => {
    // only update scene when loading is done
    if (!loading) {
      setScene(data?.findScene ?? undefined);
    }
  }, [data, loading]);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const sceneQueue = useMemo(
    () => SceneQueue.fromQueryParameters(queryParams),
    [queryParams]
  );
  const queryContinue = useMemo(() => {
    let cont = queryParams.get("continue");
    if (cont) {
      return cont === "true";
    } else {
      return !!configuration?.interface.continuePlaylistDefault;
    }
  }, [configuration?.interface.continuePlaylistDefault, queryParams]);

  const [queueScenes, setQueueScenes] = useState<QueuedScene[]>([]);

  const [collapsed, setCollapsed] = useState(false);
  const [continuePlaylist, setContinuePlaylist] = useState(queryContinue);
  const [hideScrubber, setHideScrubber] = useState(
    !(configuration?.interface.showScrubber ?? true)
  );

  const _setTimestamp = useRef<(value: number) => void>();
  const initialTimestamp = useMemo(() => {
    return Number.parseInt(queryParams.get("t") ?? "0", 10);
  }, [queryParams]);

  const [queueTotal, setQueueTotal] = useState(0);
  const [queueStart, setQueueStart] = useState(1);

  const autoplay = queryParams.get("autoplay") === "true";
  const currentQueueIndex = queueScenes
    ? queueScenes.findIndex((s) => s.id === id)
    : -1;

  function getSetTimestamp(fn: (value: number) => void) {
    _setTimestamp.current = fn;
  }

  function setTimestamp(value: number) {
    if (_setTimestamp.current) {
      _setTimestamp.current(value);
    }
  }

  // set up hotkeys
  useEffect(() => {
    Mousetrap.bind(".", () => setHideScrubber((value) => !value));

    return () => {
      Mousetrap.unbind(".");
    };
  }, []);

  async function getQueueFilterScenes(filter: ListFilterModel) {
    const query = await queryFindScenes(filter);
    const { scenes, count } = query.data.findScenes;
    setQueueScenes(scenes);
    setQueueTotal(count);
    setQueueStart((filter.currentPage - 1) * filter.itemsPerPage + 1);
  }

  async function getQueueScenes(sceneIDs: number[]) {
    const query = await queryFindScenesByID(sceneIDs);
    const { scenes, count } = query.data.findScenes;
    setQueueScenes(scenes);
    setQueueTotal(count);
    setQueueStart(1);
  }

  useEffect(() => {
    if (sceneQueue.query) {
      getQueueFilterScenes(sceneQueue.query);
    } else if (sceneQueue.sceneIDs) {
      getQueueScenes(sceneQueue.sceneIDs);
    }
  }, [sceneQueue]);

  async function onQueueLessScenes() {
    if (!sceneQueue.query || queueStart <= 1) {
      return;
    }

    const filterCopy = sceneQueue.query.clone();
    const newStart = queueStart - filterCopy.itemsPerPage;
    filterCopy.currentPage = Math.ceil(newStart / filterCopy.itemsPerPage);
    const query = await queryFindScenes(filterCopy);
    const { scenes } = query.data.findScenes;

    // prepend scenes to scene list
    const newScenes = (scenes as QueuedScene[]).concat(queueScenes);
    setQueueScenes(newScenes);
    setQueueStart(newStart);
  }

  function queueHasMoreScenes() {
    return queueStart + queueScenes.length - 1 < queueTotal;
  }

  async function onQueueMoreScenes() {
    if (!sceneQueue.query || !queueHasMoreScenes()) {
      return;
    }

    const filterCopy = sceneQueue.query.clone();
    const newStart = queueStart + queueScenes.length;
    filterCopy.currentPage = Math.ceil(newStart / filterCopy.itemsPerPage);
    const query = await queryFindScenes(filterCopy);
    const { scenes } = query.data.findScenes;

    // append scenes to scene list
    const newScenes = queueScenes.concat(scenes as QueuedScene[]);
    setQueueScenes(newScenes);
    // don't change queue start
  }

  function loadScene(sceneID: string, autoPlay?: boolean, newPage?: number) {
    const sceneLink = sceneQueue.makeLink(sceneID, {
      newPage,
      autoPlay,
      continue: continuePlaylist,
    });
    history.replace(sceneLink);
  }

  function onDelete() {
    if (
      continuePlaylist &&
      queueScenes &&
      currentQueueIndex >= 0 &&
      currentQueueIndex < queueScenes.length - 1
    ) {
      loadScene(queueScenes[currentQueueIndex + 1].id);
    } else {
      history.push("/scenes");
    }
  }

  function onQueueNext() {
    if (!queueScenes) return;

    if (currentQueueIndex >= 0 && currentQueueIndex < queueScenes.length - 1) {
      loadScene(queueScenes[currentQueueIndex + 1].id);
    }
  }

  function onQueuePrevious() {
    if (!queueScenes) return;

    if (currentQueueIndex > 0) {
      loadScene(queueScenes[currentQueueIndex - 1].id);
    }
  }

  async function onQueueRandom() {
    if (!queueScenes) return;

    if (sceneQueue.query) {
      const { query } = sceneQueue;
      const pages = Math.ceil(queueTotal / query.itemsPerPage);
      const page = Math.floor(Math.random() * pages) + 1;
      const index = Math.floor(
        Math.random() * Math.min(query.itemsPerPage, queueTotal)
      );
      const filterCopy = sceneQueue.query.clone();
      filterCopy.currentPage = page;
      const queryResults = await queryFindScenes(filterCopy);
      if (queryResults.data.findScenes.scenes.length > index) {
        const { id: sceneID } = queryResults.data.findScenes.scenes[index];
        // navigate to the image player page
        loadScene(sceneID, undefined, page);
      }
    } else {
      const index = Math.floor(Math.random() * queueTotal);
      loadScene(queueScenes[index].id);
    }
  }

  function onComplete() {
    if (!queueScenes) return;

    // load the next scene if we're continuing
    if (continuePlaylist) {
      if (
        currentQueueIndex >= 0 &&
        currentQueueIndex < queueScenes.length - 1
      ) {
        loadScene(queueScenes[currentQueueIndex + 1].id, true);
      }
    }
  }

  function onNext() {
    if (!queueScenes) return;

    if (currentQueueIndex >= 0 && currentQueueIndex < queueScenes.length - 1) {
      loadScene(queueScenes[currentQueueIndex + 1].id, true);
    }
  }

  function onPrevious() {
    if (!queueScenes) return;

    if (currentQueueIndex > 0) {
      loadScene(queueScenes[currentQueueIndex - 1].id, true);
    }
  }

  if (!scene) {
    if (loading) return <LoadingIndicator />;
    if (error) return <ErrorMessage error={error.message} />;
    return <ErrorMessage error={`No scene found with id ${id}.`} />;
  }

  return (
    <div className="row">
      <ScenePage
        scene={scene}
        setTimestamp={setTimestamp}
        queueScenes={queueScenes ?? []}
        queueStart={queueStart}
        onDelete={onDelete}
        onQueueNext={onQueueNext}
        onQueuePrevious={onQueuePrevious}
        onQueueRandom={onQueueRandom}
        continuePlaylist={continuePlaylist}
        loadScene={loadScene}
        queueHasMoreScenes={queueHasMoreScenes}
        onQueueLessScenes={onQueueLessScenes}
        onQueueMoreScenes={onQueueMoreScenes}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        setContinuePlaylist={setContinuePlaylist}
      />
      <div className={`scene-player-container ${collapsed ? "expanded" : ""}`}>
        <ScenePlayer
          key="ScenePlayer"
          scene={scene}
          hideScrubberOverride={hideScrubber}
          autoplay={autoplay}
          permitLoop={!continuePlaylist}
          initialTimestamp={initialTimestamp}
          sendSetTimestamp={getSetTimestamp}
          onComplete={onComplete}
          onNext={onNext}
          onPrevious={onPrevious}
        />
      </div>
    </div>
  );
};

export default SceneLoader;

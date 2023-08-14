import { Button, Tab, Nav, Dropdown } from "react-bootstrap";
import React, { useEffect, useMemo, useState } from "react";
import {
  useHistory,
  Link,
  RouteComponentProps,
  Redirect,
} from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { Helmet } from "react-helmet";
import * as GQL from "src/core/generated-graphql";
import {
  mutateMetadataScan,
  useFindGallery,
  useGalleryUpdate,
} from "src/core/StashService";
import { ErrorMessage } from "src/components/Shared/ErrorMessage";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { Icon } from "src/components/Shared/Icon";
import { Counter } from "src/components/Shared/Counter";
import Mousetrap from "mousetrap";
import { useGalleryLightbox } from "src/hooks/Lightbox/hooks";
import { useToast } from "src/hooks/Toast";
import { OrganizedButton } from "src/components/Scenes/SceneDetails/OrganizedButton";
import { GalleryEditPanel } from "./GalleryEditPanel";
import { GalleryDetailPanel } from "./GalleryDetailPanel";
import { DeleteGalleriesDialog } from "../DeleteGalleriesDialog";
import { GalleryImagesPanel } from "./GalleryImagesPanel";
import { GalleryAddPanel } from "./GalleryAddPanel";
import { GalleryFileInfoPanel } from "./GalleryFileInfoPanel";
import { GalleryScenesPanel } from "./GalleryScenesPanel";
import {
  faEllipsisV,
  faChevronRight,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";
import { galleryPath, galleryTitle } from "src/core/galleries";
import { GalleryChapterPanel } from "./GalleryChaptersPanel";
import { useScrollToTopOnMount } from "src/hooks/scrollToTop";

interface IProps {
  gallery: GQL.GalleryDataFragment;
  add?: boolean;
}

interface IGalleryParams {
  id: string;
  tab?: string;
}

export const GalleryPage: React.FC<IProps> = ({ gallery, add }) => {
  const history = useHistory();
  const Toast = useToast();
  const intl = useIntl();
  const showLightbox = useGalleryLightbox(gallery.id, gallery.chapters);

  const [collapsed, setCollapsed] = useState(false);

  const [activeTabKey, setActiveTabKey] = useState("gallery-details-panel");

  const setMainTabKey = (newTabKey: string | null) => {
    if (newTabKey === "add") {
      history.replace(`/galleries/${gallery.id}/add`);
    } else {
      history.replace(`/galleries/${gallery.id}`);
    }
  };

  const path = useMemo(() => galleryPath(gallery), [gallery]);

  const [updateGallery] = useGalleryUpdate();

  const [organizedLoading, setOrganizedLoading] = useState(false);

  async function onSave(input: GQL.GalleryCreateInput) {
    await updateGallery({
      variables: {
        input: {
          id: gallery.id,
          ...input,
        },
      },
    });
    Toast.success({
      content: intl.formatMessage(
        { id: "toast.updated_entity" },
        { entity: intl.formatMessage({ id: "gallery" }).toLocaleLowerCase() }
      ),
    });
  }

  const onOrganizedClick = async () => {
    try {
      setOrganizedLoading(true);
      await updateGallery({
        variables: {
          input: {
            id: gallery.id,
            organized: !gallery.organized,
          },
        },
      });
    } catch (e) {
      Toast.error(e);
    } finally {
      setOrganizedLoading(false);
    }
  };

  function getCollapseButtonIcon() {
    return collapsed ? faChevronRight : faChevronLeft;
  }

  async function onRescan() {
    if (!gallery || !path) {
      return;
    }

    await mutateMetadataScan({
      paths: [path],
    });

    Toast.success({
      content: intl.formatMessage(
        { id: "toast.rescanning_entity" },
        {
          count: 1,
          singularEntity: intl.formatMessage({ id: "gallery" }),
        }
      ),
    });
  }

  async function onClickChapter(imageindex: number) {
    showLightbox(imageindex - 1);
  }

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);

  function onDeleteDialogClosed(deleted: boolean) {
    setIsDeleteAlertOpen(false);
    if (deleted) {
      history.push("/galleries");
    }
  }

  function maybeRenderDeleteDialog() {
    if (isDeleteAlertOpen && gallery) {
      return (
        <DeleteGalleriesDialog
          selected={[{ ...gallery, image_count: NaN }]}
          onClose={onDeleteDialogClosed}
        />
      );
    }
  }

  function renderOperations() {
    return (
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
          {path ? (
            <Dropdown.Item
              key="rescan"
              className="bg-secondary text-white"
              onClick={() => onRescan()}
            >
              <FormattedMessage id="actions.rescan" />
            </Dropdown.Item>
          ) : undefined}
          <Dropdown.Item
            key="delete-gallery"
            className="bg-secondary text-white"
            onClick={() => setIsDeleteAlertOpen(true)}
          >
            <FormattedMessage
              id="actions.delete_entity"
              values={{ entityType: intl.formatMessage({ id: "gallery" }) }}
            />
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  function renderTabs() {
    if (!gallery) {
      return;
    }

    return (
      <Tab.Container
        activeKey={activeTabKey}
        onSelect={(k) => k && setActiveTabKey(k)}
      >
        <div>
          <Nav variant="tabs" className="mr-auto">
            <Nav.Item>
              <Nav.Link eventKey="gallery-details-panel">
                <FormattedMessage id="details" />
              </Nav.Link>
            </Nav.Item>
            {gallery.scenes.length >= 1 ? (
              <Nav.Item>
                <Nav.Link eventKey="gallery-scenes-panel">
                  <FormattedMessage
                    id="countables.scenes"
                    values={{ count: gallery.scenes.length }}
                  />
                </Nav.Link>
              </Nav.Item>
            ) : undefined}
            {path ? (
              <Nav.Item>
                <Nav.Link eventKey="gallery-file-info-panel">
                  <FormattedMessage id="file_info" />
                  <Counter count={gallery.files.length} hideZero hideOne />
                </Nav.Link>
              </Nav.Item>
            ) : undefined}
            <Nav.Item>
              <Nav.Link eventKey="gallery-chapter-panel">
                <FormattedMessage id="chapters" />
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="gallery-edit-panel">
                <FormattedMessage id="actions.edit" />
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="ml-auto">
              <OrganizedButton
                loading={organizedLoading}
                organized={gallery.organized}
                onClick={onOrganizedClick}
              />
            </Nav.Item>
            <Nav.Item>{renderOperations()}</Nav.Item>
          </Nav>
        </div>

        <Tab.Content>
          <Tab.Pane eventKey="gallery-details-panel">
            <GalleryDetailPanel gallery={gallery} />
          </Tab.Pane>
          <Tab.Pane
            className="file-info-panel"
            eventKey="gallery-file-info-panel"
          >
            <GalleryFileInfoPanel gallery={gallery} />
          </Tab.Pane>
          <Tab.Pane eventKey="gallery-chapter-panel">
            <GalleryChapterPanel
              gallery={gallery}
              onClickChapter={onClickChapter}
              isVisible={activeTabKey === "gallery-chapter-panel"}
            />
          </Tab.Pane>
          <Tab.Pane eventKey="gallery-edit-panel">
            <GalleryEditPanel
              isVisible={activeTabKey === "gallery-edit-panel"}
              gallery={gallery}
              onSubmit={onSave}
              onDelete={() => setIsDeleteAlertOpen(true)}
            />
          </Tab.Pane>
          {gallery.scenes.length > 0 && (
            <Tab.Pane eventKey="gallery-scenes-panel">
              <GalleryScenesPanel scenes={gallery.scenes} />
            </Tab.Pane>
          )}
        </Tab.Content>
      </Tab.Container>
    );
  }

  function renderRightTabs() {
    if (!gallery) {
      return;
    }

    return (
      <Tab.Container
        activeKey={add ? "add" : "images"}
        unmountOnExit
        onSelect={setMainTabKey}
      >
        <div>
          <Nav variant="tabs" className="mr-auto">
            <Nav.Item>
              <Nav.Link eventKey="images">
                <FormattedMessage id="images" />
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="add">
                <FormattedMessage id="actions.add" />
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        <Tab.Content>
          <Tab.Pane eventKey="images">
            <GalleryImagesPanel active={!add} gallery={gallery} />
          </Tab.Pane>
          <Tab.Pane eventKey="add">
            <GalleryAddPanel active={!!add} gallery={gallery} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    );
  }

  // set up hotkeys
  useEffect(() => {
    Mousetrap.bind("a", () => setActiveTabKey("gallery-details-panel"));
    Mousetrap.bind("c", () => setActiveTabKey("gallery-chapter-panel"));
    Mousetrap.bind("e", () => setActiveTabKey("gallery-edit-panel"));
    Mousetrap.bind("f", () => setActiveTabKey("gallery-file-info-panel"));
    Mousetrap.bind(",", () => setCollapsed(!collapsed));

    return () => {
      Mousetrap.unbind("a");
      Mousetrap.unbind("c");
      Mousetrap.unbind("e");
      Mousetrap.unbind("f");
      Mousetrap.unbind(",");
    };
  });

  const title = galleryTitle(gallery);

  return (
    <div className="row">
      <Helmet>
        <title>{title}</title>
      </Helmet>
      {maybeRenderDeleteDialog()}
      <div className={`gallery-tabs ${collapsed ? "collapsed" : ""}`}>
        <div className="d-none d-xl-block">
          {gallery.studio && (
            <h1 className="text-center">
              <Link to={`/studios/${gallery.studio.id}`}>
                <img
                  src={gallery.studio.image_path ?? ""}
                  alt={`${gallery.studio.name} logo`}
                  className="studio-logo"
                />
              </Link>
            </h1>
          )}
          <h3 className="gallery-header">{title}</h3>
        </div>
        {renderTabs()}
      </div>
      <div className="gallery-divider d-none d-xl-block">
        <Button onClick={() => setCollapsed(!collapsed)}>
          <Icon className="fa-fw" icon={getCollapseButtonIcon()} />
        </Button>
      </div>
      <div className={`gallery-container ${collapsed ? "expanded" : ""}`}>
        {renderRightTabs()}
      </div>
    </div>
  );
};

const GalleryLoader: React.FC<RouteComponentProps<IGalleryParams>> = ({
  location,
  match,
}) => {
  const { id, tab } = match.params;
  const { data, loading, error } = useFindGallery(id);

  useScrollToTopOnMount();

  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage error={error.message} />;
  if (!data?.findGallery)
    return <ErrorMessage error={`No gallery found with id ${id}.`} />;

  if (tab === "add") {
    return <GalleryPage add gallery={data.findGallery} />;
  }

  if (tab) {
    return (
      <Redirect
        to={{
          ...location,
          pathname: `/galleries/${id}`,
        }}
      />
    );
  }

  return <GalleryPage gallery={data.findGallery} />;
};

export default GalleryLoader;

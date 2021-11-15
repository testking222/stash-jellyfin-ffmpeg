import React, { useState } from "react";
import { Modal, Container, Row, Col, Nav, Tab } from "react-bootstrap";
import Introduction from "src/docs/en/Introduction.md";
import Tasks from "src/docs/en/Tasks.md";
import AutoTagging from "src/docs/en/AutoTagging.md";
import JSONSpec from "src/docs/en/JSONSpec.md";
import Configuration from "src/docs/en/Configuration.md";
import Interface from "src/docs/en/Interface.md";
import Galleries from "src/docs/en/Galleries.md";
import Scraping from "src/docs/en/Scraping.md";
import ScraperDevelopment from "src/docs/en/ScraperDevelopment.md";
import Plugins from "src/docs/en/Plugins.md";
import ExternalPlugins from "src/docs/en/ExternalPlugins.md";
import EmbeddedPlugins from "src/docs/en/EmbeddedPlugins.md";
import Tagger from "src/docs/en/Tagger.md";
import Contributing from "src/docs/en/Contributing.md";
import SceneFilenameParser from "src/docs/en/SceneFilenameParser.md";
import KeyboardShortcuts from "src/docs/en/KeyboardShortcuts.md";
import Help from "src/docs/en/Help.md";
import Deduplication from "src/docs/en/Deduplication.md";
import Interactive from "src/docs/en/Interactive.md";
import Identify from "src/docs/en/Identify.md";
import { MarkdownPage } from "../Shared/MarkdownPage";

interface IManualProps {
  animation?: boolean;
  show: boolean;
  onClose: () => void;
  defaultActiveTab?: string;
}

export const Manual: React.FC<IManualProps> = ({
  animation,
  show,
  onClose,
  defaultActiveTab,
}) => {
  const content = [
    {
      key: "Introduction.md",
      title: "Introduction",
      content: Introduction,
    },
    {
      key: "Configuration.md",
      title: "Configuration",
      content: Configuration,
    },
    {
      key: "Interface.md",
      title: "Interface Options",
      content: Interface,
    },
    {
      key: "Tasks.md",
      title: "Tasks",
      content: Tasks,
    },
    {
      key: "Identify.md",
      title: "Identify",
      content: Identify,
      className: "indent-1",
    },
    {
      key: "AutoTagging.md",
      title: "Auto Tagging",
      content: AutoTagging,
      className: "indent-1",
    },
    {
      key: "SceneFilenameParser.md",
      title: "Scene Filename Parser",
      content: SceneFilenameParser,
      className: "indent-1",
    },
    {
      key: "JSONSpec.md",
      title: "JSON Specification",
      content: JSONSpec,
      className: "indent-1",
    },
    {
      key: "Galleries.md",
      title: "Image Galleries",
      content: Galleries,
    },
    {
      key: "Scraping.md",
      title: "Metadata Scraping",
      content: Scraping,
    },
    {
      key: "ScraperDevelopment.md",
      title: "Scraper Development",
      content: ScraperDevelopment,
      className: "indent-1",
    },
    {
      key: "Plugins.md",
      title: "Plugins",
      content: Plugins,
    },
    {
      key: "ExternalPlugins.md",
      title: "External",
      content: ExternalPlugins,
      className: "indent-1",
    },
    {
      key: "EmbeddedPlugins.md",
      title: "Embedded",
      content: EmbeddedPlugins,
      className: "indent-1",
    },
    {
      key: "Tagger.md",
      title: "Scene Tagger",
      content: Tagger,
    },
    {
      key: "Deduplication.md",
      title: "Dupe Checker",
      content: Deduplication,
    },
    {
      key: "Interactive.md",
      title: "Interactivity",
      content: Interactive,
    },
    {
      key: "KeyboardShortcuts.md",
      title: "Keyboard Shortcuts",
      content: KeyboardShortcuts,
    },
    {
      key: "Contributing.md",
      title: "Contributing",
      content: Contributing,
    },
    {
      key: "Help.md",
      title: "Further Help",
      content: Help,
    },
  ];

  const [activeTab, setActiveTab] = useState(
    defaultActiveTab ?? content[0].key
  );

  // links to other manual pages are specified as "/help/page.md"
  // intercept clicks to these pages and set the tab accordingly
  function interceptLinkClick(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) {
    if (event.target instanceof HTMLAnchorElement) {
      const href = (event.target as HTMLAnchorElement).getAttribute("href");
      if (href && href.startsWith("/help")) {
        const newKey = (event.target as HTMLAnchorElement).pathname.substring(
          "/help/".length
        );
        setActiveTab(newKey);
        event.preventDefault();
      }
    }
  }

  return (
    <Modal
      animation={animation}
      show={show}
      onHide={onClose}
      dialogClassName="modal-dialog-scrollable manual modal-xl"
    >
      <Modal.Header closeButton>
        <Modal.Title>Help</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container className="manual-container">
          <Tab.Container
            activeKey={activeTab}
            onSelect={(k) => k && setActiveTab(k)}
            id="manual-tabs"
          >
            <Row>
              <Col lg={3} className="mb-3 mb-lg-0 manual-toc">
                <Nav variant="pills" className="flex-column">
                  {content.map((c) => {
                    return (
                      <Nav.Item key={`${c.key}-nav`}>
                        <Nav.Link className={c.className} eventKey={c.key}>
                          {c.title}
                        </Nav.Link>
                      </Nav.Item>
                    );
                  })}
                  <hr className="d-sm-none" />
                </Nav>
              </Col>
              <Col lg={9} className="manual-content">
                <Tab.Content>
                  {content.map((c) => {
                    return (
                      <Tab.Pane
                        eventKey={c.key}
                        key={`${c.key}-pane`}
                        onClick={interceptLinkClick}
                      >
                        <MarkdownPage page={c.content} />
                      </Tab.Pane>
                    );
                  })}
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        </Container>
      </Modal.Body>
    </Modal>
  );
};
import React from "react";
import { Route, Switch } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useTitleProps } from "src/hooks/title";
import { PersistanceLevel } from "../List/ItemList";
import Gallery from "./GalleryDetails/Gallery";
import GalleryCreate from "./GalleryDetails/GalleryCreate";
import { GalleryList } from "./GalleryList";
import { useScrollToTopOnMount } from "src/hooks/scrollToTop";

const Galleries: React.FC = () => {
  useScrollToTopOnMount();

  return <GalleryList persistState={PersistanceLevel.ALL} />;
};

const GalleryRoutes: React.FC = () => {
  const titleProps = useTitleProps({ id: "galleries" });
  return (
    <>
      <Helmet {...titleProps} />
      <Switch>
        <Route exact path="/galleries" component={Galleries} />
        <Route exact path="/galleries/new" component={GalleryCreate} />
        <Route path="/galleries/:id/:tab?" component={Gallery} />
      </Switch>
    </>
  );
};

export default GalleryRoutes;

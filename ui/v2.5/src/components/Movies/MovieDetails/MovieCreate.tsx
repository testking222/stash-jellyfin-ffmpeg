import React, { useMemo, useState } from "react";
import * as GQL from "src/core/generated-graphql";
import { useMovieCreate } from "src/core/StashService";
import { useHistory, useLocation } from "react-router-dom";
import { useIntl } from "react-intl";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { useToast } from "src/hooks/Toast";
import { MovieEditPanel } from "./MovieEditPanel";

const MovieCreate: React.FC = () => {
  const history = useHistory();
  const intl = useIntl();
  const Toast = useToast();

  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location]);
  const movie = {
    name: query.get("q") ?? undefined,
  };

  // Editing movie state
  const [frontImage, setFrontImage] = useState<string | null>();
  const [backImage, setBackImage] = useState<string | null>();
  const [encodingImage, setEncodingImage] = useState<boolean>(false);

  const [createMovie] = useMovieCreate();

  async function onSave(input: GQL.MovieCreateInput) {
    const result = await createMovie({
      variables: { input },
    });
    if (result.data?.movieCreate?.id) {
      history.push(`/movies/${result.data.movieCreate.id}`);
      Toast.success({
        content: intl.formatMessage(
          { id: "toast.created_entity" },
          { entity: intl.formatMessage({ id: "gallery" }).toLocaleLowerCase() }
        ),
      });
    }
  }

  function renderFrontImage() {
    if (frontImage) {
      return (
        <div className="movie-image-container">
          <img alt="Front Cover" src={frontImage} />
        </div>
      );
    }
  }

  function renderBackImage() {
    if (backImage) {
      return (
        <div className="movie-image-container">
          <img alt="Back Cover" src={backImage} />
        </div>
      );
    }
  }

  // TODO: CSS class
  return (
    <div className="row">
      <div className="movie-details mb-3 col">
        <div className="logo w-100">
          {encodingImage ? (
            <LoadingIndicator
              message={`${intl.formatMessage({ id: "encoding_image" })}...`}
            />
          ) : (
            <div className="movie-images">
              {renderFrontImage()}
              {renderBackImage()}
            </div>
          )}
        </div>

        <MovieEditPanel
          movie={movie}
          onSubmit={onSave}
          onCancel={() => history.push("/movies")}
          onDelete={() => {}}
          setFrontImage={setFrontImage}
          setBackImage={setBackImage}
          setEncodingImage={setEncodingImage}
        />
      </div>
    </div>
  );
};

export default MovieCreate;

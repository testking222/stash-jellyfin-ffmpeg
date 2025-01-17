import React from "react";
import { Form } from "react-bootstrap";
import { DurationInput } from "src/components/Shared/DurationInput";
import { FilterSelect } from "src/components/Shared/Select";
import DurationUtils from "./duration";

const renderTextArea = (options: {
  value: string | undefined;
  isEditing: boolean;
  onChange: (value: string) => void;
}) => {
  return (
    <Form.Control
      className="text-input"
      as="textarea"
      readOnly={!options.isEditing}
      plaintext={!options.isEditing}
      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
        options.onChange(event.currentTarget.value)
      }
      value={options.value}
    />
  );
};

const renderEditableText = (options: {
  title?: string;
  value?: string | number;
  isEditing: boolean;
  onChange: (value: string) => void;
}) => {
  return (
    <Form.Control
      readOnly={!options.isEditing}
      plaintext={!options.isEditing}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        options.onChange(event.currentTarget.value)
      }
      value={
        typeof options.value === "number"
          ? options.value.toString()
          : options.value
      }
      placeholder={options.title}
    />
  );
};

const renderInputGroup = (options: {
  title?: string;
  placeholder?: string;
  value: string | undefined;
  isEditing: boolean;
  url?: string;
  onChange?: (value: string) => void;
}) => {
  if (options.url && !options.isEditing) {
    return (
      <a href={options.url} target="_blank" rel="noopener noreferrer">
        {options.value}
      </a>
    );
  }

  return (
    <Form.Control
      className="text-input"
      readOnly={!options.isEditing}
      plaintext={!options.isEditing}
      value={options.value ?? ""}
      placeholder={options.placeholder ?? options.title}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        if (options.onChange) {
          options.onChange(event.currentTarget.value);
        }
      }}
    />
  );
};

const renderDurationInput = (options: {
  value: number | undefined;
  isEditing: boolean;
  onChange: (value: number | undefined) => void;
}) => {
  if (!options.isEditing) {
    let durationString;
    if (options.value !== undefined) {
      durationString = DurationUtils.secondsToString(options.value);
    }

    return (
      <Form.Control
        className="text-input"
        readOnly
        plaintext
        defaultValue={durationString}
      />
    );
  }

  return (
    <DurationInput
      value={options.value}
      setValue={(v) => options.onChange(v)}
    />
  );
};

const renderHtmlSelect = (options: {
  value?: string | number;
  isEditing: boolean;
  onChange: (value: string) => void;
  selectOptions: Array<string | number>;
}) => {
  if (!options.isEditing) {
    return (
      <Form.Control
        className="text-input"
        readOnly
        plaintext
        defaultValue={options.value}
      />
    );
  }
  return (
    <Form.Control
      as="select"
      className="input-control"
      disabled={!options.isEditing}
      plaintext={!options.isEditing}
      value={options.value?.toString()}
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
        options.onChange(event.currentTarget.value)
      }
    >
      {options.selectOptions.map((opt) => (
        <option value={opt} key={opt}>
          {opt}
        </option>
      ))}
    </Form.Control>
  );
};

// TODO: isediting
const renderFilterSelect = (options: {
  type: "performers" | "studios" | "tags";
  initialId: string | undefined;
  onChange: (id: string | undefined) => void;
}) => (
  <FilterSelect
    type={options.type}
    onSelect={(items) => options.onChange(items[0]?.id)}
    initialIds={options.initialId ? [options.initialId] : []}
  />
);

// TODO: isediting
const renderMultiSelect = (options: {
  type: "performers" | "studios" | "tags";
  initialIds: string[] | undefined;
  onChange: (ids: string[]) => void;
}) => (
  <FilterSelect
    type={options.type}
    isMulti
    onSelect={(items) => options.onChange(items.map((i) => i.id))}
    initialIds={options.initialIds ?? []}
  />
);

const EditableTextUtils = {
  renderTextArea,
  renderEditableText,
  renderInputGroup,
  renderDurationInput,
  renderHtmlSelect,
  renderFilterSelect,
  renderMultiSelect,
};

export default EditableTextUtils;

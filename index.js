const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");

const {
  text,
  div,
  h3,
  style,
  a,
  script,
  pre,
  domReady,
  i,
  text_attr,
} = require("@saltcorn/markup/tags");

const {
  stateFieldsToWhere,
  stateFieldsToQuery,
} = require("@saltcorn/data/plugin-helper");

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "views",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();

          const show_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewtemplate, viewrow }) =>
              (viewtemplate.runMany || viewtemplate.renderRows) &&
              viewrow.name !== context.viewname
          );
          const show_view_opts = show_views.map((v) => v.name);

          return new Form({
            fields: [
              {
                name: "front_view",
                label: "Front Card View",
                type: "String",
                required: true,
                attributes: {
                  options: show_view_opts.join(),
                },
              },
              {
                name: "back_view",
                label: "Back Card View",
                type: "String",
                required: true,
                attributes: {
                  options: show_view_opts.join(),
                },
              },
            ],
          });
        },
      },
    ],
  });

const get_state_fields = async (table_id, viewname, { show_view }) => {
  return [];
};

const readState = (state, fields) => {
  fields.forEach((f) => {
    const current = state[f.name];
    if (typeof current !== "undefined") {
      if (f.type.read) state[f.name] = f.type.read(current);
      else if (f.type === "Key")
        state[f.name] = current === "null" ? null : +current;
    }
  });
  return state;
};
const run = async (
  table_id,
  viewname,
  { front_view, back_view },
  state,
  extraArgs
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  const is_back = !!state._back;
  readState(state, fields);
  const show_view = is_back ? back_view : front_view;
  const sview = await View.findOne({ name: show_view });
  if (!sview)
    return div(
      { class: "alert alert-danger" },
      "Flash cards incorrectly configured. Cannot find view: ",
      show_view
    );
  const qstate = await stateFieldsToWhere({ fields, state });
  const q = await stateFieldsToQuery({ state, fields });
  const rows = await tbl.getJoinedRows({
    where: qstate,
    ...q,
    limit: 1,
    orderBy: "RANDOM()",
  });

  if (rows.length === 0) return "No cards found";

  const sresp = await sview.run({ id: rows[0].id }, extraArgs);

  return div({ class: "flashcard" }, sresp);
};

module.exports = {
  sc_plugin_api_version: 1,
  viewtemplates: [
    {
      name: "Flash cards",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
    },
  ],
};

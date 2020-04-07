module.exports = checkOrUpdateWebhooks;

const prettier = require("prettier");
const { writeFileSync, readdirSync } = require("fs");
const { diff, diffString } = require("json-diff");

async function checkOrUpdateWebhooks({ checkOnly }) {
  const currentWebhooks = require("../index.json");

  const eventsByName = {};
  for (const path of readdirSync("payload-examples/api.github.com")) {
    const [name] = path.split(".");
    const payload = require(`../payload-examples/api.github.com/${path}`);

    if (!eventsByName[name]) {
      eventsByName[name] = {
        actions: [],
        examples: [],
      };
    }

    if (payload.action) {
      eventsByName[name].actions.push(payload.action);
    }
    eventsByName[name].examples.push(payload);
  }

  const webhooks = [];
  for (const [name, { actions, examples }] of Object.entries(eventsByName)) {
    webhooks.push({
      name,
      actions,
      examples,
    });
  }

  for (const webhook of webhooks) {
    const currentWebhook = currentWebhooks.find(
      (currentWebhook) => currentWebhook.name === webhook.name
    );

    if (!currentWebhook) {
      console.warn(`No current webhook found for "${webhook.name}"`);
      continue;
    }

    webhook.examples = currentWebhook.examples;
  }

  if (!diff(currentWebhooks, webhooks)) {
    console.log("✅  webhooks are up-to-date");
    return;
  }

  console.log("❌  webhooks are not up-to-date");
  console.log(diffString(currentWebhooks, webhooks));

  if (checkOnly) {
    process.exit(1);
  }

  const webhooksSorted = webhooks.sort((a, b) => {
    return a.name < b.name ? -1 : 1;
  });

  writeFileSync(
    "index.json",
    prettier.format(JSON.stringify(webhooksSorted), { parser: "json" })
  );
  console.log("✏️  index.json written");
}

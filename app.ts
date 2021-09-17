import { App, SlackEventMiddlewareArgs } from '@slack/bolt';

const app = new App({
        token: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message('hello', async (params: SlackEventMiddlewareArgs<"message">) => {
        console.log('received message');
        if (params.message.subtype === undefined) {
                await params.say({
                        blocks: [
                                {
                                        "type": "section",
                                        "text": {
                                                "type": "mrkdwn",
                                                "text": `Hey there <@${params.message.user}>!`
                                        },
                                        "accessory": {
                                                "type": "button",
                                                "text": {
                                                        "type": "plain_text",
                                                        "text": "Click Me"
                                                },
                                                "action_id": "button_click"
                                        }
                                }
                        ],
                        text: `Hey there <@${params.message.user}>!`
                });
        }
});

app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

(async () => {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        await app.start(port);
        console.log('⚡️ Bolt app is running!');
})();
